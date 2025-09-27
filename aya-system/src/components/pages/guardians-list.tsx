import { AlertCircle, Database, FileDown, Mail, Pencil, Phone, RefreshCw, Trash2, UserCircle, UserPlus, Filter, ArrowDownUp, ArrowDownAZ, ArrowUpZA, Plus } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
// Removed manual pagination components (now using GenericTable internal pagination)
import { Search, MapPin, GraduationCap } from 'lucide-react';
import { useState, useEffect, useMemo } from "react";
import { getAllGuardians, searchGuardians, deleteGuardian, exportGuardiansToJson } from "@/lib/guardian-service";
import { getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { addStudent } from "@/lib/supabase-service";
import { getteachers } from "@/lib/profile-service";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // legacy usages elsewhere
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Guardian, GuardianCreate, GuardianUpdate } from "@/types/guardian";
import { StudentCreate } from "@/types/student";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Unified labels system
import { getLabels } from '@/lib/labels';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile } from "@/types/profile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase-client';
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";
import { GenericTable } from "../ui/generic-table";
import { FormDialog, FormRow } from "../ui/form-dialog";
import { StudentFormDialog, StudentFormData } from "@/components/students/StudentFormDialog";
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Fetches students associated with a specific guardian
 * @param guardianId The ID of the guardian
 * @returns Array of student objects
 */
// 1. تعديل استعلام getStudentsByGuardianId لجلب المزيد من البيانات
export async function getStudentsByGuardianId(guardianId: string) {
  try {
    // Get students with this guardian ID
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        *,
        study_circles:study_circle_id (
          id,
          name,
          teacher:teacher_id (
            id,
            full_name
          )
        )
      `)
      .eq('guardian_id', guardianId);

    if (error) {
      console.error('Error fetching students by guardian id:', error);
      return [];
    }

    return students.map(student => ({
      ...student,
      teacher_name: student.study_circles?.teacher?.full_name || null,
      teacher_id: student.study_circles?.teacher?.id || student.teacher_id || null,
      circle_name: student.study_circles?.name || null,
      grade: student.grade_level || student.grade || null
    }));
  } catch (error) {
    console.error('Exception in getStudentsByGuardianId:', error);
    return [];
  }
}


/**
 * Fetches a student by ID
 * @param studentId The ID of the student to fetch
 * @returns The student object or null
 */
export async function getStudentById(studentId: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        guardians:guardian_id (*),
        profiles:current_teacher_id (*)
      `)
      .eq('id', studentId)
      .single();

    if (error) {
      console.error('Error fetching student by id:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getStudentById:', error);
    return null;
  }
}


interface GuardiansProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string | null;
}

export function Guardians({ onNavigate, userRole, userId }: GuardiansProps) {
  const { toast } = useToast();
  const { errorMessages, successMessages, commonLabels, studentsLabels, guardiansLabels } = getLabels('ar');
  // كاشف حالة الموبايل لإدارة عرض البطاقات وعدد الحقول (استخدام هوك مباشرة)
  const isMobile = useIsMobile();

  // حالة القائمة
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Removed external currentPage state (using internal GenericTable pagination)
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // تنفيذ استرجاع البيانات عند تحميل المكون
  useEffect(() => {
    console.log('Component mounted, fetching guardians...');
    loadGuardians();
    loadteachers();
  }, []);

  // تحميل المعلمين والمشرفين
  const loadteachers = async () => {
    try {
      console.log("Loading teachers with userRole:", userRole, "and userId:", userId);
      const teachersList = await getteachers();
      console.log("Loaded teachers (raw):", teachersList);

      if (teachersList.length === 0) {
        console.warn("No teachers loaded from API!");
      }

      // فلترة القائمة لتشمل المعلمين والمشرفين فقط
      const filteredteachers = teachersList.filter(
        teacher => teacher.role === 'teacher' || teacher.role === 'admin'
      );
      console.log("Filtered teachers:", filteredteachers);
      setteachers(filteredteachers);

      // تعيين معرف المعلم إذا كان المستخدم معلمًا
      if (userRole === 'teacher' && userId) {
        console.log("Current user is teacher, setting teacher ID:", userId);

        // البحث عن المعلم بمعرّف المستخدم
        const currentteacher = filteredteachers.find(s => s.id === userId);
        console.log("teacher search result:", currentteacher);

        if (currentteacher) {
          console.log("Found teacher:", currentteacher.full_name);
          setteacherId(userId);
        } else {
          console.warn("WARNING: Current teacher with ID", userId, "not found in the list!");

          // محاولة عرض معرّفات المعلمين للمقارنة
          console.log("Available teacher IDs:", filteredteachers.map(s => s.id));
        }
      }
    } catch (error) {
      console.error(errorMessages.dataError + ':', error);
    }
  };

  // حالة الحوار
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(guardiansLabels.addGuardian);

  // حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<Guardian | null>(null);
  // حالة تحميل خاصة بعملية الحذف فقط (لتجنب تعطيل الزر بسبب تحميل عام للصفحة)
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);

  // نموذج ولي الأمر
  const [guardianId, setGuardianId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // حوار إضافة طالب
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentInitialData, setStudentInitialData] = useState<Partial<StudentFormData> | undefined>(undefined);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>("");
  const [teacherId, setteacherId] = useState<string>("");
  const [teacherSearchTerm, setteacherSearchTerm] = useState<string>("");
  const [teachers, setteachers] = useState<Profile[]>([]);
  const [isGeneralAddStudent, setIsGeneralAddStudent] = useState(false);
  const [guardianSearchTerm, setGuardianSearchTerm] = useState<string>("");
  const [studyCircleId, setStudyCircleId] = useState<string>("");
  const [teacherCircles, setTeacherCircles] = useState<{ id: string; name: string; teacher_id?: string }[]>([]);
  const [isLoadingTeacherCircles, setIsLoadingTeacherCircles] = useState(false);
  // كاش للحلقات حسب المعلم لتفادي إعادة الطلب
  const circlesCacheRef = useState<Record<string, { id: string; name: string; teacher_id?: string }[]>>({})[0];

  // 1. أولاً، أضف متغيرات الحالة الجديدة لحوار عرض الطلاب
  const [isStudentsListDialogOpen, setIsStudentsListDialogOpen] = useState(false);
  const [selectedGuardianStudents, setSelectedGuardianStudents] = useState<any[]>([]);
  const [selectedGuardianName, setSelectedGuardianName] = useState("");
  // عند تحرير طالب من قائمة طلاب ولي الأمر نحتاج معرفة السياق لإبقاء القائمة مفتوحة
  const [editingFromStudentsList, setEditingFromStudentsList] = useState(false);
  // حالة تحميل طلاب ولي الأمر (لزر العدد والحوار)
  const [isLoadingGuardianStudents, setIsLoadingGuardianStudents] = useState(false);
  const [studentsListLoadingGuardianId, setStudentsListLoadingGuardianId] = useState<string | null>(null);
  // معرف ولي الأمر الحالي المعروض طلابه (لأجل إعادة التحميل)
  const [studentsListGuardianId, setStudentsListGuardianId] = useState<string | null>(null);
  // عدد الحقول المبدئية في بطاقات الطلاب على الموبايل (يُضبط حسب عرض الشاشة)
  const [mobileCollapsedFields, setMobileCollapsedFields] = useState(3);
  // حالة عامة لمنع الضغط المتكرر وإظهار لودينج (لأزرار الأكشن في الصفوف)
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const startAction = async (key: string, fn: () => Promise<void> | void) => {
    if (pendingActionKey) return; // منع تداخل أكشن آخر
    setPendingActionKey(key);
    try { await fn(); } finally { setPendingActionKey(null); }
  };
  // شريط الأدوات الجديد: التابات + الفلترة + الترتيب
  const [activeTab, setActiveTab] = useState<'all-records' | 'my-records'>('all-records');
  const [showFilters, setShowFilters] = useState(false);
  const [listSortDirection, setListSortDirection] = useState<null | 'asc' | 'desc'>(null);
  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

  useEffect(() => {
    // تحديث العدد بناءً على عرض الشاشة الفعلي
    const updateCollapsed = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      if (w < 360) setMobileCollapsedFields(2); // شاشات صغيرة جداً
      else if (w < 420) setMobileCollapsedFields(3); // موبايل صغير
      else setMobileCollapsedFields(4); // موبايل أوسع
    };
    updateCollapsed();
    window.addEventListener('resize', updateCollapsed);
    return () => window.removeEventListener('resize', updateCollapsed);
  }, []);

  // Pagination config
  const itemsPerPage = 10;

  // حالة تحميل زر الحفظ في نموذج إضافة/تعديل ولي الأمر
  const [isSavingGuardian, setIsSavingGuardian] = useState(false);

  // تحميل البيانات
  useEffect(() => {
    loadGuardians();
  }, []);

  const loadGuardians = async (searchQuery?: string) => {
    setLoading(true);
    setError(null);

    try {
      let guardiansList;
      if (searchQuery) {
        guardiansList = await searchGuardians(searchQuery);
      } else {
        guardiansList = await getAllGuardians();
        // إعادة تعيين مربع البحث عند تحميل كل البيانات
        setSearchTerm('');
      }

      console.log('Loaded guardians:', guardiansList.length, 'records');

      // التحقق من البيانات
      if (guardiansList.length > 0) {
        console.log('Sample guardian data:', JSON.stringify(guardiansList[0]));
      } else {
        // محاولة فحص قاعدة البيانات مباشرة
        console.log('No guardians found in the result, attempting direct database check');

        const { data: guardianData } = await import('@/lib/supabase-client').then(module => {
          return module.supabase.from('guardians').select('*').limit(5);
        });

        console.log('Direct database check result:', guardianData);
      }

      setGuardians(guardiansList);
    } catch (error) {
      console.error(errorMessages.errorLoadingData, error);
      setError(errorMessages.fetchFailed);
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  };

  // البحث عن أولياء الأمور
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadGuardians();
      return;
    }

    setLoading(true);
    try {
      const results = await searchGuardians(searchTerm);
      setGuardians(results);

      // إظهار رسالة عند عدم وجود نتائج للبحث
      if (searchTerm && results.length === 0) {
        toast({
          title: guardiansLabels.noSearchResults,
          description: guardiansLabels.tryAnotherSearch,
        });
      }
    } catch (error) {
      console.error(errorMessages.searchError, error);
      toast({
        title: errorMessages.fetchFailed,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Export data to JSON
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const result = await exportGuardiansToJson();
      if (result.success && result.data) {
        // Create a downloadable blob
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `guardians_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: guardiansLabels.exportSuccess,
          className: "bg-green-50 border-green-200",
        });
      } else {
        setError(`${guardiansLabels.exportFailed}: ${result.message || guardiansLabels.unknownError}`);
      }
    } catch (err) {
      console.error(guardiansLabels.exportFailed + ':', err);
      setError(guardiansLabels.exportFailedDescription);
    } finally {
      setExportLoading(false);
    }
  };

  // إضافة ولي أمر جديد
  const handleAddGuardian = () => {
    setDialogMode("add");
    setDialogTitle(guardiansLabels.addGuardian);
    setGuardianId("");
    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setAddress("");
    setIsDialogOpen(true);

    // تحديد التركيز على حقل الاسم بعد فتح النموذج
    setTimeout(() => {
      const nameInput = document.getElementById("full_name");
      if (nameInput) {
        (nameInput as HTMLInputElement).focus();
      }
    }, 100);
  };

  // إضافة طالب جديد
  const handleAddStudent = (guardianId?: string, isGeneral: boolean = false) => {
    setteacherSearchTerm("");
    setGuardianSearchTerm("");
    setSelectedGuardianId(guardianId || "");
    setIsGeneralAddStudent(isGeneral);
    setEditingStudentId(null);
    setStudentInitialData(undefined);
    setteacherId(userRole === 'teacher' && userId ? userId : "");
    setStudyCircleId("");
    setTeacherCircles([]);
    setIsStudentDialogOpen(true);
  };

  // In the handleSaveStudent function in guardians-list.tsx
  const handleSubmitStudent = async (data: StudentFormData) => {
    try {
      if (!editingStudentId) {
        const newStudent: StudentCreate = {
          full_name: data.full_name,
          guardian_id: data.guardian_id || selectedGuardianId,
          grade_level: data.grade_level!,
          date_of_birth: data.date_of_birth || undefined,
          phone_number: data.phone_number || undefined,
          email: data.email || undefined,
          memorized_parts: data.memorized_parts || undefined,
          notes: data.notes || undefined,
          study_circle_id: data.study_circle_id || undefined
        };
        const result = await addStudent(newStudent);
        if (result.success) {
          toast({ title: studentsLabels.addSuccess, className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          loadStudentCounts();
        } else {
          toast({ title: errorMessages.saveFailed, description: result.message || errorMessages.generalError || 'حدث خطأ غير متوقع', variant: 'destructive' });
        }
      } else {
        const updatedStudent: any = {
          id: editingStudentId,
          full_name: data.full_name,
          guardian_id: data.guardian_id || selectedGuardianId,
          grade_level: data.grade_level,
          date_of_birth: data.date_of_birth || null,
          phone_number: data.phone_number || null,
          email: data.email || null,
          memorized_parts: data.memorized_parts || null,
          notes: data.notes || null,
          study_circle_id: data.study_circle_id || null
        };
        const { updateStudent } = await import('@/lib/supabase-service');
        const result = await updateStudent(updatedStudent);
        if (result.success) {
          toast({ title: studentsLabels.updateSuccess, className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          setSelectedGuardianStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, ...updatedStudent } : s));
        } else {
          toast({ title: errorMessages.updateFailed, description: result.message || errorMessages.generalError || 'حدث خطأ غير متوقع', variant: 'destructive' });
        }
      }
    } catch (err) {
      console.error('خطأ في حفظ بيانات الطالب:', err);
      toast({ title: errorMessages.generalError, description: errorMessages.generalError || 'حدث خطأ غير متوقع', variant: 'destructive' });
    }
  };

  // فتح تعديل طالب من جدول طلاب ولي الأمر
  const handleEditStudentFromGuardianList = (student: any) => {
    // تأكد من بقاء قائمة طلاب ولي الأمر مفتوحة (أو إعادة فتحها)
    setIsStudentsListDialogOpen(true);
    setEditingFromStudentsList(true);
    setEditingStudentId(student.id);
    setSelectedGuardianId(student.guardian_id || selectedGuardianId);
    setIsGeneralAddStudent(true);
    const derivedTeacherId = student.teacher_id || student.study_circles?.teacher?.id || null;
    if (derivedTeacherId) {
      loadCirclesForTeacher(derivedTeacherId);
    } else {
      setTeacherCircles([]);
    }
    setStudentInitialData({
      id: student.id,
      full_name: student.full_name,
      guardian_id: student.guardian_id,
      grade_level: student.grade_level || student.grade,
      date_of_birth: student.date_of_birth || undefined,
      phone_number: student.phone_number || undefined,
      email: student.email || undefined,
      memorized_parts: student.memorized_parts || undefined,
      notes: student.notes || undefined,
      study_circle_id: student.study_circle_id || undefined,
      teacher_id: derivedTeacherId || undefined,
    });
    // محاولة تحميل حلقات المعلم الحالي (إن وجدت) لتعبئة القائمة
    setIsStudentDialogOpen(true);
  };

  // تحميل الحلقات بعد اختيار المعلم داخل نموذج الطالب (المكون العام)
  const loadCirclesForTeacher = async (tid: string) => {
    if (!tid) { setTeacherCircles([]); return; }
    // تحقق من الكاش أولاً
    if (circlesCacheRef[tid]) {
      setTeacherCircles(circlesCacheRef[tid]);
      return;
    }
    setIsLoadingTeacherCircles(true);
    try {
      const circles = await getStudyCirclesByTeacherId(tid);
      setTeacherCircles(circles);
      circlesCacheRef[tid] = circles;
    } catch (e) {
      console.error('خطأ في تحميل الحلقات للمعلم', tid, e);
      setTeacherCircles([]);
    } finally {
      setIsLoadingTeacherCircles(false);
    }
  };

  // تعديل ولي أمر
  const handleEditGuardian = async (guardian: Guardian) => {
    setDialogMode("edit");
    setDialogTitle(guardiansLabels.editGuardian);
    setGuardianId(guardian.id);
    setFullName(guardian.full_name);
    setPhoneNumber(guardian.phone_number);
    setEmail(guardian.email || "");
    setAddress(guardian.address || "");
    setIsDialogOpen(true);
  };

  // حذف ولي أمر
  const handleDeleteGuardian = (guardian: Guardian) => {
    setGuardianToDelete(guardian);
    setIsDeleteDialogOpen(true);
  };

  // تأكيد حذف ولي أمر
  const confirmDeleteGuardian = async () => {
    if (!guardianToDelete) return;

    try {
      setIsDeleteProcessing(true);
      const result = await deleteGuardian(guardianToDelete.id);

      if (result.success) {
        toast({
          title: guardiansLabels.deleteSuccess,
          description: "",
          className: "bg-green-50 border-green-200",
        });
        loadGuardians();
      } else {
        toast({
          title: errorMessages.deleteFailed,
          description: result.message || guardiansLabels.unexpectedError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(errorMessages.deleteFailed + ':', error);
      toast({
        title: errorMessages.generalError,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setGuardianToDelete(null);
      setIsDeleteProcessing(false);
    }
  };

  // حفظ البيانات
  const handleSaveGuardian = async () => {
    if (!fullName || !phoneNumber) {
      toast({
        title: guardiansLabels.incompleteData,
        description: guardiansLabels.incompleteDataMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingGuardian(true);
      if (dialogMode === "add") {
        // إنشاء ولي أمر جديد
        const newGuardian: GuardianCreate = {
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || undefined,
          address: address || undefined
        };

        const result = await import('@/lib/guardian-service').then(module => {
          return module.addGuardian(newGuardian);
        });

        console.log('Guardian add result:', result);

        if (result.success) {
          toast({
            title: guardiansLabels.addSuccess,
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadGuardians();
        } else {
          toast({
            title: errorMessages.saveFailed,
            description: result.message || guardiansLabels.unexpectedError,
            variant: "destructive",
          });
        }
      } else {
        // تحديث ولي أمر موجود
        const updatedGuardian: GuardianUpdate = {
          id: guardianId,
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || undefined,
          address: address || undefined
        };

        const result = await import('@/lib/guardian-service').then(module => {
          return module.updateGuardian(updatedGuardian);
        });

        if (result.success) {
          toast({
            title: guardiansLabels.updateSuccess,
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadGuardians();
        } else {
          toast({
            title: errorMessages.updateFailed,
            description: result.message || guardiansLabels.unexpectedError,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error(errorMessages.saveFailed + ':', error);
      toast({
        title: errorMessages.generalError,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsSavingGuardian(false);
    }
  };

  // وظيفة لتحميل وعرض الطلاب لولي أمر محدد
  const handleShowGuardianStudents = async (guardianId: string, guardianName: string) => {
    // افتح الحوار فوراً مع حالة تحميل
    setSelectedGuardianName(guardianName);
    setSelectedGuardianStudents([]);
    setIsStudentsListDialogOpen(true);
    setIsLoadingGuardianStudents(true);
    setStudentsListLoadingGuardianId(guardianId);
    setStudentsListGuardianId(guardianId);
    try {
      console.log('[handleShowGuardianStudents] guardianId:', guardianId, 'guardianName:', guardianName);
      const students = await getStudentsByGuardianId(guardianId);
      console.log('[handleShowGuardianStudents] students fetched:', students);
      setSelectedGuardianStudents(students);
      if (students.length === 0) {
        toast({
          title: guardiansLabels.noStudentsForGuardian,
          duration: 2500
        });
      }
    } catch (error) {
      console.error(guardiansLabels.studentsLoadErrorTitle + ':', error);
      toast({
        title: guardiansLabels.studentsLoadErrorTitle,
        description: guardiansLabels.studentsLoadErrorDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoadingGuardianStudents(false);
      setStudentsListLoadingGuardianId(null);
    }
  };

  // إعادة تحميل قائمة الطلاب لنفس ولي الأمر بدون إغلاق الحوار
  const reloadGuardianStudents = async () => {
    if (!studentsListGuardianId) return;
    setIsLoadingGuardianStudents(true);
    setStudentsListLoadingGuardianId(studentsListGuardianId);
    try {
      const students = await getStudentsByGuardianId(studentsListGuardianId);
      setSelectedGuardianStudents(students);
      if (students.length === 0) {
        toast({ title: guardiansLabels.noStudentsForGuardian, duration: 2500 });
      } else {
        toast({ title: guardiansLabels.refresh, className: 'bg-green-50 border-green-200', duration: 1500 });
      }
    } catch (e) {
      toast({ title: guardiansLabels.studentsLoadErrorTitle, description: guardiansLabels.studentsLoadErrorDescription, variant: 'destructive' });
    } finally {
      setIsLoadingGuardianStudents(false);
      setStudentsListLoadingGuardianId(null);
    }
  };


  // وظيفة حذف الطالب
  // حالة حوار حذف الطالب
  const [isDeleteStudentDialogOpen, setIsDeleteStudentDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isProcessingStudentDelete, setIsProcessingStudentDelete] = useState(false);

  // طلب حذف (فتح الحوار)
  const requestDeleteStudent = (studentId: string) => {
    setStudentToDelete(studentId);
    setIsDeleteStudentDialogOpen(true);
  };

  // تنفيذ الحذف بعد التأكيد
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsProcessingStudentDelete(true);
      const { deleteStudent } = await import('@/lib/supabase-service');
      const result = await deleteStudent(studentToDelete);
      if (result.success) {
        toast({
          title: guardiansLabels.studentDeleteSuccess,
          className: 'bg-green-50 border-green-200'
        });
        setSelectedGuardianStudents(prev => prev.filter(s => s.id !== studentToDelete));
      } else {
        toast({
          title: guardiansLabels.studentDeleteFailed,
          description: result.message || guardiansLabels.studentDeleteFailedDescription,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error(guardiansLabels.studentDeleteUnexpectedError + ':', error);
      toast({
        title: guardiansLabels.studentDeleteFailed,
        description: guardiansLabels.studentDeleteUnexpectedError,
        variant: 'destructive'
      });
    } finally {
      setIsProcessingStudentDelete(false);
      setIsDeleteStudentDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  const loadStudentCounts = async () => {
    try {
      console.log("Loading student counts for guardians...");
      const { supabase } = await import('@/lib/supabase-client');

      // الحصول على عدد الطلاب لكل ولي أمر
      const { data: studentCounts, error } = await supabase
        .from('students')
        .select('guardian_id, id');

      if (error) {
        console.error("Error fetching student counts:", error);
        return;
      }

      // حساب عدد الطلاب لكل ولي أمر
      const countsMap = studentCounts.reduce((acc, student) => {
        if (student.guardian_id) {
          acc[student.guardian_id] = (acc[student.guardian_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      console.log("Student counts updated:", countsMap);

      // تحديث قائمة أولياء الأمور مع عدد الطلاب
      setGuardians(prevGuardians =>
        prevGuardians.map(guardian => ({
          ...guardian,
          students_count: countsMap[guardian.id] || 0
        }))
      );
    } catch (error) {
      console.error("Error in loadStudentCounts:", error);
    }
  };

  // استدعاء وظيفة تحميل عدد الطلاب بعد تحميل أولياء الأمور
  useEffect(() => {
    if (guardians.length > 0) {
      loadStudentCounts();
    }
  }, [guardians]);

  // Filter and paginate guardians
  const filteredGuardians = useMemo(() => {
    let list = guardians.filter(guardian => {
      // تبويب "سجلاتي" (مبدئياً يعتمد على userId إذا المعلم أو المسؤول) يمكن تخصيصه لاحقاً
      if (activeTab === 'my-records' && userRole === 'teacher' && userId) {
        // نفترض وجود teacher_id في guardian لو مرتبط (إن لم يوجد لا يتم التصفية الآن)
        if ((guardian as any).teacher_id && (guardian as any).teacher_id !== userId) return false;
      }
      if (!searchTerm) return true;
      return (
        guardian.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardian.phone_number.includes(searchTerm) ||
        (guardian.email && guardian.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    if (listSortDirection) {
      list = [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar', { sensitivity: 'base' }) * (listSortDirection === 'asc' ? 1 : -1));
    }
    return list;
  }, [guardians, searchTerm, listSortDirection, activeTab, userRole, userId]);

  // تمت إزالة حالة tablePage السابقة بعد الاعتماد على الترقيم الصفحي الداخلي للمكون العام

  // ===== Helpers: تطبيع قيم المرحلة الدراسية والأجزاء المحفوظة =====
  const normalizeKey = (v: string) => v.toString().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const getGradeLabel = (raw: any) => {
    if (raw === null || raw === undefined || raw === '') return '-';
    const rawStr = String(raw).trim();
    const options = studentsLabels.gradeOptions || [];
    // محاولة مطابقة مباشرة
    let direct = options.find(o => String(o.value) === rawStr);
    if (direct) return direct.label;
    // تطبيع ومقارنة بدون فواصل / شرطات
    const norm = normalizeKey(rawStr);
    const normMatch = options.find(o => normalizeKey(String(o.value)) === norm);
    if (normMatch) return normMatch.label;
    // محاولات خاصة لرياض الأطفال (kg, kg1, kg2 إلخ)
    if (/^kg0?1$/.test(norm)) {
      const kg1 = options.find(o => /kg.?0?1/i.test(String(o.value)));
      if (kg1) return kg1.label;
    }
    if (/^kg0?2$/.test(norm)) {
      const kg2 = options.find(o => /kg.?0?2/i.test(String(o.value)));
      if (kg2) return kg2.label;
    }
    // نمط m1 أو m01 يعتبر الصف الأول (m قد ترمز mix/مرحلة مختصرة)
    const mMatch = norm.match(/^m0*(\d{1,2})$/);
    if (mMatch) {
      const gradeNum = mMatch[1];
      const gradeOption = options.find(o => String(o.value) === gradeNum || normalizeKey(String(o.value)) === gradeNum);
      if (gradeOption) return gradeOption.label;
    }
    // نمط u3 / u01 (قد يأتي من export خارجي) نعامله كرقم الصف
    const uMatch = norm.match(/^u0*(\d{1,2})$/);
    if (uMatch) {
      const gradeNum = uMatch[1];
      const gradeOption = options.find(o => String(o.value) === gradeNum || normalizeKey(String(o.value)) === gradeNum);
      if (gradeOption) return gradeOption.label;
    }
    // دعم أنماط مثل p1 أو primary1 أو g1 أو grade1
    const primaryMatch = norm.match(/^(?:p|primary|g|gr|grade)0*(\d{1,2})$/);
    if (primaryMatch) {
      const gradeNum = primaryMatch[1];
      const gradeOption = options.find(o => String(o.value) === gradeNum || normalizeKey(String(o.value)) === gradeNum);
      if (gradeOption) return gradeOption.label;
    }
    return rawStr; // fallback raw
  };

  const getMemorizedPartsLabel = (raw: any) => {
    if (raw === null || raw === undefined || raw === '') return '-';
    const rawStr = String(raw).trim();
    const options = studentsLabels.quranPartsOptions || [];
    // مطابقة مباشرة
    let direct = options.find(o => String(o.value) === rawStr);
    if (direct) return direct.label;
    const norm = normalizeKey(rawStr);
    const normMatch = options.find(o => normalizeKey(String(o.value)) === norm);
    if (normMatch) return normMatch.label;
    // إذا كانت القيمة part_1 أو part-1 نحاول استخراج الرقم
    const m = norm.match(/^part(\d+)$/);
    if (m) {
      const num = m[1];
      const byNum = options.find(o => normalizeKey(String(o.value)) === num);
      if (byNum) return byNum.label;
      const n = parseInt(num, 10);
      if (!isNaN(n) && n >= 1 && n <= 30) return `${studentsLabels.quranJuzWord} ${studentsLabels.quranJuzOrdinals[n]}`;
    }
    // حالة complete / completed / full / all => ختم القرآن
    if (/^(complete|completed|full|all|khatm|khatam|khatem)$/.test(norm)) {
      return studentsLabels.quranComplete || 'ختم القرآن';
    }
    // fallback إذا كانت القيمة رقم فقط (مثلاً 1 أو 12)
    const numeric = parseInt(rawStr, 10);
    if (!isNaN(numeric) && numeric >= 1 && numeric <= 30) {
      return `${studentsLabels.quranJuzWord} ${studentsLabels.quranJuzOrdinals[numeric]}`;
    }
    return rawStr;
  };

  // Removed custom renderPageNumbers (GenericTable handles pagination UI)

  // التحقق من الصلاحيات
  if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-8 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">{guardiansLabels.accessDenied}</h2>
        <p className="text-muted-foreground mb-6">{guardiansLabels.accessDeniedMessage}</p>
        <Button onClick={() => onNavigate('/')} variant="outline">
          {guardiansLabels.returnToHome}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-0.5 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              {/* العنوان والوصف */}
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-yellow-300" />
                {guardiansLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {guardiansLabels.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0.5 pb-0 px-0 sm:px-0">
          {error && (
            <div className="flex flex-col md:flex-row justify-between items-center 
              gap-0 mb-1 bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-md border border-green-200 dark:border-green-700">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4 ml-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-end items-center gap-3 mb-1 rounded-lg
            bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            {/* أزرار الأدوات */}
            <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end">
              {/* زر الفلتر */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-2xl
                  ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
                  dark:bg-green-700 dark:hover:bg-green-600 shadow-md hover:scale-105 transition-transform duration-200
                  px-3 py-1.5 text-xs font-semibold h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر الترتيب */}
              <Button
                type="button"
                variant={listSortDirection ? 'default' : 'outline'}
                onClick={toggleListSort}
                title={listSortDirection === null ? 'ترتيب تصاعدي حسب الاسم' : listSortDirection === 'asc' ? 'ترتيب تنازلي' : 'إلغاء الترتيب'}
                className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold h-8 shadow-md hover:scale-105 transition-transform duration-200
                  ${listSortDirection === null
                    ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600'
                    : listSortDirection === 'asc'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-500'
                      : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600'}`}
              >
                {listSortDirection === null && <ArrowDownUp className="h-3.5 w-3.5" />}
                {listSortDirection === 'asc' && <ArrowDownAZ className="h-3.5 w-3.5" />}
                {listSortDirection === 'desc' && <ArrowUpZA className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">
                  {listSortDirection === null ? 'ترتيب' : listSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
                </span>
              </Button>
              {/* زر التحديث */}
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                onClick={() => loadGuardians()}
                title={guardiansLabels.refresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              {/* زر التصدير */}
              {(userRole === 'superadmin') && (
                <Button
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                  onClick={handleExportData}
                  title={guardiansLabels.export}
                  disabled={exportLoading || guardians.length === 0}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تصدير</span>
                </Button>
              )}
              {(userRole === 'superadmin' || userRole === 'admin') && (
                <Button
                  onClick={handleAddGuardian}
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                  title={guardiansLabels.addGuardian}
                >
                  <span className="text-lg">👤</span>
                  <span className="hidden sm:inline"> {guardiansLabels.addGuardian}</span>
                </Button>
              )}
              <Button
                onClick={() => handleAddStudent("", true)}
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                title={guardiansLabels.addStudent}
              >
                {/* الأيقونة */}
                <span className="text-lg">🧒</span>
                {/* النص يظهر فقط في الديسكتوب */}
                <span className="hidden sm:inline">{guardiansLabels.addStudent}</span>
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-2 mb-2 w-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                <Input
                  placeholder={guardiansLabels.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 pr-10 w-full bg-white dark:bg-green-950"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <GenericTable
        data={filteredGuardians}
        columns={[
          {
            key: 'row_index',
            header: '🔢',
            align: 'center' as const,
            render: (_item: any, globalIndex?: number) => (globalIndex ?? 0) + 1
          },
          {
            key: 'full_name',
            header: `👤 ${guardiansLabels.fullName}`,
            align: 'right' as const,
            important: true,
            render: (item) => (
              <span className="font-medium whitespace-pre-line leading-snug">
                {item.full_name}
              </span>
            )
          },

          {
            key: 'phone_number',
            header: `📞 ${guardiansLabels.phoneNumber}`,
            align: 'center' as const,
            render: (guardian) =>
              guardian.phone_number ? (
                <div className="flex items-center justify-center gap-1">
                  <Phone className="h-4 w-4 text-islamic-green/60" />
                  <span dir="ltr" className="text-islamic-green/80">{guardian.phone_number}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'email',
            header: `✉️ ${guardiansLabels.email}`,
            align: 'center' as const,
            render: (guardian) =>
              guardian.email ? (
                <div className="flex items-center justify-end gap-1">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-islamic-green/60" />
                  <span dir="ltr" className="text-islamic-green/80 text-xs truncate block">
                    {guardian.email}
                  </span>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <span className="text-muted-foreground">—</span>
                </div>
              ),
          },
          {
            key: 'students_count',
            header: `👶 ${guardiansLabels.studentCount}`,
            align: 'center' as const,
            render: (guardian) => (
              <div className="w-full flex items-center justify-center">
                {guardian.students_count > 0 ? (
                  <button
                    type="button"
                    data-stop="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startAction('view-students-' + guardian.id, () => handleShowGuardianStudents(guardian.id, guardian.full_name));
                    }}
                    disabled={pendingActionKey === 'view-students-' + guardian.id || (isLoadingGuardianStudents && studentsListLoadingGuardianId === guardian.id)}
                    className="h-6 px-3 rounded-full font-bold text-white bg-green-600 text-sm 
                    flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    title={guardiansLabels.viewStudents}
                  >
                    {(pendingActionKey === 'view-students-' + guardian.id) || (isLoadingGuardianStudents && studentsListLoadingGuardianId === guardian.id) ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>...</span>
                      </span>
                    ) : (
                      guardian.students_count
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-stop="true"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); startAction('add-student-empty-' + guardian.id, () => handleAddStudent(guardian.id)); }}
                    disabled={pendingActionKey === 'add-student-empty-' + guardian.id}
                    className="h-6 px-3 rounded-full font-semibold text-green-700 border border-green-300 dark:text-green-200 dark:border-green-600 text-xs bg-white dark:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-70"
                    title={guardiansLabels.addStudent}
                  >
                    {pendingActionKey === 'add-student-empty-' + guardian.id ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>...</span>
                      </span>
                    ) : (
                      <>+ {guardiansLabels.addStudent}</>
                    )}
                  </button>
                )}
              </div>
            ),
          },
          {
            key: 'actions',
            header: `⚙️ ${guardiansLabels.actions}`,
            align: 'center' as const,
            render: (guardian) => (
              <div className="flex justify-center items-center gap-2">
                <button
                  type="button"
                  onClick={() => startAction('edit-guardian-' + guardian.id, () => handleEditGuardian(guardian))}
                  title={guardiansLabels.editTooltip}
                  className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  data-stop="true"
                  disabled={pendingActionKey === 'edit-guardian-' + guardian.id}
                >
                  {pendingActionKey === 'edit-guardian-' + guardian.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
                  ) : (
                    <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => startAction('inline-add-student-' + guardian.id, () => handleAddStudent(guardian.id))}
                  title={guardiansLabels.addStudentTooltip}
                  className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  data-stop="true"
                  disabled={pendingActionKey === 'inline-add-student-' + guardian.id}
                >
                  {pendingActionKey === 'inline-add-student-' + guardian.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-green-600 dark:text-green-300" />
                  )}
                </button>
                {userRole === 'superadmin' && (
                  <button
                    type="button"
                    onClick={() => startAction('delete-guardian-' + guardian.id, () => handleDeleteGuardian(guardian))}
                    title={guardiansLabels.deleteTooltip}
                    className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                    data-stop="true"
                    disabled={pendingActionKey === 'delete-guardian-' + guardian.id}
                  >
                    {pendingActionKey === 'delete-guardian-' + guardian.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-red-500" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                    )}
                  </button>
                )}
              </div>
            ),
          },
        ]}
        emptyMessage={searchTerm ? guardiansLabels.noSearchResults : guardiansLabels.noGuardians}
        onRefresh={loadGuardians}
        onAddNew={(userRole === 'superadmin' || userRole === 'admin') ? handleAddGuardian : undefined}
        enablePagination
        defaultPageSize={8}
        pageSizeOptions={[8, 16, 48, 100]}
        cardMaxFieldsCollapsed={4}
        enableCardExpand={isMobile}
        className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
        getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
        hideSortToggle={true}
      />
      {/* حوار إضافة ولي أمر */}
      <FormDialog
        title={dialogTitle}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveGuardian}
        isLoading={isSavingGuardian}
        saveButtonText={dialogMode === "add"
          ? guardiansLabels.addGuardian
          : guardiansLabels.editGuardian}
        cancelButtonText={guardiansLabels.cancel}
        mode={dialogMode}
      >
        <div className="grid gap-4 py-2">
          {/* الاسم الكامل */}
          <FormRow label={`${guardiansLabels.fullName} *`}>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={guardiansLabels.fullName}
              className="bg-green-50 border-green-200 text-green-900 rounded-md text-sm py-1 px-2 text-right focus:border-islamic-green"
              required
            />
          </FormRow>

          {/* رقم الهاتف */}
          <FormRow label={`${guardiansLabels.phoneNumber} *`}>
            <Input
              id="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={guardiansLabels.phoneNumber}
              dir="ltr"
              className="bg-yellow-50 border-yellow-200 text-yellow-900 rounded-md text-sm py-1 px-2 text-left focus:border-islamic-green"
              required
            />
          </FormRow>

          {/* البريد الإلكتروني */}
          <FormRow label={`${guardiansLabels.email} (${guardiansLabels.optionalField})`}>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={guardiansLabels.email}
              dir="ltr"
              className="bg-blue-50 border-blue-200 text-blue-900 rounded-md text-sm py-1 px-2 text-left focus:border-islamic-green"
            />
          </FormRow>

          {/* العنوان / ملاحظات */}
          <FormRow label={`${guardiansLabels.address} (${guardiansLabels.optionalField})`}>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={guardiansLabels.address}
              rows={3}
              className="bg-orange-50 border-orange-200 text-orange-900 rounded-md text-sm py-1 px-2 text-right focus:border-islamic-green"
            />
          </FormRow>
        </div>
      </FormDialog>
      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteGuardian}
        isLoading={isDeleteProcessing}
        title={guardiansLabels.deleteGuardian}
        description={
          <>
            {guardiansLabels.deleteConfirmation}
            <br />
            {guardiansLabels.deleteDescription}
          </>
        }
        deleteButtonText={guardiansLabels.confirm}
        cancelButtonText={guardiansLabels.cancel}
      />
      <StudentFormDialog
        open={isStudentDialogOpen}
        mode={editingStudentId ? 'edit' : 'add'}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStudentId(null);
            // إذا كنا في وضع التحرير من داخل قائمة الطلاب نعيد إظهارها بعد إغلاق نموذج الطالب
            if (editingFromStudentsList) {
              setIsStudentsListDialogOpen(true);
              setEditingFromStudentsList(false);
            }
          }
          setIsStudentDialogOpen(open);
        }}
        initialData={studentInitialData}
        onSubmit={handleSubmitStudent}
        guardians={guardians}
        teachers={teachers}
        studyCircles={teacherCircles}
        isTeacher={userRole === 'teacher'}
        currentTeacherId={userId}
        allowGuardianSelection={isGeneralAddStudent}
        fixedGuardianId={!isGeneralAddStudent ? selectedGuardianId : undefined}
        onLoadTeacherCircles={loadCirclesForTeacher}
        isLoadingCircles={isLoadingTeacherCircles}
      />

      { /* طلاب ولي أمر */}
      <FormDialog
        open={isStudentsListDialogOpen}
        onOpenChange={(open) => {
          setIsStudentsListDialogOpen(open);
          if (!open) {
            setEditingFromStudentsList(false);
          }
        }}
        title={`${guardiansLabels.studentsListTitle}: ${selectedGuardianName}`}
        maxWidth="750px"
        onSave={() => { /* no-op (list dialog) */ }}
        showSaveButton={false}
        hideCancelButton={true}
        fullBleedBody
        headerContent={(
          <div className="border-b border-teal-200 dark:border-teal-700 pb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <span className="bg-teal-100 dark:bg-teal-800/60 p-1.5 rounded-full">
                <UserCircle className="h-5 w-5 text-blue-600 dark:text-teal-300" />
              </span>
              {guardiansLabels.studentsListTitle}: {selectedGuardianName}
            </h3>
          </div>

        )}
      >
        <div className="py-1">
          {isLoadingGuardianStudents ? (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-green-600 mb-3" />
              <p className="text-sm text-muted-foreground">{commonLabels.loading || '...'} </p>
            </div>
          ) : selectedGuardianStudents.length > 0 ? (
            <GenericTable<typeof selectedGuardianStudents[0] & { id: string }>
              data={selectedGuardianStudents.map((student, index) => ({
                ...student,
                id: student.id.toString(),
                serial: index + 1,
                index: index + 1
              }))}
              defaultView="table"
              enablePagination
              defaultPageSize={3}
              pageSizeOptions={[3, 6, 12, 24, 50]}
              hideSortToggle={false}
              noMaxHeight
              columns={[
                {
                  key: 'row_index',
                  header: '🔢',
                  align: 'center' as const,
                  render: (_student, globalIndex) => (globalIndex ?? 0) + 1,
                },
                {
                  key: 'full_name',
                  header: `👤 ${studentsLabels.name}`,
                  align: 'center' as const,
                  important: true,
                  render: (student) => (
                    <span className="font-medium whitespace-pre-line leading-snug">{student.full_name}</span>
                  ),
                },
                {
                  key: 'grade',
                  header: guardiansLabels.studentGradeHeader,
                  align: 'center' as const,
                  render: (student) => getGradeLabel(student.grade_level ?? student.grade ?? null),
                },
                {
                  key: 'gender',
                  header: guardiansLabels.studentGenderHeader,
                  align: 'center' as const,
                  render: (student) =>
                    student.gender === 'male'
                      ? studentsLabels.genderMale
                      : student.gender === 'female'
                        ? studentsLabels.genderFemale
                        : '-',
                },
                {
                  key: 'memorized_parts',
                  header: guardiansLabels.studentLastQuranHeader,
                  align: 'center' as const,
                  render: (student) => getMemorizedPartsLabel(student.memorized_parts),
                },
                {
                  key: 'teacher_name',
                  header: guardiansLabels.studentTeacherHeader,
                  align: 'center' as const,
                  render: (student) => student.teacher_name || commonLabels.none,
                },
                {
                  key: 'circle_name',
                  header: guardiansLabels.studentCircleHeader,
                  align: 'center' as const,
                  render: (student) => student.circle_name || commonLabels.none,
                },
                ...(userRole === 'superadmin'
                  ? [
                    {
                      key: 'actions',
                      header: guardiansLabels.studentActionsHeader,
                      align: 'center' as const,
                      render: (student: any) => (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditStudentFromGuardianList(student)}
                            title={guardiansLabels.studentEditTooltip}
                            className="h-6 w-6 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            data-stop="true"
                          >
                            <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteStudent(student.id)}
                            title={guardiansLabels.studentDeleteTooltip}
                            className="h-6 w-6 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            data-stop="true"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                          </button>
                        </div>
                      ),
                    } as const,
                  ]
                  : []),
              ]}
              emptyMessage={guardiansLabels.noStudentsForGuardian}
              className="overflow-hidden rounded-lg text-xs sm:text-sm border border-green-300 dark:border-green-700 shadow-sm w-full"
              getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50/40 dark:bg-green-900/20' : 'bg-white dark:bg-gray-900'} hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Database className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{guardiansLabels.noStudentsForGuardian}</p>
            </div>
          )}
        </div>
      </FormDialog>

      {/* حوار تأكيد حذف طالب (داخل قائمة طلاب ولي الأمر) */}
      <DeleteConfirmationDialog
        isOpen={isDeleteStudentDialogOpen}
        onOpenChange={setIsDeleteStudentDialogOpen}
        onConfirm={confirmDeleteStudent}
        isLoading={isProcessingStudentDelete}
        title={guardiansLabels.deleteStudentTitle}
        description={
          <>
            {guardiansLabels.deleteStudentConfirmation}
            <br />
            {guardiansLabels.deleteStudentDescription}
          </>
        }
        deleteButtonText={guardiansLabels.confirmDeleteStudent}
        cancelButtonText={guardiansLabels.cancel}
      />

    </div>
  );
}
