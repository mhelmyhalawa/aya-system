import { useEffect, useState, useMemo } from 'react';
import { fetchDriveImagesWithStatus, warmDriveImagesCache, getCachedDriveImages, clearDriveImageCache, fetchDriveImageDataUrl, fetchDriveImageBlob, resolvePublicImageUrls } from '@/lib/google-drive-image-service';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FormDialog } from '@/components/ui/form-dialog';
import { ZoomIn, Filter as FilterIcon, Eye, EyeOff, Trash2, Star, StarOff, CheckSquare, Square, X } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { getDriveAccessToken, listDriveFolderImages, uploadDriveImage, deleteDriveFile, renameDriveFile } from '@/lib/google-drive-oauth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

// نفس النوع المستخدم في صفحة إدارة صور البانر
type DriveImageLite = { id: string; name: string; mimeType: string; url?: string; size?: number; debugTried?: string[]; sourceType?: string };

// مفاتيح التخزين المحلي (يمكن إبقاؤها كما هي لتوحيد السلوك)
const HIDDEN_KEY = 'top_achievers_hidden_ids';
const ORDER_KEY = 'top_achievers_order_ids';
const FEATURED_KEY = 'top_achievers_featured_id';

function loadHiddenIds(): string[] { try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); } catch { return []; } }
function saveHiddenIds(ids: string[]) { try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids)); } catch { } }
function loadOrder(): string[] { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch { return []; } }
function saveOrder(ids: string[]) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(ids)); } catch { } }
function loadFeatured(): string | null { try { return localStorage.getItem(FEATURED_KEY); } catch { return null; } }
function saveFeatured(id: string | null) { try { if (id) localStorage.setItem(FEATURED_KEY, id); else localStorage.removeItem(FEATURED_KEY); } catch { } }

interface TopAchieversImagesManagementProps { onNavigate?: (path: string) => void; }

// المجلد الافتراضي للأوائل (يمكن تغيير المعرف لاحقاً أو جعله من متغير بيئة)
const DEFAULT_TOP_ACHIEVERS_FOLDER_ID = '1MPlvec7-hntKRZWA8hkBfn8KSTyh7JZh';

export const TopAchieversImagesManagement = ({ onNavigate }: TopAchieversImagesManagementProps) => {
  const topAchieversFolderIdEnv = import.meta.env.VITE_GOOGLE_DRIVE_TOP_ACHIEVERS_FOLDER_ID as string | undefined;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

  const [images, setImages] = useState<DriveImageLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>(loadHiddenIds());
  const [cacheInfo, setCacheInfo] = useState<{ cached: number; totalMeta: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc'>('name-asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [httpStatus, setHttpStatus] = useState<number | undefined>(undefined);
  const [rawCount, setRawCount] = useState<number | undefined>(undefined);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [extFilter, setExtFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<number>(0);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [orderIds, setOrderIds] = useState<string[]>(loadOrder());
  const [featuredId, setFeaturedId] = useState<string | null>(loadFeatured());
  const [previewImage, setPreviewImage] = useState<DriveImageLite | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resolvedFolderId] = useState<string | undefined>(topAchieversFolderIdEnv || DEFAULT_TOP_ACHIEVERS_FOLDER_ID);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{ open: boolean; title: string; message: string; mode: 'info'|'error'|'success'; }>( { open: false, title: '', message: '', mode: 'info' } );
  const [startRank, setStartRank] = useState<string>(''); // الإدخال النصي للرقم المبدئي
  const [monthFilter, setMonthFilter] = useState<string>(''); // فلتر الشهر بصيغة YYYYMM
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  const showMsg = (title: string, message: string, mode: 'info'|'error'|'success'='info') => { setMessageDialog({ open: true, title, message, mode }); };
  const closeMsg = () => setMessageDialog(m => ({ ...m, open: false }));

  // تحميل الصور
  const loadImages = async () => {
    if (!resolvedFolderId || !apiKey) { setError('متغيرات البيئة غير مكتملة'); return; }
    setLoading(true); setError(null);
    const { images: driveImages, error: driveError, status, rawCount } = await fetchDriveImagesWithStatus(resolvedFolderId, apiKey, { force: true });
    if (driveError) setError(driveError);
    setHttpStatus(status); setRawCount(rawCount);
    const cached = getCachedDriveImages(resolvedFolderId);
    const dataMap = cached?.dataUrls || {};
    let resolved = await resolvePublicImageUrls(driveImages);
    const merged = resolved.map(d => ({ id: d.id, name: d.name, mimeType: d.mimeType, url: dataMap[d.id] || d.url, debugTried: d.debugTried, sourceType: d.sourceType }));
    setImages(merged);
    if (cached) setCacheInfo({ cached: Object.keys(cached.dataUrls).length, totalMeta: cached.meta.images.length }); else setCacheInfo(null);
    setLoading(false);
  };

  // تحميل باستخدام OAuth (للحجم والعمليات الفعلية)
  const loadImagesOAuth = async () => {
    if (!resolvedFolderId || !accessToken) return;
    setLoading(true); setError(null);
    try {
      const list = await listDriveFolderImages(resolvedFolderId, accessToken);
      const cached = getCachedDriveImages(resolvedFolderId);
      const dataMap = cached?.dataUrls || {};
      const enriched: DriveImageLite[] = list.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: (f as any).size ? Number((f as any).size) : undefined,
        url: dataMap[f.id] || `https://drive.google.com/uc?export=view&id=${f.id}`,
        sourceType: dataMap[f.id] ? 'cache' : 'direct'
      }));
      setImages(enriched); setHttpStatus(200); setRawCount(enriched.length);
    } catch (e:any) { setError(e.message || 'فشل تحميل عبر OAuth'); } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    try { const token = await getDriveAccessToken(); setAccessToken(token); await loadImagesOAuth(); showMsg('تم الدخول','تم الحصول على صلاحية Drive بنجاح','success'); }
    catch (e:any) { showMsg('خطأ تسجيل الدخول', e.message || 'فشل تسجيل الدخول','error'); }
  };
  const handleLogout = () => setAccessToken(null);

  useEffect(() => { if (resolvedFolderId) loadImages(); }, [resolvedFolderId]);
  useEffect(() => { if (accessToken && resolvedFolderId) loadImagesOAuth(); }, [accessToken, resolvedFolderId]);

  // إخفاء / إظهار
  const toggleHidden = (id: string) => { setHiddenIds(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; saveHiddenIds(next); return next; }); };
  const hideSelected = () => { if (!selectedIds.length) return; setHiddenIds(prev => { const merged = Array.from(new Set([...prev, ...selectedIds])); saveHiddenIds(merged); return merged; }); };
  const unhideSelected = () => { if (!selectedIds.length) return; setHiddenIds(prev => { const filtered = prev.filter(id => !selectedIds.includes(id)); saveHiddenIds(filtered); return filtered; }); };
  const clearSelection = () => setSelectedIds([]);
  const selectAllVisible = (filteredImages: DriveImageLite[]) => setSelectedIds(filteredImages.map(i => i.id));

  const refreshCache = async () => { if (!resolvedFolderId || !apiKey) return; setLoading(true); await warmDriveImagesCache(resolvedFolderId, apiKey); await loadImages(); };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!accessToken || !resolvedFolderId) { showMsg('صلاحية مطلوبة','سجل الدخول أولاً للحصول على صلاحية الرفع.','error'); return; }
    setUploading(true);
    try {
      // توليد أسماء تلقائية بصيغة YYYYMM-RR حيث RR رقم تسلسلي يبدأ من أكبر الموجود + 1
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,'0')}`; // YYYYMM
      // استخراج الأرقام الحالية لنفس الشهر
      const existingNumbers = images.map(img => {
        const m = img.name.match(new RegExp(`^${ym}-(\\d{2})`, 'i'));
        return m ? parseInt(m[1], 10) : null;
      }).filter(n => n !== null) as number[];
      let nextNumber = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
      const parsedStart = startRank.trim() ? parseInt(startRank.trim(), 10) : null;
      if (parsedStart && parsedStart > 0) nextNumber = parsedStart;

      // توليد الأسماء المستهدفة مسبقاً للفحص عن التعارض
      const intendedNames: string[] = Array.from(files).map((_, idx) => {
        const seq = nextNumber + idx;
        const rr = String(seq).padStart(2,'0');
        const ext = ((Array.from(files)[idx].name.split('.').pop()) || 'jpg').toLowerCase();
        return `${ym}-${rr}.${ext}`;
      });
      const existingNamesLower = images.map(i => i.name.toLowerCase());
      const duplicates = intendedNames.filter(n => existingNamesLower.includes(n.toLowerCase()));
      if (duplicates.length) {
        const proceed = window.confirm(`هناك أسماء متعارضة (${duplicates.length}). سيتم تجاوزها؟\n${duplicates.slice(0,5).join('\n')}${duplicates.length>5?'\n...':''}`);
        if (!proceed) { setUploading(false); return; }
      }

      for (const [idx, f] of Array.from(files).entries()) {
        const seq = nextNumber + idx;
        const rr = String(seq).padStart(2,'0');
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const customName = `${ym}-${rr}.${ext}`;
        const result = await uploadDriveImage(f, resolvedFolderId, accessToken, customName);
        if (!result) {
          showMsg('رفع فاشل', 'فشل رفع ملف: ' + f.name,'error');
        }
      }
      await loadImagesOAuth(); showMsg('رفع مكتمل','انتهى رفع الملفات المحددة','success');
    } catch (e:any) { showMsg('خطأ رفع', e.message || 'فشل الرفع','error'); } finally { setUploading(false); }
  };

  // بدء التسمية اليدوية
  const beginRename = (img: DriveImageLite) => {
    setRenamingId(img.id);
    // إزالة الامتداد من الاسم الحالي
    const base = img.name.replace(/\.[a-zA-Z0-9]+$/, '');
    setRenameDraft(base);
    setRenameError(null);
  };
  const cancelRename = () => { setRenamingId(null); setRenameDraft(''); setRenameError(null); };
  const confirmRename = async (img: DriveImageLite) => {
    if (!accessToken) { showMsg('صلاحية مطلوبة','سجل الدخول أولاً','error'); return; }
    const ext = (img.name.split('.').pop() || 'jpg').toLowerCase();
    const draft = renameDraft.trim();
    const patternOk = /^\d{6}-\d{2}$/.test(draft);
    if (!patternOk) { setRenameError('الصيغة يجب أن تكون YYYYMM-RR مثل 202510-05'); return; }
    const finalName = `${draft}.${ext}`;
    if (images.some(other => other.id !== img.id && other.name.toLowerCase() === finalName.toLowerCase())) {
      setRenameError('اسم مستخدم مسبقاً'); return;
    }
    const ok = await renameDriveFile(img.id, finalName, accessToken);
    if (!ok) { setRenameError('فشل التسمية'); return; }
    // تحديث في الواجهة
    setImages(prev => prev.map(it => it.id === img.id ? { ...it, name: finalName } : it));
    cancelRename();
    showMsg('تم التعديل','تم تغيير اسم الصورة','success');
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) { showMsg('صلاحية مطلوبة','يلزم تسجيل الدخول للحذف','error'); return; }
    setDeletingId(id);
    try { const ok = await deleteDriveFile(id, accessToken); if (!ok) showMsg('حذف فاشل','فشل الحذف','error'); else showMsg('تم الحذف','تم حذف الصورة بنجاح','success'); await loadImagesOAuth(); }
    catch (e:any) { showMsg('خطأ حذف', e.message || 'خطأ أثناء الحذف','error'); } finally { setDeletingId(null); }
  };

  useEffect(() => { if (selectedIds.length > 0) setShowBulkBar(true); else if (showBulkBar) { const t = setTimeout(() => setShowBulkBar(false), 300); return () => clearTimeout(t); } }, [selectedIds, showBulkBar]);

  const bulkDeleteSelected = async (filteredImages: DriveImageLite[]) => {
    if (!accessToken) { showMsg('صلاحية مطلوبة','يلزم تسجيل الدخول للحذف','error'); return; }
    if (!selectedIds.length) return;
    if (!window.confirm(`سيتم حذف ${selectedIds.length} صورة. هل أنت متأكد؟`)) return;
    setDeletingBulk(true);
    let failures: string[] = [];
    try { for (const id of selectedIds) { const ok = await deleteDriveFile(id, accessToken); if (!ok) failures.push(id); } await loadImagesOAuth(); setSelectedIds([]); if (failures.length) showMsg('تحذير جزئي', `تم حذف بعض الصور مع وجود أخطاء (${failures.length}).`,'info'); else showMsg('حذف جماعي', 'تم حذف جميع الصور المحددة بنجاح','success'); }
    catch (e:any) { showMsg('خطأ حذف جماعي', e.message || 'فشل حذف جماعي','error'); } finally { setDeletingBulk(false); }
  };

  const filteredImages = useMemo(() => {
    let list = images;
    if (search.trim()) { const q = search.trim().toLowerCase(); list = list.filter(img => img.name.toLowerCase().includes(q)); }
    if (extFilter !== 'all') list = list.filter(img => img.name.toLowerCase().endsWith('.' + extFilter));
    if (sizeFilter > 0) list = list.filter(img => (img.size || 0) / 1024 >= sizeFilter);
    if (monthFilter.trim()) list = list.filter(img => img.name.startsWith(monthFilter + '-'));
    const orderIndex = (id: string) => { const idx = orderIds.indexOf(id); return idx === -1 ? Number.MAX_SAFE_INTEGER : idx; };
    list = [...list].sort((a, b) => {
      if (featuredId) { if (a.id === featuredId && b.id !== featuredId) return -1; if (b.id === featuredId && a.id !== featuredId) return 1; }
      const oi = orderIndex(a.id) - orderIndex(b.id); if (oi !== 0) return oi;
      return sortOrder === 'name-asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
    return list;
  }, [images, search, sortOrder, extFilter, sizeFilter, orderIds, featuredId, monthFilter]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    images.forEach(img => { const m = img.name.match(/^(\d{6})-\d{2}/); if (m) set.add(m[1]); });
    return Array.from(set).sort().reverse();
  }, [images]);

  const allVisibleSelected = useMemo(() => { if (!filteredImages.length) return false; return filteredImages.every(img => selectedIds.includes(img.id)); }, [filteredImages, selectedIds]);
  const toggleSelectAllVisible = () => { if (allVisibleSelected) clearSelection(); else selectAllVisible(filteredImages); };

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => { e.dataTransfer.setData('text/plain', id); };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); };
  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault(); const draggedId = e.dataTransfer.getData('text/plain'); if (!draggedId || draggedId === targetId) return;
    setOrderIds(prev => { const withoutDragged = prev.filter(x => x !== draggedId); const targetIndex = withoutDragged.indexOf(targetId); if (targetIndex === -1) { withoutDragged.push(draggedId); saveOrder(withoutDragged); return withoutDragged; } const newArr = [...withoutDragged]; newArr.splice(targetIndex, 0, draggedId); saveOrder(newArr); return newArr; });
  };

  const toggleFeatured = (id: string) => { setFeaturedId(prev => { const next = prev === id ? null : id; saveFeatured(next); return next; }); };

  const openPreview = async (img: DriveImageLite) => {
    setPreviewImage(img);
    if (!img.url && apiKey) { setPreviewLoading(true); const dataUrl = await fetchDriveImageDataUrl(img.id, apiKey); if (dataUrl) { setImages(prev => prev.map(it => it.id === img.id ? { ...it, url: dataUrl, sourceType: dataUrl.startsWith('blob:') ? 'blob' : 'data-url' } : it)); setPreviewImage(prev => prev ? { ...prev, url: dataUrl, sourceType: dataUrl.startsWith('blob:') ? 'blob' : 'data-url' } : prev); } setPreviewLoading(false); }
  };
  const closePreview = () => { setPreviewImage(null); setPreviewLoading(false); };

  const driveReadOnly = !apiKey || !resolvedFolderId;

  const reSequenceMonth = async () => {
    if (!accessToken) { showMsg('صلاحية مطلوبة','سجل الدخول أولاً','error'); return; }
    const now = new Date();
    const currentYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,'0')}`;
    const targetYm = monthFilter.trim() || currentYm;
    const monthRegex = new RegExp(`^${targetYm}-(\\d{2})`, 'i');
    const monthImages = images.filter(img => monthRegex.test(img.name));
    if (monthImages.length === 0) { showMsg('لا صور','لا توجد صور مطابقة للشهر المحدد','info'); return; }
    const withRank = monthImages.map(img => { const m = img.name.match(monthRegex); const rank = m ? parseInt(m[1],10) : Number.MAX_SAFE_INTEGER; return { img, rank }; });
    withRank.sort((a,b) => a.rank - b.rank || a.img.name.localeCompare(b.img.name));
    const targetNames = withRank.map((wrap, idx) => {
      const ext = (wrap.img.name.split('.').pop() || 'jpg').toLowerCase();
      const rr = String(idx+1).padStart(2,'0');
      return { id: wrap.img.id, newName: `${targetYm}-${rr}.${ext}`, oldName: wrap.img.name };
    });
    const allNamesMap = new Map<string,string>();
    images.forEach(i => allNamesMap.set(i.name.toLowerCase(), i.id));
    const conflicts = targetNames.filter(t => allNamesMap.has(t.newName.toLowerCase()) && allNamesMap.get(t.newName.toLowerCase()) !== t.id);
    if (conflicts.length) { showMsg('تعارض أسماء', `هناك ${conflicts.length} أسماء مستخدمة خارج مجموعة الشهر. ألغيت العملية.`, 'error'); return; }
    const confirm = window.confirm(`سيتم إعادة ترقيم ${monthImages.length} صورة للشهر ${targetYm} من 01 إلى ${String(monthImages.length).padStart(2,'0')}، هل تريد المتابعة؟`);
    if (!confirm) return;
    let success = 0; let failed: string[] = [];
    for (const t of targetNames) {
      if (t.oldName === t.newName) { success++; continue; }
      const ok = await renameDriveFile(t.id, t.newName, accessToken);
      if (ok) success++; else failed.push(t.oldName);
    }
    await loadImagesOAuth();
    if (failed.length) showMsg('انتهى جزئياً', `تمت إعادة ترقيم ${success} وفشل ${failed.length}`, 'info');
    else showMsg('إعادة ترقيم', `تمت إعادة ترقيم ${success} صورة بنجاح`, 'success');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 font-arabic">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0 rounded-2xl overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 w-full">
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <span className="text-yellow-300">🏅</span>
                <span className="truncate max-w-[180px] sm:max-w-none">إدارة صور الأوائل</span>
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-0.5">
                إدارة صور الطلاب الأوائل (رفع / إخفاء محلي / تحديث الكاش). الرفع والحذف يتطلبان الدخول بـ Gmail.<br />
                <span className="text-[10px] opacity-80">المجلد: <code className="break-all">{resolvedFolderId || 'غير محدد'}</code></span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0.5 pb-2 px-2 sm:px-3 space-y-2">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-1 rounded-lg bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 text-[11px] w-full max-w-full overflow-x-auto sm:overflow-visible pr-1 whitespace-nowrap sm:whitespace-normal sm:flex-wrap scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-300/60">
              <Button size="sm" variant="outline" disabled={loading || driveReadOnly} onClick={loadImages} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0" title="إعادة تحميل الصور" aria-label="إعادة تحميل الصور">{loading ? '⏳' : '🔄'} <span className="hidden sm:inline">تحميل</span></Button>
              <Button size="sm" variant="outline" disabled={loading || driveReadOnly} onClick={refreshCache} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0" title="تحديث الكاش" aria-label="تحديث الكاش">♻️ <span className="hidden sm:inline">تحديث الكاش</span></Button>
              <Button size="sm" variant="outline" disabled={loading || driveReadOnly} onClick={() => { clearDriveImageCache(resolvedFolderId); loadImages(); }} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0" title="مسح الكاش" aria-label="مسح الكاش">🧹 <span className="hidden sm:inline">مسح الكاش</span></Button>
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-green-700 hover:bg-green-600 text-white border border-green-600 cursor-pointer text-[11px] h-8 shadow-md transition-all" title="رفع صور جديدة" aria-label="رفع صور">📤 <span className="hidden sm:inline">رفع</span><input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} /></label>
                <div className="flex items-center gap-1 text-[10px] bg-green-100 border border-green-300 rounded-md px-2 py-1">
                  <span className="text-green-700">بدء من:</span>
                  <input
                    type="number"
                    min={1}
                    value={startRank}
                    onChange={(e) => setStartRank(e.target.value)}
                    placeholder="رقم"
                    className="w-14 h-6 text-[10px] rounded border border-green-300 px-1 bg-white"
                    title="الرقم التسلسلي الأول (RR)"
                  />
                </div>
              </div>
              {uploading && <span className="text-yellow-600 font-semibold">...رفع</span>}
              {!accessToken ? (
                <Button size="sm" variant="outline" onClick={handleLogin} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0" title="دخول Drive" aria-label="دخول Drive">🔐 <span className="hidden sm:inline">دخول Drive</span></Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0" title="خروج Drive" aria-label="خروج Drive">🚪 <span className="hidden sm:inline">خروج</span></Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setShowDebug(d => !d)} className="bg-gray-600 hover:bg-gray-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md whitespace-nowrap flex-shrink-0" title={showDebug ? 'إخفاء معلومات التصحيح' : 'عرض معلومات التصحيح'} aria-label="تفاصيل التصحيح">{showDebug ? '🛈' : '🧪'} <span className="hidden sm:inline">{showDebug ? 'إخفاء التفاصيل' : 'تفاصيل'}</span></Button>
              <Button size="sm" variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(f => !f)} className={`flex items-center gap-1.5 rounded-2xl h-8 px-3 py-1.5 shadow-md whitespace-nowrap transition-colors flex-shrink-0 ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`} title={showFilters ? 'إخفاء الفلترة' : 'إظهار الفلترة'} aria-label="أدوات الفلترة"><FilterIcon className="h-4 w-4" /><span className="hidden sm:inline">{showFilters ? 'إخفاء الفلتر' : 'فلتر'}</span></Button>
              {accessToken && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={reSequenceMonth}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-8 px-3 py-1.5 shadow-md flex-shrink-0"
                  title="إعادة ترقيم صور الشهر"
                  aria-label="إعادة ترقيم الشهر"
                >🔄 <span className="hidden sm:inline">ترقيم {monthFilter ? 'الشهر المحدد' : 'الشهر الحالي'}</span></Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            {error && <span className="text-red-600 font-semibold">خطأ: {error}</span>}
            {images.length === 0 && rawCount && rawCount > 0 && !error && (<span className="text-amber-600">تم العثور على ملفات لكن لا توجد صور.</span>)}
            {(showBulkBar || selectedIds.length > 0) && (
              <div className={`transition-all duration-300 ${selectedIds.length > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white/80 border border-green-200 rounded-lg p-2 shadow-sm`} aria-hidden={selectedIds.length === 0}>
                <div className="flex flex-col gap-1">
                  <div className="text-green-700 text-[11px] font-semibold flex items-center gap-1">
                    <span>✅</span><span>محدد: {selectedIds.length}</span>{filteredImages.length > 0 && (<span className="text-gray-500">({Math.round((selectedIds.length / filteredImages.length) * 100)}%)</span>)}
                  </div>
                </div>
                <div className="flex gap-1 flex-nowrap overflow-x-auto sm:overflow-visible [&::-webkit-scrollbar]:hidden">
                  <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={hideSelected} aria-label="إخفاء المحدد" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 disabled:opacity-40"><EyeOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">إخفاء</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">إخفاء كل الصور المحددة</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={unhideSelected} aria-label="إظهار المحدد" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-green-600 hover:bg-green-700 text-white border-green-600 disabled:opacity-40"><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">إظهار</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">إظهار كل الصور المحددة</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" onClick={toggleSelectAllVisible} aria-label={allVisibleSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'} className={`h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] ${allVisibleSelected ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`}>{allVisibleSelected ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" /> }<span className="hidden sm:inline">{allVisibleSelected ? 'إلغاء الكل' : 'تحديد الكل'}</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">{allVisibleSelected ? 'إلغاء تحديد كل الصور' : 'تحديد جميع الصور الظاهرة'}</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" disabled={selectedIds.length === 0} onClick={clearSelection} aria-label="إلغاء التحديد" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-gray-600 hover:bg-gray-700 text-white border-gray-600 disabled:opacity-40"><Square className="h-3.5 w-3.5" /><span className="hidden sm:inline">إلغاء</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">إلغاء تحديد كل الصور</TooltipContent></Tooltip>
                  {accessToken && (<Tooltip><TooltipTrigger asChild><Button size="sm" variant="destructive" disabled={selectedIds.length === 0 || deletingBulk} onClick={() => bulkDeleteSelected(filteredImages)} aria-label="حذف المحدد" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-40">{deletingBulk ? '⏳' : <Trash2 className="h-3.5 w-3.5" />}<span className="hidden sm:inline">حذف</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">حذف كل الصور المحددة نهائياً</TooltipContent></Tooltip>)}
                </div>
              </div>
            )}
          </div>
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-2 bg-white dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 rounded-lg animate-fade-in">
              <div className="relative w-full md:w-auto flex-1">
                <Input placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-8 h-8 rounded-md border-green-200 text-[12px]" />
                <span className="absolute right-2 top-2 h-4 w-4 text-green-500 text-[12px]">🔍</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => setSortOrder(o => o === 'name-asc' ? 'name-desc' : 'name-asc')} className={`rounded-2xl h-8 px-3 py-1.5 text-[11px] font-semibold shadow-md transition-colors ${sortOrder === 'name-asc' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>{sortOrder === 'name-asc' ? '⬇️ تنازلي' : '⬆️ تصاعدي'}</Button>
              <select value={extFilter} onChange={e => setExtFilter(e.target.value)} className="h-8 text-[11px] rounded-md border border-green-300 bg-green-50 px-2">
                <option value="all">كل الصيغ</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
              <div className="flex items-center gap-1">
                <label className="text-[10px] text-green-700">حجم ≥ {sizeFilter}KB</label>
                <input type="range" min={0} max={500} step={25} value={sizeFilter} onChange={e => setSizeFilter(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-1">
                <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="h-8 text-[11px] rounded-md border border-indigo-300 bg-indigo-50 px-2 min-w-[100px]" title="تصفية بالشهر (YYYYMM)">
                  <option value="">كل الشهور</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-300 shadow-md bg-white rounded-xl">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2 font-bold text-green-800"><span>📂</span> الصور الحالية <span className="text-green-600">({filteredImages.length})</span></CardTitle>
          <CardDescription className="text-[11px] sm:text-xs text-green-600">يمكنك إخفاء صورة دون حذفها من Drive أو تنفيذ عمليات متعددة.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {images.length === 0 && !loading && <div className="text-xs text-red-300">لا توجد صور أو لم يتم التحميل.</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredImages.map(img => {
              const hidden = hiddenIds.includes(img.id);
              const selected = selectedIds.includes(img.id);
              return (
                <div key={img.id} draggable onDragStart={(e) => onDragStart(e, img.id)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, img.id)} className={`group relative rounded-lg border p-2 flex flex-col gap-2 text-[10px] bg-green-50 ${hidden ? 'opacity-40 border-yellow-400 bg-yellow-50' : 'border-green-200'} ${selected ? 'ring-2 ring-green-400' : ''} hover:shadow-md transition-shadow ${featuredId === img.id ? 'outline outline-2 outline-green-600' : ''}`}> 
                  <div className="aspect-video w-full flex items-center justify-center bg-white rounded-md overflow-hidden border border-green-100">
                    {img.url ? (
                      <img src={img.url} alt={img.name} className="object-contain max-h-full" onError={async (e) => { if (!apiKey) return; const dataUrl = await fetchDriveImageDataUrl(img.id, apiKey); let finalUrl = dataUrl; if (!finalUrl) { const blobUrl = await fetchDriveImageBlob(img.id, apiKey); finalUrl = blobUrl || undefined; } if (finalUrl) { setImages(prev => prev.map(it => it.id === img.id ? { ...it, url: finalUrl, sourceType: finalUrl.startsWith('blob:') ? 'blob' : 'data-url' } : it)); } else { (e.currentTarget as HTMLImageElement).alt = 'فشل التحميل'; } }} />
                    ) : (<span className="text-green-300">بدون رابط مباشر</span>)}
                  </div>
                  <div className="flex-1 break-all leading-relaxed">{img.name}</div>
                  <div className="flex gap-1 flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden py-0.5 pr-1">
                    <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" onClick={() => toggleHidden(img.id)} aria-label={hidden ? 'إظهار الصورة' : 'إخفاء الصورة'} className={`h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] ${hidden ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600' : 'bg-green-600 hover:bg-green-700 text-white border-green-600'}`}>{hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{hidden ? 'إظهار' : 'إخفاء'}</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">{hidden ? 'إظهار الصورة' : 'إخفاء الصورة'}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="sm" variant="destructive" disabled={deletingId === img.id} onClick={() => handleDelete(img.id)} aria-label="حذف الصورة" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-red-600 hover:bg-red-700 text-white border-red-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{deletingId === img.id ? 'جارٍ' : 'حذف'}</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">{deletingId === img.id ? 'جاري الحذف...' : 'حذف الصورة نهائياً'}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" onClick={() => setSelectedIds(prev => prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id])} aria-label={selected ? 'إلغاء التحديد' : 'تحديد الصورة'} className={`h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] ${selected ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' : 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600'}`}>{selected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{selected ? 'محدد' : 'تحديد'}</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">{selected ? 'إلغاء تحديد الصورة' : 'تحديد الصورة'}</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" onClick={() => beginRename(img)} aria-label="إعادة تسمية" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"><span className="text-xs">✏️</span><span className="hidden sm:inline">تعديل</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">تعديل اسم الصورة</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="sm" variant="outline" onClick={() => openPreview(img)} aria-label="معاينة الصورة" className="h-7 px-2 py-1 flex items-center gap-1 rounded-md text-[10px] bg-purple-600 hover:bg-purple-700 text-white border-purple-600"><ZoomIn className="h-3.5 w-3.5" /><span className="hidden sm:inline">عرض</span></Button></TooltipTrigger><TooltipContent side="top" className="text-[10px]">معاينة الصورة بالحجم الكامل</TooltipContent></Tooltip>
                  </div>
                  {renamingId === img.id && (
                    <div className="mt-1 flex flex-col gap-1 bg-white rounded p-2 border border-indigo-300">
                      <div className="flex items-center gap-1">
                        <Input
                          value={renameDraft}
                          onChange={(e) => { setRenameDraft(e.target.value); setRenameError(null); }}
                          placeholder="YYYYMM-RR"
                          className="h-7 text-[10px]"
                        />
                        <Button size="sm" variant="outline" onClick={() => confirmRename(img)} className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600">حفظ</Button>
                        <Button size="sm" variant="outline" onClick={cancelRename} className="h-7 text-[10px] bg-gray-500 hover:bg-gray-600 text-white border-gray-500">إلغاء</Button>
                      </div>
                      <div className="text-[9px] text-gray-600">صيغة مطلوبة: YYYYMM-RR مثال 202510-05 وسيتم الحفاظ على الامتداد الحالي.</div>
                      {renameError && <div className="text-[9px] text-red-600">{renameError}</div>}
                    </div>
                  )}
                  {hidden && <div className="absolute top-1 left-1 bg-yellow-500/80 text-yellow-50 text-[9px] px-1 rounded shadow">مخفي</div>}
                  <Tooltip><TooltipTrigger asChild><div onClick={() => toggleFeatured(img.id)} aria-label={featuredId === img.id ? 'إلغاء التمييز' : 'تمييز الصورة'} className={`absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] cursor-pointer transition shadow ${featuredId === img.id ? 'bg-green-600 text-white' : 'bg-gray-500/70 text-white hover:bg-yellow-600'}`}>{featuredId === img.id ? <Star className="h-3 w-3" /> : <StarOff className="h-3 w-3" />}<span className="hidden sm:inline">{featuredId === img.id ? 'مميزة' : 'تمييز'}</span></div></TooltipTrigger><TooltipContent side="top" className="text-[10px]">{featuredId === img.id ? 'إلغاء جعل الصورة مميزة' : 'جعل الصورة مميزة لتظهر أولاً'}</TooltipContent></Tooltip>
                  {showDebug && (
                    <div className="mt-1 space-y-1 bg-white/70 rounded p-1 border border-green-200 text-[9px] text-gray-700">
                      <div>المصدر: {img.sourceType || 'direct'}</div>
                      {typeof img.size === 'number' && <div>الحجم: {(img.size / 1024).toFixed(1)} KB</div>}
                      {img.debugTried && img.debugTried.length > 0 && (
                        <details><summary className="cursor-pointer">روابط مجربة ({img.debugTried.length})</summary><ul className="list-disc pr-4 break-all">{img.debugTried.map(u => <li key={u}>{u}</li>)}</ul></details>
                      )}
                      <div className="text-gray-500">سحب لإعادة الترتيب</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewImage}>
        <DialogContent dir="rtl" className="sm:max-w-[850px] w-full max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-green-300 p-0 overflow-hidden" aria-label="معاينة صورة الأوائل" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} hideClose>
          <button type="button" onClick={closePreview} aria-label="إغلاق" className="absolute top-2 left-2 z-20 inline-flex items-center justify-center rounded-full p-1.5 bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border border-white/30 transition-colors"><X className="h-5 w-5" /></button>
          <DialogHeader className="px-4 py-2 bg-gradient-to-r from-green-700 to-green-600 text-white shadow flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2 pr-0.5">
              <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-1 tracking-wide">
                <div className="flex items-center space-x-2"><span className="text-yellow-300 text-base">🔍</span><span className="font-medium">معاينة</span><span className="ml-1 px-2 py-1 from-green-300 to-green-600 rounded text-blue-700 font-semibold">( <span className="text-blue-900">{previewImage?.name || ''}</span> )</span></div>
              </DialogTitle>
              {typeof previewImage?.size === 'number' && (<span className="text-[9px] sm:text-[10px] bg-black/25 rounded px-1.5 py-0.5 font-mono">{(previewImage.size / 1024).toFixed(1)}KB</span>)}
            </div>
            <DialogDescription className="text-[10px] sm:text-[11px] text-green-100/90 leading-snug line-clamp-1 break-all"></DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-3 sm:p-5 bg-gradient-to-br from-green-50 via-green-100 to-green-50">
            {previewLoading && (<div className="flex flex-col items-center justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-2"></div><span className="text-xs text-green-700">جاري التحميل...</span></div>)}
            {!previewLoading && previewImage?.url && (<div className="w-full flex items-center justify-center"><img src={previewImage.url} alt={previewImage.name} className="max-h-[65vh] object-contain rounded-lg shadow-md border border-green-300 bg-white" /></div>)}
            {!previewLoading && previewImage && !previewImage.url && (<div className="text-center text-red-600 text-xs">لا يمكن عرض الصورة (لا يوجد رابط صالح)</div>)}
            {previewImage && (<div className="mt-3 space-y-1 text-[10px] sm:text-[11px] text-gray-600"><div>المعرف: <code className="break-all">{previewImage.id}</code></div><div>النوع: {previewImage.mimeType}</div>{typeof previewImage.size === 'number' && <div>الحجم: {(previewImage.size / 1024).toFixed(1)} KB</div>}<div>المصدر: {previewImage.sourceType || 'direct'}</div>{showDebug && previewImage.debugTried && previewImage.debugTried.length > 0 && (<details className="bg-white rounded border border-green-200 p-2"><summary className="cursor-pointer text-green-700">روابط مجربة ({previewImage.debugTried.length})</summary><ul className="list-disc pr-5 break-all space-y-1 mt-1">{previewImage.debugTried.map(u => <li key={u}>{u}</li>)}</ul></details>)}</div>)}
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog title={messageDialog.title} description={messageDialog.mode === 'error' ? 'حدث خطأ أثناء العملية' : messageDialog.mode === 'success' ? 'تمت العملية بنجاح' : ''} open={messageDialog.open} onOpenChange={(o) => { if (!o) closeMsg(); else setMessageDialog(m => ({ ...m, open: o })); }} onSave={closeMsg} saveButtonText={messageDialog.mode === 'error' ? 'إغلاق' : 'موافق'} hideCancelButton={true} mode={messageDialog.mode === 'error' ? 'edit' : 'add'} showSaveButton={true} maxWidth="380px" fullBleedBody={false} mobileFullWidth={false} mobileFlatStyle={true} mobileStickyHeader={false}>
        <div className="text-[12px] leading-relaxed break-words py-2 px-1">
          <p className={messageDialog.mode === 'error' ? 'text-red-600' : messageDialog.mode === 'success' ? 'text-green-700' : 'text-gray-700'}>{messageDialog.message}</p>
        </div>
      </FormDialog>
    </div>
  );
};

export default TopAchieversImagesManagement;
