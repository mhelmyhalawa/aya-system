import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { UserRole } from "@/types/profile";
import { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  Search,
  FileDown,
  RefreshCw,
  AlertCircle,
  Filter,
  Eye,
  Pencil,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Trash2,
  BookOpen,
  Database,
  School,
  UserCircle,
  History
} from "lucide-react";

// Type definition for extended UserRole
type UserRoleExtended = UserRole | 'teacher' | null;

// Type guard for user role comparison
function isTeacher(role: UserRoleExtended): boolean {
  return role === 'teacher' as UserRoleExtended;
}

import {
  getAllStudents as getAllStudentsApi,
  searchStudents as searchStudentsApi,
  deleteStudent,
  exportToJson as exportStudentsToJson
} from "@/lib/supabase-service";
import { createStudent, updateStudent as updateStudentWithHistory } from "@/lib/student-service";
import { getteacherHistoryForStudent } from "@/lib/teacher-history-service";
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { StudyCircle } from "@/types/study-circle";
import { supabase } from "@/lib/supabase-client"; // Import the supabase client
import { getAllGuardians, addGuardian } from "@/lib/guardian-service";
import { getteachers } from "@/lib/profile-service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Student, StudentCreate, StudentUpdate } from "@/types/student";
import { teacherHistory } from "@/types/teacher-history";
import { Guardian, GuardianCreate } from "@/types/guardian";
import { Profile } from "@/types/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorMessages, successMessages, commonLabels, studentsLabels } from "@/lib/arabic-labels";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";

interface StudentsListProps {
  onNavigate: (path: string) => void;
  userRole?: UserRoleExtended;
  userId?: string | null;
}


export function StudentsList({ onNavigate, userRole, userId }: StudentsListProps) {
  const { toast } = useToast();

  // حالة القائمة
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardianSearchTerm, setGuardianSearchTerm] = useState("");
  const [teachers, setteachers] = useState<Profile[]>([]);
  const [teacherSearchTerm, setteacherSearchTerm] = useState("");

  // حالة الحلقات الدراسية
  const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
  const [teacherStudyCircles, setTeacherStudyCircles] = useState<StudyCircle[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [studyCircleId, setStudyCircleId] = useState<string>("");
  const [isLoadingStudyCircles, setIsLoadingStudyCircles] = useState<boolean>(false);

  // تنفيذ استرجاع البيانات عند تحميل المكون
  useEffect(() => {
    console.log('Component mounted, fetching students...');
    loadGuardians();
    loadteachers();

    // تحميل الحلقات الدراسية المناسبة بناءً على دور المستخدم
    if (userRole === 'teacher' && userId) {
      // للمعلمين، تحميل الحلقات الخاصة بهم فقط وتعيين معرف المعلم
      setSelectedTeacherId(userId); // تعيين المعلم الحالي مباشرة

      loadStudyCirclesForTeacher(userId).then((hasCircles) => {
        if (hasCircles) {
          // بدلاً من استخدام handleSearch، استخدم loadStudents مع معايير محددة
          const searchCriteria = { teacher_id: userId };
          loadStudents(searchCriteria);
        } else {
          // إظهار رسالة للمعلم إذا لم تكن لديه حلقات
          setError("ليس لديك حلقات دراسية حالياً. يرجى التواصل مع الإدارة لإضافة حلقات.");
          setLoading(false);
        }
      });
    } else {
      // للإدارة والمشرفين، تحميل جميع الحلقات
      loadStudyCircles();
      loadStudents();
    }
  }, []);

  // تنفيذ البحث عند تغيير الحلقة الدراسية
  useEffect(() => {
    console.log('تغيير الحلقة الدراسية:', studyCircleId);
    if (studyCircleId !== undefined) {
      // تأخير بسيط لتجنب البحث المتكرر عند التحميل الأولي
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [studyCircleId]);

  // تنفيذ البحث عند تغيير مستوى الصف
  useEffect(() => {
    if (filterGrade !== undefined) {
      // تأخير بسيط لتجنب البحث المتكرر عند التحميل الأولي
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [filterGrade]);

  // حالة الحوار
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(studentsLabels.addStudent);

  // حوار إضافة ولي أمر
  const [isGuardianDialogOpen, setIsGuardianDialogOpen] = useState(false);
  const [guardianFullName, setGuardianFullName] = useState<string>("");
  const [guardianPhoneNumber, setGuardianPhoneNumber] = useState<string>("");
  const [guardianEmail, setGuardianEmail] = useState<string>("");
  const [guardianAddress, setGuardianAddress] = useState<string>("");

  // حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // حوار سجل المعلمين
  const [isteacherHistoryDialogOpen, setIsteacherHistoryDialogOpen] = useState(false);
  const [currentStudentHistory, setCurrentStudentHistory] = useState<{ student: Student, history: teacherHistory[] }>({
    student: {} as Student,
    history: []
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // نموذج الطالب
  const [studentId, setStudentId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [guardianName, setGuardianName] = useState<string>("");
  const [guardianId, setGuardianId] = useState<string>("");
  const [teacherId, setteacherId] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [lastQuranProgress, setLastQuranProgress] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // Pagination config
  const itemsPerPage = 10;

  // تحميل البيانات
  useEffect(() => {
    console.log('بدء تحميل البيانات الأولية...');
    loadStudents();
  }, []);

  // تحميل الحلقات الدراسية
  const loadStudyCircles = async () => {
    try {
      console.log('بدء تحميل الحلقات الدراسية...');
      // تحميل كل الحلقات الدراسية (للمدراء والمشرفين)
      const circlesList = await getAllStudyCircles();
      console.log('تم تحميل', circlesList.length, 'حلقة دراسية');
      setStudyCircles(circlesList);
    } catch (error) {
      console.error("خطأ في تحميل الحلقات الدراسية:", error);
    }
  };

  // تحميل الحلقات الدراسية لمعلم محدد
  const loadStudyCirclesForTeacher = async (teacherId: string): Promise<boolean> => {
    if (!teacherId) {
      // إذا كان المستخدم معلمًا ولم يتم تحديد معلم، استخدم معرف المستخدم الحالي
      if (userRole === 'teacher' && userId) {
        teacherId = userId;
        console.log('استخدام معرف المعلم الحالي:', teacherId);
      } else {
        console.log('لم يتم تحديد معلم، إلغاء تحميل الحلقات');
        setTeacherStudyCircles([]);
        return false;
      }
    }

    setIsLoadingStudyCircles(true);
    try {
      console.log('تحميل الحلقات الدراسية للمعلم:', teacherId);
      const circles = await getStudyCirclesByTeacherId(teacherId);
      console.log('تم تحميل', circles.length, 'حلقة دراسية للمعلم', teacherId);

      if (circles.length > 0) {
        console.log('الحلقات:', circles.map(c => `${c.name} (${c.id})`));
      }

      // تحديث قائمة حلقات المعلم المحدد
      setTeacherStudyCircles(circles);

      // إذا كان المستخدم معلمًا، استخدم حلقاته كقائمة كاملة للحلقات للبحث أيضًا
      if (userRole === 'teacher' && userId === teacherId) {
        setStudyCircles(circles); // تحديث قائمة الحلقات العامة
        setSelectedTeacherId(teacherId);
      }

      return circles.length > 0; // إرجاع true إذا كان للمعلم حلقات
    } catch (error) {
      console.error("خطأ في تحميل الحلقات الدراسية للمعلم:", error);
      toast({
        title: "خطأ في تحميل الحلقات الدراسية",
        description: "حدث خطأ أثناء محاولة تحميل الحلقات الدراسية للمعلم.",
        variant: "destructive",
      });
      setTeacherStudyCircles([]);
      if (userRole === 'teacher') {
        setStudyCircles([]);
      }
      return false; // إرجاع false في حالة الخطأ
    } finally {
      setIsLoadingStudyCircles(false);
    }
  };

  // معالجة تغيير المعلم
  const handleTeacherChange = async (teacherId: string) => {
    console.log('تغيير المعلم المحدد:', teacherId);

    // إذا كان المستخدم معلمًا، تجاهل أي تغيير والعودة إلى معلم المستخدم الحالي
    if (userRole === 'teacher' && userId) {
      console.log('المستخدم هو معلم، لا يمكن تغيير المعلم المحدد.');
      // إعادة تعيين المعلم المحدد إلى معلم المستخدم الحالي
      teacherId = userId;
    }

    setSelectedTeacherId(teacherId);
    setStudyCircleId(""); // إعادة تعيين الحلقة الدراسية عند تغيير المعلم

    if (teacherId) {
      setIsLoadingStudyCircles(true);
      try {
        console.log('تحميل الحلقات الدراسية للمعلم:', teacherId);
        const circles = await getStudyCirclesByTeacherId(teacherId);
        console.log('تم تحميل', circles.length, 'حلقة دراسية للمعلم', teacherId);

        // تحديث قائمة حلقات المعلم المحدد
        setTeacherStudyCircles(circles);

        // إذا كان المستخدم معلمًا، استخدم حلقاته كقائمة كاملة للحلقات للبحث أيضًا
        if (userRole === 'teacher' && userId === teacherId) {
          setStudyCircles(circles);
        }

        if (circles.length === 0) {
          toast({
            title: "لا توجد حلقات دراسية",
            description: "المعلم المحدد ليس لديه حلقات دراسية مرتبطة به.",
          });
          setStudents([]); // تفريغ قائمة الطلاب إذا لم يكن للمعلم حلقات
        } else {
          // تحميل الطلاب المرتبطين بحلقات المعلم المحدد
          const searchCriteria: { [key: string]: any } = {};

          console.log('البحث في حلقات المعلم:', circles.map(c => `${c.name} (${c.id})`));
          searchCriteria.teacher_id = teacherId; // استخدام معرف المعلم مباشرة

          // إضافة معايير البحث الأخرى إن وجدت
          if (searchTerm.trim()) {
            searchCriteria.full_name = searchTerm;
          }

          const results = await searchStudentsApi(searchCriteria);
          console.log(`تم العثور على ${results.length} طالب للمعلم ${teacherId}`);
          setStudents(results);
        }
      } catch (error) {
        console.error("خطأ في تحميل الحلقات الدراسية للمعلم:", error);
        toast({
          title: "خطأ في تحميل الحلقات الدراسية",
          description: "حدث خطأ أثناء محاولة تحميل الحلقات الدراسية للمعلم.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingStudyCircles(false);
      }
    } else {
      // إذا تم إعادة تعيين المعلم، قم بتحميل جميع الطلاب مرة أخرى
      loadStudents();

      // إعادة تحميل جميع الحلقات للمشرفين والمدراء
      if (userRole === 'admin' || userRole === 'superadmin') {
        loadStudyCircles();
      }
    }
  };

  // تحميل أولياء الأمور
  const loadGuardians = async () => {
    try {
      console.log('بدء تحميل بيانات أولياء الأمور...');
      const guardiansList = await getAllGuardians();
      console.log('تم تحميل', guardiansList.length, 'ولي أمر');
      setGuardians(guardiansList);
    } catch (error) {
      console.error("خطأ في تحميل أولياء الأمور:", error);
    }
  };

  // تحسين وظيفة loadteachers
  const loadteachers = async () => {
    try {
      console.log("🔄 Loading teachers with userRole:", userRole, "and userId:", userId);
      const teachersList = await getteachers();
      console.log("📊 Loaded teachers (all):", teachersList);

      let filteredteachers = teachersList;
      // إذا كان المستخدم teacher فقط، فلتر القائمة
      if (userRole === 'teacher') {
        filteredteachers = teachersList.filter(
          teacher => teacher.role === 'teacher' || teacher.role === 'admin'
        );
      }
      // إذا كان admin أو superadmin لا تصفّي القائمة
      console.log("👥 teacher roles:", filteredteachers.map(s => ({ id: s.id, name: s.full_name, role: s.role })));
      setteachers(filteredteachers);

      // تعيين معرف المعلم إذا كان المستخدم معلمًا
      if (userRole === 'teacher' && userId) {
        const currentteacher = filteredteachers.find(s => s.id === userId);
        if (currentteacher) {
          console.log("👤 Found current teacher:", currentteacher.full_name);
          setteacherId(userId);
        }
      }
    } catch (error) {
      console.error("❌ خطأ في تحميل المعلمين:", error);
    }
  };

  // إضافة ولي أمر جديد
  const handleAddGuardian = () => {
    setGuardianFullName("");
    setGuardianPhoneNumber("");
    setGuardianEmail("");
    setGuardianAddress("");
    setIsGuardianDialogOpen(true);
  };

  // حفظ بيانات ولي الأمر
  const handleSaveGuardian = async () => {
    // التحقق من وجود البيانات المطلوبة
    if (!guardianFullName || !guardianPhoneNumber) {
      toast({
        title: "بيانات غير مكتملة",
        description: "الرجاء تعبئة الاسم ورقم الهاتف",
        variant: "destructive",
      });
      return;
    }

    try {
      // إنشاء كائن ولي الأمر
      const newGuardian: GuardianCreate = {
        full_name: guardianFullName,
        phone_number: guardianPhoneNumber,
        email: guardianEmail || undefined,
        address: guardianAddress || undefined,
      };

      const result = await addGuardian(newGuardian);

      if (result.success) {
        toast({
          title: "تم إضافة ولي الأمر بنجاح",
          description: "",
          className: "bg-green-50 border-green-200",
        });
        setIsGuardianDialogOpen(false);
        // إعادة تحميل قائمة أولياء الأمور
        loadGuardians();
      } else {
        toast({
          title: "فشل في حفظ بيانات ولي الأمر",
          description: result.message || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات ولي الأمر:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  // تحديث وظيفة loadStudents للتصفية حسب المعلم
  const loadStudents = async (searchQuery?: { [key: string]: any }) => {
    setLoading(true);
    setError(null);

    try {
      console.log('بدء تحميل الطلاب... دور المستخدم:', userRole, 'معرف المستخدم:', userId);
      let studentsList: Student[] = [];

      // حالات تحميل الطلاب: 1- للمعلم يظهر الطلاب في حلقاته، 2- للمشرف والمسؤول يظهر كل الطلاب
      if (userRole === 'teacher' && userId) {
        console.log('تحميل الطلاب في حلقات المعلم:', userId);
        try {
          // أولاً، نحصل على الحلقات الدراسية التي يديرها المعلم
          const teacherCircles = await getStudyCirclesByTeacherId(userId);
          console.log('حلقات المعلم:', teacherCircles.map(c => c.id));

          if (teacherCircles.length > 0) {
            // إذا كان لدى المعلم حلقات، نبحث عن الطلاب في هذه الحلقات
            if (searchQuery) {
              // إضافة معرفات الحلقات إلى معايير البحث
              const circlesQuery = {
                ...searchQuery,
                study_circle_ids: teacherCircles.map(c => c.id)
              };
              studentsList = await searchStudentsApi(circlesQuery);
            } else {
              // جمع الطلاب من جميع حلقات المعلم
              const promises = teacherCircles.map(circle =>
                searchStudentsApi({ study_circle_id: circle.id })
              );
              const results = await Promise.all(promises);
              // دمج النتائج في قائمة واحدة
              studentsList = results.flat();
            }
            console.log('تم استرجاع الطلاب من حلقات المعلم، العدد:', studentsList.length);
          } else {
            console.log('المعلم ليس لديه حلقات دراسية');
            studentsList = [];
          }
        } catch (e) {
          console.error('خطأ في تحميل طلاب حلقات المعلم:', e);
          setError("حدث خطأ أثناء تحميل طلاب حلقات المعلم");
        }
      } else {
        // للمدراء والمسؤولين، عرض جميع الطلاب
        console.log('تحميل جميع الطلاب للمشرف/المسؤول');
        try {
          if (searchQuery) {
            studentsList = await searchStudentsApi(searchQuery);
            console.log('تم استرجاع الطلاب من البحث للمشرف، العدد:', studentsList.length);
          } else {
            studentsList = await getAllStudentsApi();
            console.log('تم استرجاع جميع الطلاب للمشرف بدون بحث، العدد:', studentsList.length);
          }
          console.log('تم تحميل جميع الطلاب، تم العثور على:', studentsList.length);
        } catch (e) {
          console.error('خطأ في تحميل جميع الطلاب:', e);
          setError("حدث خطأ أثناء تحميل جميع الطلاب");
        }
      }

      setSearchTerm('');
      console.log('إجمالي الطلاب الذين تم تحميلهم:', studentsList.length);

      if (studentsList.length > 0) {
        console.log('نموذج للطالب الأول:', {
          id: studentsList[0].id,
          name: studentsList[0].full_name,
          has_guardian: !!studentsList[0].guardian,
          has_teacher: !!studentsList[0].study_circle?.teacher
        });
      } else {
        console.log('لا يوجد طلاب للعرض');
      }

      // تصحيح شكل البيانات للتأكد من أن العلاقات موجودة
      const formattedStudents = studentsList.map(student => {
        return {
          ...student,
          id: student.id,
          full_name: student.full_name || "بدون اسم",
          guardian_id: student.guardian_id,
          study_circle_id: student.study_circle_id,
          guardian: student.guardian || null,
          teacher: student.study_circle?.teacher || null,
          memorized_parts: student.memorized_parts || null,
          grade: student.grade || student.grade_level || '', // التأكد من وجود حقل grade
          grade_level: student.grade_level || student.grade || '' // التأكد من وجود حقل grade_level
        };
      });

      console.log('تم تنسيق بيانات الطلاب، العدد النهائي:', formattedStudents.length);
      setStudents(formattedStudents);
    } catch (error) {
      console.error("خطأ في تحميل الطلاب:", error);
      setError(errorMessages.fetchFailed || "فشل في تحميل البيانات");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };  // البحث عن الطلاب
  // البحث عن الطلاب
  const handleSearch = async () => {
    console.log('تنفيذ البحث بالمعايير:', {
      searchTerm: searchTerm ? searchTerm.trim() : 'فارغ',
      studyCircleId: studyCircleId || 'غير محدد',
      selectedTeacherId: selectedTeacherId || 'غير محدد',
      filterGrade: filterGrade || 'غير محدد',
      userRole: userRole || 'غير محدد',
      userId: userId || 'غير محدد'
    });

    setLoading(true);
    try {
      const searchCriteria: { [key: string]: any } = {};

      // إضافة معايير البحث إذا وجدت
      if (searchTerm.trim()) {
        searchCriteria.full_name = searchTerm;
      }

      if (filterGrade && filterGrade !== 'all') {
        searchCriteria.grade = filterGrade;
      }

      // لضمان أن المعلم يرى فقط الطلاب المرتبطين به
      if (userRole === 'teacher' && userId) {
        console.log('المستخدم هو معلم، سيتم تقييد البحث بحلقاته فقط');
        searchCriteria.teacher_id = userId;
      }
      // إضافة معرف الحلقة للبحث إذا تم تحديدها
      else if (studyCircleId && studyCircleId !== 'all') {
        console.log('البحث باستخدام معرف الحلقة المحددة:', studyCircleId);
        searchCriteria.study_circle_id = studyCircleId;
      }
      // إذا تم تحديد معلم ولم يتم تحديد حلقة
      else if (selectedTeacherId && selectedTeacherId !== 'all') {
        console.log('البحث باستخدام معرف المعلم:', selectedTeacherId);
        searchCriteria.teacher_id = selectedTeacherId;
      }

      console.log("معايير البحث النهائية:", searchCriteria);

      // في حالة عدم وجود معايير بحث وعدم كون المستخدم معلم، قم بتحميل كل الطلاب
      if (Object.keys(searchCriteria).length === 0 && userRole !== 'teacher') {
        console.log('لا توجد معايير بحث للمشرف/المسؤول، تحميل جميع الطلاب');
        loadStudents();
        return;
      }

      const results = await searchStudentsApi(searchCriteria);
      setStudents(results);
      setCurrentPage(1);

      // إظهار رسالة عند عدم وجود نتائج للبحث
      if (Object.keys(searchCriteria).length > 0 && results.length === 0) {
        toast({
          title: studentsLabels.noSearchResults || "لا توجد نتائج",
          description: studentsLabels.tryAnotherSearch || "حاول تغيير كلمات البحث",
        });
      }
    } catch (error) {
      console.error("خطأ في البحث:", error);
      toast({
        title: errorMessages.fetchFailed || "فشل في البحث",
        description: studentsLabels.unexpectedError,
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
      const result = await exportStudentsToJson();
      if (result.success && result.data) {
        // Create a downloadable blob
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_export_${new Date().toISOString().split('T')[0]}.json`;
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

  // إضافة طالب جديد
  const handleAddStudent = async () => {
    // إعادة تحميل المعلمين لضمان وجود أحدث البيانات
    await loadteachers();
    await loadStudyCircles(); // تحميل الحلقات الدراسية

    setDialogMode("add");
    setDialogTitle(studentsLabels.addStudent);
    setStudentId("");
    setFullName("");
    setGuardianName("");
    setGuardianId("");

    // إعادة تعيين الحلقة الدراسية والمعلم
    setSelectedTeacherId("");
    setStudyCircleId("");
    setTeacherStudyCircles([]);

    setGrade("");
    setGender(""); // تعيين قيمة فارغة للجنس
    setDateOfBirth("");
    setLastQuranProgress("");
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

  // تعديل طالب
  const handleEditStudent = async (student: Student) => {
    // إعادة تحميل المعلمين لضمان وجود أحدث البيانات
    await loadteachers();
    await loadStudyCircles(); // تحميل الحلقات الدراسية

    setDialogMode("edit");
    setDialogTitle(studentsLabels.editStudent);
    setStudentId(student.id);
    setFullName(student.full_name);
    setGuardianName(student.guardian?.full_name || "");
    setGuardianId(student.guardian_id || "");

    // تعيين الحلقة الدراسية والمعلم
    setStudyCircleId(student.study_circle_id || "");
    if (student.study_circle_id) {
      // الحصول على معلومات الحلقة الدراسية للحصول على معرف المعلم
      const circle = studyCircles.find(c => c.id === student.study_circle_id);
      if (circle) {
        setSelectedTeacherId(circle.teacher_id);
        // تحميل الحلقات الدراسية للمعلم المحدد
        await loadStudyCirclesForTeacher(circle.teacher_id);
      }
    }

    setGrade(student.grade_level || ""); // استخدم grade_level بدلاً من grade
    setGender(student.gender || ""); // تعيين الجنس من بيانات الطالب
    setDateOfBirth(student.date_of_birth || "");
    setLastQuranProgress(student.memorized_parts || "");
    setPhoneNumber(student.phone_number || "");
    setEmail(student.email || "");
    setAddress("");
    setIsDialogOpen(true);
  };

  // حذف طالب
  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  // عرض سجل المعلمين
  const handleViewteacherHistory = async (student: Student) => {
    setLoadingHistory(true);
    try {
      // تحميل سجل المعلمين للطالب
      const history = await getteacherHistoryForStudent(student.id);
      console.log('تم تحميل سجل المعلمين للطالب:', history);

      // تحقق من وجود معلومات الحلقة الدراسية
      if (history.length > 0) {
        console.log('معلومات الحلقة الدراسية للسجل الأول:', {
          study_circle_id: history[0].study_circle_id,
          study_circle: history[0].study_circle
        });
      }

      setCurrentStudentHistory({
        student,
        history
      });

      setIsteacherHistoryDialogOpen(true);
    } catch (error) {
      console.error('خطأ في تحميل سجل المعلمين:', error);
      toast({
        title: "خطأ في تحميل سجل المعلمين",
        description: "حدث خطأ أثناء محاولة تحميل سجل المعلمين السابقين للطالب.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  // تأكيد حذف طالب
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const result = await deleteStudent(studentToDelete.id);

      if (result.success) {
        toast({
          title: studentsLabels.deleteSuccess,
          description: "",
          className: "bg-green-50 border-green-200",
        });
        loadStudents();
      } else {
        toast({
          title: errorMessages.deleteFailed || "فشل في الحذف",
          description: result.message || studentsLabels.unexpectedError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف الطالب:", error);
      toast({
        title: errorMessages.generalError || "خطأ",
        description: studentsLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setStudentToDelete(null);
    }
  };

  // حفظ البيانات
  const handleSaveStudent = async () => {
    // التحقق من وجود البيانات المطلوبة
    if (!fullName || !grade) {
      toast({
        title: studentsLabels.incompleteData,
        description: studentsLabels.incompleteDataMessage,
        variant: "destructive",
      });
      return;
    }

    // التحقق من أن الاسم لا يحتوي على مسافات
    if (fullName.includes(' ')) {
      toast({
        title: "خطأ في اسم الطالب",
        description: studentsLabels.fullNameError,
        variant: "destructive",
      });
      return;
    }

    try {
      if (dialogMode === "add") {
        // إنشاء طالب جديد
        const newStudent: StudentCreate = {
          full_name: fullName,
          guardian_id: guardianId || undefined,
          study_circle_id: studyCircleId || undefined,
          grade_level: grade, // استخدم grade_level بدلاً من grade
          gender: (gender === "male" || gender === "female") ? gender : undefined, // إضافة الجنس
          date_of_birth: dateOfBirth || undefined,
          memorized_parts: lastQuranProgress || undefined,
          phone_number: phoneNumber || undefined,
          email: email || undefined,
        };

        // استخدام وظيفة createStudent التي تضيف سجل المعلم عند إنشاء طالب جديد
        const result = await createStudent(newStudent);

        console.log('🌟 Student add result:', result);
        console.log('✅ تم إنشاء الطالب وإضافة سجل المعلم إذا كان موجودًا');

        if (result.success) {
          toast({
            title: studentsLabels.addSuccess,
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadStudents();
        } else {
          toast({
            title: errorMessages.saveFailed || "فشل في الحفظ",
            description: result.message || studentsLabels.unexpectedError,
            variant: "destructive",
          });
        }
      } else {
        // تحديث طالب موجود
        const updatedStudent: StudentUpdate = {
          id: studentId,
          full_name: fullName,
          guardian_id: guardianId || undefined,
          study_circle_id: studyCircleId || undefined,
          grade_level: grade, // استخدم grade_level بدلاً من grade
          gender: (gender === "male" || gender === "female") ? gender : undefined, // إضافة الجنس
          date_of_birth: dateOfBirth || undefined,
          memorized_parts: lastQuranProgress || undefined,
          phone_number: phoneNumber || undefined,
          email: email || undefined
        };

        // استخدام وظيفة updateStudentWithHistory لتحديث الطالب وإضافة سجل المعلم عند تغييره
        const result = await updateStudentWithHistory(studentId, updatedStudent);

        console.log('🔄 Student update result:', result);
        console.log('✅ تم تحديث بيانات الطالب وإضافة سجل للمعلم إذا تم تغييره');

        if (result.success) {
          toast({
            title: studentsLabels.updateSuccess || "تم تحديث بيانات الطالب بنجاح",
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadStudents();
        } else {
          toast({
            title: errorMessages.updateFailed || "فشل في التحديث",
            description: result.message || studentsLabels.unexpectedError,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات الطالب:", error);
      toast({
        title: errorMessages.generalError || "خطأ",
        description: studentsLabels.unexpectedError,
        variant: "destructive",
      });
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    console.log('تصفية قائمة الطلاب:', students.length, 'طالب باستخدام المعايير:', {
      searchTerm: searchTerm ? searchTerm.trim() : 'فارغ',
      filterGrade: filterGrade || 'غير محدد',
      selectedTeacherId: selectedTeacherId || 'غير محدد',
      studyCircleId: studyCircleId || 'غير محدد'
    });

    return students.filter(student => {
      // تطبيق البحث النصي
      const matchesSearch = !searchTerm ||
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone_number && student.phone_number.includes(searchTerm)) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.guardian?.full_name && student.guardian.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

      // تطبيق فلتر الصف الدراسي
      const studentGrade = student.grade || student.grade_level;
      const matchesGrade = filterGrade === 'all' || !filterGrade || studentGrade === filterGrade;

      // تطبيق فلتر الحلقة الدراسية
      const matchesStudyCircle = !studyCircleId || studyCircleId === 'all' || student.study_circle_id === studyCircleId;

      // تطبيق فلتر المعلم إذا تم اختياره (فقط لغير المعلمين)
      let matchesTeacher = true;
      if (userRole !== 'teacher' && selectedTeacherId && selectedTeacherId !== 'all') {
        // التحقق من أن المعلم في الحلقة الدراسية التي ينتمي إليها الطالب
        matchesTeacher = student.study_circle?.teacher?.id === selectedTeacherId;
      }

      return matchesSearch && matchesGrade && matchesStudyCircle && matchesTeacher;
    });
  }, [students, searchTerm, filterGrade, selectedTeacherId, studyCircleId, userRole]);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));

  // Paginate the filtered results
  const paginatedStudents = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) {
      console.log('No students to paginate');
      return [];
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedResult = filteredStudents.slice(startIndex, startIndex + itemsPerPage);
    console.log(`Paginated students: ${paginatedResult.length} (page ${currentPage} of ${totalPages})`);
    return paginatedResult;
  }, [filteredStudents, currentPage, itemsPerPage, totalPages]);

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
      <div className="container mx-auto p-8 text-center">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">{studentsLabels.accessDenied}</h2>
        <p className="text-muted-foreground mb-6">{studentsLabels.accessDeniedMessage}</p>
        <Button onClick={() => onNavigate('/')} variant="outline">
          {studentsLabels.returnToHome}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6" dir="rtl">
      <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-yellow-300" />
                {userRole === 'teacher' ? 'الطلاب المرتبطين بك' : studentsLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {userRole === 'teacher'
                  ? 'عرض وإدارة الطلاب المرتبطين بالمعلم الحالي'
                  : studentsLabels.description
                }
              </CardDescription>
            </div>

            {/* الأزرار */}
            <div className="flex gap-2">
              <Button
                className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={handleAddStudent}
              >
                <span className="text-lg">🧒</span>
                <span>{studentsLabels.addStudent}</span>
              </Button>

              <Button
                className="flex items-center gap-2 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={handleAddGuardian}
              >
                <span className="text-lg">👤</span>
                <span>إضافة ولي أمر جديد</span>
              </Button>
            </div>
          </div>
        </CardHeader>


        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 ml-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={studentsLabels.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-10 w-full"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex gap-2">
              {/* فلتر ديناميكي: معلم أو حلقة */}
              {userRole === 'teacher' ? (
                <Select
                  value={studyCircleId || 'all'}
                  onValueChange={value => {
                    const newValue = value === 'all' ? '' : value;
                    setStudyCircleId(newValue);
                    // تنفيذ البحث مباشرة عند تغيير الحلقة
                    setTimeout(() => handleSearch(), 100);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="كل الحلقات" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                    <SelectItem value="all">كل الحلقات</SelectItem>
                    {teacherStudyCircles.length > 0 ? (
                      teacherStudyCircles.map(circle => (
                        <SelectItem key={circle.id} value={circle.id}>{circle.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>لا توجد حلقات متاحة</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  {/* قائمة المعلمين - إخفاء تمامًا للمعلمين */}
                  {!isTeacher(userRole) && (
                    <Select
                      value={selectedTeacherId || 'all'}
                      onValueChange={value => {
                        const newValue = value === 'all' ? '' : value;
                        handleTeacherChange(newValue);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="كل المعلمين" />
                      </SelectTrigger>
                      <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                        <SelectItem value="all">كل المعلمين</SelectItem>
                        {teachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id}>{teacher.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {isTeacher(userRole) && (
                    <div className="bg-gray-100 rounded-md px-3 py-2 flex items-center w-[180px]">
                      <GraduationCap className="h-4 w-4 text-islamic-green/60 mr-2" />
                      <span className="text-sm">المعلم الحالي</span>
                    </div>
                  )}

                  {/* قائمة الحلقات الدراسية - تعتمد على المعلم المحدد */}
                  <Select
                    value={studyCircleId || 'all'}
                    onValueChange={value => {
                      const newValue = value === 'all' ? '' : value;
                      setStudyCircleId(newValue);
                      // تنفيذ البحث مباشرة عند تغيير الحلقة
                      setTimeout(() => handleSearch(), 100);
                    }}
                    disabled={isLoadingStudyCircles}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="كل الحلقات" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                      <SelectItem value="all">كل الحلقات</SelectItem>
                      {teacherStudyCircles.length > 0 ? (
                        teacherStudyCircles.map(circle => (
                          <SelectItem key={circle.id} value={circle.id}>{circle.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {selectedTeacherId ? 'لا توجد حلقات لهذا المعلم' : 'اختر معلم أولاً'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleSearch}
                title={studentsLabels.search}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadStudents()}
                title={studentsLabels.refresh}
                className="shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExportData}
                title={studentsLabels.export}
                className="shrink-0"
                disabled={exportLoading || students.length === 0}
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* الجدول */}
          <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-green-200 dark:border-green-700 p-2">
            <Table className="min-w-full border border-green-300 rounded-2xl overflow-hidden shadow-lg">
              <TableHeader className="bg-islamic-green">
                <TableRow>
                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between">
                      <span>{'#️⃣'}</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>الاسم</span>
                      <span className="ml-1">👤</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>ولي الأمر</span>
                      <span className="ml-1">👪</span>
                    </div>
                  </TableHead>

                  {userRole !== 'teacher' && (
                    <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                      <div className="flex items-center justify-between flex-row-reverse">
                        <span>المعلم</span>
                        <span className="ml-1">🎓</span>
                      </div>
                    </TableHead>
                  )}

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>الحلقة</span>
                      <span className="ml-1">📚</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>مستوى الحفظ</span>
                      <span className="ml-1">🕋</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>الصف</span>
                      <span className="ml-1">🏫</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-between flex-row-reverse">
                      <span>الجنس</span>
                      <span className="ml-1">👤</span>
                    </div>
                  </TableHead>

                  <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">
                    <div className="flex items-center justify-center gap-1">
                      ⚙️ إجراءات
                    </div>
                  </TableHead>

                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedStudents.map((student, index) => (
                  <TableRow
                    key={student.id}
                    className={`border-b border-green-200 transition-colors duration-200
        ${index % 2 === 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-white dark:bg-gray-800'}
        hover:bg-green-100 dark:hover:bg-green-700`}
                  >
                    <TableCell className="text-center border-r border-green-200 font-medium text-islamic-green/80 py-2 px-3">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>

                    <TableCell className="border-r border-green-200 font-medium py-2 px-3">{student.full_name}</TableCell>

                    <TableCell className="border-r border-green-200 py-2 px-3">
                      {student.guardian?.full_name ? (
                        <div className="flex items-center justify-center gap-1">
                          <UserCircle className="h-4 w-4 text-islamic-green/60" />
                          <span className="text-islamic-green/80">{student.guardian.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {userRole !== 'teacher' && (
                      <TableCell className="border-r border-green-200 py-2 px-3">
                        {student.study_circle?.teacher?.full_name ? (
                          <div className="flex items-center justify-center gap-1">
                            <GraduationCap className="h-4 w-4 text-islamic-green/60" />
                            <span className="text-islamic-green/80">{student.study_circle.teacher.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="border-r border-green-200 py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="h-4 w-4 text-islamic-green/60" />
                        <span className="text-islamic-green/80">{student.study_circle?.name || '-'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="border-r border-green-200 py-2 px-3">
                      <span className="text-islamic-green/80">{studentsLabels.quranPartsOptions.find(part => part.value === student.memorized_parts)?.label || student.memorized_parts}</span>
                    </TableCell>

                    <TableCell className="border-r border-green-200 py-2 px-3">
                      <span className="text-islamic-green/80">{studentsLabels.gradeOptions.find(g => g.value === (student.grade_level || student.grade))?.label || (student.grade_level || student.grade || "-")}</span>
                    </TableCell>

                    <TableCell className="border-r border-green-200 py-2 px-3 text-center">
                      <span className="text-islamic-green/80">{student.gender === 'male' ? 'ذكر' : student.gender === 'female' ? 'أنثى' : '-'}</span>
                    </TableCell>

                    <TableCell className="border-r border-green-200 py-2 px-3">
                      <div className="flex justify-center items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditStudent(student)} className="h-8 w-8 text-islamic-green hover:bg-green-100 rounded-full">
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student)} className="h-8 w-8 text-red-500 hover:bg-red-100 rounded-full">
                          <Trash2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewteacherHistory(student)} className="h-8 w-8 text-blue-500 hover:bg-blue-100 rounded-full">
                          <History size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>



            </Table>
          </div>


          {filteredStudents.length > itemsPerPage && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    />
                  </PaginationItem>

                  {renderPageNumbers()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {studentsLabels.totalStudents}: <span className="font-medium">{students.length}</span>
          </div>

          <div className="text-sm text-muted-foreground">
            {studentsLabels.showing}{" "}
            <span className="font-medium">
              {Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)} - {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
            </span>{" "}
            {studentsLabels.from} <span className="font-medium">{filteredStudents.length}</span> {studentsLabels.student}
          </div>
        </CardFooter>
      </Card>

      {/* حوار إضافة/تعديل طالب */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[650px]">
          <DialogHeader className="flex justify-center items-center">
            <DialogTitle className="flex items-center gap-2 text-islamic-green text-xl">
              {dialogTitle}
              <UserPlus className="h-5 w-5" />
            </DialogTitle>
          </DialogHeader>

          {/* بيانات النموذج - منظمة بترتيب: المعلم والحلقة في صف، ثم ولي الأمر في صف جديد */}
          <div className="flex flex-col gap-6 py-4">
            {/* الصف الأول - المعلم والحلقة */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* المعلم */}
              {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'teacher') && (
                <div className="flex-1">
                  <Label htmlFor="teacher_id" className="mb-2 block">
                    {studentsLabels.teacherName} <span className="text-muted-foreground text-sm">{studentsLabels.optionalField}</span>
                  </Label>
                  {userRole === 'teacher' ? (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                      <UserCircle className="h-4 w-4 text-islamic-green/60" />
                      <span>
                        {(() => {
                          const currentteacher = userId ? teachers.find(s => s.id === userId) : null;
                          if (currentteacher) {
                            return currentteacher.full_name;
                          }
                          return 'المعلم';
                        })()}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative md:w-1/2">
                          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="البحث عن معلم"
                            value={teacherSearchTerm}
                            onChange={(e) => setteacherSearchTerm(e.target.value)}
                            className="pl-3 pr-10 mb-2 md:mb-0"
                          />
                        </div>
                        <div className="md:w-1/2">
                          <Select
                            value={selectedTeacherId}
                            onValueChange={(value) => handleTeacherChange(value)}
                            disabled={userRole === 'teacher' as UserRoleExtended}
                          >
                            <SelectTrigger className="focus:border-islamic-green">
                              <SelectValue placeholder="اختر معلم" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachers
                                .filter(teacher =>
                                  !teacherSearchTerm ||
                                  teacher.full_name.toLowerCase().includes(teacherSearchTerm.toLowerCase())
                                )
                                .map(teacher => (
                                  <SelectItem key={teacher.id} value={teacher.id}>
                                    <div className="flex flex-col">
                                      <span>{teacher.full_name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {teacher.role === 'admin' ? 'مشرف' : 'معلم'}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* الحلقة الدراسية */}
              {(userRole === 'admin' || userRole === 'superadmin' || userRole === 'teacher') && (
                <div className="flex-1">
                  <Label htmlFor="study_circle_id" className="mb-2 block">
                    {studentsLabels.studyCircleName} <span className="text-muted-foreground text-sm">{studentsLabels.requiredField}</span>
                  </Label>
                  <Select
                    value={studyCircleId}
                    onValueChange={(value) => {
                      setStudyCircleId(value);
                      // No need to trigger search here as this is in the edit dialog
                    }}
                    disabled={!selectedTeacherId || isLoadingStudyCircles}
                  >
                    <SelectTrigger className="focus:border-islamic-green">
                      <SelectValue placeholder={isLoadingStudyCircles ? "جاري تحميل الحلقات..." : studentsLabels.studyCirclePlaceholder} />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" align="start" side="bottom">
                      {teacherStudyCircles.length > 0 ? (
                        teacherStudyCircles.map(circle => (
                          <SelectItem key={circle.id} value={circle.id}>
                            <div className="flex flex-col">
                              <span>{circle.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {circle.name || "حلقة دراسية"}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          {selectedTeacherId ? "لا توجد حلقات لهذا المعلم" : "اختر معلم أولاً"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {/* الصف الثاني - ولي الأمر فقط */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 ltr">
                <Label htmlFor="guardian_id" className="mb-2 block">
                  {studentsLabels.guardianName} <span className="text-muted-foreground text-sm">{studentsLabels.optionalField}</span>
                </Label>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="w-[50%]">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="بحث عن ولي أمر..."
                          className="pl-8 text-sm focus:border-islamic-green"
                          value={guardianSearchTerm}
                          onChange={(e) => setGuardianSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="w-[50%]">
                      <Select
                        value={guardianId}
                        onValueChange={setGuardianId}
                      >
                        <SelectTrigger className="focus:border-islamic-green">
                          <SelectValue placeholder="اختر ولي الأمر" />
                        </SelectTrigger>
                        <SelectContent position="item-aligned" align="start" side="bottom">
                          {guardians
                            .filter(guardian =>
                              !guardianSearchTerm ||
                              guardian.full_name.includes(guardianSearchTerm) ||
                              (guardian.phone_number && guardian.phone_number.includes(guardianSearchTerm))
                            )
                            .map(guardian => (
                              <SelectItem key={guardian.id} value={guardian.id}>
                                <div className="flex flex-col">
                                  <span>{guardian.full_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {guardian.phone_number || "لا يوجد رقم هاتف"}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Input
                  id="guardian_name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder={studentsLabels.guardianName}
                  className="focus:border-islamic-green hidden"
                />
              </div>
            </div>

            {/* الصف الثالث - معلومات الصف الدراسي */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* الصف الدراسي */}
              <div className="flex-1">
                <Label htmlFor="grade_level" className="mb-2 block">
                  {studentsLabels.grade} <span className="text-destructive">*</span>
                </Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="focus:border-islamic-green">
                    <SelectValue placeholder="اختر الصف" />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">مرحلة رياض الأطفال</SelectLabel>
                      {studentsLabels.gradeOptions.slice(0, 2).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">المرحلة الابتدائية</SelectLabel>
                      {studentsLabels.gradeOptions.slice(2, 8).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">المرحلة الإعدادية</SelectLabel>
                      {studentsLabels.gradeOptions.slice(8, 11).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">المرحلة الثانوية</SelectLabel>
                      {studentsLabels.gradeOptions.slice(11, 14).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">المرحلة الجامعية</SelectLabel>
                      {studentsLabels.gradeOptions.slice(14, 20).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">الدراسات العليا</SelectLabel>
                      {studentsLabels.gradeOptions.slice(20).map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* مستوى حفظ القرآن */}
              <div className="flex-1">
                <Label htmlFor="last_quran_progress" className="mb-2 block">
                  {studentsLabels.lastQuranProgress} <span className="text-muted-foreground text-sm">{studentsLabels.optionalField}</span>
                </Label>
                <Select value={lastQuranProgress} onValueChange={setLastQuranProgress}>
                  <SelectTrigger className="focus:border-islamic-green">
                    <SelectValue placeholder={studentsLabels.quranProgressPlaceholder} />
                  </SelectTrigger>
                  <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                    <SelectGroup>
                      <SelectLabel className="font-bold text-islamic-green">الأجزاء</SelectLabel>
                      {studentsLabels.quranPartsOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* الصف الرابع - معلومات الاتصال */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* رقم الهاتف */}
              <div className="flex-1">
                <Label htmlFor="phone_number" className="mb-2 block">
                  {studentsLabels.phoneNumber} <span className="text-muted-foreground text-sm">{studentsLabels.optionalField}</span>
                </Label>
                <Input
                  id="phone_number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={studentsLabels.phoneNumber}
                  dir="ltr"
                  className="text-left focus:border-islamic-green"
                />
              </div>

              {/* البريد الإلكتروني */}
              <div className="flex-1">
                <Label htmlFor="email" className="mb-2 block">
                  {studentsLabels.email} <span className="text-muted-foreground text-sm">(اختياري)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={studentsLabels.email}
                  dir="ltr"
                  className="text-left focus:border-islamic-green"
                />
              </div>
            </div>

            {/* الصف الخامس - الملاحظات */}
            <div>
              <Label htmlFor="address" className="mb-2 block">
                {studentsLabels.notes} <span className="text-muted-foreground text-sm">(اختياري)</span>
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={studentsLabels.notes}
                rows={3}
                className="focus:border-islamic-green"
              />
            </div>
          </div>

          <DialogFooter dir="rtl" className="flex justify-start gap-2">
            <Button onClick={handleSaveStudent} className="bg-islamic-green hover:bg-islamic-green/90">
              {studentsLabels.save}
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {studentsLabels.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteStudent}
        title={studentsLabels.deleteStudent}
        description={
          <>
            {studentsLabels.deleteConfirmation}
            <br />
            {studentsLabels.deleteDescription}
          </>
        }
        deleteButtonText={studentsLabels.confirm}
        cancelButtonText={studentsLabels.cancel}
      />
      {/* حوار إضافة ولي أمر جديد */}
      <Dialog open={isGuardianDialogOpen} onOpenChange={setIsGuardianDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[500px]">
          <DialogHeader className="flex justify-center items-center">
            <DialogTitle className="flex items-center gap-2 text-islamic-green text-xl">
              إضافة ولي أمر جديد
              <UserPlus className="h-5 w-5" />
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            {/* اسم ولي الأمر */}
            <div>
              <Label htmlFor="guardian_full_name" className="mb-2 block">
                الاسم الكامل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guardian_full_name"
                value={guardianFullName}
                onChange={(e) => setGuardianFullName(e.target.value)}
                placeholder="الاسم الكامل لولي الأمر"
                className="focus:border-islamic-green"
                required
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <Label htmlFor="guardian_phone_number" className="mb-2 block">
                رقم الهاتف <span className="text-destructive">*</span>
              </Label>
              <Input
                id="guardian_phone_number"
                value={guardianPhoneNumber}
                onChange={(e) => setGuardianPhoneNumber(e.target.value)}
                placeholder="رقم الهاتف"
                dir="ltr"
                className="text-left focus:border-islamic-green"
                required
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <Label htmlFor="guardian_email" className="mb-2 block">
                البريد الإلكتروني <span className="text-muted-foreground text-sm">(اختياري)</span>
              </Label>
              <Input
                id="guardian_email"
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                dir="ltr"
                className="text-left focus:border-islamic-green"
              />
            </div>

            {/* العنوان / ملاحظات */}
            <div>
              <Label htmlFor="guardian_address" className="mb-2 block">
                العنوان / ملاحظات <span className="text-muted-foreground text-sm">(اختياري)</span>
              </Label>
              <Textarea
                id="guardian_address"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                placeholder="العنوان أو أي ملاحظات إضافية"
                rows={3}
                className="focus:border-islamic-green"
              />
            </div>
          </div>

          <DialogFooter dir="rtl" className="flex justify-start gap-2">
            <Button onClick={handleSaveGuardian} className="bg-islamic-green hover:bg-islamic-green/90">
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setIsGuardianDialogOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار عرض سجل المعلمين */}
      <Dialog open={isteacherHistoryDialogOpen} onOpenChange={setIsteacherHistoryDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-[700px]">
          <DialogHeader className="flex justify-center items-center">
            <DialogTitle className="flex items-center gap-2 text-islamic-green text-xl">
              سجل المعلمين السابقين للطالب
              <History className="h-5 w-5" />
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* معلومات الطالب */}
            <div className="mb-4 bg-gray-50 p-3 rounded-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <UserCircle className="h-5 w-5 text-islamic-green" />
                <span className="font-semibold">{currentStudentHistory.student.full_name}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-islamic-green/60" />
                  <span className="text-sm text-gray-600">
                    الصف: {studentsLabels.gradeOptions?.find(g => g.value === currentStudentHistory.student.grade_level)?.label || currentStudentHistory.student.grade_level || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-islamic-green/60" />
                  <span className="text-sm text-gray-600">
                    المعلم الحالي: {currentStudentHistory.student.study_circle?.teacher?.full_name || 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>

            {/* جدول سجل المعلمين */}
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-islamic-green" />
              </div>
            ) : currentStudentHistory.history.length > 0 ? (
              <div className="border border-islamic-green/20 rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-islamic-green/25">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right font-bold text-islamic-green">المعلم</TableHead>
                      <TableHead className="text-right font-bold text-islamic-green">الحلقة</TableHead>
                      <TableHead className="text-right font-bold text-islamic-green">تاريخ البداية</TableHead>
                      <TableHead className="text-right font-bold text-islamic-green">تاريخ النهاية</TableHead>
                      <TableHead className="text-right font-bold text-islamic-green">المدة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStudentHistory.history.map((record, index) => {
                      // البحث عن اسم المعلم
                      const teacher = teachers.find(s => s.id === record.teacher_id);

                      // حساب المدة
                      const startDate = new Date(record.start_date);
                      const endDate = record.end_date ? new Date(record.end_date) : new Date();
                      const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                      let duration = '';

                      if (durationDays < 30) {
                        duration = `${durationDays} يوم`;
                      } else if (durationDays < 365) {
                        const months = Math.floor(durationDays / 30);
                        duration = `${months} شهر`;
                      } else {
                        const years = Math.floor(durationDays / 365);
                        const remainingMonths = Math.floor((durationDays % 365) / 30);
                        duration = `${years} سنة${remainingMonths > 0 ? ` و ${remainingMonths} شهر` : ''}`;
                      }

                      return (
                        <TableRow
                          key={record.id}
                          className={`border-b border-islamic-green/10 ${!record.end_date ? 'bg-islamic-green/5' : ''}`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-4 w-4 text-islamic-green/60" />
                              <span>{teacher?.full_name || 'غير معروف'}</span>
                              {!record.end_date && (
                                <span className="inline-flex px-2 py-0.5 mr-2 text-xs bg-islamic-green/20 text-islamic-green/80 rounded-full">
                                  حالي
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4 text-islamic-green/60" />
                              <span>{record.study_circle?.name || 'غير محدد'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(record.start_date).toLocaleDateString('ar-EG')}</TableCell>
                          <TableCell>
                            {record.end_date
                              ? new Date(record.end_date).toLocaleDateString('ar-EG')
                              : <span className="text-gray-500">-</span>
                            }
                          </TableCell>
                          <TableCell>{duration}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-muted-foreground mb-2">لا يوجد سجل للمعلمين السابقين</p>
                <p className="text-sm text-gray-500">لم يتم تسجيل أي تغيير في معلمي هذا الطالب</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsteacherHistoryDialogOpen(false)}
              className="border-islamic-green text-islamic-green hover:bg-islamic-green/10"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
