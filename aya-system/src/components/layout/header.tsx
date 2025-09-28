import { Home, UserPlus, LogOut, UserCheck, Search, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImage from "@/assets/logo.png";
import { Profile } from "@/types/profile";
import { Sidebar } from "./sidebar";
import { signOut } from "@/lib/auth-service";
import { useState } from "react";

// أضف تعريف UserRole
type UserRole = 'superadmin' | 'admin' | 'teacher' | 'parent' | 'guardian' | null;

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  userRole?: UserRole | null;
  currentUser?: Profile | null;
  onLogout?: () => void;
  onSidebarToggle?: () => void;
}

export function Header({ currentPath, onNavigate, userRole, currentUser, onLogout, onSidebarToggle }: HeaderProps) {
  // ترجمة نوع المستخدم إلى العربية
  const getRoleInArabic = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return 'مدير';
      case 'admin':
        return 'مشرف';
      case 'teacher':
        return 'معلم';
      case 'guardian':
        return 'ولي أمر';
      default:
        return 'مستخدم';
    }
  };

  return (
    <>
      <header className="bg-gradient-to-r from-green-950 via-green-900 to-green-950 border-b border-green-800/60 shadow-xl backdrop-blur-md text-white fixed top-0 right-0 left-0 z-50 h-16 md:h-16">
        <div className="container mx-auto px-2 sm:px-4 h-full flex justify-between items-center">

          {/* 1. الشعار والعنوان */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="p-1 bg-gradient-to-br from-green-50 via-white to-green-100 rounded-full border border-green-300/60 shadow-xl cursor-pointer hover:scale-110 hover:shadow-2xl hover:ring-10 hover:ring-green-400/60 transition-all duration-300"
              onClick={() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                if (userRole && isMobile && onSidebarToggle) {
                  onSidebarToggle();
                } else {
                  onNavigate("/");
                }
              }}
              title={(() => {
                const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                if (userRole && isMobile) return "فتح القائمة الجانبية";
                return "الصفحة الرئيسية";
              })()}
            >
              <img
                src={logoImage}
                alt="شعار مكتب آية"
                className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 object-contain drop-shadow-md"
              />
            </div>
            <div className="text-right">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold leading-tight text-green-100 drop-shadow-sm">
                مكتب آية
              </h1>
              <p className="text-xs sm:text-sm text-green-300/80 hidden sm:block">
                نظام إدارة تحفيظ القرآن الكريم
              </p>
            </div>
          </div>

          {/* 2. معلومات المستخدم */}
          {userRole && currentUser && (
            <div className="hidden md:flex items-center gap-2 bg-green-800/30 border border-green-700/40 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl cursor-pointer hover:bg-green-700/50 hover:border-green-600/60 transition-all duration-300 shadow-md"
              onClick={() => onNavigate("/profile")}
              title="عرض وتعديل بياناتي الشخصية"
            >
              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-300" />
              <span className="text-xs sm:text-sm text-green-100">
                مرحباً <span className="font-semibold">{currentUser.full_name}</span>
                {" | "}
                <span className="text-green-300/80">
                  {getRoleInArabic(userRole)}
                </span>
              </span>
            </div>
          )}

          {/* 3. الأزرار والأيقونات */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">

            {/* أيقونة الملف الشخصي للجوال */}
            {userRole && currentUser && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate("/profile")}
                className="md:hidden text-green-100 hover:bg-green-800/50 rounded-xl transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9"
                title="الملف الشخصي"
                aria-label="الملف الشخصي"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}

            {/* أزرار التنقل */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate("/")}
                className="text-green-100 hover:bg-green-800/50 rounded-xl transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9"
                title="الصفحة الرئيسية"
              >
                <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate("/parent-inquiry")}
                className="text-green-100 hover:bg-green-800/50 rounded-xl transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9"
                title="استعلام أولياء الأمور"
              >
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {!userRole ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate("/login")}
                  className="text-green-100 hover:bg-green-800/50 rounded-xl transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9"
                  title="تسجيل الدخول"
                >
                  <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (onLogout) {
                      await signOut();
                      onLogout();
                    }
                  }}
                  className="text-red-300 hover:bg-red-800/40 hover:text-red-200 rounded-xl transition-all duration-300 h-8 w-8 sm:h-9 sm:w-9"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
            </div>
          </div>

        </div>
      </header>

    </>
  );
}
