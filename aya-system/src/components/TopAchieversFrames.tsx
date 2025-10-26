import { useEffect, useState } from 'react';
import { fetchDriveImagesWithStatus, resolvePublicImageUrls, getCachedDriveImages } from '@/lib/google-drive-image-service';

interface DriveLite { id: string; name: string; mimeType: string; url?: string; sourceType?: string; debugTried?: string[]; size?: number }

interface TopAchieversFramesProps {
  folderId?: string; // يمكن تمرير مجلد مختلف
  apiKey?: string;   // يمكن تمرير مفتاح مختلف
  count?: number;    // عدد الأوائل (افتراضي 3)
  onImageClick?: (img: DriveLite) => void;
  title?: string; // عنوان مخصص بدل الافتراضي
  showTitle?: boolean; // إخفاء العنوان داخلياً عند الحاجة
  variant?: 'default' | 'compact'; // تنسيق للاستخدام داخل Card بدون هوامش
  layout?: 'grid' | 'scroll'; // شكل العرض: شبكة أو تمرير أفقي
  onRefresh?: () => void; // يستدعى بعد التحديث
  autoRefreshInterval?: number; // فترة التحديث التلقائي بالمللي ثانية
  showCount?: boolean; // إخفاء عدد العناصر/المحمّل
  styleVariant?: 'classic' | 'subtle' | 'flat' | 'premium'; // أنماط إضافية للألوان
  showManageButton?: boolean; // إظهار زر إدارة الرفع
  manageLabel?: string; // نص زر الإدارة
  onManage?: () => void; // حدث زر الإدارة
  enable3D?: boolean; // تأثير ثلاثي الأبعاد للترتيب
  showTooltips?: boolean; // تفعيل تلميحات مخصصة
  frameHeight?: number; // ارتفاع الإطار (بيكسل) بدل القيم الافتراضية
  aspect?: 'square' | 'video' | 'portrait'; // التحكم بنسبة العرض إلى الارتفاع للصورة داخلياً
  showPattern?: boolean; // إظهار خلفية زخرفية خلف الصورة
  imageFit?: 'cover' | 'contain' | 'fill' | 'stretch'; // طريقة ملء الصورة للإطار
  showRefreshButton?: boolean; // التحكم في ظهور زر التحديث
  showDetails?: boolean; // إظهار تفاصيل (الأبعاد + الحجم)
  showRankTags?: boolean; // إظهار زينة/تاج للترتيب
  frameGlow?: boolean; // تفعيل توهج إضافي في النمط المميز
  showRankUnderline?: boolean; // إظهار خط سفلي ملوّن أسفل الصورة حسب المرتبة
  respectHidden?: boolean; // استثناء الصور المخفية (حسب سجلات الإدارة) من العرض
  preferredThumbnailSize?: number; // حجم مصغر مفضل لتقليل زمن التحميل (مثال 640)
  initialCacheFirst?: boolean; // محاولة عرض الصور من الكاش أولاً ثم التحديث الشبكي
}

/**
 * إطارات عرض أوائل المكتب (الأول / الثاني / الثالث) للاستخدام في الصفحة الرئيسية.
 * تعتمد على مجلد Drive عام يحتوي صور مميزة.
 */
export const TopAchieversFrames = ({
  folderId,
  apiKey,
  count = 3,
  onImageClick,
  title = '🏅 أوائل المكتب',
  showTitle = true,
  variant = 'default',
  layout = 'grid',
  onRefresh,
  autoRefreshInterval,
  showCount = true,
  styleVariant = 'classic',
  showManageButton = false,
  manageLabel = 'إدارة الرفع',
  onManage,
  enable3D = false,
  showTooltips = false,
  frameHeight,
  aspect = 'video',
  showPattern = false
  ,imageFit = 'cover'
  ,showRefreshButton = true
  ,showDetails = true
  ,showRankTags = true
  ,frameGlow = true
  ,showRankUnderline = true
  ,respectHidden = true
  ,preferredThumbnailSize = 640
  ,initialCacheFirst = true
}: TopAchieversFramesProps) => {
  const FALLBACK_FOLDER = '1MPlvec7-hntKRZWA8hkBfn8KSTyh7JZh';
  const driveFolder = folderId || (import.meta.env.VITE_GOOGLE_DRIVE_TOP_ACHIEVERS_FOLDER_ID as string) || FALLBACK_FOLDER;
  const googleApiKey = apiKey || (import.meta.env.VITE_GOOGLE_API_KEY as string | undefined);

  const [images, setImages] = useState<DriveLite[]>([]);
  const [dimensions, setDimensions] = useState<Record<string, { w: number; h: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0); // لفرض إعادة تحميل خارجي عند تغيير الخصائص لاحقاً
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // تحميل من الشبكة (forceRefresh يحدد إذا كنا نريد تجاهل الكاش المؤقت)
  const loadTop = async (forceRefresh: boolean) => {
    if (!googleApiKey || !driveFolder) return;
    setLoading(true); setError(null);
    try {
      const { images: list, error: err } = await fetchDriveImagesWithStatus(driveFolder, googleApiKey, { force: forceRefresh });
      if (err) setError(err);
      const resolved = await resolvePublicImageUrls(list, 5000, googleApiKey, { preferredThumbnailSize });
      let visible = resolved;
      if (respectHidden) {
        const hiddenNames: string[] = (() => { try { return JSON.parse(localStorage.getItem('topAchievers:hiddenNames') || '[]'); } catch { return []; } })();
        if (hiddenNames.length) visible = resolved.filter(d => !hiddenNames.includes(d.name));
      }
      setImages(visible.slice(0, count).map(d => ({ id: d.id, name: d.name, mimeType: d.mimeType, url: d.url, sourceType: d.sourceType, debugTried: d.debugTried, size: d.size })));
      if (onRefresh) onRefresh();
    } catch (e:any) {
      setError(e.message || 'فشل تحميل أوائل المكتب');
    } finally {
      setLoading(false);
    }
  };

  // المرحلة 1: محاولة التحميل من الكاش المحلي (localStorage) إن وجد
  useEffect(() => {
    if (!initialCacheFirst) return;
    if (!driveFolder) return;
    const cached = getCachedDriveImages(driveFolder);
    if (cached?.meta?.images?.length) {
      let list = cached.meta.images.map(i => ({
        id: i.id,
        name: i.name,
        mimeType: i.mimeType,
        url: cached.dataUrls[i.id],
        sourceType: 'cache' as const
      })).filter(d => !!d.url);
      if (respectHidden) {
        const hiddenNames: string[] = (() => { try { return JSON.parse(localStorage.getItem('topAchievers:hiddenNames') || '[]'); } catch { return []; } })();
        if (hiddenNames.length) list = list.filter(d => !hiddenNames.includes(d.name));
      }
      if (list.length) setImages(list.slice(0, count));
    }
  }, [initialCacheFirst, driveFolder, count, respectHidden]);

  // المرحلة 2: تحديث شبكي (إن لم يكن لدينا كاش أو للحصول على الأحدث)
  useEffect(() => { loadTop(!initialCacheFirst); }, [driveFolder, googleApiKey, count, refreshTick, initialCacheFirst]);
  // تحديث تلقائي
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval < 1000) return;
    const id = setInterval(() => { loadTop(true); }, autoRefreshInterval);
    return () => clearInterval(id);
  }, [autoRefreshInterval, driveFolder, googleApiKey, count]);

  const rankMeta = ['الأول','الثاني','الثالث'];

  const outerMarginClass = variant === 'compact' ? 'mt-0' : 'mt-4 sm:mt-6';
  const isScroll = layout === 'scroll';

  // أنماط ألوان عامة حسب styleVariant
  const styleBase = {
    classic: {
      first: 'from-yellow-400 via-amber-300 to-yellow-500 border-yellow-400 text-yellow-900',
      second: 'from-slate-50 via-slate-200 to-slate-300 border-slate-300 text-slate-800', // فضي أوضح وأفتح
      third: 'from-[#b87333] via-[#c07d3e] to-[#a95d20] border-[#b87333] text-amber-50', // برونزي أوضح بعيد عن الذهبي
      other: 'from-green-200 via-green-100 to-green-200 border-green-200 text-green-800'
    },
    subtle: {
      first: 'from-amber-200 via-amber-100 to-amber-200 border-amber-300 text-amber-800',
      second: 'from-[#f5f7fa] via-[#e2e6ea] to-[#cfd4dc] border-[#cfd4dc] text-[#4a5568]',
      third: 'from-[#d39c66] via-[#e0b07c] to-[#c88945] border-[#d39c66] text-[#5a3b16]',
      other: 'from-emerald-50 via-green-50 to-emerald-50 border-emerald-100 text-green-700'
    },
    flat: {
      first: 'bg-amber-400 border-amber-500 text-amber-950',
      second: 'bg-[#d1d5db] border-[#c4c9cf] text-[#2d3748]',
      third: 'bg-[#b87333] border-[#a46129] text-amber-50',
      other: 'bg-green-200 border-green-300 text-green-800'
    },
    premium: {
      first: 'from-yellow-300 via-amber-200 to-yellow-400 border-yellow-300 text-yellow-900',
      second: 'from-[#f2f4f7] via-[#d9dde2] to-[#bfc5cc] border-[#d1d6dc] text-[#2d3748]',
      third: 'from-[#c8863d] via-[#e0b074] to-[#b87333] border-[#c8863d] text-[#4d2e10]',
      other: 'from-emerald-200 via-green-100 to-emerald-200 border-emerald-200 text-green-800'
    }
  } as const;

  const variantStyles = styleBase[styleVariant];

  // دالة مساعدة لإخفاء امتداد الصورة (.jpg/.jpeg/.png) عند العرض
  const stripExtension = (fileName: string) => fileName.replace(/\.(jpg|jpeg|png)$/i, '');
  const formatSize = (bytes?: number) => {
    if (!bytes || !Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes}B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)}KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(mb < 10 ? 2 : 1)}MB`;
  };

  return (
    <div className={outerMarginClass}>
      {showTitle && (
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-xs sm:text-sm font-bold flex items-center gap-2 text-green-800">
            {title}
            {showCount && (
              <span className="text-[10px] font-normal text-green-600">{images.length}/{count}</span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {showManageButton && (
              <button
                onClick={onManage}
                className="text-[10px] sm:text-[11px] px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow"
              >⚙ {manageLabel}</button>
            )}
            {showRefreshButton && (
              <button
                onClick={() => loadTop(true)}
                disabled={loading}
                className="text-[10px] sm:text-[11px] px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white shadow disabled:opacity-40"
                aria-label="تحديث أوائل المكتب"
              >{loading ? '⏳' : '🔄 تحديث'}</button>
            )}
          </div>
        </div>
      )}
      {error && <div className="text-[10px] text-red-600 mb-2">خطأ: {error}</div>}
      {!loading && images.length === 0 && !error && (
        <div className="text-[10px] text-gray-500">لا توجد صور متاحة.</div>
      )}
      <div
        className={
          isScroll
            ? 'flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-300'
            : `grid gap-3 ${count <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`
        }
        dir="rtl"
      >
        {Array.from({ length: count }).map((_, idx) => {
          const img = images[idx];
          const rankLabel = rankMeta[idx] || `#${idx + 1}`;
          const rankStyles = (() => {
            if (styleVariant === 'flat') {
              return idx === 0 ? variantStyles.first : idx === 1 ? variantStyles.second : idx === 2 ? variantStyles.third : variantStyles.other;
            }
            return idx === 0 ? `bg-gradient-to-br ${variantStyles.first}` : idx === 1 ? `bg-gradient-to-br ${variantStyles.second}` : idx === 2 ? `bg-gradient-to-br ${variantStyles.third}` : `bg-gradient-to-br ${variantStyles.other}`;
          })();
          const badgeIcon = idx === 0 ? '👑' : (idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐');
          const isSkeleton = loading && !img; // عرض سكلتون أثناء التحميل
          const baseGlow = idx === 0
            ? '0 0 14px rgba(255,215,0,0.65), 0 0 4px rgba(255,215,0,0.9)'
            : idx === 1
              ? '0 0 14px rgba(205,210,215,0.70), 0 0 4px rgba(235,238,240,0.85)'
              : idx === 2
                ? '0 0 12px rgba(184,115,51,0.55), 0 0 3px rgba(184,115,51,0.7)'
                : '0 0 8px rgba(16,185,129,0.35)';
          const premiumExtra = idx === 0
            ? '0 0 25px rgba(255,215,0,0.55)'
            : idx === 1
              ? '0 0 24px rgba(210,215,220,0.55)'
              : idx === 2
                ? '0 0 22px rgba(184,115,51,0.45)'
                : '0 0 16px rgba(16,185,129,0.30)';
          const ringShadow = styleVariant === 'premium' && frameGlow ? `${baseGlow}, ${premiumExtra}` : baseGlow;
          const ringClass = showRankTags ? (idx === 0
            ? 'ring-4 ring-yellow-300'
            : idx === 1
              ? 'ring-4 ring-[#d1d5db]'
              : idx === 2
                ? 'ring-4 ring-[#b87333]'
                : 'ring-2 ring-emerald-200') : '';
          const underlineClass = isSkeleton
            ? 'bg-gray-300'
            : idx === 0
              ? 'bg-yellow-300'
              : idx === 1
                ? 'bg-[#d1d5db]'
                : idx === 2
                  ? 'bg-[#b87333]'
                  : 'bg-emerald-300';
          // تم إزالة تأثيرات التكبير لتثبيت الحجم
          return (
            <div
              key={idx}
              className={`relative rounded-xl p-2 ${rankStyles} shadow-md flex flex-col items-center gap-2 border overflow-hidden group ${isScroll ? 'min-w-[150px] sm:min-w-[170px]' : ''}`}
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(prev => prev === idx ? null : prev)}
            >
              {showRankTags && idx === 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce text-xl">👑</div>}
              {showRankTags && (
                <div className="absolute top-2 left-2 text-[9px] font-bold bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {badgeIcon} {rankLabel}
                </div>
              )}
              <div
                className={`relative w-full flex items-center justify-center rounded-lg bg-white/90 border border-white/50 overflow-hidden ${isSkeleton ? 'animate-pulse' : 'cursor-pointer'} ${ringClass}`}
                style={frameHeight ? { height: frameHeight } : undefined}
                onClick={() => img && onImageClick && onImageClick(img)}
                title={img ? stripExtension(img.name) : `بدون صورة ${rankLabel}`}
              >
                {showPattern && (
                  <div className="absolute inset-0 bg-[url('/patterns/islamic-pattern.svg')] opacity-[0.07] pointer-events-none" />
                )}
                {showRankTags && (
                  <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: ringShadow, borderRadius: '0.5rem' }} />
                )}
                {img ? (
                  <img
                    src={img.url}
                    alt={`${rankLabel} - ${stripExtension(img.name)}`}
                    className={
                      aspect === 'square'
                        ? `w-full h-full ${imageFit === 'stretch' ? 'object-fill' : imageFit === 'fill' ? 'object-fill' : imageFit === 'contain' ? 'object-contain' : 'object-cover'}`
                        : aspect === 'portrait'
                          ? `w-full h-full ${imageFit === 'stretch' ? 'object-fill' : imageFit === 'fill' ? 'object-fill' : imageFit === 'contain' ? 'object-contain' : 'object-cover'} object-center`
                          : `w-full h-full ${imageFit === 'stretch' ? 'object-fill' : imageFit === 'fill' ? 'object-fill' : imageFit === 'contain' ? 'object-contain' : 'object-cover'}`
                    }
                    style={imageFit === 'stretch' ? { objectFit: 'fill' } : undefined}
                    onLoad={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      if (img.id && (!dimensions[img.id] || dimensions[img.id].w !== el.naturalWidth)) {
                        setDimensions(prev => ({ ...prev, [img.id]: { w: el.naturalWidth, h: el.naturalHeight } }));
                      }
                    }}
                  />
                ) : (
                  <span className="text-[9px] text-gray-600 z-10">{isSkeleton ? '' : 'لا صورة'}</span>
                )}
              </div>
              {showRankUnderline && (
                <div className={`w-full h-1 rounded-full ${underlineClass}`} aria-hidden="true" />
              )}
              {img && (
                <div
                  className="text-[9px] sm:text-[10px] font-medium w-full truncate text-center"
                  title={rankLabel}
                >
                  {rankLabel}
                </div>
              )}
              {img && showDetails && (
                <div className="text-[8px] sm:text-[9px] text-center w-full opacity-80 flex items-center justify-center gap-1">
                  {(() => {
                    const dim = dimensions[img.id];
                    const dimText = dim ? `${dim.w}x${dim.h}` : '...';
                    const sizeText = formatSize(img.size);
                    return <span>{dimText}{sizeText ? ` • ${sizeText}` : ''}</span>;
                  })()}
                </div>
              )}
              {showTooltips && hoverIndex === idx && img && (
                <div className="absolute bottom-1 right-1 left-1 text-[9px] leading-snug bg-black/60 text-white px-2 py-1 rounded-md backdrop-blur-sm animate-fadeIn">
                  <div className="font-semibold">{rankLabel}</div>
                  {showDetails && (
                    <div className="opacity-80">
                      {(() => {
                        const dim = dimensions[img.id];
                        const dimText = dim ? `${dim.w}x${dim.h}` : 'أبعاد غير معروفة';
                        const sizeText = formatSize(img.size);
                        return `${dimText}${sizeText ? ' • ' + sizeText : ''}`;
                      })()}
                    </div>
                  )}
                  {img.sourceType && <div className="opacity-80">نوع المصدر: {img.sourceType}</div>}
                  {img.debugTried && img.debugTried.length > 0 && (
                    <div className="opacity-60">محاولات: {img.debugTried.length}</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopAchieversFrames;
