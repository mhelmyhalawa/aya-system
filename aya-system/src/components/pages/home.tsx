import { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import logoFallback from "@/assets/logo.png";
import { fetchDriveImageBlob, fetchDriveImageDataUrl, getCachedDriveImages } from "@/lib/google-drive-image-service";
import { fetchDriveImagesWithStatus, resolvePublicImageUrls } from "@/lib/google-drive-image-service";
import { DashboardStatistics } from "@/components/pages/dashboard-statistics";
import { getLabels } from "@/lib/labels";

// مصفوفة الصور للبانر المتحرك
// Retrieve localized labels (Arabic default)
const { homeLabels } = getLabels('ar');

// إعداد صور افتراضية محلية كـ fallback في حال فشل جلب الصور من Google Drive
// إنشاء مصفوفة صور افتراضية بطول الشرائح كلها تستخدم شعار النظام كصورة مؤقتة
const fallbackImages = Array.from({ length: homeLabels.banner.slides.length }, () => logoFallback);

// نوع بيانات الشرائح في البانر (موسع لدعم المصدر والمحاولات)
type BannerSlide = {
  title: string;
  subtitle: string;
  src: string;
  id?: string;
  sourceType?: 'direct' | 'blob' | 'cache' | 'fallback';
  tried?: string[];
};

// للخلفية الأساسية المعتمدة على النصوص المعرفة في labels
const fallbackBannerImages: BannerSlide[] = homeLabels.banner.slides.map((slide, idx) => ({
  title: slide.title,
  subtitle: slide.subtitle || '',
  src: fallbackImages[idx],
  sourceType: 'fallback',
  id: `fallback-${idx}`
}));

// قراءة متغيرات البيئة (يجب إضافتها في ملف .env باسمين: VITE_GOOGLE_DRIVE_FOLDER_ID, VITE_GOOGLE_API_KEY)
const DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID as string | undefined;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

// تسجيل القيم في الـ Console للمساعدة في التشخيص
if (typeof window !== 'undefined') {
  console.log('[DriveBanner] VITE_GOOGLE_DRIVE_FOLDER_ID =', DRIVE_FOLDER_ID);
  console.log('[DriveBanner] VITE_GOOGLE_API_KEY present =', !!GOOGLE_API_KEY);
  if (!DRIVE_FOLDER_ID || !GOOGLE_API_KEY) {
    console.warn('[DriveBanner] البيئة ناقصة: تأكد من وجود ملف .env يحتوي على القيم المطلوبة ثم أعد تشغيل dev server');
  }
}

type HomeProps = {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | 'parent' | null;
  currentUser: Profile | null;
  onLogout: () => void;
};

export const Home = ({ onNavigate, userRole, currentUser }: HomeProps) => {
  // الصور المعروضة (تبدأ بالافتراضية ثم تُستبدل إن وُجدت صور من Google Drive)
  const [bannerImages, setBannerImages] = useState<BannerSlide[]>(fallbackBannerImages);
  // إدارة حالة الصورة الحالية في البانر
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // حالة تحميل الصور من Google Drive
  const [loadingDriveImages, setLoadingDriveImages] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [imageDiagnostics, setImageDiagnostics] = useState<Record<number, { loaded?: boolean; error?: boolean; w?: number; h?: number; blobTried?: boolean }>>({});
  // تخزين روابط الكائن (Object URLs) لتنظيفها لاحقًا
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});

  // تحويل نوع المستخدم إلى النوع المتوافق مع مكون الإحصائيات
  const mappedUserRole = userRole === 'parent' ? null : userRole;

  // وظيفة للانتقال إلى الصورة التالية
  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === bannerImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  // وظيفة للانتقال إلى الصورة السابقة
  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? bannerImages.length - 1 : prevIndex - 1
    );
  };

  // المرحلة 1: تحميل من الكاش (إن وجد) مباشرة بدون انتظار الشبكة
  useEffect(() => {
    if (DRIVE_FOLDER_ID) {
      const cached = getCachedDriveImages(DRIVE_FOLDER_ID);
      if (cached?.meta?.images?.length && Object.keys(cached.dataUrls).length) {
        const hiddenIds: string[] = (() => { try { return JSON.parse(localStorage.getItem('drive_banner_hidden_ids')||'[]'); } catch { return []; } })();
        const slides: BannerSlide[] = cached.meta.images
          .filter(i => cached.dataUrls[i.id])
          .filter(i => !hiddenIds.includes(i.id))
          .map((img, idx) => ({
            title: img.name,
            subtitle: homeLabels.banner.slides[idx]?.subtitle || '',
            src: cached.dataUrls[img.id],
            id: img.id,
            sourceType: 'cache'
          }));
        if (slides.length) {
          setBannerImages(slides);
          setCurrentImageIndex(0);
          console.log('[DriveBanner] Loaded cached images:', slides.length);
        }
      }
    }
  }, []);

  // المرحلة 2: طلب الشبكة للتحديث وضمان حداثة الصور
  useEffect(() => {
    if (DRIVE_FOLDER_ID && GOOGLE_API_KEY) {
      setLoadingDriveImages(true);
      fetchDriveImagesWithStatus(DRIVE_FOLDER_ID, GOOGLE_API_KEY, { force: true })
        .then(async ({ images, error, status, rawCount }) => {
          if (images.length) {
            const resolved = await resolvePublicImageUrls(images);
            const hiddenIds: string[] = (() => { try { return JSON.parse(localStorage.getItem('drive_banner_hidden_ids')||'[]'); } catch { return []; } })();
            const dynamicSlides: BannerSlide[] = resolved.map((img, idx) => ({
              title: img.name,
              subtitle: homeLabels.banner.slides[idx]?.subtitle || '',
              src: img.url,
              id: img.id,
              sourceType: img.sourceType || 'direct',
              tried: img.debugTried
            })).filter(slide => !hiddenIds.includes(slide.id || ''));
            setBannerImages(dynamicSlides);
            setCurrentImageIndex(0);
            setDriveError(null);
            console.log('[DriveBanner] Loaded', images.length, 'images (network fresh).');
          } else if (error) {
            const extended = status ? `${error} (Status: ${status}${rawCount !== undefined ? ", Files: " + rawCount : ''})` : error;
            setDriveError(extended);
          }
        })
        .catch(err => {
          console.error('Failed to load Drive banner images', err);
          setDriveError('فشل الاتصال بـ Google Drive');
        })
        .finally(() => setLoadingDriveImages(false));
    }
  }, []);

  // زر تحديث الصور من Google Drive يدويًا
  const refreshDriveImages = () => {
    if (!DRIVE_FOLDER_ID || !GOOGLE_API_KEY) {
      setDriveError('بيانات الربط (Folder / API Key) غير متوفرة');
      return;
    }
    setLoadingDriveImages(true);
    setDriveError(null);
    fetchDriveImagesWithStatus(DRIVE_FOLDER_ID, GOOGLE_API_KEY, { force: true })
      .then(async ({ images, error, status, rawCount }) => {
        if (images.length) {
          const resolved = await resolvePublicImageUrls(images);
          const hiddenIds: string[] = (() => { try { return JSON.parse(localStorage.getItem('drive_banner_hidden_ids')||'[]'); } catch { return []; } })();
          const dynamicSlides: BannerSlide[] = resolved.map((img, idx) => ({
            title: img.name,
            subtitle: homeLabels.banner.slides[idx]?.subtitle || '',
            src: img.url,
            id: img.id,
            sourceType: img.sourceType || 'direct',
            tried: img.debugTried
          })).filter(slide => !hiddenIds.includes(slide.id || ''));
          setBannerImages(dynamicSlides);
          setCurrentImageIndex(0);
          console.log('[DriveBanner] Refreshed images count:', images.length);
        } else if (error) {
          const extended = status ? `${error} (Status: ${status}${rawCount !== undefined ? ", Files: " + rawCount : ''})` : error;
          setDriveError(extended);
        }
      })
      .catch(err => {
        console.error('Refresh failed', err);
        setDriveError('فشل تحديث الصور من Google Drive');
      })
      .finally(() => setLoadingDriveImages(false));
  };

  // تغيير الصورة تلقائيًا كل 5 ثوانٍ
  useEffect(() => {
    const intervalId = setInterval(() => {
      goToNextImage();
    }, 5000);

    // تنظيف interval عند إزالة المكون
    return () => clearInterval(intervalId);
  }, []);

  // تنظيف روابط الـ Blob عند التفكيك أو إعادة الإنشاء
  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach(url => {
        try { URL.revokeObjectURL(url); } catch (_) {}
      });
    };
  }, [blobUrls]);

  // تحديد الأزرار التي يجب عرضها بناءً على دور المستخدم
  const renderRoleBasedActions = () => {
    if (!userRole) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          {/* زر تسجيل الدخول */}
          <Button
            onClick={() => onNavigate('/login')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>🔑</span> تسجيل الدخول
          </Button>

          {/* زر استعلام أولياء الأمور */}
          <Button
            onClick={() => onNavigate('/parent-inquiry')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>👨‍👩‍👧‍👦</span> استعلام أولياء الأمور
          </Button>
        </div>


      );
    }

    // أزرار للمعلمين
    if (userRole === 'teacher') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <Button
            onClick={() => onNavigate('/students')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>👦</span>  إدارة الطلاب
          </Button>
          <Button
            onClick={() => onNavigate('/study-circles')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
           <span>📚</span>  حلقاتي الدراسية
          </Button>
        </div>
      );
    }

    // أزرار للمسؤولين
    if (userRole === 'admin' || userRole === 'superadmin') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <Button
            onClick={() => onNavigate('/students-list')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>👦</span>  قائمة الطلاب
          </Button>

          <Button
            onClick={() => onNavigate('/guardians-list')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>👨‍👩‍👧‍👦</span>   قائمة أولياء الأمور
          </Button>

          <Button
            onClick={() => onNavigate('/study-circles')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>📚</span>  إدارة الحلقات الدراسية
          </Button>

          {/* زر استعلام أولياء الأمور */}
          <Button
            onClick={() => onNavigate('/parent-inquiry')}
            className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
          <span>👨‍👩‍👧‍👦</span> استعلام أولياء الأمور
          </Button>
          
          {userRole === 'superadmin' && (
            <Button
              onClick={() => onNavigate('/database-management')}
              className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
            >
            <span>🗄️</span>  إدارة قاعدة البيانات
            </Button>
          )}

          {userRole === 'superadmin' && (
            <Button
              onClick={() => onNavigate('/user-management')}
              className="h-8 sm:h-9 px-3 rounded-full text-sm sm:text-base font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
            >
            <span>👤</span>  إدارة المستخدمين
            </Button>
          )}
        </div>

      );
    }

    // أزرار لأولياء الأمور
    if (userRole === 'parent') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <Button
            onClick={() => onNavigate('/parent-inquiry')}
            className="h-10 sm:h-12 text-base sm:text-lg px-4 rounded-full font-bold border border-green-500 text-green-600 bg-white hover:bg-green-600 hover:text-white transition-colors duration-300"
          >
            <span>👦</span>  عرض معلومات الطالب
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
  <div className="w-full max-w-[1600px] mx-auto px-4 py-4 sm:py-6">
      <div className="max-w-4xl mx-auto">
{/* بانر صور متغيرة - لمسة إسلامية معاصرة */}
<div className="mb-6 sm:mb-8 flex justify-center font-arabic">
  <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg sm:shadow-2xl relative 
                  border-2 border-green-600 bg-gradient-to-tr from-green-950/90 via-green-800/80 to-emerald-700/70">

    {/* خلفية زخرفة هندسية شفافة */}
    <div className="absolute inset-0 bg-[url('/patterns/islamic-pattern.svg')] opacity-10 pointer-events-none" />

    {/* صورة البانر */}
    <div className="relative h-48 sm:h-64 md:h-80 flex items-center justify-center">
      {(() => {
        const length = bannerImages.length;
        const safeIndex = length === 0 ? 0 : Math.min(currentImageIndex, length - 1);
        const slide: BannerSlide = length === 0
          ? { src: logoFallback, title: 'لا توجد صور', subtitle: '', sourceType: 'direct' }
          : bannerImages[safeIndex];
        return (
          <img
            src={slide.src}
            alt={slide.title}
            className="w-full h-full object-contain transition-all duration-700 ease-in-out drop-shadow-xl"
            onLoad={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              setImageDiagnostics(prev => ({ ...prev, [safeIndex]: { ...(prev[safeIndex]||{}), loaded: true, w: el.naturalWidth, h: el.naturalHeight } }));
              console.log('[DriveBanner] Image loaded:', { index: safeIndex, src: el.src, size: el.naturalWidth + 'x' + el.naturalHeight });
            }}
            onError={async (e) => {
              console.warn('[DriveBanner] فشل تحميل الصورة، محاولة جلب dataURL/Blob:', slide.src);
              setImageDiagnostics(prev => ({ ...prev, [safeIndex]: { ...(prev[safeIndex]||{}), error: true } }));
              if (slide.id && GOOGLE_API_KEY) {
                // نحاول أولاً dataURL (مفيد للكاش الدائم) وإن كان كبيراً سيعود blob:
                const dataUrl = await fetchDriveImageDataUrl(slide.id, GOOGLE_API_KEY);
                if (dataUrl) {
                  (e.currentTarget as HTMLImageElement).src = dataUrl;
                  const type = dataUrl.startsWith('blob:') ? 'blob' : 'cache';
                  if (type === 'blob') setBlobUrls(prev => ({ ...prev, [safeIndex]: dataUrl }));
                  setBannerImages(prev => prev.map((s, i) => i === safeIndex ? { ...s, src: dataUrl, sourceType: type } : s));
                  return;
                }
                // محاولة أخيرة Blob مباشر (قد يكون فشل بسبب الحجم)
                if (slide.sourceType !== 'blob' && !imageDiagnostics[safeIndex]?.blobTried) {
                  setImageDiagnostics(prev => ({ ...prev, [safeIndex]: { ...(prev[safeIndex]||{}), blobTried: true } }));
                  const blobUrl = await fetchDriveImageBlob(slide.id, GOOGLE_API_KEY);
                  if (blobUrl) {
                    (e.currentTarget as HTMLImageElement).src = blobUrl;
                    setBlobUrls(prev => ({ ...prev, [safeIndex]: blobUrl }));
                    setBannerImages(prev => prev.map((s, i) => i === safeIndex ? { ...s, src: blobUrl, sourceType: 'blob' } : s));
                    return;
                  }
                }
              }
              // fallback النهائي للشعار
              (e.currentTarget as HTMLImageElement).src = logoFallback;
              setBannerImages(prev => prev.map((s, i) => i === safeIndex ? { ...s, src: logoFallback, sourceType: 'fallback' } : s));
            }}
          />
        );
      })()}

      {loadingDriveImages && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-900/30 backdrop-blur-sm text-white text-sm">
          جاري تحميل الصور...
        </div>
      )}

      {!loadingDriveImages && (!DRIVE_FOLDER_ID || !GOOGLE_API_KEY) && (
        <div className="absolute top-2 left-2 right-2 text-center text-[11px] sm:text-xs bg-red-900/50 text-red-200 border border-red-700/40 rounded-md py-1 px-2 shadow-md">
          إعداد الربط غير مكتمل: أضف القيم VITE_GOOGLE_DRIVE_FOLDER_ID و VITE_GOOGLE_API_KEY في ملف <code>.env</code> ثم أعد التشغيل.
        </div>
      )}

      {/* طبقة تدرج لتعزيز وضوح الكتابة */}
      <div className="absolute inset-0 bg-gradient-to-t from-green-950/70 via-green-800/20 to-transparent" />


    </div>

    {/* أزرار التنقل بشكل زخرفة دائرية */}
    <button
      onClick={goToPrevImage}
      className="absolute left-4 top-1/2 -translate-y-1/2 bg-green-700/80 border border-green-400/50 
                 text-white p-4 rounded-full backdrop-blur-md hover:bg-green-600 shadow-xl 
                 transition-all transform hover:scale-110"
  aria-label={homeLabels.banner.previous}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" 
           viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <button
      onClick={goToNextImage}
      className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-700/80 border border-green-400/50 
                 text-white p-4 rounded-full backdrop-blur-md hover:bg-green-600 shadow-xl 
                 transition-all transform hover:scale-110"
  aria-label={homeLabels.banner.next}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" 
           viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>

    {/* مؤشرات الصور بدوائر وزخرفة */}
    <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-3">
      <div className="flex justify-center gap-3">
        {bannerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`h-4 w-4 rounded-full border-2 transition-all duration-300 shadow-md
                        ${index === currentImageIndex 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-400 scale-125 border-yellow-300' 
                          : 'bg-white/30 hover:bg-white/80 border-green-200'
                        }`}
            aria-label={homeLabels.banner.gotoImage(index + 1)}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={refreshDriveImages}
          className="px-3 py-1 rounded-full text-xs font-bold bg-green-700/80 hover:bg-green-600 text-white border border-green-400/50 shadow-md transition-colors disabled:opacity-50"
          aria-label="تحديث صور البانر"
          disabled={loadingDriveImages}
        >
          {loadingDriveImages ? 'جاري التحديث...' : '🔄 تحديث الصور'}
        </button>
        <span className="text-[10px] sm:text-xs text-green-200 bg-green-900/40 px-2 py-1 rounded-md border border-green-700/40" title="عدد الصور المحملة من Google Drive">
          {bannerImages.length} صور
        </span>
        <button
          onClick={() => setShowDebug(d => !d)}
          className="px-2 py-1 rounded-full text-[10px] font-semibold bg-yellow-600/80 hover:bg-yellow-500 text-white border border-yellow-300/40 shadow transition-colors"
        >{showDebug ? 'إخفاء معلومات' : 'إظهار معلومات'}</button>
        {driveError && (
          <span className="text-[10px] sm:text-xs text-red-300 bg-red-900/40 px-2 py-1 rounded-md border border-red-600/40 max-w-[220px] truncate" title={driveError}>
            {driveError}
          </span>
        )}
      </div>
      {showDebug && (
        <div className="mt-2 max-h-40 overflow-auto w-full px-3 py-2 bg-black/70 text-[10px] text-white rounded-lg border border-white/10 space-y-1 leading-snug">
          {bannerImages.map((b, i) => {
            const diag = imageDiagnostics[i];
            return (
              <div key={i} className={i === currentImageIndex ? 'text-emerald-300 font-semibold' : ''}>
                #{i+1}: {b.title} [{b.sourceType || 'n/a'}]{b.tried && b.tried.length ? ` (محاولات:${b.tried.length})` : ''}
                {b.sourceType === 'blob' && <span className="ml-1 px-1 rounded bg-blue-800/40 text-blue-200">BLOB</span>}
                {diag?.blobTried && b.sourceType !== 'blob' && <span className="ml-1 px-1 rounded bg-purple-800/40 text-purple-200">BlobAttempt</span>}
                <div className="break-all opacity-80">{b.src}</div>
                {diag?.loaded && !diag?.error && (
                  <span className="ml-1 text-green-300">✔ {diag?.w}x{diag?.h}</span>
                )}
                {diag?.error && (
                  <span className="ml-1 text-red-300">✖ فشل التحميل</span>
                )}
              </div>
            );
          })}
          {bannerImages.length === 0 && (
            <div className="text-red-300">لا توجد صور بعد التحميل - تحقق من صلاحيات المشاركة.</div>
          )}
        </div>
      )}
    </div>
  </div>
</div>





        <Card className="mb-4 sm:mb-6">
          <CardHeader className="text-center pb-3 sm:pb-4">
            <CardTitle className="text-sm font-bold tracking-wide">
              {homeLabels.welcomeHeading}
            </CardTitle>
            {currentUser && (
              <CardDescription className="text-sm mt-1 sm:mt-2">
                {currentUser.full_name} - {userRole ? homeLabels.roles[userRole] : ''}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-2 sm:pt-3">
            <p className="text-sm mb-3 sm:mb-4">
              {homeLabels.description}
            </p>
            {renderRoleBasedActions()}
          </CardContent>
        </Card>

        {/* إضافة قسم الإحصائيات للمستخدمين المسجلين (ما عدا أولياء الأمور) */}
        {userRole && userRole !== 'parent' && (
          <Card className="mb-4 sm:mb-6 border-islamic-green/30 shadow-md">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-sm font-bold text-islamic-green">{homeLabels.stats.title}</CardTitle>
              <CardDescription className="text-sm">
                {homeLabels.stats.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-3">
              <DashboardStatistics userRole={mappedUserRole} userId={currentUser?.id} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="text-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">{homeLabels.sections.forTeachers}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm">
                {homeLabels.sections.teachersFeatures.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </CardContent>
          </Card>

          <Card className="text-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">{homeLabels.sections.forParents}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm">
                {homeLabels.sections.parentsFeatures.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
