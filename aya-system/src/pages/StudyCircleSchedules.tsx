import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import { Badge } from "@/components/ui/badge";
import { StudyCircle } from "@/types/study-circle";
import { StudyCircleSchedule, StudyCircleScheduleCreate, StudyCircleScheduleUpdate, weekdayOptions, getWeekdayName, formatTime } from "@/types/study-circle-schedule";
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from "@/lib/study-circle-schedule-service";
import { Calendar, Clock, Search, Plus, Pencil, Trash2, Info, MapPin, BookOpen, ChevronLeft, AlertCircle, AlertTriangle, X, ChevronRight } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<StudyCircle | null>(null);

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

  // Handle circle selection
  const handleSelectCircle = async (circle: StudyCircle) => {
    setSelectedCircle(circle);
    await loadCircleSchedules(circle.id);
  };

  // Filter circles based on search term
  const filteredCircles = allCircles.filter(
    circle =>
      circle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (circle.teacher?.full_name && circle.teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // === Mobile circles pagination (show only 3 at a time) ===
  const MOBILE_CIRCLES_PAGE_SIZE = 2 // كان 3 - طلب التعديل ليصبح 2
  const [mobileCirclesPage, setMobileCirclesPage] = useState(0);
  const totalMobileCirclePages = Math.ceil(filteredCircles.length / MOBILE_CIRCLES_PAGE_SIZE) || 1;
  const pagedMobileCircles = filteredCircles.slice(
    mobileCirclesPage * MOBILE_CIRCLES_PAGE_SIZE,
    mobileCirclesPage * MOBILE_CIRCLES_PAGE_SIZE + MOBILE_CIRCLES_PAGE_SIZE
  );

  const canPrevMobileCircles = mobileCirclesPage > 0;
  const canNextMobileCircles = mobileCirclesPage < totalMobileCirclePages - 1;

  const goPrevMobileCircles = () => {
    setMobileCirclesPage(p => (p > 0 ? p - 1 : p));
  };
  const goNextMobileCircles = () => {
    setMobileCirclesPage(p => (p < totalMobileCirclePages - 1 ? p + 1 : p));
  };

  // Reset page to 0 when filters (search) change or count shrinks
  useEffect(() => {
    setMobileCirclesPage(0);
  }, [searchTerm, allCircles.length]);

  // === Schedules pagination (separate mobile vs desktop) ===
  const MOBILE_SCHEDULES_PAGE_SIZE = 2; // المطلوب للموبايل
  const DESKTOP_SCHEDULES_PAGE_SIZE = 4; // يمكن تغييره بسهولة لاحقاً دون التأثير على الموبايل
  const sortedSchedules = [...circleSchedules].sort(
    (a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time)
  );

  // Mobile schedule pagination state
  const [mobileSchedulePage, setMobileSchedulePage] = useState(0);
  const totalMobileSchedulePages = Math.ceil(sortedSchedules.length / MOBILE_SCHEDULES_PAGE_SIZE) || 1;
  const pagedMobileSchedules = sortedSchedules.slice(
    mobileSchedulePage * MOBILE_SCHEDULES_PAGE_SIZE,
    mobileSchedulePage * MOBILE_SCHEDULES_PAGE_SIZE + MOBILE_SCHEDULES_PAGE_SIZE
  );
  const prevMobileSchedulePage = () => setMobileSchedulePage(p => (p > 0 ? p - 1 : p));
  const nextMobileSchedulePage = () => setMobileSchedulePage(p => (p < totalMobileSchedulePages - 1 ? p + 1 : p));

  // Desktop schedule pagination state
  const [desktopSchedulePage, setDesktopSchedulePage] = useState(0);
  const totalDesktopSchedulePages = Math.ceil(sortedSchedules.length / DESKTOP_SCHEDULES_PAGE_SIZE) || 1;
  const pagedDesktopSchedules = sortedSchedules.slice(
    desktopSchedulePage * DESKTOP_SCHEDULES_PAGE_SIZE,
    desktopSchedulePage * DESKTOP_SCHEDULES_PAGE_SIZE + DESKTOP_SCHEDULES_PAGE_SIZE
  );
  const prevDesktopSchedulePage = () => setDesktopSchedulePage(p => (p > 0 ? p - 1 : p));
  const nextDesktopSchedulePage = () => setDesktopSchedulePage(p => (p < totalDesktopSchedulePages - 1 ? p + 1 : p));

  // Reset both when circle or schedules change
  useEffect(() => { setMobileSchedulePage(0); setDesktopSchedulePage(0); }, [selectedCircle?.id, sortedSchedules.length]);

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
    setSelectedCircle(null);
    setCircleSchedules([]);
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

  const tableSchedules = sortedSchedules.map((s, idx) => ({ ...s, row_index: idx + 1, id: s.id ?? `sch-${idx}` }));

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-0.5 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-300 animate-pulse" />
                <span className="line-clamp-1">{scsLabels.pageTitle} </span>
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-sm text-green-100/90 mt-0.5">
                {scsLabels.pageDescription}
              </CardDescription>
            </div>

          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-6 px-2 sm:px-4 pt-3 pb-4">
          <div className="grid md:grid-cols-4 gap-2 sm:gap-6">
            {/* قائمة الجوال */}
            <div className="md:hidden">
              <div className="bg-white/70 backdrop-blur border border-green-200 rounded-lg shadow-sm overflow-hidden mb-3">
                {/* الهيدر */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-2 py-2 bg-gradient-to-r from-green-600 via-green-500 to-green-600">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-white" />
                    <h2 className="text-[12px] font-semibold text-white">{scsLabels.circlesListTitle}</h2>
                  </div>
                  {selectedCircle && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/80">{scsLabels.teacherShort}</span>
                      <Badge className="bg-white/20 text-white font-normal px-2 py-0 h-4 rounded-full text-[10px]">
                        {selectedCircle.teacher?.full_name?.split(" ")[0] || scsLabels.teacherUnknown}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* البحث */}
                {userRole !== 'teacher' && (
                  <div className="px-2 pt-2">
                    <div className="relative">
                      <Search className="absolute right-2 top-2 h-3.5 w-3.5 text-green-400" />
                      <Input
                        placeholder={scsLabels.searchPlaceholder}
                        className="pr-7 h-8 text-[11px] rounded-lg border-green-300 focus:ring-green-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* العناصر */}
                <div className="px-2 pt-2 pb-1 overflow-y-auto max-h-44 custom-scrollbar">
                  {loading ? (
                    <div className="w-full py-6 text-center flex flex-col items-center">
                      <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full mb-2"></div>
                      <span className="text-green-700 text-[12px] font-medium">{scsLabels.loading}</span>
                    </div>
                  ) : filteredCircles.length === 0 ? (
                    <div className="w-full py-6 text-center text-green-600 text-[12px]">{scsLabels.noResults}</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {pagedMobileCircles.map(circle => {
                        const active = selectedCircle?.id === circle.id;
                        return (
                          <button
                            key={circle.id}
                            onClick={() => handleSelectCircle(circle)}
                            className={`group flex items-center justify-between w-full px-2 py-1.5 rounded-md border text-[11px] transition-all duration-200
                        ${active
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-300 text-white shadow-md'
                                : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 hover:shadow-sm'}
                      `}
                          >
                            <span className="font-medium truncate">{circle.name}</span>
                            <div className="flex items-center gap-1.5">
                              {circle.teacher && (
                                <span className={`text-[10px] ${active ? 'text-green-100' : 'text-green-500'}`}>
                                  {circle.teacher.full_name.split(" ")[0]}
                                </span>
                              )}
                              {active && (
                                <span className="inline-flex items-center bg-white/30 text-[9px] px-1 py-0.5 rounded-full font-medium">
                                  ✓
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {/* Pagination controls */}
                      {totalMobileCirclePages > 1 && (
                        <div className="mt-2 flex flex-col items-center gap-1 py-1">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={goPrevMobileCircles}
                              disabled={!canPrevMobileCircles}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border shadow-sm transition-all
                                ${canPrevMobileCircles ? 'bg-white border-green-300 text-green-700 hover:bg-green-50 active:scale-95' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                              aria-label={scsLabels.prevLabel}
                            >
                              ‹
                            </button>
                            <div className="flex items-center gap-1" aria-label={scsLabels.pagesIndicatorAria}>
                              {Array.from({ length: totalMobileCirclePages }).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-2 h-2 rounded-full transition-all ${i === mobileCirclesPage ? 'bg-green-600 scale-110' : 'bg-green-300'
                                    }`}
                                  aria-label={`صفحة ${i + 1}`}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={goNextMobileCircles}
                              disabled={!canNextMobileCircles}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border shadow-sm transition-all
                                ${canNextMobileCircles ? 'bg-white border-green-300 text-green-700 hover:bg-green-50 active:scale-95' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                              aria-label={scsLabels.nextLabel}
                            >
                              ›
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* جانب الحلقات - ثلث الصفحة (ديسكتوب) */}
            <div className="md:col-span-1 hidden md:block">
              <div className="bg-green-50 border border-green-300 rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 p-3">
                  <h2 className="text-lg font-semibold text-white mb-0 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {scsLabels.circlesHeading}
                  </h2>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 md:space-y-5">
                  {/* مربع البحث */}
                  <div className="relative">
                    {userRole !== 'teacher' && (
                      <div className="relative mt-1">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-green-400" />
                        <Input
                          placeholder={scsLabels.searchPlaceholder}
                          className="pr-10 pl-3 py-2 border-2 border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 shadow-sm text-sm"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-8 gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                      <span className="text-sm text-green-600">{scsLabels.loadingCircles}</span>
                    </div>
                  ) : filteredCircles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                      <BookOpen className="h-12 w-12 text-green-200" />
                      <h3 className="text-lg font-semibold text-green-800">{scsLabels.noCircles}</h3>
                      <p className="text-sm text-green-600">
                        {scsLabels.noCirclesSearch}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-green-100">
                      {filteredCircles.map((circle) => (
                        <div
                          key={circle.id}
                          className={`cursor-pointer transition-all duration-200 rounded-2xl flex flex-col gap-1 p-2.5 shadow-sm text-sm ${selectedCircle?.id === circle.id
                            ? 'bg-green-700 text-white ring-1 ring-green-400'
                            : 'bg-green-50 hover:bg-green-100 text-green-800'
                            }`}
                          onClick={() => handleSelectCircle(circle)}
                        >
                          <div className="flex items-center justify-between font-medium gap-1">
                            {/* اسم الحلقة مع أيقونة كتاب صغيرة */}
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-green-500">📖</span>
                              <span className="truncate">{circle.name}</span>
                              {circle.teacher && (
                                <span className={`flex items-center gap-1 text-[11px] truncate ${selectedCircle?.id === circle.id ? 'text-white' : 'text-green-700'
                                  }`}>
                                  👨‍🏫 {circle.teacher.full_name}
                                </span>
                              )}
                            </div>

                            {selectedCircle?.id === circle.id && (
                              <Badge
                                variant="outline"
                                className={`${selectedCircle?.id === circle.id ? 'text-white border-white' : 'text-green-800 border-green-400'
                                  } text-xs`}
                              >
                                {scsLabels.selectedBadge}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* جانب الجدولة - ثلثين الصفحة */}
            <div className="md:col-span-3">
              <div className="bg-green-50 border border-green-200 rounded-none md:rounded-xl shadow-sm overflow-hidden">

                {/* هيدر ديناميكي حسب الشاشة */}
                {/** هيدر الموبايل **/}
                <div className="flex items-center justify-between md:hidden px-2 py-1 bg-gradient-to-r from-green-600 via-green-500 to-green-600 rounded-t-lg">
                  <div className="flex items-center gap-1 truncate">
                    {selectedCircle?.teacher && (
                      <>
                        <BookOpen className="h-3 w-3 text-white" />
                        <span className="text-[9px] text-white truncate">
                          <span className="truncate">{selectedCircle.name}</span> 👨‍🏫 {selectedCircle.teacher.full_name.split(" ")[0]}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {canEditSchedules && selectedCircle && (
                      <Button
                        onClick={handleAddSchedule}
                        size="sm"
                        className="flex items-center gap-1 rounded-md bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[8px] px-1 py-0.5 h-5 shadow-none"
                        title={scsLabels.addScheduleTooltip}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    )}

                    {selectedCircle && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        className="flex items-center gap-1 rounded-md bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-[8px] px-1 py-0.5 h-5 shadow-none border border-green-200"
                        title={scsLabels.clearSelection}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>

                    )}
                  </div>
                </div>


                {/** هيدر الديسكتوب **/}
                <div className="hidden md:flex justify-between items-center bg-gradient-to-r from-green-100 via-green-200 to-green-700 px-4 py-4 rounded-t-xl">
                  <CardTitle className="text-lg font-bold text-white flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-green-700" />
                      {selectedCircle ? `${scsLabels.pageTitle.replace('الحلقات الدراسية', 'حلقة')}: ${selectedCircle.name}` : scsLabels.pageTitle} | 👨‍🏫
                    </div>

                    {selectedCircle?.teacher && (
                      <CardDescription className="text-gray-700 text-xs sm:text-[10px]">
                        {scsLabels.teacherShort.replace(':', '')}: {selectedCircle.teacher.full_name}
                      </CardDescription>
                    )}
                  </CardTitle>

                  {selectedCircle && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-3 rounded-3xl border-2 border-green-600 text-green-900 
                                  hover:bg-green-100 hover:text-green-800 hover:scale-105 
                                  dark:border-green-500 dark:text-green-300 dark:hover:bg-green-800 dark:hover:text-green-200 
                                  shadow-lg transition-all duration-200 px-5 py-2 font-semibold"
                        onClick={handleClearSelection}
                      >
                        {scsLabels.clearSelection}
                      </Button>

                      {canEditSchedules && (
                        <Button
                          onClick={handleAddSchedule}
                          size="sm"
                          className="flex items-center gap-3 rounded-3xl bg-green-600 hover:bg-green-700 
                                     dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-5 py-2 font-semibold"
                        >
                          <Plus className="h-4 w-4" />
                          {scsLabels.scheduleAdd}
                        </Button>
                      )}
                    </div>
                  )}
                </div>


                {/* محتوى الجدولة */}
                <CardContent className="px-3 sm:px-4 pt-4 pb-5">
                  {!selectedCircle ? (
                    <div className="flex flex-col items-center justify-center p-10 sm:p-12 text-center gap-3 text-sm sm:text-base">
                      <Calendar className="h-16 w-16 text-green-200" />
                      <h3 className="text-xl font-semibold text-green-800">{scsLabels.chooseCircleTitle}</h3>
                      <p className="text-green-600 max-w-md">
                        {scsLabels.chooseCircleHelp}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <GenericTable
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
                        /* تطبيق نفس فكرة جدول سجلات الحفظ: إخفاء أيقونة الترتيب الافتراضي، تلوين الصفوف، تنسيق الإطار */
                        className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
                        getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
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
                </CardContent>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
