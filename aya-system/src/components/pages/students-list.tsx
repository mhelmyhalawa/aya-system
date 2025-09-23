// Unified labels (multi-language)
import { getLabels } from "@/lib/labels";
import { FormDialog } from "@/components/ui/form-dialog";
import { StudentFormDialog, StudentFormData } from "@/components/students/StudentFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable, Column } from "../ui/generic-table";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
import { UserRole } from "@/types/profile";
import { StudyCircle } from "@/types/study-circle";
import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  FileDown,
  RefreshCw,
  AlertCircle,
  Pencil,
  GraduationCap,
  Trash2,
  BookOpen,
  Database,
  School,
  UserCircle,
  History
} from "lucide-react";
import { Student, StudentCreate, StudentUpdate } from "@/types/student";
import { teacherHistory } from "@/types/teacher-history";
import { Guardian, GuardianCreate } from "@/types/guardian";
import { Profile } from "@/types/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getAllGuardians, addGuardian } from "@/lib/guardian-service";
import { getteachers } from "@/lib/profile-service";
import { createStudent, updateStudent as updateStudentWithHistory } from "@/lib/student-service";
import { searchStudents as searchStudentsApi, getAllStudents as getAllStudentsApi, deleteStudent } from "@/lib/supabase-service";
import { exportStudentsToJson } from "@/lib/database-service";
import { getteacherHistoryForStudent } from "@/lib/teacher-history-service";

interface StudentsListProps { onNavigate: (path: string) => void; userRole?: UserRole; userId?: string | null; }

export function StudentsList({ onNavigate, userRole, userId }: StudentsListProps) {
  const { toast } = useToast();
  const { errorMessages, studentsLabels, guardiansLabels, teacherHistoryLabels, commonLabels } = getLabels('ar');

  // Helper type guard to safely check teacher role
  const isTeacherRole = (role: UserRole | undefined): role is UserRole => role === 'teacher';

  // صلاحيات الحذف مقتصرة على superadmin فقط
  const canDelete = userRole === 'superadmin';

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
  // حالات خاصة بالنموذج فقط (لا تؤثر على فلترة الجدول)
  const [formTeacherId, setFormTeacherId] = useState<string>("");
  const [formStudyCircleId, setFormStudyCircleId] = useState<string>("");
  const [isLoadingStudyCircles, setIsLoadingStudyCircles] = useState<boolean>(false);

  // تنفيذ استرجاع البيانات عند تحميل المكون
  useEffect(() => {
    console.log('Component mounted, fetching students...');
    loadteachers();
    loadGuardians();

    if (userRole === 'teacher' && userId) {
      setSelectedTeacherId(userId);
      loadStudyCirclesForTeacher(userId).then(() => {
        const searchCriteria = { teacher_id: userId } as any;
        loadStudents(searchCriteria);
      });
    } else {
      loadStudyCircles();
      loadStudents();
    }
  }, []);

  // تنفيذ البحث عند تغيير الحلقة الدراسية
  useEffect(() => {
    console.log('تغيير الحلقة الدراسية:', studyCircleId);
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 100);
    return () => clearTimeout(timeoutId);
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

  // حالة حوار الطالب (استبدلنا النموذج الداخلي بمكون مشترك)
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [studentDialogMode, setStudentDialogMode] = useState<"add" | "edit">("add");
  const [studentInitialData, setStudentInitialData] = useState<Partial<StudentFormData> | undefined>(undefined);

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
          full_name: student.full_name || studentsLabels.noName,
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
    await loadteachers();
    await loadStudyCircles();
    setStudentDialogMode("add");
    setStudentInitialData(undefined);
    setIsStudentDialogOpen(true);
  };

  // تعديل طالب
  const handleEditStudent = async (student: Student) => {
    await loadteachers();
    await loadStudyCircles();
    let teacherIdForCircle: string | undefined = undefined;
    if (student.study_circle_id) {
      const circle = studyCircles.find(c => c.id === student.study_circle_id);
      if (circle) {
        teacherIdForCircle = circle.teacher_id;
        await loadStudyCirclesForTeacher(circle.teacher_id);
      }
    }
    setStudentDialogMode("edit");
    setStudentInitialData({
      id: student.id,
      full_name: student.full_name,
      guardian_id: student.guardian_id,
      grade_level: student.grade_level || student.grade,
      gender: student.gender as any,
      date_of_birth: student.date_of_birth || undefined,
      memorized_parts: student.memorized_parts || undefined,
      phone_number: student.phone_number || undefined,
      email: student.email || undefined,
      study_circle_id: student.study_circle_id || undefined,
      teacher_id: teacherIdForCircle,
      // notes not stored previously in this view
    });
    setIsStudentDialogOpen(true);
  };

  // حذف طالب
  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setIsDeleteDialogOpen(true);
  };

  // عرض سجل المعلمين
  const handleViewteacherHistory = async (student: Student) => {
    // افتح الحوار أولاً لإظهار مؤشر التحميل فوراً
    setIsteacherHistoryDialogOpen(true);
    setLoadingHistory(true);
    try {
      const history = await getteacherHistoryForStudent(student.id);
      console.log('تم تحميل سجل المعلمين للطالب:', history);
      if (history.length > 0) {
        console.log('معلومات الحلقة الدراسية للسجل الأول:', {
          study_circle_id: history[0].study_circle_id,
          study_circle: history[0].study_circle
        });
      }
      setCurrentStudentHistory({ student, history });
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
  const handleSubmitStudentForm = async (data: StudentFormData) => {
    try {
      if (studentDialogMode === 'add') {
        const newStudent: StudentCreate = {
          full_name: data.full_name,
          guardian_id: data.guardian_id,
          study_circle_id: data.study_circle_id,
          grade_level: data.grade_level!,
          gender: data.gender === 'male' || data.gender === 'female' ? data.gender : undefined,
          date_of_birth: data.date_of_birth,
          memorized_parts: data.memorized_parts,
          phone_number: data.phone_number,
          email: data.email,
        };
        const result = await createStudent(newStudent);
        if (result.success) {
          toast({ title: studentsLabels.addSuccess, className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          loadStudents();
        } else {
          toast({ title: errorMessages.saveFailed || 'فشل في الحفظ', description: result.message || studentsLabels.unexpectedError, variant: 'destructive' });
        }
      } else {
        const updatedStudent: StudentUpdate = {
          id: data.id!,
          full_name: data.full_name,
          guardian_id: data.guardian_id,
          study_circle_id: data.study_circle_id,
          grade_level: data.grade_level!,
          gender: data.gender === 'male' || data.gender === 'female' ? data.gender : undefined,
          date_of_birth: data.date_of_birth,
          memorized_parts: data.memorized_parts,
          phone_number: data.phone_number,
          email: data.email,
        };
        const result = await updateStudentWithHistory(data.id!, updatedStudent);
        if (result.success) {
          toast({ title: studentsLabels.updateSuccess || 'تم تحديث بيانات الطالب بنجاح', className: 'bg-green-50 border-green-200' });
          setIsStudentDialogOpen(false);
          loadStudents();
        } else {
          toast({ title: errorMessages.updateFailed || 'فشل في التحديث', description: result.message || studentsLabels.unexpectedError, variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('خطأ في حفظ بيانات الطالب:', error);
      toast({ title: errorMessages.generalError || 'خطأ', description: studentsLabels.unexpectedError, variant: 'destructive' });
    }
  };

  // إزالة حالات الـ Wizard المحلية بعد نقلها للمكون المشترك

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
      <div className="w-full max-w-[1600px] mx-auto p-8 text-center">
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
    <div className="w-full max-w-[1600px] mx-auto px-0 sm:px-0 py-1 sm:py-2">

      <Card>
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-yellow-300" />
                {userRole === 'teacher' ? studentsLabels.teacherViewTitle : studentsLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {userRole === 'teacher'
                  ? studentsLabels.teacherViewDescription
                  : studentsLabels.description
                }
              </CardDescription>
            </div>

            {/* الأزرار */}
            <div className="flex gap-2">
              <Button
                className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={handleAddGuardian}
                title={guardiansLabels.addGuardian}
              >
                <span className="text-lg">👤</span>
                <span className="hidden sm:inline">{guardiansLabels.addGuardian}</span>
              </Button>
              <Button
                className="flex items-center gap-2 rounded-3xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
                onClick={handleAddStudent}
                title={studentsLabels.addStudent}
              >
                <span className="text-lg">🧒</span>
                <span className="hidden sm:inline">{studentsLabels.addStudent}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="h-4 w-4 ml-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* شريط البحث والتصفية (نسخة مضغوطة) */}
          <div className="flex flex-col md:flex-row md:items-stretch gap-0 md:gap-0 mb-1 md:mb-0">
            {/* حقل البحث */}
            <div className="relative md:w-[220px] lg:w-[260px]">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={studentsLabels.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-8 h-9 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* الفلاتر + أزرار الإجراءات */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-0 md:gap-0 md:w-auto flex-1">
              {/* فلتر ديناميكي: معلم أو حلقة */}
              {userRole === 'teacher' ? (
                <div className="w-full sm:w-auto md:w-[200px]">
                  <Select
                    value={studyCircleId || 'all'}
                    onValueChange={value => {
                      const newValue = value === 'all' ? '' : value;
                      setStudyCircleId(newValue);
                      setTimeout(() => handleSearch(), 100);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder={studentsLabels.allStudyCircles} />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                      <SelectItem value="all">{studentsLabels.allStudyCircles}</SelectItem>
                      {teacherStudyCircles.length > 0 ? (
                        teacherStudyCircles.map(circle => (
                          <SelectItem key={circle.id} value={circle.id}>{circle.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>{studentsLabels.noStudyCircles}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-2 md:gap-2 md:w-auto flex-1">
                  {!isTeacherRole(userRole) && (
                    <div className="w-full sm:w-auto md:w-[180px]">
                      <Select
                        value={selectedTeacherId || 'all'}
                        onValueChange={value => {
                          const newValue = value === 'all' ? '' : value;
                          handleTeacherChange(newValue);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 text-sm">
                          <SelectValue placeholder={studentsLabels.allTeachers} />
                        </SelectTrigger>
                        <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                          <SelectItem value="all">{studentsLabels.allTeachers}</SelectItem>
                          {teachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>{teacher.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isTeacherRole(userRole) && (
                    <div className="bg-gray-100 rounded-md px-3 py-2 flex items-center w-full md:w-[180px]">
                      <GraduationCap className="h-4 w-4 text-islamic-green/60 mr-2" />
                      <span className="text-sm">{studentsLabels.currentTeacherLabel}</span>
                    </div>
                  )}

                  <div className="w-full md:w-[180px]">
                    <Select
                      value={studyCircleId || 'all'}
                      onValueChange={value => {
                        const newValue = value === 'all' ? '' : value;
                        setStudyCircleId(newValue);
                        setTimeout(() => handleSearch(), 100);
                      }}
                      disabled={isLoadingStudyCircles}
                    >
                      <SelectTrigger className="w-full h-9 text-sm">
                        <SelectValue placeholder={studentsLabels.allStudyCircles} />
                      </SelectTrigger>
                      <SelectContent position="item-aligned" align="end" side="bottom" className="max-h-[300px]">
                        <SelectItem value="all">{studentsLabels.allStudyCircles}</SelectItem>
                        {teacherStudyCircles.length > 0 ? (
                          teacherStudyCircles.map(circle => (
                            <SelectItem key={circle.id} value={circle.id}>{circle.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            {selectedTeacherId ? studentsLabels.noCirclesForTeacher : studentsLabels.selectTeacherFirst}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="hidden sm:flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadStudents()}
                  title={studentsLabels.refresh}
                  className="shrink-0 w-9 h-9"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExportData}
                  title={studentsLabels.export}
                  className="shrink-0 w-9 h-9"
                  disabled={exportLoading || students.length === 0}
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

      </Card>

      {/* الجدول عبر المكون العام GenericTable */}
      <GenericTable
        title={studentsLabels.title}
        data={paginatedStudents.map((s, idx) => ({ ...s, __index: (currentPage - 1) * itemsPerPage + idx + 1 }))}
        defaultView="table"
        columns={([
          { key: '__index', header: '#', render: (item: any) => <span className="font-medium">{item.__index}</span>, width: '50px', align: 'center' },
          // عمود اسم الطالب (يُستخدم في رأس البطاقة مع الفهرس)
          { key: 'full_name', header: studentsLabels.name, render: (item: any) => <span className="font-medium">{item.full_name} {item.guardian?.full_name}</span> },
           ...(userRole !== 'teacher' ? [{
            key: 'teacher', header: studentsLabels.teacherColumn, render: (item: any) => item.study_circle?.teacher?.full_name ? (
              <div className="flex items-center gap-1"><GraduationCap className="h-4 w-4 text-islamic-green/60" /><span>{item.study_circle.teacher.full_name}</span></div>
            ) : <span className="text-muted-foreground">—</span>
          }] : []),
          {
            key: 'study_circle', header: studentsLabels.studyCircleShort, render: (item: any) => (
              <div className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-islamic-green/60" /><span>{item.study_circle?.name || '-'}</span></div>
            )
          },
          {
            key: 'memorized_parts', header: studentsLabels.memorizeLevelHeader, render: (item: any) => (
              <span>{studentsLabels.quranPartsOptions.find(p => p.value === item.memorized_parts)?.label || item.memorized_parts}</span>
            )
          },
          {
            key: 'grade', header: studentsLabels.gradeShort, render: (item: any) => (
              <span>{studentsLabels.gradeOptions.find(g => g.value === (item.grade_level || item.grade))?.label || (item.grade_level || item.grade || '-')}</span>
            )
          },
          {
            key: 'gender', header: studentsLabels.gender || 'الجنس', render: (item: any) => (
              <span>{item.gender === 'male' ? studentsLabels.genderMale : item.gender === 'female' ? studentsLabels.genderFemale : '-'}</span>
            )
          },
          {
            key: 'actions', header: studentsLabels.actions, render: (item: any) => (
              <div className="flex justify-center items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEditStudent(item)} className="h-8 w-8 text-islamic-green hover:bg-green-100 rounded-full" title={studentsLabels.editTooltip}>
                  <Pencil size={16} />
                </Button>
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(item)} className="h-8 w-8 text-red-500 hover:bg-red-100 rounded-full" title={studentsLabels.deleteTooltip}>
                    <Trash2 size={16} />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleViewteacherHistory(item)} className="h-8 w-8 text-blue-500 hover:bg-blue-100 rounded-full" title={teacherHistoryLabels.title}>
                  <History size={16} />
                </Button>
              </div>
            )
          }
        ]) as Column<any>[]}
        emptyMessage={studentsLabels.noStudents || 'لا يوجد طلاب'}
      />

      <StudentFormDialog
        open={isStudentDialogOpen}
        mode={studentDialogMode}
        onOpenChange={setIsStudentDialogOpen}
        initialData={studentInitialData}
        onSubmit={handleSubmitStudentForm}
        guardians={guardians}
        teachers={teachers}
        studyCircles={teacherStudyCircles}
        isTeacher={userRole === 'teacher'}
        currentTeacherId={userId}
        onLoadTeacherCircles={async (tid) => { await loadStudyCirclesForTeacher(tid); }}
        allowGuardianSelection={true}
      />

      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteStudent}
        title={studentsLabels.deleteStudent}
        description={<><span>{studentsLabels.deleteConfirmation}</span><br />{studentsLabels.deleteDescription}</>}
        deleteButtonText={studentsLabels.confirm}
        cancelButtonText={studentsLabels.cancel}
      />
      {/* حوار إضافة ولي أمر جديد باستخدام FormDialog */}
      <FormDialog
        title={guardiansLabels.addGuardian}
        open={isGuardianDialogOpen}
        onOpenChange={setIsGuardianDialogOpen}
        onSave={handleSaveGuardian}
        mode="add"
        saveButtonText={commonLabels.save}
        maxWidth="360px"
      >
        <div className="flex flex-col gap-4 py-1">
          {/* اسم ولي الأمر */}
          <div>
            <Label htmlFor="guardian_full_name" className="mb-1 block text-sm font-medium">{guardiansLabels.fullNameFull || guardiansLabels.fullName} <span className="text-destructive">*</span></Label>
            <Input id="guardian_full_name" value={guardianFullName} onChange={(e) => setGuardianFullName(e.target.value)} placeholder={guardiansLabels.fullNamePlaceholder || guardiansLabels.fullName} className="focus:border-islamic-green" required />
          </div>
          {/* رقم الهاتف */}
          <div>
            <Label htmlFor="guardian_phone_number" className="mb-1 block text-sm font-medium">{guardiansLabels.phoneNumber} <span className="text-destructive">*</span></Label>
            <Input id="guardian_phone_number" value={guardianPhoneNumber} onChange={(e) => setGuardianPhoneNumber(e.target.value)} placeholder={guardiansLabels.phoneNumberPlaceholder || guardiansLabels.phoneNumber} dir="ltr" className="text-left focus:border-islamic-green" required />
          </div>
          {/* البريد الإلكتروني */}
          <div>
            <Label htmlFor="guardian_email" className="mb-1 block text-sm font-medium">{guardiansLabels.email} <span className="text-muted-foreground text-xs">{guardiansLabels.optionalField}</span></Label>
            <Input id="guardian_email" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} placeholder={guardiansLabels.emailPlaceholder || guardiansLabels.email} dir="ltr" className="text-left focus:border-islamic-green" />
          </div>
          {/* العنوان / ملاحظات */}
          <div>
            <Label htmlFor="guardian_address" className="mb-1 block text-sm font-medium">{guardiansLabels.addressNotes || guardiansLabels.address} <span className="text-muted-foreground text-xs">{guardiansLabels.optionalField}</span></Label>
            <Textarea id="guardian_address" value={guardianAddress} onChange={(e) => setGuardianAddress(e.target.value)} placeholder={guardiansLabels.addressPlaceholder || guardiansLabels.address} rows={3} className="focus:border-islamic-green" />
          </div>
        </div>
      </FormDialog>

      {/* حوار عرض سجل المعلمين باستخدام FormDialog */}
      <FormDialog
        title={teacherHistoryLabels.titleLong}
        open={isteacherHistoryDialogOpen}
        onOpenChange={setIsteacherHistoryDialogOpen}
        onSave={() => setIsteacherHistoryDialogOpen(false)}
        mode="edit"
        saveButtonText="إغلاق"
        maxWidth="700px"
        hideCancelButton
      >
        <div className="py-1">
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
                  {studentsLabels.gradeShort || studentsLabels.grade}: {studentsLabels.gradeOptions?.find(g => g.value === currentStudentHistory.student.grade_level)?.label || currentStudentHistory.student.grade_level || '-'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-islamic-green/60" />
                <span className="text-sm text-gray-600">
                  {teacherHistoryLabels.currentTeacher} {currentStudentHistory.student.study_circle?.teacher?.full_name || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* جدول سجل المعلمين */}
          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <RefreshCw className="h-8 w-8 animate-spin text-islamic-green" />
            </div>
          ) : currentStudentHistory.history.length > 0 ? (
            <GenericTable
              title={teacherHistoryLabels.title}
              defaultView="table"
              data={currentStudentHistory.history.map(h => {
                const teacher = teachers.find(t => t.id === h.teacher_id);
                const startDate = new Date(h.start_date);
                const endDate = h.end_date ? new Date(h.end_date) : new Date();
                const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                let duration = '';
                if (durationDays < 30) {
                  duration = `${durationDays} ${teacherHistoryLabels.day}`;
                } else if (durationDays < 365) {
                  const months = Math.floor(durationDays / 30);
                  duration = `${months} ${teacherHistoryLabels.month}`;
                } else {
                  const years = Math.floor(durationDays / 365);
                  duration = `${years} ${teacherHistoryLabels.year}`;
                }
                return {
                  id: h.id,
                  teacher_name: teacher?.full_name || '-',
                  current_flag: !h.end_date,
                  study_circle_name: h.study_circle?.name || '-',
                  start_date: new Date(h.start_date).toLocaleDateString('ar-EG'),
                  end_date: h.end_date ? new Date(h.end_date).toLocaleDateString('ar-EG') : '-',
                  duration,
                };
              })}
              columns={([
                {
                  key: 'teacher_name',
                  header: teacherHistoryLabels.teacherHeader,
                  render: (item: any) => (
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4 text-islamic-green/60" />
                      <span>{item.teacher_name}</span>
                      {item.current_flag && (
                        <span className="inline-flex px-2 py-0.5 mr-2 text-xs bg-islamic-green/20 text-islamic-green/80 rounded-full">{teacherHistoryLabels.currentTeacherTag}</span>
                      )}
                    </div>
                  )
                },
                {
                  key: 'study_circle_name',
                  header: teacherHistoryLabels.studyCircleHeader,
                  render: (item: any) => (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 text-islamic-green/60" />
                      <span>{item.study_circle_name}</span>
                    </div>
                  )
                },
                { key: 'start_date', header: teacherHistoryLabels.startDateHeader },
                { key: 'end_date', header: teacherHistoryLabels.endDateHeader },
                { key: 'duration', header: teacherHistoryLabels.durationHeader },
              ]) as Column<any>[]}
              emptyMessage={teacherHistoryLabels.noHistoryShort}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Database className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-muted-foreground mb-2">{teacherHistoryLabels.noHistoryTitle}</p>
              <p className="text-sm text-gray-500">{teacherHistoryLabels.noHistoryDescription}</p>
            </div>
          )}
        </div>
      </FormDialog>
    </div>
  );
}
