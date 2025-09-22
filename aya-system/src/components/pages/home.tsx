import { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import quranHeroImage from "@/assets/quran-hero.jpg";
import image0 from "@/assets/0.jpg";
import image1 from "@/assets/1.jpg";
import image2 from "@/assets/2.jpg";
import image3 from "@/assets/3.jpg";
import image4 from "@/assets/4.jpg";
import image5 from "@/assets/5.jpg";
import { DashboardStatistics } from "@/components/pages/dashboard-statistics";
import { getLabels } from "@/lib/labels";

// مصفوفة الصور للبانر المتحرك
// Retrieve localized labels (Arabic default)
const { homeLabels } = getLabels('ar');

// Map slides images to labels
const bannerImages = homeLabels.banner.slides.map((slide, idx) => ({
  ...slide,
  src: [quranHeroImage, image0, image1, image2, image3, image4, image5][idx]
}));

type HomeProps = {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | 'parent' | null;
  currentUser: Profile | null;
  onLogout: () => void;
};

export const Home = ({ onNavigate, userRole, currentUser }: HomeProps) => {
  // إدارة حالة الصورة الحالية في البانر
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // تغيير الصورة تلقائيًا كل 5 ثوانٍ
  useEffect(() => {
    const intervalId = setInterval(() => {
      goToNextImage();
    }, 5000);

    // تنظيف interval عند إزالة المكون
    return () => clearInterval(intervalId);
  }, []);

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
      <img
        src={bannerImages[currentImageIndex].src}
        alt={bannerImages[currentImageIndex].title}
        className="w-full h-full object-contain transition-all duration-700 ease-in-out drop-shadow-xl"
      />

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
    <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
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
