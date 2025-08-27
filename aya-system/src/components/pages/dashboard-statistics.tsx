import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, AlertCircle, UserCircle, UserCheck, School, ClipboardCheck, Clock, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { UserRole } from "@/types/profile";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface DashboardStatisticsProps {
  userRole?: UserRole | null;
  userId?: string | null;
}

interface StatisticsData {
  // إحصائيات عامة
  totalCircles: number;
  totalStudents: number;
  totalTeachers: number;
  todayAbsences: number;
  
  // إحصائيات المشرف
  supervisorCircles?: number;
  supervisorStudents?: number;
  supervisorTeachers?: number;
  
  // إحصائيات المعلم
  teacherCircles?: number;
  teacherStudents?: number;
  teacherAbsences?: number;
  
  // معلومات إضافية
  recentMemorizations?: any[];
  recentAssessments?: any[];
  teacherNotes?: any[];
  
  // معلومات الحلقات للزوار
  availableCircles?: any[];
  sessionSchedules?: any[];
}

export function DashboardStatistics({ userRole, userId }: DashboardStatisticsProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatisticsData>({
    totalCircles: 0,
    totalStudents: 0,
    totalTeachers: 0,
    todayAbsences: 0,
    supervisorCircles: 0,
    supervisorStudents: 0,
    supervisorTeachers: 0,
    teacherCircles: 0,
    teacherStudents: 0,
    teacherAbsences: 0,
    recentMemorizations: [],
    recentAssessments: [],
    teacherNotes: [],
    availableCircles: [],
    sessionSchedules: []
  });

  // تحويل تاريخ اليوم إلى صيغة الـ ISO لاستخدامه في الاستعلامات
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd"); // "2025-08-24"

  useEffect(() => {
    async function fetchStatistics() {
      setLoading(true);
      setError(null);

      try {
        let newStats: StatisticsData = {
          totalCircles: 0,
          totalStudents: 0,
          totalTeachers: 0,
          todayAbsences: 0
        };

        try {
          // 1. إحصائيات عامة (للجميع)
          const generalStats = await fetchGeneralStatistics();
          newStats = { ...newStats, ...generalStats };
        } catch (error) {
          console.error("خطأ في جلب الإحصائيات العامة:", error);
        }

        // 2. إحصائيات خاصة (بناءً على دور المستخدم)
        if (userId) {
          try {
            if (userRole === "superadmin") {
              const adminStats = await fetchSuperAdminStatistics();
              newStats = { ...newStats, ...adminStats };
            } else if (userRole === "admin") {
              const supervisorStats = await fetchSupervisorStatistics(userId);
              newStats = { ...newStats, ...supervisorStats };
            } else if (userRole === "teacher") {
              const teacherStats = await fetchTeacherStatistics(userId);
              newStats = { ...newStats, ...teacherStats };
            }
          } catch (error) {
            console.error("خطأ في جلب الإحصائيات الخاصة بالمستخدم:", error);
          }
        } else {
          // للزوار (أولياء الأمور من خارج النظام)
          try {
            const visitorStats = await fetchVisitorStatistics();
            newStats = { ...newStats, ...visitorStats };
          } catch (error) {
            console.error("خطأ في جلب إحصائيات الزوار:", error);
          }
        }

        // تحديث الإحصائيات
        setStats(newStats);
      } catch (err) {
        console.error("خطأ في جلب الإحصائيات:", err);
        setError("حدث خطأ أثناء جلب الإحصائيات. الرجاء المحاولة مرة أخرى.");
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, [userId, userRole, todayStr]);

  // جلب الإحصائيات العامة
  const fetchGeneralStatistics = async (): Promise<Partial<StatisticsData>> => {
    const stats: Partial<StatisticsData> = {
      totalCircles: 0,
      totalStudents: 0,
      totalTeachers: 0,
      todayAbsences: 0
    };

    try {
      // جلب عدد الحلقات
      const { count: circlesCount, error: circlesError } = await supabase
        .from("study_circles")
        .select("*", { count: "exact", head: true });
      
      if (!circlesError) {
        stats.totalCircles = circlesCount || 0;
      } else {
        console.error("خطأ في جلب عدد الحلقات:", circlesError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد الحلقات:", error);
    }
    
    try {
      // جلب عدد الطلاب
      const { count: studentsCount, error: studentsError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      
      if (!studentsError) {
        stats.totalStudents = studentsCount || 0;
      } else {
        console.error("خطأ في جلب عدد الطلاب:", studentsError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد الطلاب:", error);
    }
    
    try {
      // جلب عدد المعلمين
      const { count: teachersCount, error: teachersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher");
      
      if (!teachersError) {
        stats.totalTeachers = teachersCount || 0;
      } else {
        console.error("خطأ في جلب عدد المعلمين:", teachersError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد المعلمين:", error);
    }
    
    try {
      // جلب عدد الغياب اليوم
      const { count: absencesCount, error: absencesError } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("status", "absent")
        .gte("date", `${todayStr}T00:00:00`)
        .lt("date", `${todayStr}T23:59:59`);
      
      if (!absencesError) {
        stats.todayAbsences = absencesCount || 0;
      } else {
        console.error("خطأ في جلب عدد الغياب:", absencesError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد الغياب:", error);
    }

    return stats;
  };

  // جلب إحصائيات مدير النظام
  const fetchSuperAdminStatistics = async (): Promise<Partial<StatisticsData>> => {
    const stats: Partial<StatisticsData> = {};
    
    // يمكن هنا إضافة إحصائيات إضافية للمدير مثل:
    // - توزيع الطلاب حسب المراحل
    // - نسب الحضور والغياب
    // - إجمالي المشرفين
    
    return stats;
  };

  // جلب إحصائيات المشرف
  const fetchSupervisorStatistics = async (userId: string): Promise<Partial<StatisticsData>> => {
    const stats: Partial<StatisticsData> = {
      supervisorCircles: 0,
      supervisorStudents: 0,
      supervisorTeachers: 0
    };
    
    try {
      // عدد الحلقات تحت إشراف المشرف
      // (نفترض أن هناك علاقة بين المشرف والحلقات في قاعدة البيانات)
      const { count: supervisorCirclesCount, error: supervisorCirclesError } = await supabase
        .from("study_circles")
        .select("*", { count: "exact", head: true })
        .eq("supervisor_id", userId);
      
      if (!supervisorCirclesError) {
        stats.supervisorCircles = supervisorCirclesCount || 0;
      } else {
        console.error("خطأ في جلب عدد حلقات المشرف:", supervisorCirclesError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد حلقات المشرف:", error);
    }
    
    try {
      // عدد المعلمين تحت إشراف المشرف
      // (نفترض أن هناك علاقة بين المشرف والمعلمين في قاعدة البيانات)
      const { count: supervisorTeachersCount, error: supervisorTeachersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher")
        .eq("supervisor_id", userId);
      
      if (!supervisorTeachersError) {
        stats.supervisorTeachers = supervisorTeachersCount || 0;
      } else {
        console.error("خطأ في جلب عدد معلمي المشرف:", supervisorTeachersError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد معلمي المشرف:", error);
    }
    
    try {
      // عدد الطلاب في الحلقات تحت إشراف المشرف
      const { data: circleIds, error: circleIdsError } = await supabase
        .from("study_circles")
        .select("id")
        .eq("supervisor_id", userId);
      
      if (!circleIdsError && circleIds && circleIds.length > 0) {
        const ids = circleIds.map(c => c.id);
        
        const { count: studentsCount, error: studentsError } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .in("study_circle_id", ids);
        
        if (!studentsError) {
          stats.supervisorStudents = studentsCount || 0;
        } else {
          console.error("خطأ في جلب عدد طلاب المشرف:", studentsError);
        }
      } else if (circleIdsError) {
        console.error("خطأ في جلب معرفات حلقات المشرف:", circleIdsError);
      }
    } catch (error) {
      console.error("استثناء في جلب عدد طلاب المشرف:", error);
    }
    
    return stats;
  };

  // جلب إحصائيات المعلم
  const fetchTeacherStatistics = async (userId: string): Promise<Partial<StatisticsData>> => {
    const stats: Partial<StatisticsData> = {
      teacherCircles: 0,
      teacherStudents: 0,
      teacherAbsences: 0,
      recentMemorizations: [],
      recentAssessments: []
    };
    
    try {
      // عدد الحلقات التي يدرسها المعلم
      const { count: teacherCirclesCount, error: teacherCirclesError } = await supabase
        .from("study_circles")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", userId);
      
      if (!teacherCirclesError) {
        stats.teacherCircles = teacherCirclesCount || 0;
      } else {
        console.error("خطأ في جلب عدد حلقات المعلم:", teacherCirclesError);
      }
      
      // جلب معرفات الحلقات التي يدرسها المعلم
      const { data: circleIds, error: circleIdsError } = await supabase
        .from("study_circles")
        .select("id")
        .eq("teacher_id", userId);
      
      if (!circleIdsError && circleIds && circleIds.length > 0) {
        const ids = circleIds.map(c => c.id);
        
        try {
          // عدد الطلاب في حلقات المعلم
          const { count: studentsCount, error: studentsError } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .in("study_circle_id", ids);
          
          if (!studentsError) {
            stats.teacherStudents = studentsCount || 0;
          } else {
            console.error("خطأ في جلب عدد طلاب المعلم:", studentsError);
          }
        } catch (error) {
          console.error("استثناء في جلب عدد طلاب المعلم:", error);
        }
        
        try {
          // عدد الغياب في حلقات المعلم اليوم
          const { count: absencesCount, error: absencesError } = await supabase
            .from("attendance_records")
            .select("*", { count: "exact", head: true })
            .in("study_circle_id", ids)
            .eq("status", "absent")
            .gte("date", `${todayStr}T00:00:00`)
            .lt("date", `${todayStr}T23:59:59`);
          
          if (!absencesError) {
            stats.teacherAbsences = absencesCount || 0;
          } else {
            console.error("خطأ في جلب عدد غياب طلاب المعلم:", absencesError);
          }
        } catch (error) {
          console.error("استثناء في جلب عدد غياب طلاب المعلم:", error);
        }
        
        try {
          // آخر 10 سجلات حفظ للطلاب
          const { data: recentMemorizations, error: memorizationsError } = await supabase
            .from("memorization_records")
            .select("id, student_id, date, surah, from_verse, to_verse, students(full_name)")
            .in("study_circle_id", ids)
            .order("date", { ascending: false })
            .limit(10);
          
          if (!memorizationsError) {
            stats.recentMemorizations = recentMemorizations || [];
          } else {
            console.error("خطأ في جلب سجلات حفظ الطلاب:", memorizationsError);
          }
        } catch (error) {
          console.error("استثناء في جلب سجلات حفظ الطلاب:", error);
        }
        
        try {
          // آخر 10 تقييمات
          const { data: recentAssessments, error: assessmentsError } = await supabase
            .from("assessments")
            .select("id, student_id, date, score, type, students(full_name)")
            .in("study_circle_id", ids)
            .order("date", { ascending: false })
            .limit(10);
          
          if (!assessmentsError) {
            stats.recentAssessments = recentAssessments || [];
          } else {
            console.error("خطأ في جلب تقييمات الطلاب:", assessmentsError);
          }
        } catch (error) {
          console.error("استثناء في جلب تقييمات الطلاب:", error);
        }
      } else if (circleIdsError) {
        console.error("خطأ في جلب معرفات حلقات المعلم:", circleIdsError);
      }
    } catch (error) {
      console.error("استثناء في جلب إحصائيات المعلم:", error);
    }
    
    return stats;
  };

  // جلب معلومات للزوار (أولياء الأمور الخارجيين)
  const fetchVisitorStatistics = async (): Promise<Partial<StatisticsData>> => {
    const stats: Partial<StatisticsData> = {
      availableCircles: [],
      sessionSchedules: []
    };
    
    try {
      // الحلقات المتاحة للتسجيل
      const { data: availableCircles, error: circlesError } = await supabase
        .from("study_circles")
        .select("id, name, teacher_id, profiles(full_name), capacity, current_students")
        .eq("is_open_for_registration", true)
        .limit(5);
      
      if (!circlesError) {
        stats.availableCircles = availableCircles || [];
      } else {
        console.error("خطأ في جلب الحلقات المتاحة:", circlesError);
      }
    } catch (error) {
      console.error("استثناء في جلب الحلقات المتاحة:", error);
    }
    
    try {
      // مواعيد الجلسات
      const { data: sessionSchedules, error: schedulesError } = await supabase
        .from("circle_schedules")
        .select("id, study_circle_id, day, start_time, end_time, study_circles(name)")
        .order("day")
        .limit(10);
      
      if (!schedulesError) {
        stats.sessionSchedules = sessionSchedules || [];
      } else {
        console.error("خطأ في جلب مواعيد الجلسات:", schedulesError);
      }
    } catch (error) {
      console.error("استثناء في جلب مواعيد الجلسات:", error);
    }
    
    return stats;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="border border-green-200 shadow-md">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 animate-pulse rounded-md mb-2"></div>
              <div className="h-8 bg-gray-100 animate-pulse rounded-md"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
        <AlertCircle className="inline-block mr-2 h-5 w-5" />
        {error}
      </div>
    );
  }

  // تنسيق تاريخ اليوم بالعربية
  const formattedDate = format(today, "EEEE d MMMM yyyy", { locale: ar });

  return (
    <div className="space-y-6">
      <div className="mb-4 text-center">
        <p className="text-gray-600 mb-1">إحصائيات اليوم</p>
        <h2 className="text-xl font-semibold text-islamic-green">{formattedDate}</h2>
      </div>

      {/* الإحصائيات العامة - تظهر للجميع ولكن تختلف حسب نوع المستخدم */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* مدير النظام والمشرف يرون إحصائيات عامة */}
        {(userRole === "superadmin" || userRole === "admin") && (
          <>
            {/* إجمالي الحلقات */}
            <StatCard 
              title="إجمالي الحلقات" 
              value={stats.totalCircles} 
              icon={<BookOpen className="h-8 w-8 text-green-600" />} 
              color="bg-green-50 border-green-200" 
              textColor="text-green-700"
            />
            
            {/* إجمالي الطلاب */}
            <StatCard 
              title="إجمالي الطلاب" 
              value={stats.totalStudents} 
              icon={<Users className="h-8 w-8 text-blue-600" />} 
              color="bg-blue-50 border-blue-200" 
              textColor="text-blue-700"
            />
            
            {/* إجمالي المعلمين */}
            <StatCard 
              title="إجمالي المعلمين" 
              value={stats.totalTeachers} 
              icon={<GraduationCap className="h-8 w-8 text-purple-600" />} 
              color="bg-purple-50 border-purple-200" 
              textColor="text-purple-700"
            />
            
            {/* غياب اليوم */}
            <StatCard 
              title="غياب اليوم" 
              value={stats.todayAbsences} 
              icon={<AlertCircle className="h-8 w-8 text-amber-600" />} 
              color="bg-amber-50 border-amber-200" 
              textColor="text-amber-700"
            />
          </>
        )}

        {/* المشرف يرى إحصائيات خاصة به */}
        {userRole === "admin" && (
          <>
            {/* الحلقات تحت إشراف المشرف */}
            <StatCard 
              title="الحلقات تحت إشرافك" 
              value={stats.supervisorCircles || 0} 
              icon={<BookOpen className="h-8 w-8 text-teal-600" />} 
              color="bg-teal-50 border-teal-200" 
              textColor="text-teal-700"
            />
            
            
            {/* الطلاب في حلقات المشرف */}
            <StatCard 
              title="الطلاب في حلقاتك" 
              value={stats.supervisorStudents || 0} 
              icon={<Users className="h-8 w-8 text-pink-600" />} 
              color="bg-pink-50 border-pink-200" 
              textColor="text-pink-700"
            />
          </>
        )}

        {/* المعلم يرى إحصائيات خاصة به */}
        {userRole === "teacher" && (
          <>
            {/* حلقات المعلم */}
            <StatCard 
              title="حلقاتك الدراسية" 
              value={stats.teacherCircles || 0} 
              icon={<School className="h-8 w-8 text-indigo-600" />} 
              color="bg-indigo-50 border-indigo-200" 
              textColor="text-indigo-700"
            />
            
            {/* طلاب المعلم */}
            <StatCard 
              title="طلابك" 
              value={stats.teacherStudents || 0} 
              icon={<UserCheck className="h-8 w-8 text-emerald-600" />} 
              color="bg-emerald-50 border-emerald-200" 
              textColor="text-emerald-700"
            />
            
            {/* غياب طلاب المعلم اليوم */}
            <StatCard 
              title="الغياب في حلقاتك اليوم" 
              value={stats.teacherAbsences || 0} 
              icon={<AlertCircle className="h-8 w-8 text-red-600" />} 
              color="bg-red-50 border-red-200" 
              textColor="text-red-700"
            />
            
            {/* آخر تقييمات */}
            <StatCard 
              title="آخر التقييمات" 
              value={stats.recentAssessments?.length || 0} 
              icon={<ClipboardCheck className="h-8 w-8 text-orange-600" />} 
              color="bg-orange-50 border-orange-200" 
              textColor="text-orange-700"
            />
          </>
        )}
        
        {/* للزوار (أولياء الأمور من خارج النظام) */}
        {!userRole && (
          <>
            {/* الحلقات المتاحة للتسجيل */}
            <StatCard 
              title="الحلقات المتاحة" 
              value={stats.availableCircles?.length || 0} 
              icon={<BookOpen className="h-8 w-8 text-green-600" />} 
              color="bg-green-50 border-green-200" 
              textColor="text-green-700"
            />
            
            {/* مواعيد الجلسات */}
            <StatCard 
              title="مواعيد الجلسات" 
              value={stats.sessionSchedules?.length || 0} 
              icon={<Calendar className="h-8 w-8 text-blue-600" />} 
              color="bg-blue-50 border-blue-200" 
              textColor="text-blue-700"
            />
            
            {/* إجمالي الحلقات */}
            <StatCard 
              title="إجمالي الحلقات" 
              value={stats.totalCircles} 
              icon={<School className="h-8 w-8 text-purple-600" />} 
              color="bg-purple-50 border-purple-200" 
              textColor="text-purple-700"
            />
            
            {/* جلسات اليوم */}
            <StatCard 
              title="جلسات اليوم" 
              value={stats.sessionSchedules?.filter(s => s.day === new Date().getDay())?.length || 0} 
              icon={<Clock className="h-8 w-8 text-amber-600" />} 
              color="bg-amber-50 border-amber-200" 
              textColor="text-amber-700"
            />
          </>
        )}
      </div>

      {/* عرض المعلومات الإضافية للمعلم */}
      {userRole === "teacher" && stats.recentMemorizations && stats.recentMemorizations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-islamic-green border-r-4 border-islamic-green pr-2">
            آخر سجلات الحفظ
          </h3>
          <div className="overflow-x-auto bg-white rounded-lg border border-green-200">
            <table className="min-w-full divide-y divide-green-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    الطالب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    التاريخ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    السورة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    من آية
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    إلى آية
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-green-100">
                {stats.recentMemorizations.map((record) => (
                  <tr key={record.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.students?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.surah}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.from_verse}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.to_verse}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* عرض الحلقات المتاحة للتسجيل لأولياء الأمور الخارجيين */}
      {!userRole && stats.availableCircles && stats.availableCircles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-3 text-islamic-green border-r-4 border-islamic-green pr-2">
            الحلقات المتاحة للتسجيل
          </h3>
          <div className="overflow-x-auto bg-white rounded-lg border border-green-200">
            <table className="min-w-full divide-y divide-green-200">
              <thead className="bg-green-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    اسم الحلقة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    المعلم
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    السعة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">
                    عدد الطلاب الحاليين
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-green-100">
                {stats.availableCircles.map((circle) => (
                  <tr key={circle.id} className="hover:bg-green-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {circle.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {circle.profiles?.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {circle.capacity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {circle.current_students}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// مكون بطاقة الإحصائيات
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
  textColor?: string;
}

function StatCard({ title, value, icon, color = "bg-white", textColor = "text-gray-800" }: StatCardProps) {
  return (
    <Card className={`shadow-md ${color}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
            <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          </div>
          <div className="p-3 rounded-full bg-white/70 shadow-sm">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
