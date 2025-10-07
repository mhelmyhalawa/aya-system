import { useState, useEffect, useMemo } from "react";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // ما زال مستخدماً داخل حوارات إضافة/تعديل الجدولة
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import { Badge } from "@/components/ui/badge"; // يستخدم داخل جداول الحوارات
import { StudyCircle } from "@/types/study-circle";
import { StudyCircleSchedule, StudyCircleScheduleCreate, StudyCircleScheduleUpdate, weekdayOptions, getWeekdayName, formatTime } from "@/types/study-circle-schedule";
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { Calendar, Clock, Plus, Pencil, Trash2, Info, MapPin, X, BookOpen, Filter, RefreshCwIcon } from "lucide-react";
import { checkAuthStatus } from '@/lib/auth-service';
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { getLabels } from '@/lib/labels';
import { GenericTable } from '@/components/ui/generic-table';
import TeacherCircleFilterBar from '@/components/filters/TeacherCircleFilterBar';

const { studyCircleSchedulesLabels: scsLabels } = getLabels('ar');

interface StudyCircleSchedulesPageProps {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string;
}

export function StudyCircleSchedulesPage({ onNavigate, userRole, userId }: StudyCircleSchedulesPageProps) {
  const { toast } = useToast();
  const [allCircles, setAllCircles] = useState<StudyCircle[]>([]);
  const [loading, setLoading] = useState(true);
  // حالات الفلترة الجديدة
  const [search, setSearch] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<StudyCircle | null>(null);
  // لم نعد نستخدم حوارات اختيار المعلم/الحلقة بعد التحويل إلى قوائم مباشرة

  // State for circle schedules
  const [circleSchedules, setCircleSchedules] = useState<StudyCircleSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Add schedule dialog state
  const [openAddScheduleDialog, setOpenAddScheduleDialog] = useState(false);
  const [savingNewSchedule, setSavingNewSchedule] = useState(false);
  const [addScheduleForm, setAddScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // Edit schedule dialog state
  const [openEditScheduleDialog, setOpenEditScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StudyCircleSchedule | null>(null);
  const [savingScheduleEdit, setSavingScheduleEdit] = useState(false);
  const [editScheduleForm, setEditScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // Delete confirmation dialog state
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<StudyCircleSchedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  // Check if user can edit schedules (admin/superadmin only)
  const canEditSchedules = userRole === 'admin' || userRole === 'superadmin';

  // Load all circles on page load
  useEffect(() => {
    loadCircles();
  }, [userRole, userId]);

  // Load circles based on user role
  const loadCircles = async () => {
    setLoading(true);
    try {
      let circles: StudyCircle[] = [];

      // إذا كان المستخدم معلم، نحمل حلقاته فقط
      if (userRole === 'teacher' && userId) {
        circles = await getStudyCirclesByTeacherId(userId);
        console.log('Teacher circles loaded:', circles);
      }
      // إذا كان المستخدم مشرف أو مدير، نحمل جميع الحلقات
      else if (userRole === 'admin' || userRole === 'superadmin') {
        circles = await getAllStudyCircles();
      }

      setAllCircles(circles);

      // إذا كان معلم ولديه حلقة واحدة فقط، نختارها تلقائيًا
      if (userRole === 'teacher' && circles.length === 1) {
        setSelectedCircle(circles[0]);
        await loadCircleSchedules(circles[0].id);
      }
    } catch (error) {
      console.error("Error loading circles:", error);
      toast({
        title: "خطأ في تحميل الحلقات",
        description: "حدث خطأ أثناء تحميل قائمة الحلقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load schedules for a specific circle
  const loadCircleSchedules = async (circleId: string) => {
    setLoadingSchedules(true);
    try {
      const schedules = await getStudyCircleSchedules(circleId);
      console.log('📅 Loaded schedules:', schedules);
      setCircleSchedules(schedules);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast({
        title: "خطأ في تحميل الجدولة",
        description: "حدث خطأ أثناء تحميل جدولة الحلقة",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedules(false);
    }
  };

  // قائمة المعلمين مع عدد الحلقات
  const teachers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; circles_count: number }>();
    allCircles.forEach(c => {
      const t = c.teacher;
      if (t?.id) {
        if (!map.has(t.id)) map.set(t.id, { id: t.id, name: t.full_name, circles_count: 0 });
        map.get(t.id)!.circles_count += 1;
      }
    });
    return Array.from(map.values());
  }, [allCircles]);

  // فلترة الحلقات حسب المعلم والبحث
  const filteredCircles = useMemo(() => {
    const q = search.toLowerCase();
    return allCircles.filter(c => {
      if (teacherId && c.teacher?.id !== teacherId) return false;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.teacher?.full_name?.toLowerCase().includes(q))
      );
    });
  }, [allCircles, teacherId, search]);

  // تحديث الحلقة المختارة عند تغير circleId
  useEffect(() => {
    if (circleId) {
      const c = allCircles.find(cc => cc.id === circleId) || null;
      setSelectedCircle(c);
      if (c) loadCircleSchedules(c.id);
    } else {
      setSelectedCircle(null);
      setCircleSchedules([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, allCircles]);

  // عند تغيير المعلم نصفر اختيار الحلقة
  useEffect(() => { setCircleId(null); }, [teacherId]);

  // اختيار الحلقة
  const handleSelectCircle = async (circle: StudyCircle) => {
    setCircleId(circle.id);
  };

  // === Schedules sorting ===
  const sortedSchedules = [...circleSchedules].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  );

  // Add schedule
  const handleAddSchedule = () => {
    // Reset add schedule form
    setAddScheduleForm({
      weekday: '0',
      start_time: '08:00',
      end_time: '09:00',
      location: ''
    });

    // Open add schedule dialog
    setOpenAddScheduleDialog(true);
  };

  // Handle add schedule form changes
  const handleAddScheduleFormChange = (field: string, value: string) => {
    setAddScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Open edit schedule dialog for a specific schedule
  const handleEditSchedule = (schedule: StudyCircleSchedule) => {
    setEditingSchedule(schedule);
    setEditScheduleForm({
      weekday: schedule.weekday.toString(),
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      location: schedule.location || ''
    });
    setOpenEditScheduleDialog(true);
  };

  // Save new schedule (create)
  const handleSaveNewSchedule = async () => {
    if (!selectedCircle || savingNewSchedule) return;
    try {
      setSavingNewSchedule(true);

      if (!addScheduleForm.start_time || !addScheduleForm.end_time) {
        toast({
          title: scsLabels.validationDataError,
          description: scsLabels.validationMissingTimes,
          variant: 'destructive'
        });
        return;
      }
      if (addScheduleForm.start_time >= addScheduleForm.end_time) {
        toast({
          title: scsLabels.validationTimesError,
          description: scsLabels.validationTimesMessage,
          variant: 'destructive'
        });
        return;
      }

      const payload: StudyCircleScheduleCreate = {
        study_circle_id: selectedCircle.id,
        weekday: parseInt(addScheduleForm.weekday),
        start_time: addScheduleForm.start_time,
        end_time: addScheduleForm.end_time,
        location: addScheduleForm.location.trim() || null
      };
      const result = await createStudyCircleSchedule(payload);
      if (result.success) {
        toast({
          title: scsLabels.createSuccessTitle,
          description: scsLabels.createSuccessDescription(selectedCircle.name),
          variant: 'default'
        });
        await loadCircleSchedules(selectedCircle.id);
        setOpenAddScheduleDialog(false);
      } else {
        toast({
          title: scsLabels.createFailedTitle,
          description: result.message || scsLabels.createFailedDescription,
          variant: 'destructive'
        });
      }
    } catch (e) {
      console.error('Error creating schedule', e);
      toast({
        title: scsLabels.unexpectedErrorTitle,
        description: scsLabels.unexpectedErrorDescription,
        variant: 'destructive'
      });
    } finally {
      setSavingNewSchedule(false);
    }
  };

  // Handle edit schedule form changes
  const handleEditScheduleFormChange = (field: string, value: string) => {
    setEditScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save schedule edit
  const handleSaveScheduleEdit = async () => {
    if (!editingSchedule || savingScheduleEdit) return;

    try {
      setSavingScheduleEdit(true);

      // Validate form data
      if (!editScheduleForm.start_time || !editScheduleForm.end_time) {
        toast({
          title: scsLabels.validationDataError,
          description: scsLabels.validationMissingTimes,
          variant: "destructive",
        });
        return;
      }

      // Check if end time is after start time
      if (editScheduleForm.start_time >= editScheduleForm.end_time) {
        toast({
          title: scsLabels.validationTimesError,
          description: scsLabels.validationTimesMessage,
          variant: "destructive",
        });
        return;
      }

      // Prepare update data
      const updateData: StudyCircleScheduleUpdate = {
        id: editingSchedule.id,
        weekday: parseInt(editScheduleForm.weekday),
        start_time: editScheduleForm.start_time,
        end_time: editScheduleForm.end_time,
        location: editScheduleForm.location.trim() || null
      };

      console.log('💾 Updating schedule with data:', updateData);

      // Call API to update the schedule
      const result = await updateStudyCircleSchedule(updateData);

      if (result.success) {
        toast({
          title: scsLabels.updateSuccessTitle,
          description: scsLabels.updateSuccessDescription,
          variant: "default",
        });

        // Reload schedules to show the update
        if (selectedCircle) {
          await loadCircleSchedules(selectedCircle.id);
        }

        // Close edit dialog
        setOpenEditScheduleDialog(false);
        setEditingSchedule(null);
      } else {
        toast({
          title: scsLabels.updateFailedTitle,
          description: result.message || scsLabels.updateFailedDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error updating schedule:', error);
      toast({
        title: scsLabels.unexpectedErrorTitle,
        description: scsLabels.unexpectedErrorDescription,
        variant: "destructive",
      });
    } finally {
      setSavingScheduleEdit(false);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = (schedule: StudyCircleSchedule) => {
    setScheduleToDelete(schedule);
    setOpenDeleteDialog(true);
  };

  // Confirm delete schedule
  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      setDeletingSchedule(true);

      // Execute the actual deletion
      const result = await deleteStudyCircleSchedule(scheduleToDelete.id);

      if (result.success) {
        toast({
          title: scsLabels.deleteSuccessTitle,
          description: scsLabels.deleteSuccessDescription,
          variant: "default",
        });

        console.log('✅ Schedule deleted successfully:', scheduleToDelete.id);

        // Reload schedules for the selected circle
        if (selectedCircle) {
          await loadCircleSchedules(selectedCircle.id);
        }
      } else {
        toast({
          title: scsLabels.deleteFailedTitle,
          description: result.message || scsLabels.deleteFailedDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error deleting schedule:', error);
      toast({
        title: scsLabels.unexpectedErrorTitle,
        description: scsLabels.unexpectedErrorDescription,
        variant: "destructive",
      });
    } finally {
      setDeletingSchedule(false);
      setOpenDeleteDialog(false);
      setScheduleToDelete(null);
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setCircleId(null);
  };

  // === Helpers for grouping & conflict detection ===
  const parseTimeToMinutes = (time: string) => {
    const [h, m] = time.split(":");
    return parseInt(h) * 60 + parseInt(m);
  };

  const conflictIds: Set<string> = (() => {
    const set = new Set<string>();
    const byDay: Record<number, StudyCircleSchedule[]> = {};
    circleSchedules.forEach(s => { (byDay[s.weekday] ||= []).push(s); });
    Object.values(byDay).forEach(list => {
      list.forEach(a => {
        const aStart = parseTimeToMinutes(a.start_time.substring(0, 5));
        const aEnd = parseTimeToMinutes(a.end_time.substring(0, 5));
        list.forEach(b => {
          if (a.id === b.id) return;
          const bStart = parseTimeToMinutes(b.start_time.substring(0, 5));
          const bEnd = parseTimeToMinutes(b.end_time.substring(0, 5));
          if (aStart < bEnd && aEnd > bStart) {
            set.add(a.id); set.add(b.id);
          }
        });
      });
    });
    return set;
  })();

  // لم نعد نحتاج groupedSchedules بعد تحويل العرض إلى بطاقات أفقية

  // ===== إعداد أعمدة الجدول الجديد (استبدال العرض اليدوي) =====
  const scheduleColumns = [
    {
      key: 'row_index',
      header: '🔢',
      align: 'center' as const,
      render: (s: any) => (
        <span className="text-xs font-semibold text-green-700">{s.row_index}</span>
      )
    },
    {
      key: 'weekday',
      header: '📅 ' + scsLabels.fieldDayHeader,
      align: 'right' as const,
      important: true,
      render: (s: StudyCircleSchedule) => (
        <div className="flex flex-col text-right leading-snug">
          <span className="text-xs font-semibold text-green-800">{getWeekdayName(s.weekday)}</span>
        </div>
      )
    },
    {
      key: 'time',
      header: '⏰ ' + scsLabels.fieldTime,
      align: 'right' as const,
      render: (s: StudyCircleSchedule) => (
        <div className="flex items-center gap-1 flex-wrap max-w-full">
          <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatTime(s.start_time)}</span>
          </div>
          <span className="text-gray-400 text-[10px] font-bold">—</span>
          <div className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{formatTime(s.end_time)}</span>
          </div>
        </div>
      )
    },
    {
      key: 'location',
      header: '📍 ' + scsLabels.fieldLocation,
      align: 'right' as const,
      render: (s: StudyCircleSchedule) => (
        <span className="text-green-800 text-[11px] max-w-[160px] block truncate">
          {s.location ? (<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-green-600" />{s.location}</span>) : <span className="italic text-green-500">{scsLabels.virtualLocation}</span>}
        </span>
      )
    },
    canEditSchedules ? {
      key: 'actions',
      header: '⚙️ ' + scsLabels.fieldActions,
      align: 'center' as const,
      render: (s: StudyCircleSchedule) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditSchedule(s)}
            className="bg-green-200 hover:bg-green-300 text-green-900 rounded-md p-1.5 transition-colors h-7"
            title={scsLabels.editDialogTitle}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteSchedule(s)}
            className="bg-red-100 hover:bg-red-200 text-red-700 rounded-md p-1.5 transition-colors h-7"
            title={scsLabels.deleteDialogTitle}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    } : null
  ].filter(Boolean);

  const tableSchedules = sortedSchedules.map((s, idx) => ({ ...s, row_index: idx + 1, id: s.id ?? `sch-${idx}`, __conflict: conflictIds.has(s.id) }));

  // تبويبات (جميع السجلات / سجلاتي)
  const [showFilters, setShowFilters] = useState(false);

  // حالة المصادقة الفعلية
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await checkAuthStatus();
        if (mounted && status.success && status.isAuthenticated && status.user) {
          setCurrentUserProfile(status.user);
          // نفترض أن الدور مفرد (role) داخل user.role، يمكن لاحقاً دعمه كمصفوفة
          setCurrentUserRoles(status.user.role ? [status.user.role] : []);
        }
      } finally {
        mounted = false;
        setAuthLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const isTeacher = currentUserRoles.includes('teacher');
  const isAdmin = currentUserRoles.includes('admin') || currentUserRoles.includes('superadmin');
  const effectiveTeachers = useMemo(() => {
    if ((isTeacher || isAdmin) && currentUserProfile) {
      // إذا كان أدمن نعرض الجميع، إذا معلم نعرض نفسه فقط
      if (isTeacher && !isAdmin) {
        return teachers.filter(t => t.id === currentUserProfile.id);
      }
    }
    return teachers;
  }, [isTeacher, isAdmin, currentUserProfile, teachers]);

  // عند التحول إلى تبويب سجلاتي نضمن اختيار المعلم الحالي (إن وجد)
  // عند تحميل الصفحة: لو المستخدم معلم نحدد معلمه وحلقته الوحيدة (إن وُجدت)
  useEffect(() => {
    if (authLoading) return; // انتظار حتى تنتهي المصادقة
    if (!(isTeacher || isAdmin) || !currentUserProfile) return;

    // تأكد أن المستخدم موجود ضمن قائمة المعلمين (قد يتأخر تحميلها)
    const userAsTeacher = teachers.find(t => t.id === currentUserProfile.id);
    if (userAsTeacher && !teacherId) {
      setTeacherId(currentUserProfile.id);
    }

    // اختيار حلقة واحدة تلقائياً إذا هو معلم وله حلقة وحيدة
    if (isTeacher) {
      const myCircles = filteredCircles.filter(c => c.teacher?.id === currentUserProfile.id);
      if (myCircles.length === 1 && !circleId) {
        setCircleId(myCircles[0].id);
      }
    }

    // في حالة الأدمن: إن كان الأدمن نفسه معرفاً كمعلم وله حلقة واحدة أيضاً (سيناريو مزدوج)
    if (isAdmin && !isTeacher && userAsTeacher) {
      const adminCircles = filteredCircles.filter(c => c.teacher?.id === currentUserProfile.id);
      if (adminCircles.length === 1 && !circleId) {
        setCircleId(adminCircles[0].id);
      }
    }
  }, [authLoading, isTeacher, isAdmin, currentUserProfile, teachers, filteredCircles, teacherId, circleId]);

  // إعادة ضبط عند زر تحديث (إلغاء التحديد)
  const handleResetSelections = () => {
    setTeacherId(null);
    setCircleId(null);
    setSearch('');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-1 pb-0 px-0 sm:px-0 shadow-md border-0">
        {/* الهيدر */}
        <CardHeader className="pb-1 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-base md:text-lg font-extrabold text-green-50 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-300 animate-pulse" />
                <span className="line-clamp-1">{scsLabels.pageTitle} </span>
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs text-green-100/90 mt-0.5">
                {scsLabels.pageDescription}
              </CardDescription>
            </div>

          </div>
        </CardHeader>

        <CardContent className="space-y-0 sm:space-y-0 px-2 sm:px-3 pt-2 pb-3">
          <div className="flex flex-col md:flex-row justify-end items-center gap-2 mb-1 rounded-md bg-white dark:bg-gray-900 p-1.5 shadow-sm border border-green-200 dark:border-green-700">
            <div className="flex gap-2 items-center ">
              {/* زر الفلتر لإظهار/إخفاء شريط TeacherCircleFilterBar */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-xl ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} dark:bg-green-700 dark:hover:bg-green-600 shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء شريط الفلترة' : 'إظهار شريط الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر التحديث لإلغاء التحديد */}
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-sm transition-colors px-2.5 py-1 text-[11px] font-medium h-8"
                onClick={handleResetSelections}
                title='تحديث / إلغاء التحديد'
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
            </div>
          </div>
          {showFilters && (
            <TeacherCircleFilterBar
              useInlineSelects
              useShadSelect
              teachers={effectiveTeachers}
              circles={filteredCircles.map(c => ({ id: c.id, name: c.name }))}
              selectedTeacherId={teacherId}
              selectedCircleId={circleId}
              searchQuery={search}
              onSearchChange={setSearch}
              onTeacherChange={(id) => { setTeacherId(id); setCircleId(null); }}
              onCircleChange={(id) => setCircleId(id)}
              onClearTeacher={() => { setTeacherId(null); setCircleId(null); }}
              onClearCircle={() => setCircleId(null)}
              showAddButton={canEditSchedules}
              onAddClick={handleAddSchedule}
              addButtonLabel={scsLabels.scheduleAdd}
              addButtonTooltip={"إضافة موعد جديد"}
              showExportButton={userRole === 'superadmin'}
              onExportClick={() => {/* TODO: export logic */}}
              exportButtonLabel="تصدير"
              requireCircleBeforeAdd
            />
          )}

          <div>
          </div>
        </CardContent>
      </Card>


      <div>
        {!selectedCircle ? (
          <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center gap-2.5 text-sm sm:text-base">
            <Calendar className="h-16 w-16 text-green-200" />
            <h3 className="text-lg font-semibold text-green-800">{scsLabels.chooseCircleTitle}</h3>
            <p className="text-green-600 max-w-md">
              {scsLabels.chooseCircleHelp}
            </p>
          </div>
        ) : (
          <div className="pt-2">
            <GenericTable
              title={
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-green-600 drop-shadow-sm" />
                  <span className="font-extrabold text-green-600 text-sm md:text-base tracking-wide truncate">
                    {selectedCircle
                      ? `${scsLabels.pageTitle.replace('الحلقات الدراسية', 'حلقة')} : ${selectedCircle.name}`
                      : scsLabels.pageTitle}
                  </span>
                </div>
              }
              data={tableSchedules}
              columns={scheduleColumns as any}
              emptyMessage={circleSchedules.length === 0 ? scsLabels.noSchedules : ''}
              onAddNew={canEditSchedules ? handleAddSchedule : undefined}
              onRefresh={selectedCircle ? () => loadCircleSchedules(selectedCircle.id) : undefined}
              enablePagination
              defaultPageSize={5}
              pageSizeOptions={[5, 10, 20, 50]}
              cardGridColumns={{ sm: 1, md: 2, lg: 3, xl: 3 }}
              cardWidth="100%"
              cardMaxFieldsCollapsed={4}
              className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
              getRowClassName={(row: any, index) => {
                const base = index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50';
                return cn(base, row.__conflict && 'outline outline-2 outline-red-400/70');
              }}
              hideSortToggle={false}
              cardPrimaryActions={canEditSchedules ? (s: any) => (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSchedule(s)}
                    className="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <Pencil className="h-3 w-3 ml-1" />
                    <span className="hidden sm:inline">{scsLabels.editDialogTitle}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteSchedule(s)}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 ml-1" />
                    <span className="hidden sm:inline">{scsLabels.deleteDialogTitle}</span>
                  </Button>
                </>
              ) : undefined}
            />
          </div>
        )}
      </div>

      {/* تمت إزالة حوارات اختيار المعلم والحلقة بعد اعتماد القوائم المباشرة */}
      {/* Add Schedule Dialog */}
      <FormDialog
        title={scsLabels.addDialogTitle}
        description={scsLabels.addDialogDescription}
        open={openAddScheduleDialog}
        onOpenChange={setOpenAddScheduleDialog}
        onSave={handleSaveNewSchedule}
        isLoading={savingNewSchedule}
        saveButtonText={savingNewSchedule ? scsLabels.addDialogSaving : scsLabels.addDialogSave}
        mode="add"
      >
        <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
          {/* اليوم كأزرار عصرية */}
          <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
            <Label className="text-right text-gray-800 text-sm mb-2">{scsLabels.fieldDay}</Label>
            <div className="flex flex-wrap gap-2 justify-center">
              {weekdayOptions.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleAddScheduleFormChange('weekday', day.value.toString())}
                  className={`
                    text-sm px-4 py-2 rounded-full border transition-all duration-200
                    flex-1 text-center
                    ${addScheduleForm.weekday === day.value.toString()
                      ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-md transform scale-105'
                      : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100 hover:shadow-sm'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* الوقت */}
          <FormRow label={scsLabels.fieldStart}>
            <Input
              id="add-schedule-start-time"
              type="time"
              value={addScheduleForm.start_time}
              onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
              required
              className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 font-medium"
            />
          </FormRow>

          <FormRow label={scsLabels.fieldEnd}>
            <Input
              id="add-schedule-end-time"
              type="time"
              value={addScheduleForm.end_time}
              onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
              required
              className="bg-purple-50 border-purple-200 text-purple-900 rounded-md text-sm py-1 px-2 font-medium"
            />
          </FormRow>

          {/* الموقع */}
          <FormRow label={scsLabels.fieldLocation}>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              {scsLabels.fieldLocationHelp}
            </div>
            <Input
              id="add-schedule-location"
              value={addScheduleForm.location}
              onChange={(e) => handleAddScheduleFormChange('location', e.target.value)}
              placeholder={scsLabels.fieldLocationPlaceholder}
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>
      {/* Edit Schedule Dialog */}
      <FormDialog
        title={scsLabels.editDialogTitle}
        description={scsLabels.editDialogDescription}
        open={openEditScheduleDialog}
        onOpenChange={setOpenEditScheduleDialog}
        onSave={handleSaveScheduleEdit}
        isLoading={savingScheduleEdit}
        saveButtonText={savingScheduleEdit ? scsLabels.editDialogSaving : scsLabels.editDialogSave}
        mode="edit"
      >
        <div className="border border-gray-200 rounded-md shadow-sm p-3 bg-white">
          {/* اليوم كأزرار عصرية */}
          <Label className="text-right text-gray-800 text-sm mb-2 block">{scsLabels.fieldDay}</Label>
          <div className="flex flex-wrap gap-2 justify-center">
            {weekdayOptions.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleEditScheduleFormChange('weekday', day.value.toString())}
                className={`
                  text-sm px-4 py-2 rounded-full border transition-all duration-200
                  flex-1 text-center
                  ${editScheduleForm.weekday === day.value.toString()
                    ? 'bg-gradient-to-r from-blue-400 to-blue-400 text-white shadow-md transform scale-105'
                    : 'bg-gray-50 text-gray-800 border-gray-300 hover:bg-gray-100 hover:shadow-sm'
                  }
                `}
              >
                {day.label}
              </button>
            ))}
          </div>

          {/* الوقت */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <FormRow label={scsLabels.fieldStart}>
              <Input
                id="edit-schedule-start-time"
                type="time"
                value={editScheduleForm.start_time}
                onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                required
                className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 font-medium"
              />
            </FormRow>
            <FormRow label={scsLabels.fieldEnd}>
              <Input
                id="edit-schedule-end-time"
                type="time"
                value={editScheduleForm.end_time}
                onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                required
                className="bg-purple-50 border-purple-200 text-purple-900 rounded-md text-sm py-1 px-2 font-medium"
              />
            </FormRow>
          </div>

          {/* الموقع */}
          <FormRow label={scsLabels.fieldLocation}>
            <div className="flex items-center text-xs text-gray-500 mb-1">
              <Info className="h-3 w-3 ml-1" />
              {scsLabels.fieldLocationHelp}
            </div>
            <Input
              id="edit-schedule-location"
              value={editScheduleForm.location}
              onChange={(e) => handleEditScheduleFormChange('location', e.target.value)}
              placeholder={scsLabels.fieldLocationPlaceholder}
              className="bg-gray-50 border-gray-300 rounded-md text-sm py-1 px-2"
            />
          </FormRow>
        </div>
      </FormDialog>

      {/* حوار تأكيد الحذف */}

      <DeleteConfirmationDialog
        isOpen={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        onConfirm={confirmDeleteSchedule}
        isLoading={deletingSchedule}
        title={scsLabels.deleteDialogTitle}
        description={scsLabels.deleteDialogDescription}
        itemDetails={scheduleToDelete ? {
          [scsLabels.deleteDialogWeekday]: getWeekdayName(scheduleToDelete.weekday),
          [scsLabels.deleteDialogTime]: `${formatTime(scheduleToDelete.start_time)} - ${formatTime(scheduleToDelete.end_time)}`,
          [scsLabels.deleteDialogLocation]: scheduleToDelete.location || "-"
        } : null}
        deleteButtonText={scsLabels.deleteDialogConfirm}
        cancelButtonText={scsLabels.cancel}
      />

    </div>
  );
}
