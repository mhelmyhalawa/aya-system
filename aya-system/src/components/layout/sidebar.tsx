import { UserCog, UserCircle, UsersRound, Menu, X, LogOut, Search, ChevronDown, ChevronUp, School, Users, Settings, Database, BookOpen, GraduationCap, BookText, UserPlus, User, Calendar, BookMarked, ClipboardList, BookOpenCheck, FileHeart, FileText, Mail, Inbox, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { signOut } from "@/lib/auth-service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type UserRole = 'superadmin' | 'admin' | 'teacher' | 'parent' | 'guardian' | null;

interface SidebarProps {
  userRole?: UserRole | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ userRole, onNavigate, onLogout, isOpen: externalIsOpen, setIsOpen: externalSetIsOpen }: SidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  // أضفنا جميع المفاتيح المحتملة لضمان عمل الفتح/الإغلاق فوراً
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    circleManagement: false,
    studentManagement: false,
    notificationsManagement: false,
    teacherSettings: false,
    systemManagement: false,
  });
  
  // حالة جديدة للتحكم في القوائم المنسدلة في وضع Popover
  const [openPopoverMenus, setOpenPopoverMenus] = useState<{ [key: string]: boolean }>({});
  
  // وظيفة لتبديل حالة Popover
  const togglePopoverMenu = (key: string) => {
    setOpenPopoverMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // استخدام الحالة الخارجية إذا كانت موجودة، وإلا استخدام الحالة الداخلية
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalSetIsOpen || setInternalIsOpen;

  // التحقق من صلاحيات المستخدم لعرض عناصر القائمة
  const canViewUserManagement = userRole === 'superadmin' || userRole === 'admin';
  const canViewGuardians = userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher';
  const canViewStudents = userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher';
  const canViewStudyCircles = userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher';

  const menuItems = [

    // 1️⃣ إدارة الحلقات
    (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') && {
      icon: <BookMarked className="h-5 w-5" />,
      label: "إدارة الحلقات",
      isSubmenu: true,
      key: "circleManagement",
      subItems: [
        (userRole === 'superadmin' || userRole === 'admin') && {
          icon: <BookOpen className="h-5 w-5" />,
          label: "بيانات الحلقات",
          path: "/study-circles"
        },
        (userRole === 'superadmin' || userRole === 'admin') && {
          icon: <Calendar className="h-5 w-5" />,
          label: "جدولة الحلقات",
          path: "/study-circle-schedules"
        },
        (userRole === 'superadmin' || userRole === 'admin') && {
          icon: <ClipboardList className="h-5 w-5" />,
          label: "تسجيل الجلسات",
          path: "/teacher-sessions"
        },
        {
          icon: <Users className="h-5 w-5" />,
          label: "سجل الحضور",
          path: "/attendance-record"
        },
      ].filter(Boolean)
    },

    // 2️⃣ إدارة الطلاب وأولياء الأمور
    (canViewGuardians || canViewStudents) && {
      icon: <School className="h-5 w-5" />,
      label: "إدارة الطلاب",
      isSubmenu: true,
      key: "studentManagement",
      subItems: [
        canViewGuardians && {
          icon: <UserCircle className="h-5 w-5" />,
          label: "بيانات أولياء الأمور",
          path: "/guardians-list"
        },
        canViewStudents && {
          icon: <UsersRound className="h-5 w-5" />,
          label: "بيانات الطلاب",
          path: "/students-list"
        },
      ].filter(Boolean)
    },

        // ✅ القائمة الموحدة لتقييم ومتابعة الطلاب
    (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') && {
      icon: <Award className="h-5 w-5" />,
      label: "تقييم الطلاب",
      isSubmenu: true,
      key: "evaluationManagement",
      subItems: [
        {
          icon: <Users className="h-5 w-5" />,
          label: "سجل الحضور",
          path: "/attendance-record"
        },
        {
          icon: <BookOpenCheck className="h-5 w-5" />,
          label: "سجل الحفظ والمراجعة",
          path: "/memorization-records"
        },
        {
          icon: <Award className="h-5 w-5" />,
          label: "الاختبارات والتقييمات",
          path: "/student-assessments"
        },
      ]
    },


    // 3️⃣ استعلام ولي الأمر
    {
      icon: <Search className="h-5 w-5" />,
      label: "استعلام ولي أمر",
      path: "/parent-inquiry"
    },

    // 4️⃣ الإشعارات والرسائل
    (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') && {
      icon: <FileText className="h-5 w-5" />,
      label: "الإشعارات والرسائل",
      isSubmenu: true,
      key: "notificationsManagement",
      subItems: [
        {
          icon: <Mail className="h-5 w-5" />,
          label: "إرسال إشعار",
          path: "/send-notification"
        },
        {
          icon: <Inbox className="h-5 w-5" />,
          label: "سجل الإشعارات",
          path: "/notifications-log"
        }
      ]
    },

    // 5️⃣ إعدادات المعلم (للمعلم فقط)
    userRole === 'teacher' && {
      icon: <Settings className="h-5 w-5" />,
      label: "إعدادات المعلم",
      isSubmenu: true,
      key: "teacherSettings",
      subItems: [
        {
          icon: <UserCog className="h-5 w-5" />,
          label: "بياناتي الشخصية",
          path: "/profile"
        }
      ]
    },

    // 6️⃣ إعدادات النظام (للمشرفين والمديرين)
    (userRole === 'superadmin' || userRole === 'admin') && {
      icon: <Settings className="h-5 w-5" />,
      label: "إعدادات النظام",
      isSubmenu: true,
      key: "systemManagement",
      subItems: [
        {
          icon: <Users className="h-5 w-5" />,
          label: "بيانات المستخدمين",
          path: "/user-management"
        }
      ]
    }

  ].filter(Boolean);

  if (menuItems.length === 0) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

  {isOpen ? (
        // الحالة الكاملة
        <div className="w-64 h-[calc(100vh-64px)] z-50 relative">
          <div className="flex flex-col h-full backdrop-blur-lg bg-black/50 border-l border-green-700/30 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between p-4 border-b border-green-400/30 bg-gradient-to-l from-green-900/80 via-green-800/60 to-transparent">
              <h2 className="text-lg font-bold text-green-100 tracking-wide">القائمة الرئيسية</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 transition-all">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-transparent">
              {menuItems.map((item: any, index) => (
                <div key={index} className="group">
                  {item.isSubmenu ? (
                    <div className="space-y-1">
                      <Button
                        variant="ghost"
                        className="w-full justify-between gap-3 text-right text-green-100 hover:bg-green-700/50 hover:text-white transition-all duration-200 rounded-lg px-2 py-1"
                        onClick={() => setExpandedMenus(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {expandedMenus[item.key] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {expandedMenus[item.key] && (
                        <div className="pr-4 space-y-1 border-r-2 border-green-400/40 mr-2 animate-in slide-in-from-right-2">
                          {item.subItems.map((subItem: any, subIndex: number) => (
                            <Button
                              key={subIndex}
                              variant="ghost"
                              className="w-full justify-start gap-3 text-right text-green-200 hover:bg-green-700/50 hover:text-white transition-all duration-200 rounded-md px-2 py-1"
                              onClick={() => { onNavigate(subItem.path); setIsOpen(false); }}
                            >
                              {subItem.icon}
                              <span>{subItem.label}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-right text-green-100 hover:bg-green-700/50 hover:text-white transition-all duration-200 rounded-md px-2 py-1"
                      onClick={() => { onNavigate(item.path); setIsOpen(false); }}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-green-400/30 bg-gradient-to-t from-green-900/80 via-green-800/60 to-transparent">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-right text-red-300 hover:bg-red-700/40 hover:text-red-200 transition-all duration-200 rounded-md px-2 py-1"
                onClick={async () => {
                  if (onLogout) {
                    await signOut();
                    onLogout();
                  }
                  setIsOpen(false);
                }}
              >
                <LogOut className="h-5 w-5" />
                <span>تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // الحالة المصغرة
        <div className="hidden md:block w-16 h-[calc(100vh-64px)] z-40 relative">
          <div className="flex h-full flex-col py-4 backdrop-blur-md bg-gradient-to-b from-green-900 to-green-800 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="text-white/80 transition-all duration-200 hover:scale-110 hover:bg-white/10 hover:text-white"
                title="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 flex flex-col items-center space-y-4 py-4">
              {menuItems.map((item: any, index) => (
                <div key={index}>
                  {item.isSubmenu ? (
                    <Popover open={openPopoverMenus[item.key]} onOpenChange={(open) => setOpenPopoverMenus(prev => ({ ...prev, [item.key]: open }))}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={item.label}
                          className="text-white/70 transition-all duration-300 transform hover:scale-110 hover:bg-gradient-to-br hover:from-green-700/20 hover:to-green-900/30 hover:text-white shadow-sm hover:shadow-green-500/40 rounded-lg"
                          onClick={() => togglePopoverMenu(item.key)}
                        >
                          {item.icon}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="min-w-[220px] border border-green-800/50 bg-green-900/90 p-3 text-white shadow-2xl backdrop-blur-md rounded-xl z-50"
                        side="left"
                        align="start"
                        sideOffset={20}
                        forceMount
                      >
                        <div className="flex flex-col space-y-2 bg-gradient-to-b from-green-800/80 to-green-900/90 p-2 rounded-xl shadow-inner shadow-green-900/50">
                          <div className="text-center mb-2 pb-2 rounded-md font-semibold text-white bg-gradient-to-br from-green-600 to-green-500 shadow-lg shadow-green-800/50 border border-green-700/50">
                            {item.label}
                          </div>
                          <div className="flex flex-col space-y-1 p-2 rounded-lg border border-green-600/50 bg-green-800/80">
                            {item.subItems.map((subItem: any, subIndex: number) => (
                              <Button
                                key={subIndex}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-right text-green-200 transition-all duration-300 hover:bg-green-700 hover:text-white rounded-md shadow-sm hover:shadow-md hover:shadow-green-500/40"
                                onClick={() => onNavigate(subItem.path)}
                              >
                                <div className="flex w-full items-center gap-2">
                                  <div className="flex-shrink-0">{subItem.icon}</div>
                                  <span className="flex-1 text-right">{subItem.label}</span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={item.label}
                      className="text-white/70 transition-all duration-300 transform hover:scale-110 hover:bg-gradient-to-br hover:from-green-700/20 hover:to-green-900/30 hover:text-white shadow-sm hover:shadow-green-500/40 rounded-lg"
                      onClick={() => onNavigate(item.path)}
                    >
                      {item.icon}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                title="تسجيل الخروج"
                className="text-red-500 transition-all duration-200 hover:scale-110 hover:bg-red-900/20 hover:text-red-400"
                onClick={async () => {
                  if (onLogout) {
                    await signOut();
                    onLogout();
                  }
                }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
