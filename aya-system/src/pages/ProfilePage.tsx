import { Profile } from "@/types/profile";

interface ProfilePageProps {
  onNavigate: (path: string) => void;
  currentUser: Profile | null;
}

export function ProfilePage({ onNavigate, currentUser }: ProfilePageProps) {
  return (
    <div dir="rtl">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">بياناتي الشخصية</h1>
        {currentUser ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <ProfileForm currentUser={currentUser} />
          </div>
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
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, MapPin, Clock, Users, Calendar, CalendarDays, AlertCircle } from "lucide-react";
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
  const [circleSchedules, setCircleSchedules] = useState<{[key: string]: StudyCircleSchedule[]}>({});
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [formData, setFormData] = useState({
    full_name: currentUser.full_name,
    username: currentUser.username,
    password: "",
    confirmPassword: ""
  });

  // تحميل حلقات المستخدم إذا كان معلم أو مشرف
  useEffect(() => {
    const loadUserCircles = async () => {
      if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        setLoadingCircles(true);
        try {
          const circles = await getStudyCirclesByTeacherId(currentUser.id);
          setUserCircles(circles);
          
          // تحميل جداول كل حلقة
          const schedulesMap: {[key: string]: StudyCircleSchedule[]} = {};
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">معلومات المستخدم</h2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>تعديل</Button>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(false)}>إلغاء</Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={!isEditing}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <Input
                id="role"
                value={
                  currentUser.role === 'superadmin' ? 'مسؤول رئيسي' :
                  currentUser.role === 'admin' ? 'مسؤول' :
                  currentUser.role === 'teacher' ? 'معلم' : 'غير معروف'
                }
                disabled
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_login">آخر تسجيل دخول</Label>
              <Input
                id="last_login"
                value={
                  (() => {
                    try {
                      // تحقق من وجود وصحة last_login_at 
                      if (!currentUser.last_login_at || 
                          currentUser.last_login_at === "null" || 
                          currentUser.last_login_at === "undefined" ||
                          currentUser.last_login_at === null || 
                          currentUser.last_login_at === undefined) {
                        return 'غير متوفر';
                      }
                      
                      // تحويل النص إلى كائن Date
                      const date = new Date(currentUser.last_login_at);
                      
                      // التحقق من صحة التاريخ
                      if (isNaN(date.getTime())) {
                        console.error('تاريخ غير صالح:', currentUser.last_login_at);
                        return 'غير متوفر';
                      }
                      
                      // تنسيق التاريخ بالعربية
                      return date.toLocaleString('ar-SA');
                    } catch (e) {
                      console.error('خطأ في معالجة التاريخ:', e, 'القيمة:', currentUser.last_login_at);
                      return 'غير متوفر';
                    }
                  })()
                }
                disabled
              />
            </div>
          </div>

          {isEditing && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-4">تغيير كلمة المرور</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور الجديدة</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                  <p className="text-sm text-muted-foreground">اترك هذا الحقل فارغًا إذا كنت لا تريد تغيير كلمة المرور</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        )}
      </form>

      {/* عرض حلقات المستخدم إذا كان معلم أو مشرف */}
      {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
        <Card className="mt-8 border-islamic-green/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-islamic-green">
              <BookOpen className="h-5 w-5" />
              حلقاتي الدراسية
            </CardTitle>
            <CardDescription>
              الحلقات الدراسية التي أشرف عليها أو أدرّس فيها
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCircles ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green"></div>
                  <span className="text-sm text-muted-foreground">جاري تحميل الحلقات...</span>
                </div>
              </div>
            ) : userCircles.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-islamic-green/5 rounded-lg mb-6">
                  <Badge variant="outline" className="text-islamic-green border-islamic-green/40">
                    {userCircles.length} حلقة
                  </Badge>
                  <span className="text-sm text-muted-foreground">إجمالي الحلقات</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userCircles.map((circle) => (
                    <Card key={circle.id} className="overflow-hidden border-islamic-green/20 transition-all hover:shadow-md">
                      <CardHeader className="bg-islamic-green/5 pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2 text-islamic-green text-xs">
                            <BookOpen className="h-5 w-5" />
                            {circle.name}
                          </CardTitle>

                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Users className="h-3 w-3" />
                            {circle.max_students 
                              ? `الحد: ${circle.max_students} طالب` 
                              : '0 طالب'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-islamic-green" />
                            <h4 className="text-sm font-medium">مواعيد الحلقة</h4>
                          </div>
                          
                          {circleSchedules[circle.id]?.length > 0 ? (
                            <div className="space-y-2 mt-2">
                              {circleSchedules[circle.id].map((schedule) => (
                                <div key={schedule.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-islamic-green">
                                      {getWeekdayName(schedule.weekday)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-sm">
                                      <Clock className="h-3 w-3 text-blue-500" />
                                      <span>{formatTime(schedule.start_time)}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">إلى</span>
                                    <div className="flex items-center gap-1 text-sm">
                                      <Clock className="h-3 w-3 text-red-500" />
                                      <span>{formatTime(schedule.end_time)}</span>
                                    </div>
                                  </div>
                                  {schedule.location && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      <span>{schedule.location}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center bg-muted/20 py-3 rounded-md">
                              <div className="flex flex-col items-center gap-1 text-center">
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">لا توجد مواعيد محددة لهذه الحلقة</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد حلقات</h3>
                <p className="text-muted-foreground text-center">
                  لم يتم تسجيل أي حلقات باسمك بعد
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
