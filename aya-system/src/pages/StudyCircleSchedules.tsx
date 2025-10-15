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
import { Student } from '@/types/student';
import { getAllStudents as getAllStudentsApi } from '@/lib/supabase-service';
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { Calendar, Clock, Plus, Pencil, Trash2, Info, MapPin, X, BookOpen, Filter, RefreshCwIcon, ChevronDown, ChevronUp } from "lucide-react";
import FilterBar from '@/components/filters/FilterBar';
import { checkAuthStatus } from '@/lib/auth-service';
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { getLabels } from '@/lib/labels';
import { GenericTable } from '@/components/ui/generic-table';

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
  // فلتر اليوم (للبحث مع اليوم كما طلب المستخدم)
  const [weekdayFilter, setWeekdayFilter] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<StudyCircle | null>(null);
  // لم نعد نستخدم حوارات اختيار المعلم/الحلقة بعد التحويل إلى قوائم مباشرة

  // State for circle schedules
  const [circleSchedules, setCircleSchedules] = useState<StudyCircleSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  // طلاب (لأغراض العد فقط في شارة الفلاتر)
  const [allStudentsForCounts, setAllStudentsForCounts] = useState<Student[]>([]);
  const [loadingStudentCounts, setLoadingStudentCounts] = useState(false);

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

  // اختيار تلقائي للمعلم (teacher/admin/superadmin) وتحديد الحلقة فقط إذا كان لديه حلقة واحدة
  useEffect(() => {
    if ((userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && userId) {
      const userCircles = allCircles.filter(c => c.teacher?.id === userId);
      if (userCircles.length > 0 && !teacherId) {
        setTeacherId(userId);
      }
      if (userCircles.length === 1 && !circleId) {
        setCircleId(userCircles[0].id);
      }
      // إذا أكثر من حلقة نترك للمستخدم الاختيار
    }
  }, [userRole, userId, allCircles, teacherId, circleId]);

  // في حال النظام كله يحتوي حلقة واحدة فقط ولم يتم اختيار circleId بعد، اخترها مباشرة
  useEffect(() => {
    if (!circleId && allCircles.length === 1) {
      setCircleId(allCircles[0].id);
    }
  }, [allCircles, circleId]);

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
      // بعد تحميل الحلقات نحمل الطلاب لحساب أعدادهم لكل حلقة (لإظهار العدد مباشرة في شريط الفلترة)
      loadStudentsForCounts(circles);

      // اختيار الحلقة سيتم الآن عبر تأثير موحد لاحق (circleId) عندما يكون هناك حلقة واحدة فقط
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

  // تحميل الطلاب مرة واحدة لاستخدامهم في حساب أعداد الطلاب لكل حلقة
  const loadStudentsForCounts = async (circlesRef?: StudyCircle[]) => {
    setLoadingStudentCounts(true);
    try {
      const list = await getAllStudentsApi();
      let usable = list || [];
      // لو المستخدم معلم؛ أظهر فقط طلاب حلقاته حفاظاً على النطاق
      if (userRole === 'teacher' && userId) {
        const allowedCircleIds = (circlesRef || allCircles).filter(c => c.teacher?.id === userId).map(c => c.id);
        usable = usable.filter(st => allowedCircleIds.includes(st.study_circle_id || st.study_circle?.id));
      }
      setAllStudentsForCounts(usable);
    } catch (e) {
      console.warn('⚠️ فشل تحميل الطلاب لأغراض العد فقط', e);
    } finally {
      setLoadingStudentCounts(false);
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
    // نعيد فقط المعلمين الذين لديهم حلقات (الخريطة منشأة أساساً من الحلقات، فالقائمة بالفعل مصفاة).
    return Array.from(map.values()).filter(t => t.circles_count > 0);
  }, [allCircles]);

  // في حال المعلم أو الحلقة المحددة لم يعودا صالحين بعد تحديث الحلقات، نقوم بإعادة التعيين
  useEffect(() => {
    if (teacherId && !teachers.some(t => t.id === teacherId)) {
      setTeacherId(null);
    }
    if (circleId) {
      const stillExists = allCircles.some(c => c.id === circleId);
      if (!stillExists) {
        setCircleId(null);
        setSelectedCircle(null);
      }
    }
  }, [teachers, teacherId, circleId, allCircles]);

  // عند تغيير المعلم: إذا كان لديه حلقة واحدة فقط ولم يتم اختيار circleId نختارها
  useEffect(() => {
    if (teacherId) {
      const teacherCircles = allCircles.filter(c => c.teacher?.id === teacherId);
      if (teacherCircles.length === 1 && !circleId) {
        setCircleId(teacherCircles[0].id);
      }
      if (teacherCircles.length > 1 && circleId) {
        const stillValid = teacherCircles.some(c => c.id === circleId);
        if (!stillValid) setCircleId(null);
      }
    } else {
      if (allCircles.length !== 1) setCircleId(null);
    }
  }, [teacherId, allCircles, circleId]);

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

  // خريطة عدد الطلاب لكل حلقة
  const circleStudentsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allStudentsForCounts.forEach(st => {
      const cid = st.study_circle_id || st.study_circle?.id;
      if (cid) map[cid] = (map[cid] || 0) + 1;
    });
    return map;
  }, [allStudentsForCounts]);

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

  // عند تغيير المعلم: لا نصفر اختيار الحلقة فوراً إن كانت الحلقة الوحيدة لديه وتم تعيينها تلقائياً
  // بدلاً من ذلك نتحقق في effect أعلاه الخاص بالمعلم والحلقات.
  // إزالة التصفير التلقائي هنا كان يمنع اختيار الحلقة الوحيدة لأن هذا التأثير كان ينفذ بعد التعيين.
  // إذا احتجنا لاحقاً لتصفير يدوي يتم عبر handleResetSelections أو عند عدم صلاحية الحلقة في التأثيرات الأخرى.

  // اختيار الحلقة
  const handleSelectCircle = async (circle: StudyCircle) => {
    setCircleId(circle.id);
  };

  // === Schedules sorting ===
  const sortedSchedules = [...circleSchedules].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  );

  // تطبيق فلتر اليوم (إن وُجد)
  const filteredSchedulesByWeekday = useMemo(() => {
    if (!weekdayFilter || weekdayFilter === '__ALL__') return sortedSchedules;
    const w = parseInt(weekdayFilter, 10);
    return sortedSchedules.filter(s => s.weekday === w);
  }, [sortedSchedules, weekdayFilter]);

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

  const tableSchedules = filteredSchedulesByWeekday.map((s, idx) => ({ ...s, row_index: idx + 1, id: s.id ?? `sch-${idx}`, __conflict: conflictIds.has(s.id) }));

  // تبويبات (جميع السجلات / سجلاتي)
  const [showFilters, setShowFilters] = useState(true);
  const [cardCollapsed, setCardCollapsed] = useState(false);

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
    setWeekdayFilter(null);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-1 pb-0 px-0 sm:px-0 shadow-md border-0">
        {/* الهيدر */}
        <CardHeader className="pb-1 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base md:text-lg font-extrabold text-green-50 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-300 animate-pulse" />
              <span className="line-clamp-1 flex-1">
                {scsLabels.pageTitle}
              </span>
              {/* زر الطي (في نفس مستوى العنوان) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCardCollapsed(prev => !prev)}
                className="bg-green-700/30 hover:bg-green-600/50 text-white rounded-full h-7 w-7 p-0 flex items-center justify-center shadow-sm transition-colors shrink-0"
                title={cardCollapsed ? "عرض المحتوى" : "طي المحتوى"}
                aria-label={cardCollapsed ? "Expand" : "Collapse"}
              >
                {cardCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
            {!cardCollapsed && (
              <CardDescription className="text-[10px] sm:text-xs text-green-100/90 mt-0.5 pr-8">
                {scsLabels.pageDescription}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        {!cardCollapsed && (
          <CardContent className="space-y-0 sm:space-y-0 px-2 sm:px-3 pt-2 pb-3 transition-all duration-300">
            <div className="flex flex-col md:flex-row justify-end items-center gap-2 mb-1 rounded-md bg-white dark:bg-gray-900 p-1.5 shadow-sm border border-green-200 dark:border-green-700">
              <div className="flex gap-2 items-center ">
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
              <div className="mb-2 bg-white dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 rounded-lg animate-fade-in" dir="rtl">
                <FilterBar
                  values={{
                    teacher: teacherId,
                    circle: circleId,
                    weekday: weekdayFilter || '',
                    q: search || ''
                  }}
                  showFieldLabels={false}
                  onValuesChange={(vals) => {
                    // بحث
                    setSearch(String(vals.q ?? ''));
                    // يوم
                    if (vals.weekday === null || vals.weekday === '__ALL__' || vals.weekday === '') {
                      if (weekdayFilter) setWeekdayFilter(null);
                    } else if (vals.weekday !== weekdayFilter) {
                      setWeekdayFilter(String(vals.weekday));
                    }
                    // معلم
                    if (vals.teacher === null || vals.teacher === '__ALL__') {
                      if (teacherId) setTeacherId(null);
                      // إذا تم مسح المعلم وتوجد حلقة حالية لا تنتمي لأي معلم محدد (حالة نادرة) نتركها
                      // لكن لو تم اختيار حلقة غير متسقة مع الفلتر الجديد يمكن إفراغها (اعتماداً على السياسة)
                    } else if (vals.teacher !== teacherId) {
                      setTeacherId(String(vals.teacher));
                    }
                    // حلقة
                    if (vals.circle === null || vals.circle === '__ALL__') {
                      if (circleId) setCircleId(null);
                    } else if (vals.circle !== circleId) {
                      setCircleId(String(vals.circle));
                    }
                  }}
                  fields={[
                    {
                      id: 'teacher',
                      label: 'المعلم',
                      type: 'select',
                      showSearch: true,
                      clearable: true,
                      options: [
                        { value: '__ALL__', label: 'جميع المعلمين', icon: '👨‍🏫', meta: { count: allCircles.length } },
                        ...teachers.map(t => ({
                          value: t.id,
                          label: t.name || '—',
                          icon: '👨‍🏫',
                          meta: { count: t.circles_count }
                        }))
                      ],
                      value: teacherId,
                      showCountsFromMetaKey: 'count',
                      onChange: (val) => {
                        if (!val || val === '__ALL__') {
                          setTeacherId(null);
                          setCircleId(null);
                        } else {
                          setTeacherId(val);
                        }
                      }
                    },
                    {
                      id: 'circle',
                      label: 'الحلقة',
                      type: 'select',
                      showSearch: true,
                      clearable: true,
                      options: [
                        { value: '__ALL__', label: 'جميع الحلقات', icon: '🕋', meta: { count: filteredCircles.reduce((sum, c) => sum + (circleStudentsCountMap[c.id] || 0), 0) } },
                        ...filteredCircles.map(c => ({
                          value: c.id,
                          label: c.name || '—',
                          icon: '🕋',
                          meta: { count: circleStudentsCountMap[c.id] || 0 }
                        }))
                      ],
                      value: circleId,
                      showCountsFromMetaKey: 'count',
                      onChange: (val) => {
                        if (!val || val === '__ALL__') setCircleId(null); else setCircleId(val);
                      }
                    },
                    {
                      id: 'weekday',
                      label: 'اليوم',
                      type: 'select',
                      showSearch: true,
                      clearable: true,
                      options: [
                        { value: '__ALL__', label: 'جميع الأيام', icon: '🗓️' },
                        ...weekdayOptions.map(w => ({ value: String(w.value), label: w.label, icon: '🗓️' }))
                      ],
                      value: weekdayFilter || '__ALL__',
                      onChange: (val) => {
                        if (!val || val === '__ALL__') setWeekdayFilter(null); else setWeekdayFilter(val);
                      }
                    },
                    {
                      id: 'q',
                      label: 'بحث',
                      type: 'text',
                      placeholder: '🔍 بحث عن حلقة أو معلم...',
                      value: search,
                      debounceMs: 350,
                      onChange: (v) => setSearch(v)
                    }
                  ]}
                  actions={[{
                    id: 'reset',
                    label: 'إعادة تعيين',
                    variant: 'outline',
                    className: 'w-full sm:w-auto justify-center font-semibold text-[11px] sm:text-xs h-9 bg-white dark:bg-gray-900 border-green-300 hover:bg-green-50 dark:hover:bg-green-800 text-green-700 dark:text-green-200 mt-2 sm:mt-0',
                    onClick: () => {
                      setTeacherId(null);
                      setCircleId(null);
                      setSearch('');
                      setWeekdayFilter(null);
                    }
                  }]}
                  enableDefaultApplyButton={false}
                  enableDefaultResetButton={false}
                  actionsPlacement="wrap"
                  className="bg-transparent p-0"
                />
              </div>
            )}
            <div>
            </div>
          </CardContent>
        )}
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
