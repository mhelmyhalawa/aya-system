import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import {
  UserPlus,
  Search,
  FileDown,
  RefreshCw,
  AlertCircle,
  Pencil,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Database,
  UserCircle,
  GraduationCap
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { getAllGuardians, searchGuardians, deleteGuardian, exportGuardiansToJson } from "@/lib/guardian-service";
import { getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { addStudent } from "@/lib/supabase-service";
import { getteachers } from "@/lib/profile-service";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Guardian, GuardianCreate, GuardianUpdate } from "@/types/guardian";
import { StudentCreate } from "@/types/student";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessages, successMessages, commonLabels, studentsLabels, guardiansLabels } from "@/lib/arabic-labels";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Profile } from "@/types/profile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/lib/supabase-client';
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";
import { GenericTable } from "../ui/generic-table";
import { FormDialog, FormRow } from "../ui/form-dialog";
import { StudentFormDialog, StudentFormData } from "@/components/students/StudentFormDialog";

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

  // حالة القائمة
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
      console.error("خطأ في تحميل المعلمين:", error);
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
  const [teacherCircles, setTeacherCircles] = useState<{id: string; name: string; teacher_id?: string}[]>([]);
  const [isLoadingTeacherCircles, setIsLoadingTeacherCircles] = useState(false);

  // 1. أولاً، أضف متغيرات الحالة الجديدة لحوار عرض الطلاب
  const [isStudentsListDialogOpen, setIsStudentsListDialogOpen] = useState(false);
  const [selectedGuardianStudents, setSelectedGuardianStudents] = useState<any[]>([]);
  const [selectedGuardianName, setSelectedGuardianName] = useState("");
  // عند تحرير طالب من قائمة طلاب ولي الأمر نحتاج معرفة السياق لإبقاء القائمة مفتوحة
  const [editingFromStudentsList, setEditingFromStudentsList] = useState(false);

  // Pagination config
  const itemsPerPage = 10;

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
      setCurrentPage(1);

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
          title: "تم تصدير البيانات بنجاح",
          className: "bg-green-50 border-green-200",
        });
      } else {
        setError("فشل تصدير البيانات: " + (result.message || "خطأ غير معروف"));
      }
    } catch (err) {
      console.error("خطأ في تصدير البيانات:", err);
      setError("تعذر تصدير البيانات");
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
          toast({ title: 'تم إضافة الطالب بنجاح', className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          loadStudentCounts();
        } else {
          toast({ title: 'فشل في حفظ بيانات الطالب', description: result.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
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
          toast({ title: 'تم تحديث بيانات الطالب', className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          setSelectedGuardianStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, ...updatedStudent } : s));
        } else {
          toast({ title: 'فشل في تحديث بيانات الطالب', description: result.message || 'حدث خطأ غير متوقع', variant: 'destructive' });
        }
      }
    } catch (err) {
      console.error('خطأ في حفظ بيانات الطالب:', err);
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
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
    setIsLoadingTeacherCircles(true);
    try {
      const circles = await getStudyCirclesByTeacherId(tid);
      setTeacherCircles(circles);
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
          title: errorMessages.deleteFailed || "فشل في الحذف",
          description: result.message || guardiansLabels.unexpectedError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف ولي الأمر:", error);
      toast({
        title: errorMessages.generalError || "خطأ",
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
            title: errorMessages.saveFailed || "فشل في الحفظ",
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
            title: guardiansLabels.updateSuccess || "تم تحديث بيانات ولي الأمر بنجاح",
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadGuardians();
        } else {
          toast({
            title: errorMessages.updateFailed || "فشل في التحديث",
            description: result.message || guardiansLabels.unexpectedError,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات ولي أمر:", error);
      toast({
        title: errorMessages.generalError || "خطأ",
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    }
  };

  // وظيفة لتحميل وعرض الطلاب لولي أمر محدد
  const handleShowGuardianStudents = async (guardianId: string, guardianName: string) => {
    try {
      setLoading(true);
      console.log('[handleShowGuardianStudents] guardianId:', guardianId, 'guardianName:', guardianName);
      const students = await getStudentsByGuardianId(guardianId);
      console.log('[handleShowGuardianStudents] students fetched:', students);
      // تعيين البيانات لعرضها في الحوار
      setSelectedGuardianStudents(students);
      setSelectedGuardianName(guardianName);
      setIsStudentsListDialogOpen(true);
    } catch (error) {
      console.error("خطأ في تحميل بيانات الطلاب:", error);
      toast({
        title: "خطأ في تحميل بيانات الطلاب",
        description: "حدث خطأ أثناء محاولة تحميل بيانات الطلاب",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          title: 'تم حذف الطالب بنجاح',
          className: 'bg-green-50 border-green-200'
        });
        setSelectedGuardianStudents(prev => prev.filter(s => s.id !== studentToDelete));
      } else {
        toast({
          title: 'فشل في حذف الطالب',
          description: result.message || 'حدث خطأ غير متوقع',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('خطأ في حذف الطالب:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع أثناء حذف الطالب',
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
    return guardians.filter(guardian => {
      // If no search term, return all guardians
      if (!searchTerm) return true;

      // Search in name, phone, and email
      return (
        guardian.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guardian.phone_number.includes(searchTerm) ||
        (guardian.email && guardian.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [guardians, searchTerm]);

  // Paginate the filtered results
  const paginatedGuardians = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGuardians.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGuardians, currentPage]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredGuardians.length / itemsPerPage));

  // Render page numbers for pagination
  const renderPageNumbers = () => {
    const pages = [];

    // Always show first page
    pages.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => setCurrentPage(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // If we're past page 3, show an ellipsis
    if (currentPage > 3) {
      pages.push(
        <PaginationItem key="ellipsis1">
          <span className="px-3">...</span>
        </PaginationItem>
      );
    }

    // Show current page -1 and +1 if they exist
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue; // Skip first and last as they're always shown
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // If we're more than 1 page away from the last page, show an ellipsis
    if (currentPage < totalPages - 2) {
      pages.push(
        <PaginationItem key="ellipsis2">
          <span className="px-3">...</span>
        </PaginationItem>
      );
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pages.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  };

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
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">

      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-yellow-300" />
                {guardiansLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {guardiansLabels.description}
              </CardDescription>
            </div>

            <div className="flex gap-2">

              <Button
                className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={handleAddGuardian}
                title="إضافة ولي أمر جديد"
              >
                {/* الأيقونة */}
                <span className="text-lg">👤</span>
                {/* النص يظهر فقط في الديسكتوب */}
                <span className="hidden sm:inline">إضافة ولي أمر جديد</span>
              </Button>

              <Button
                className="flex items-center gap-2 rounded-3xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={() => handleAddStudent("", true)}
                title="إضافة طالب جديد"
              >
                {/* الأيقونة */}
                <span className="text-lg">🧒</span>
                {/* النص يظهر فقط في الديسكتوب */}
                <span className="hidden sm:inline">إضافة طالب جديد</span>
              </Button>


            </div>
          </div>
        </CardHeader>
        <CardContent>
          <>
            {error && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md border border-green-200 dark:border-green-700">
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}



            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* حقل البحث */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={guardiansLabels.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-3 pr-10 w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {/* الأزرار */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSearch}
                  title={guardiansLabels.search}
                  className="shrink-0"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadGuardians()}
                  title={guardiansLabels.refresh}
                  className="shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportData}
                  title={guardiansLabels.export}
                  className="shrink-0"
                  disabled={exportLoading || guardians.length === 0}
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>


          </>
        </CardContent>
      </Card>
      <GenericTable
        data={paginatedGuardians}
        columns={[
          {
            key: 'index_full_name',
            header: '#️⃣👤',
            align: 'center' as const,
            render: (item) => {
              // نجيب ترتيب العنصر
              const itemIndex = paginatedGuardians.findIndex(
                (guardian) => guardian.id === item.id
              );
              const index = (currentPage - 1) * itemsPerPage + itemIndex + 1;

              // نعرض الرقم مع الاسم
              return `${index} - ${item.full_name}`;
            },
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
                <div className="flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-islamic-green/60" />
                  <span dir="ltr" className="text-islamic-green/80 text-xs truncate block">
                    {guardian.email}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'students_count',
            header: `👶 ${guardiansLabels.studentCount}`,
            align: 'center' as const,
            render: (guardian) =>
              guardian.students_count > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => handleShowGuardianStudents(guardian.id, guardian.full_name)}
                  className="h-6 px-3 rounded-full font-bold text-white bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow-lg hover:scale-105 transition-all duration-200 text-sm"
                  title="عرض الطلاب"
                >
                  {guardian.students_count}
                </Button>
              ) : (
                <span className="text-muted-foreground">0</span>
              ),
          },
          {
            key: 'actions',
            header: `⚙️ ${guardiansLabels.actions}`,
            align: 'center' as const,
            render: (guardian) => (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditGuardian(guardian)}
                  className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-700 transition-colors rounded-lg"
                  title={guardiansLabels.editTooltip}
                >
                  <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddStudent(guardian.id)}
                  className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-700 transition-colors rounded-lg"
                  title="إضافة طالب"
                >
                  <UserPlus className="h-4 w-4 text-green-600 dark:text-green-300" />
                </Button>
                {userRole === 'superadmin' && (
                  <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGuardian(guardian)}
                  className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                  title={guardiansLabels.deleteTooltip}
                  >
                  <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        emptyMessage={searchTerm ? guardiansLabels.noSearchResults : guardiansLabels.noGuardians}
      />
      {/* حوار إضافة ولي أمر */}
      <FormDialog
        title={dialogTitle}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveGuardian}
        saveButtonText={dialogMode === "add"
          ? "إضافة ولي أمر جديد"
          : "تحديث بيانات ولي الأمر"}
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
      />

      <Dialog modal={false} open={isStudentsListDialogOpen} onOpenChange={(open) => {
        // إذا تم إغلاق قائمة الطلاب أثناء وجود نموذج الطالب مفتوح لا نغلقه قسرياً
        setIsStudentsListDialogOpen(open);
        if (!open) {
          setEditingFromStudentsList(false);
        }
      }}>
        <DialogContent dir="rtl" className="bg-gradient-to-r from-green-100 via-green-200 to-green-100 sm:max-w-[750px] max-h-[70vh] overflow-y-auto">
          <DialogHeader className="flex flex-col items-center border-b border-green-200">
            <DialogTitle className="text-sm text-islamic-green flex items-center gap-2">
              <span className="bg-green-100 p-1.5 rounded-full">
                <UserCircle className="h-5 w-5 text-green-600" />
              </span>
              طلاب ولي الأمر: {selectedGuardianName}
            </DialogTitle>
          </DialogHeader>


          <div className="py-2">
            {selectedGuardianStudents.length > 0 ? (
              <GenericTable<typeof selectedGuardianStudents[0] & { id: string }>
                data={selectedGuardianStudents.map((student, index) => ({
                  ...student,
                  id: student.id.toString(),
                  serial: index + 1
                }))}
                columns={[
                  {
                    key: 'serial_full_name',
                    header: '#️⃣👤 الطالب',
                    align: 'center' as const,
                    render: (student) => (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-1 text-right">
                        <span className="font-medium">{student.serial + " - " + student.full_name}</span>
                      </div>
                    ),
                  },

                  {
                    key: 'grade',
                    header: '🏫 الدراسي',
                    align: 'center' as const,
                    render: (student) =>
                      studentsLabels.gradeOptions.find(g => g.value === student.grade_level)?.label ||
                      studentsLabels.gradeOptions.find(g => g.value === student.grade)?.label ||
                      "-",
                  },
                  {
                    key: 'gender',
                    header: '⚧ الجنس',
                    align: 'center' as const,
                    render: (student) =>
                      student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : '-',
                  },
                  {
                    key: 'memorized_parts',
                    header: '📅 آخر حفظ',
                    align: 'center' as const,
                    render: (student) =>
                      student.memorized_parts ?
                        studentsLabels.quranPartsOptions.find(part => part.value === student.memorized_parts)?.label ||
                        student.memorized_parts : "-",
                  },
                  {
                    key: 'teacher_name',
                    header: '👨‍🏫 المعلم',
                    align: 'center' as const,
                    render: (student) => student.teacher_name || "غير محدد",
                  },
                  {
                    key: 'circle_name',
                    header: '📚 الحلقة',
                    align: 'center' as const,
                    render: (student) => student.circle_name || "غير محدد",
                  },
                  ...(userRole === 'superadmin' ? [
                    {
                      key: 'actions',
                      header: '⚙️ الإجراءات',
                      align: 'center' as const,
                      render: (student: any) => (
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStudentFromGuardianList(student)}
                            className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-700 transition-colors rounded-lg"
                            title="تعديل"
                          >
                            <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => requestDeleteStudent(student.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                          </Button>
                        </div>
                      ),
                    } as const,
                  ] : []),
                ]}
                emptyMessage="لا يوجد طلاب"
                className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
                getRowClassName={(_, index) =>
                  `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
                }
              />

            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Database className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">لا يوجد طلاب مرتبطين بولي الأمر</p>
              </div>
            )}
          </div>

          <DialogFooter dir="rtl">
            <Button variant="outline" onClick={() => setIsStudentsListDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد حذف طالب (داخل قائمة طلاب ولي الأمر) */}
      <DeleteConfirmationDialog
        isOpen={isDeleteStudentDialogOpen}
        onOpenChange={setIsDeleteStudentDialogOpen}
        onConfirm={confirmDeleteStudent}
        isLoading={isProcessingStudentDelete}
        title="حذف الطالب"
        description={
          <>
            هل أنت متأكد من رغبتك في حذف هذا الطالب؟
            <br />
            لا يمكن التراجع عن هذه العملية.
          </>
        }
        deleteButtonText="تأكيد الحذف"
        cancelButtonText={guardiansLabels.cancel}
      />

    </div>
  );
}
