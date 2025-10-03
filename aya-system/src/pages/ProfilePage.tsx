import { Profile } from "@/types/profile";

interface ProfilePageProps {
  onNavigate: (path: string) => void;
  currentUser: Profile | null;
}

export function ProfilePage({ onNavigate, currentUser }: ProfilePageProps) {
  return (
    <div dir="rtl">
      {currentUser ? (
        <ProfileForm currentUser={currentUser} />
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>لم يتم تسجيل الدخول. يرجى تسجيل الدخول لعرض بياناتك الشخصية.</p>
          <button
            onClick={() => onNavigate('/login')}
            className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            تسجيل الدخول
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, MapPin, Clock, Users, Calendar, CalendarDays, AlertCircle, User2Icon, User as UserIcon, AtSign, Shield, LogIn as LoginIcon, Lock, CheckSquare, Pencil, X, Save } from "lucide-react";
import { GenericTable, Column } from '@/components/ui/generic-table';
import * as profileService from "@/lib/profile-service";
import { getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getStudyCircleSchedules } from "@/lib/study-circle-schedule-service";
import { ProfileUpdate } from "@/types/profile";
import { StudyCircle } from "@/types/study-circle";
import { StudyCircleSchedule, getWeekdayName, formatTime } from "@/types/study-circle-schedule";

interface ProfileFormProps {
  currentUser: Profile;
}

function ProfileForm({ currentUser }: ProfileFormProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userCircles, setUserCircles] = useState<StudyCircle[]>([]);
  const [circleSchedules, setCircleSchedules] = useState<{ [key: string]: StudyCircleSchedule[] }>({});
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [formData, setFormData] = useState({
    full_name: currentUser.full_name,
    username: currentUser.username,
    password: "",
    confirmPassword: ""
  });
  // For cancel/dirty check
  const initialFormRef = useRef({
    full_name: currentUser.full_name,
    username: currentUser.username,
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // تحميل حلقات المستخدم إذا كان معلم أو مشرف
  useEffect(() => {
    const loadUserCircles = async () => {
      if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        setLoadingCircles(true);
        try {
          const circles = await getStudyCirclesByTeacherId(currentUser.id);
          setUserCircles(circles);

          // تحميل جداول كل حلقة
          const schedulesMap: { [key: string]: StudyCircleSchedule[] } = {};
          for (const circle of circles) {
            const schedules = await getStudyCircleSchedules(circle.id);
            schedulesMap[circle.id] = schedules;
          }
          setCircleSchedules(schedulesMap);

        } catch (error) {
          console.error('Error loading user circles:', error);
        } finally {
          setLoadingCircles(false);
        }
      }
    };

    loadUserCircles();
  }, [currentUser.id, currentUser.role]);

  // Track initial values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      initialFormRef.current = {
        full_name: formData.full_name,
        username: formData.username,
      };
    }
  }, [isEditing]);

  const isDirty = isEditing && (
    formData.full_name !== initialFormRef.current.full_name ||
    formData.username !== initialFormRef.current.username ||
    formData.password !== "" ||
    formData.confirmPassword !== ""
  );

  const passwordMismatch = isEditing && (formData.password || formData.confirmPassword) && formData.password !== formData.confirmPassword;

  const handleCancelEdit = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    setIsEditing(false);
    setFormData((prev) => ({
      ...prev,
      full_name: currentUser.full_name,
      username: currentUser.username,
      password: "",
      confirmPassword: "",
    }));
  };

  const handleDismissCancel = () => setShowCancelConfirm(false);

  // Show saved indicator for 2 seconds after save
  useEffect(() => {
    if (showSaved) {
      const t = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showSaved]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // التحقق من تطابق كلمات المرور
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ في كلمة المرور",
        description: "كلمتا المرور غير متطابقتين. يرجى التحقق من الإدخال.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // إعداد بيانات التحديث
      const updateData: ProfileUpdate = {
        id: currentUser.id,
        full_name: formData.full_name,
        username: formData.username
      };

      // إضافة كلمة المرور فقط إذا تم إدخالها
      if (formData.password) {
        updateData.password = formData.password;
      }

      // تحديث الملف الشخصي
      const result = await profileService.updateProfile(updateData);

      if (result.success) {
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث بياناتك الشخصية بنجاح.",
        });
        setShowSaved(true);
        // تحديث البيانات في localStorage
        const updatedUser = {
          ...currentUser,
          full_name: formData.full_name,
          username: formData.username
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        // إيقاف وضع التحرير
        setIsEditing(false);
      } else {
        toast({
          title: "خطأ في التحديث",
          description: result.message || "حدث خطأ أثناء تحديث البيانات. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في تحديث الملف الشخصي:", error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء تحديث البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // دالة تنسيق آخر تسجيل دخول (مستقرة عبر useMemo)
  const lastLoginFormatted = useMemo(() => {
    try {
      const raw = currentUser.last_login_at;
      if (!raw || raw === 'null' || raw === 'undefined') return 'غير متوفر';
      const date = new Date(raw);
      if (isNaN(date.getTime())) return 'غير متوفر';
      return date.toLocaleString('ar-SA');
    } catch { return 'غير متوفر'; }
  }, [currentUser.last_login_at]);

  // تعريف أعمدة جدول مواعيد الحلقات
  const scheduleColumns: Column<StudyCircleSchedule>[] = [
    {
      key: 'weekday',
      header: 'اليوم',
      align: 'center',
      render: (s) => (
        <Badge variant="outline" className="text-islamic-green">
          {getWeekdayName(s.weekday)}
        </Badge>
      )
    },
    {
      key: 'start_time',
      header: 'البداية',
      align: 'center',
      render: (s) => (
        <div className="flex items-center gap-1 justify-center text-sm">
          <Clock className="h-3 w-3 text-blue-500" />
          <span>{formatTime(s.start_time)}</span>
        </div>
      )
    },
    {
      key: 'end_time',
      header: 'النهاية',
      align: 'center',
      render: (s) => (
        <div className="flex items-center gap-1 justify-center text-sm">
          <Clock className="h-3 w-3 text-red-500" />
          <span>{formatTime(s.end_time)}</span>
        </div>
      )
    },
    {
      key: 'location',
      header: 'الموقع',
      align: 'center',
      render: (s) => s.location ? (
        <div className="flex items-center gap-1 justify-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{s.location}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">—</span>
      )
    }
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0 rounded-2xl">
        {/* الهيدر */}
        <CardHeader className="pb-1 sm:pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col">
            <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
              <User2Icon className="h-5 w-5 text-yellow-300" />
              بياناتي الشخصية
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
              عرض وتحديث بياناتك الشخصية
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-1 pb-3 px-2 sm:px-2">
          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 px-3 sm:px-4 py-4 sm:py-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs sm:text-sm">الاسم الكامل</Label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      className={`pr-9 h-10 text-sm sm:text-base transition-colors ${isEditing ? 'bg-white/90 border-green-300 focus-visible:ring-islamic-green shadow-sm' : 'bg-muted/40'} `}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs sm:text-sm">اسم المستخدم</Label>
                  <div className="relative">
                    <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      className={`pr-9 h-10 text-sm sm:text-base transition-colors ${isEditing ? 'bg-white/90 border-green-300 focus-visible:ring-islamic-green shadow-sm' : 'bg-muted/40'} `}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs sm:text-sm">الدور</Label>
                  <div className="relative">
                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="role"
                      value={
                        currentUser.role === 'superadmin' ? 'مسؤول رئيسي' :
                          currentUser.role === 'admin' ? 'مسؤول' :
                            currentUser.role === 'teacher' ? 'معلم' : 'غير معروف'
                      }
                      disabled
                      className="bg-muted/40 pr-9 h-10 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2 xl:col-span-1 md:col-span-2">
                  <Label htmlFor="last_login" className="text-xs sm:text-sm">آخر تسجيل دخول</Label>
                  <div className="relative">
                    <LoginIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="last_login"
                      value={lastLoginFormatted}
                      disabled
                      className="bg-muted/40 pr-9 h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="h-px bg-gradient-to-l from-transparent via-green-300/40 dark:via-green-700/40 to-transparent my-3" />

              {isEditing && (
                <>
                  <div className="h-px bg-gradient-to-l from-transparent via-yellow-400/40 dark:via-yellow-600/40 to-transparent my-4" />
                  <div className="mt-4 sm:mt-6">
                    <button
                      type="button"
                      onClick={() => setShowPasswordSection(v => !v)}
                      className="group w-full flex items-center justify-between rounded-lg border border-yellow-300/50 dark:border-yellow-400/30 bg-yellow-50/60 dark:bg-yellow-950/10 px-4 py-3 text-right transition hover:bg-yellow-100/70 dark:hover:bg-yellow-900/30"
                    >
                      <span className="flex items-center gap-2 text-sm sm:text-base font-medium text-yellow-800 dark:text-yellow-100">
                        <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-300" />
                        تغيير كلمة المرور (اختياري)
                        {(formData.password || formData.confirmPassword) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 border border-yellow-400/40">مدخل جزئياً</span>
                        )}
                      </span>
                      <span className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                        {showPasswordSection ? 'إخفاء' : 'إظهار'}
                        <svg className={`h-4 w-4 transition-transform ${showPasswordSection ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </span>
                    </button>
                    <div className={`grid transition-all duration-300 ease-out overflow-hidden ${showPasswordSection ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <div className="rounded-xl border border-yellow-300/40 dark:border-yellow-400/30 bg-yellow-50/70 dark:bg-yellow-950/20 p-4 sm:p-5 shadow-inner">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-xs sm:text-sm">كلمة المرور الجديدة</Label>
                              <div className="relative">
                                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  id="password"
                                  name="password"
                                  type="password"
                                  value={formData.password}
                                  onChange={handleChange}
                                  autoComplete="new-password"
                                  placeholder="••••••••"
                                  className={`pr-9 transition-colors ${isEditing ? 'bg-white/90 border-green-300 focus-visible:ring-islamic-green shadow-sm' : 'bg-muted/40'} ${passwordMismatch && formData.password ? 'border-red-400 focus-visible:ring-red-500' : ''}`}
                                />
                              </div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">اتركه فارغًا إذا لا ترغب في التغيير. يُفضل كلمة قوية.</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">تأكيد كلمة المرور</Label>
                              <div className="relative">
                                <CheckSquare className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  id="confirmPassword"
                                  name="confirmPassword"
                                  type="password"
                                  value={formData.confirmPassword}
                                  onChange={handleChange}
                                  autoComplete="new-password"
                                  placeholder="••••••••"
                                  className={`pr-9 transition-colors ${isEditing ? 'bg-white/90 border-green-300 focus-visible:ring-islamic-green shadow-sm' : 'bg-muted/40'} ${passwordMismatch && formData.confirmPassword ? 'border-red-400 focus-visible:ring-red-500' : ''}`}
                                />
                              </div>
                              {passwordMismatch && formData.confirmPassword && (
                                <div className="flex items-start gap-1 text-[11px] sm:text-xs text-red-600 dark:text-red-400 mt-1 animate-in fade-in">
                                  <svg className="h-3.5 w-3.5 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  <span>كلمتا المرور غير متطابقتين</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Cancel confirmation dialog */}
            {showCancelConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 max-w-xs w-full flex flex-col items-center gap-4">
                  <div className="text-lg font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                    <X className="h-5 w-5" />
                    تجاهل التعديلات؟
                  </div>
                  <div className="text-sm text-muted-foreground text-center">هناك تغييرات لم تحفظ بعد. هل تريد بالتأكيد إلغاء التعديل؟</div>
                  <div className="flex gap-3 mt-2">
                    <Button variant="outline" onClick={handleDismissCancel}>متابعة التعديل</Button>
                    <Button variant="destructive" onClick={handleConfirmCancel}>إلغاء التعديل</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Saved indicator (kept outside new footer for overlay) */}
            {showSaved && (
              <div className="fixed bottom-20 right-0 left-0 z-50 flex justify-center pointer-events-none">
                <div className="bg-green-600 text-white rounded-full px-5 py-2 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-6">
                  <Save className="h-4 w-4" />
                  تم الحفظ بنجاح
                </div>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-end pt-2 sm:pt-3 pb-3 gap-3 border-t border-green-200/60 dark:border-green-700/40 bg-gradient-to-l from-green-50/60 to-white dark:from-green-900/10 dark:to-transparent rounded-b-2xl flex-wrap">
          {isEditing ? (
            <div className="flex w-full sm:w-auto justify-center sm:justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto min-w-[110px] flex items-center gap-2"
                aria-label="إلغاء"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">إلغاء</span>
              </Button>
              <Button
                type="submit"
                form="profile-form"
                disabled={isLoading || !isDirty}
                className="w-full sm:w-auto min-w-[140px] font-semibold flex items-center gap-2"
                aria-label="حفظ"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{isLoading ? "جارٍ الحفظ..." : isDirty ? "حفظ التغييرات" : "لا تغييرات"}</span>
                <span className="sm:hidden">{isLoading ? "جاري..." : isDirty ? "حفظ" : "—"}</span>
              </Button>
            </div>
          ) : (
            <div className="flex w-full sm:w-auto justify-center sm:justify-end">
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto min-w-[140px] flex items-center gap-2"
                aria-label="تعديل"
                title="تعديل البيانات"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">تعديل البيانات</span>
                <span className="sm:hidden">تعديل</span>
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* عرض حلقات المستخدم: عنوان فقط ثم المحتوى */}
      {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
        <section className="mt-2">
          <div className="relative mb-2">
            <div className="absolute inset-0 bg-gradient-to-l from-green-200/40 via-green-100/30 to-transparent dark:from-green-900/40 dark:via-green-800/30 rounded-xl blur-sm" />
            <div className="relative flex flex-wrap items-center justify-between gap-4 rounded-xl border border-green-300/60 dark:border-green-700/50 bg-white/70 dark:bg-green-950/30 backdrop-blur-sm px-4 sm:px-6 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-inner ring-2 ring-white/40 dark:ring-green-900/40">
                  <BookOpen className="h-5 w-5 text-yellow-200" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-green-800 dark:text-green-100 flex items-center gap-2">
                    حلقاتي الدراسية
                    {userCircles.length > 0 && (
                      <span className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-green-600/15 text-green-700 dark:text-green-200 border border-green-400/30">{userCircles.length} حلقة</span>
                    )}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-green-700/80 dark:text-green-300/70">عرض الحلقات التي تشرف عليها أو تدرّس فيها</p>
                </div>
              </div>
              {userCircles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] sm:text-xs px-2 py-1 border-green-400/40 text-green-700 dark:text-green-200 bg-green-50/60 dark:bg-green-900/30">
                    إجمالي: {userCircles.length}
                  </Badge>
                </div>
              )}
              <div className="absolute -bottom-px right-4 left-4 h-px bg-gradient-to-l from-transparent via-green-400/60 to-transparent" />
            </div>
          </div>
          {loadingCircles ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green" />
                <span className="text-sm text-muted-foreground">جاري التحميل...</span>
              </div>
            </div>
          ) : userCircles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-2">لا توجد حلقات</h3>
              <p className="text-muted-foreground text-center text-sm">لم يتم تسجيل أي حلقات باسمك بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {userCircles.map(circle => (
                <Card key={circle.id} className="overflow-hidden border-green-200 dark:border-green-800/50 hover:shadow-md transition-all">
                  <CardHeader className="bg-gradient-to-l from-green-50 to-green-100/60 dark:from-green-900/30 dark:to-green-900/10 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-green-800 dark:text-green-200">
                        <BookOpen className="h-4 w-4 text-green-600" />
                        <span className="truncate max-w-[140px] sm:max-w-[180px]">{circle.name}</span>
                      </CardTitle>
                      <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs whitespace-nowrap">
                        <Users className="h-3 w-3" />
                        {circle.max_students ? `${circle.max_students} طالب` : '0'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <CalendarDays className="h-4 w-4" />
                        <h4 className="text-xs sm:text-sm font-medium">المواعيد</h4>
                      </div>
                      <GenericTable
                        data={(circleSchedules[circle.id] || []) as StudyCircleSchedule[]}
                        columns={scheduleColumns}
                        className="overflow-hidden rounded-lg text-xs sm:text-sm border border-green-300 dark:border-green-700 shadow-sm w-full"
                        defaultView="table"
                        hideSortToggle={false}
                        enablePagination={true}
                        defaultPageSize={3}
                        pageSizeOptions={[3, 6, 12, 24, 50]}
                        getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50/40 dark:bg-green-900/20' : 'bg-white dark:bg-gray-900'} hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors`}
                        emptyMessage="لا توجد مواعيد محددة لهذه الحلقة"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
