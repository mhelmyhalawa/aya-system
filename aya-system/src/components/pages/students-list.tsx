// Unified labels (multi-language)
import { getLabels } from "@/lib/labels";
import { FormDialog } from "@/components/ui/form-dialog";
import { StudentFormDialog, StudentFormData } from "@/components/students/StudentFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable, Column } from "../ui/generic-table";
import { Input } from "@/components/ui/input";
import { PaginationItem, PaginationLink } from "@/components/ui/pagination";
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
  History,
  ChevronDown
} from "lucide-react";
import { Filter, ArrowDownUp, ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { Student, StudentCreate, StudentUpdate } from "@/types/student";
import { teacherHistory } from "@/types/teacher-history";
import { Guardian, GuardianCreate } from "@/types/guardian";
import { Profile } from "@/types/profile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmationDialog } from "../ui/delete-confirmation-dialog";
import { getAllStudyCircles, getStudyCirclesByTeacherId } from "@/lib/study-circle-service";
import { getAllGuardians, addGuardian } from "@/lib/guardian-service";
import { getteachers } from "@/lib/profile-service";
import { createStudent, updateStudent as updateStudentWithHistory, updateStudentImageDriveId } from "@/lib/student-service";
import { searchStudents as searchStudentsApi, getAllStudents as getAllStudentsApi, deleteStudent } from "@/lib/supabase-service";
import { exportStudentsToJson } from "@/lib/database-service";
// جلب صور الطلاب من مجلد Google Drive (العام) عبر المفتاح و المجلد
import { fetchDriveImages } from '@/lib/google-drive-image-service';
// رفع الصورة مباشرة من الجدول
import { getDriveAccessToken, uploadDriveImage, clearDriveAccessToken, deleteDriveFile } from '@/lib/google-drive-oauth';
import { getteacherHistoryForStudent } from "@/lib/teacher-history-service";
// مكون شريط فلترة المعلم والحلقة الموحد
// استيراد شريط الفلترة الموحد الجديد
import FilterBar from '@/components/filters/FilterBar';
// تعريف محلي لنوع الكيان الأساسي المستخدم مع بناء قائمة المعلمين / الحلقات
type BasicEntity = { id: string; name?: string; circles_count?: number; teacher_id?: string };

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
  // تتبع حالة حفظ معرف الصورة في قاعدة البيانات لكل طالب
  const [savedImageStudentIds, setSavedImageStudentIds] = useState<Set<string>>(new Set());
  const [failedPersistImageStudentIds, setFailedPersistImageStudentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  // حوار اختيار ولي الأمر (بدلاً من حقل النص المباشر)
  const [isGuardianPickerOpen, setIsGuardianPickerOpen] = useState(false);
  const [guardianPickerSearch, setGuardianPickerSearch] = useState("");
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<string[]>([]);
  const [teachers, setteachers] = useState<Profile[]>([]);
  // دمج البحث الخاص بالمعلم مع البحث العام (searchTerm)

  // حالة الحلقات الدراسية
  const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
  const [teacherStudyCircles, setTeacherStudyCircles] = useState<StudyCircle[]>([]);
  const [isTeacherCirclesLoading, setIsTeacherCirclesLoading] = useState<boolean>(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [studyCircleId, setStudyCircleId] = useState<string>("");
  // حالات خاصة بالنموذج فقط (لا تؤثر على فلترة الجدول)
  const [formTeacherId, setFormTeacherId] = useState<string>("");
  const [formStudyCircleId, setFormStudyCircleId] = useState<string>("");
  const [isLoadingStudyCircles, setIsLoadingStudyCircles] = useState<boolean>(false);

  const teacherEntities: BasicEntity[] = useMemo(() => {
    // احسب عدد الحلقات لكل معلم ثم احتفظ فقط بمن لديه حلقات
    return teachers.map(t => ({
      id: t.id,
      name: t.full_name,
      circles_count: studyCircles.filter(sc => sc.teacher?.id === t.id).length
    })).filter(t => (t.circles_count || 0) > 0);
  }, [teachers, studyCircles]);

  // تحويل بيانات الحلقات إلى BasicEntity (تعتمد على المعلم المحدد إن وجد)
  const circleSource = selectedTeacherId ? teacherStudyCircles : studyCircles;
  const circleEntities: BasicEntity[] = useMemo(() => {
    return circleSource.map(c => ({
      id: c.id,
      name: c.name || '-',
      teacher_id: c.teacher?.id
    }));
  }, [circleSource]);

  // تنفيذ استرجاع البيانات عند تحميل المكون
  useEffect(() => {
    console.log('Component mounted, fetching students...');
    loadteachers();
    loadGuardians();

    if (userRole === 'teacher' && userId) {
      setSelectedTeacherId(userId);
      setIsTeacherCirclesLoading(true);
      loadStudyCirclesForTeacher(userId).then(() => {
        setIsTeacherCirclesLoading(false);
        // سيتم تنفيذ البحث بعد اكتمال تحميل الحلقات
        const searchCriteria = { teacher_id: userId } as any;
        loadStudents(searchCriteria);
      }).catch(() => setIsTeacherCirclesLoading(false));
    } else {
      loadStudyCircles();
      loadStudents();
    }
  }, []);

  // تنفيذ البحث عند تغيير الحلقة الدراسية
  useEffect(() => {
    console.log('تغيير الحلقة الدراسية:', studyCircleId);
    if (userRole === 'teacher' && isTeacherCirclesLoading) return; // لا نبحث قبل تحميل الحلقات
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [studyCircleId, isTeacherCirclesLoading]);

  // اختيار تلقائي للحلقة الوحيدة عند المعلم
  useEffect(() => {
    if (userRole === 'teacher' && !isTeacherCirclesLoading) {
      if (teacherStudyCircles.length === 1) {
        if (studyCircleId !== teacherStudyCircles[0].id) {
          setStudyCircleId(teacherStudyCircles[0].id);
        }
      }
    }
  }, [teacherStudyCircles, userRole, isTeacherCirclesLoading]);

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

  // دالة موحدة لتصفير الفلاتر
  const resetFilters = (triggerReload: boolean = true) => {
    const had = (searchTerm && searchTerm.trim()) || filterGrade !== 'all' || (!isTeacherRole(userRole) && selectedTeacherId) || studyCircleId || selectedGuardianIds.length;
    setSearchTerm('');
    setFilterGrade('all');
    // لا نزيل معرف المعلم إذا كان المستخدم نفسه معلماً
    if (!isTeacherRole(userRole)) {
      setSelectedTeacherId('');
    }
    if (isTeacherRole(userRole) && teacherStudyCircles.length === 1) {
      setStudyCircleId(teacherStudyCircles[0].id);
    } else {
      setStudyCircleId('');
    }
    setSelectedGuardianIds([]);
    setCurrentPage(1);
    if (triggerReload && had) {
      if (userRole === 'teacher') {
        handleSearch();
      } else {
        loadStudents();
      }
    }
  };

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
  // Image viewer dialog state
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageDialogStudent, setImageDialogStudent] = useState<Student | null>(null);
  const [imageDialogUrl, setImageDialogUrl] = useState<string | null>(null);
  // مسارات متعددة محتملة للصورة (محاولات مختلفة)
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState<number>(0);
  // حالة وضع عرض الصورة (ملء / احتواء)
  const [isCoverMode, setIsCoverMode] = useState<boolean>(true);
  // تخزين رابط الصورة الناجح لكل معرف صورة لتجنب إعادة المحاولات مستقبلاً
  const [imageUrlCache, setImageUrlCache] = useState<Record<string, string>>({});
  // حوار رفع صورة جديدة
  const [isUploadImageDialogOpen, setIsUploadImageDialogOpen] = useState(false);
  const [uploadTargetStudent, setUploadTargetStudent] = useState<Student | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadInfo, setLastUploadInfo] = useState<{ name?: string; size?: number; message?: string } | null>(null);
  // مؤشر دوران أثناء حذف الصورة القديمة
  const [deletingOldImage, setDeletingOldImage] = useState<boolean>(false);
  // حوار تأكيد حذف صورة الطالب داخل العارض
  const [isDeleteImageConfirmOpen, setIsDeleteImageConfirmOpen] = useState<boolean>(false);
  const [pendingDeleteImageStudent, setPendingDeleteImageStudent] = useState<Student | null>(null);
  // خريطة صور الطلاب المستخرجة من Google Drive
  const [studentImagesMap, setStudentImagesMap] = useState<Record<string, { id: string; url: string; name: string }>>({});
  const [isLoadingStudentImages, setIsLoadingStudentImages] = useState(false);

  // تحميل قائمة الصور مرة واحدة بعد تحميل الطلاب (إذا توفر المفتاح والمجلد)
  useEffect(() => {
    const folderId = import.meta.env.VITE_GOOGLE_DRIVE_STUDENT_FOLDER_ID as string | undefined;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
    if (!folderId || !apiKey) return; // عدم المحاولة بدون بيانات البيئة
    if (!students.length) return;
    // إذا كان لدينا بالفعل صور لا نكرر (يمكنك إزالة هذا الشرط لإعادة التحميل)
    if (Object.keys(studentImagesMap).length > 0) return;
    setIsLoadingStudentImages(true);
    (async () => {
      try {
        const driveImages = await fetchDriveImages(folderId, apiKey, { force: true });
        // نبني خريطة بالاسم الكامل => كائن الصورة، ثم نحاول ربطها بالطالب عبر: student.id + امتداد
        const map: Record<string, { id: string; url: string; name: string }> = {};
        driveImages.forEach(img => {
          const lower = img.name.toLowerCase();
          map[lower] = { id: img.id, url: img.url, name: img.name };
        });
        // ربط سريع بالطلاب
        const exts = ['jpg', 'jpeg', 'png', 'webp'];
        const updated = students.map(s => {
          for (const ext of exts) {
            const fname = `${s.id}.${ext}`.toLowerCase();
            if (map[fname]) {
              return { ...s, image_drive_id: map[fname].id };
            }
          }
          return s;
        });
        setStudents(updated as Student[]);
        setStudentImagesMap(map);
      } catch (e) {
        console.warn('تعذر تحميل صور الطلاب من Drive', e);
      } finally {
        setIsLoadingStudentImages(false);
      }
    })();
  }, [students, studentImagesMap]);

  const openImageViewer = (student: Student, url?: string | null) => {
    let id = student.image_drive_id;
    const candidates: string[] = [];
    // إذا تم تمرير رابط خارجي (مباشر) اجعله الأول
    if (url) candidates.push(url);
    if (id) {
      // إذا كان لدينا رابط مخزن سابقاً ناجح لهذا المعرف ضعه أولاً لتجنب إعادة المحاولات
      const cached = imageUrlCache[id];
      if (cached) {
        candidates.push(cached);
      }
      // روابط مختلفة محتملة للعرض المباشر
      candidates.push(
        `https://drive.google.com/uc?export=view&id=${id}`,
        `https://lh3.googleusercontent.com/d/${id}=w1000`,
        `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
        `https://drive.google.com/uc?id=${id}`
      );
    }
    // إزالة التكرارات المحتملة
    const unique = candidates.filter((v, i, a) => a.indexOf(v) === i);
    setImageViewerUrls(unique);
    setImageViewerIndex(0);
    setImageDialogStudent(student);
    setImageDialogUrl(unique.length ? unique[0] : null);
    setIsImageDialogOpen(true);
  };

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

      // ملاحظة: لم نعد نصفر حقل البحث هنا حتى لا نفقد كلمات البحث عند التحديث
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
      selectedGuardianIds: selectedGuardianIds.length ? selectedGuardianIds : 'غير محدد',
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

      // فلترة حسب ولي الأمر إذا تم اختياره
      if (selectedGuardianIds.length) {
        const guardianRealIds = guardians.filter(g => g.id && (selectedGuardianIds.includes(g.id) || selectedGuardianIds.includes(g.phone_number || ''))).map(g => g.id as string);
        if (guardianRealIds.length) {
          searchCriteria.guardian_ids = guardianRealIds;
          console.log('تطبيق فلترة guardian_ids:', guardianRealIds);
        }
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

  // زر التحديث: يمسح كل الشروط ويعرض جميع البيانات (للمعلم يقتصر على نطاقه الطبيعي فقط)
  const handleRefreshClick = () => {
    console.log('تنفيذ تحديث شامل: تصفير كل الفلاتر وإعادة تحميل البيانات الأصلية.');
    // تصفير دون إعادة تحميل داخل resetFilters (triggerReload=false) ثم تحميل يدوي شامل
    resetFilters(false);
    if (userRole === 'teacher' && userId) {
      // للمعلم: تحميل طلابه فقط (السلوك الأمني)
      handleSearch(); // سيطبق teacher_id = userId تلقائياً
    } else {
      // للمشرف/الإداري: تحميل كل الطلاب
      loadStudents();
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

  // شريط الأدوات: إظهار الفلاتر + الترتيب
  const [showFilters, setShowFilters] = useState(false);
  const [listSortDirection, setListSortDirection] = useState<null | 'asc' | 'desc'>(null);
  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };
  // لم نعد نستخدم حقول البحث النصي المباشرة للمعلم والحلقة، سيتم استبدالها بقوائم اختيار مع ترقيم صفحات
  // تم دمج البحث الخاص بالمعلم داخل searchTerm العام
  const [circlePickerSearch, setCirclePickerSearch] = useState("");
  // حوارات اختيار المعلم والحلقة
  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [isCirclePickerOpen, setIsCirclePickerOpen] = useState(false);

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
          image_drive_id: data.image_drive_id
        };
        const result = await updateStudentWithHistory(data.id!, updatedStudent);
        if (!result.success && result.message?.includes('غير مسموحة')) {
          // نتجاهل الفشل المتعلق بالباك اند غير المتاح ونحدث الواجهة محلياً (خصوصاً للصورة)
          setStudents(prev => prev.map(s => s.id === data.id ? { ...s, ...updatedStudent } : s));
          toast({ title: 'تم حفظ التعديلات (محلياً)', description: 'التحديث الدائم يتطلب تفعيل الباك اند', className: 'bg-yellow-50 border-yellow-200 text-yellow-900' });
          setIsStudentDialogOpen(false);
          return;
        }
        if (result.success) {
          // نحدث القائمة كاملة
          setStudents(prev => prev.map(s => s.id === data.id ? { ...s, ...updatedStudent } : s));
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
      studyCircleId: studyCircleId || 'غير محدد',
      guardians: selectedGuardianIds
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

      // فلتر ولي الأمر المحدد (إن وُجد)
      // بيانات ولي الأمر في الطالب لا تحتوي id ضمن النوع الحالي؛ نستخدم phone_number كبديل (مع افتراض uniqueness)
      // بعض السجلات قد لا تحتوي على id لولي الأمر (اعتماداً على select المستخدم في الاستعلام) لذا نستخدم phone_number كمعرف بديل
      const guardianKey = (student as any).guardian?.id || student.guardian?.phone_number;
      const matchesGuardian = selectedGuardianIds.length === 0 || (guardianKey && selectedGuardianIds.includes(guardianKey));

      return matchesSearch && matchesGrade && matchesStudyCircle && matchesTeacher && matchesGuardian;
    });
  }, [students, searchTerm, filterGrade, selectedTeacherId, studyCircleId, userRole, selectedGuardianIds]);

  // بيانات المعلم / الحلقة / ولي الأمر المختار
  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);
  // جميع الحلقات المتاحة للاختيار (مع فرز أبجدي عربي/لاتيني)
  const allCirclesForSelection = useMemo(() => {
    const base = selectedTeacherId ? teacherStudyCircles : studyCircles;
    // لا نعدّل المصفوفة الأصلية
    return [...base].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar')); // فرز أبجدي
  }, [selectedTeacherId, teacherStudyCircles, studyCircles]);
  const selectedCircle = useMemo(() => allCirclesForSelection.find(c => c.id === studyCircleId), [allCirclesForSelection, studyCircleId]);
  const selectedGuardians = useMemo(() => guardians.filter(g => selectedGuardianIds.includes(g.id) || selectedGuardianIds.includes(g.phone_number || '')), [guardians, selectedGuardianIds]);

  // خريطة عدد الطلاب لكل حلقة (تعتمد على قائمة الطلاب الحالية بعد البحث)
  const circleStudentsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(st => {
      const cid = (st as any).study_circle_id || st.study_circle_id || st.study_circle?.id;
      if (cid) map[cid] = (map[cid] || 0) + 1;
    });
    return map;
  }, [students]);

  // خريطة عدد الطلاب لكل ولي أمر (تعتمد على القائمة الحالية بعد البحث)
  const guardianStudentsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(st => {
      const gid = (st as any).guardian?.id || st.guardian_id || st.guardian?.phone_number;
      if (gid) map[gid] = (map[gid] || 0) + 1;
    });
    return map;
  }, [students]);

  const toggleGuardianSelection = (g: Guardian) => {
    const key = g.id || g.phone_number;
    if (!key) return;
    setSelectedGuardianIds(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    // تشغيل البحث بعد تغيير الاختيار (تأخير بسيط لضمان تحديث الحالة)
    setTimeout(() => handleSearch(), 80);
  };

  const clearAllGuardians = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedGuardianIds.length === 0) return;
    setSelectedGuardianIds([]);
    setTimeout(() => handleSearch(), 50);
  };

  // فلترة قوائم الاختيار (المعلم / الحلقة)
  const filteredTeachersForPicker = useMemo(() => {
    return teachers.filter(t => !searchTerm || t.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [teachers, searchTerm]);
  const filteredCirclesForPicker = useMemo(() => {
    return allCirclesForSelection.filter(c => !circlePickerSearch || (c.name || '').toLowerCase().includes(circlePickerSearch.toLowerCase()));
  }, [allCirclesForSelection, circlePickerSearch]);
  const filteredGuardiansForPicker = useMemo(() => {
    return guardians.filter(g => !guardianPickerSearch || (g.full_name || '').toLowerCase().includes(guardianPickerSearch.toLowerCase()));
  }, [guardians, guardianPickerSearch]);
  // اختيار الكل أولياء (حسب الظاهر في الفلترة)
  const isAllGuardiansSelected = useMemo(() => {
    if (!filteredGuardiansForPicker.length) return false;
    return filteredGuardiansForPicker.every(g => selectedGuardianIds.includes(g.id) || selectedGuardianIds.includes(g.phone_number || ''));
  }, [filteredGuardiansForPicker, selectedGuardianIds]);

  const toggleSelectAllGuardians = () => {
    const ids = filteredGuardiansForPicker.map(g => g.id || g.phone_number).filter(Boolean) as string[];
    const allSelected = ids.every(id => selectedGuardianIds.includes(id));
    if (allSelected) {
      // إزالة الظاهرين فقط
      setSelectedGuardianIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedGuardianIds(prev => Array.from(new Set([...prev, ...ids])));
    }
    setTimeout(() => handleSearch(), 60);
  };
  // عدد الحلقات لكل معلم (نعتمد على studyCircles العامة، أو teacherStudyCircles عند الحاجة)
  const teacherCirclesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    // استخدم كل الحلقات المتاحة (studyCircles) لضمان الشمول
    studyCircles.forEach(sc => {
      const tid = (sc as any).teacher_id || sc.teacher_id || sc.teacher?.id;
      if (tid) map[tid] = (map[tid] || 0) + 1;
    });
    return map;
  }, [studyCircles]);

  const handleSelectTeacher = (t: Profile) => {
    // إعادة استخدام منطق تغيير المعلم الأصلي
    handleTeacherChange(t.id);
    setIsTeacherPickerOpen(false);
  };

  const handleSelectCircle = (c: StudyCircle) => {
    setStudyCircleId(c.id);
    setIsCirclePickerOpen(false);
  };
  // الإبقاء على الدالة القديمة للاستخدام المحتمل، لكن الآن تعتمد على التبديل متعدد
  const handleSelectGuardian = (g: Guardian) => {
    toggleGuardianSelection(g);
  };

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

  // توحيد تنسيق الجداول: تعريف ثوابت وأدوات مساعدة خارج JSX
  const TABLE_BASE_CLASS = "rounded-xl border border-green-300 shadow-md";
  const TABLE_TEXT_BASE = "text-xs"; // يمكن تخصيصه لاحقاً حسب السياق
  // توحيد ألوان الصفوف والـ hover لانسجام أفضل
  // الأساس: صفوف متبادلة #F0FDF4 (green-50 أفتح) و #FFFFFF ثم عند المرور نستخدم درجة أغنى #DCFCE7 (green-100)
  // عند التحديد نستخدم درجة وسطى #BBF7D0 (green-200) مع نفس لون hover لمنع القفز اللوني الحاد
  const getZebraRowClass = (index: number) => {
    const base = index % 2 === 0 ? 'bg-green-50' : 'bg-white';
    return `${base} hover:bg-green-100 transition-colors`;
  };
  const getSelectableRowClass = (isSelected: boolean, index: number) => {
    if (isSelected) {
      return 'bg-green-200 hover:bg-green-200/90 transition-colors';
    }
    return getZebraRowClass(index);
  };
  const getHistoryRowClass = (index: number) => getZebraRowClass(index);

  // ==== تنسيق موحد لشريط الفلترة العلوي (حقول المعلم / الحلقة / ولي الأمر / البحث) ====
  const filterFieldBase = 'h-10 w-full rounded-lg border px-3 pr-9 text-sm flex items-center gap-2 bg-white dark:bg-green-950 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-500';
  const filterFieldPlaceholder = 'text-gray-500';
  const filterFieldSelected = 'border-green-400 bg-green-50 text-green-700 font-medium';
  const filterFieldUnselected = 'border-gray-300 dark:border-green-700';
  const guardianButtonBase = 'group relative w-full px-3 rounded-lg border flex items-center justify-between overflow-hidden transition-colors focus:outline-none focus:ring-2 focus:ring-green-400/40';
  const guardianButtonSelected = 'border-green-400 bg-green-50';
  const guardianButtonUnselected = 'border-gray-300 dark:border-green-700 bg-white dark:bg-green-950';
  const searchInputClass = `${filterFieldBase} ${filterFieldUnselected}`;

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 
                               border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              {/* العنوان والوصف */}
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="pt-0.5 pb-0 px-0 sm:px-0">
          {error && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-0 mb-1 bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-md border border-green-200 dark:border-green-700">
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4 ml-2" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-end items-center gap-3 mb-1 rounded-lg bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-2xl ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} dark:bg-green-700 dark:hover:bg-green-600 shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8`}
                onClick={() => {
                  setShowFilters(prev => {
                    const next = !prev;
                    if (next) {
                      // عند الفتح نقوم بالتصفير حسب طلب المستخدم
                      resetFilters();
                    }
                    return next;
                  });
                }}
                title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة (سيتم تصفير الفلاتر)'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                onClick={handleRefreshClick}
                title={studentsLabels.refresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              {(userRole === 'superadmin') && (
                <Button
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                  onClick={handleExportData}
                  title={studentsLabels.export}
                  disabled={exportLoading || students.length === 0}
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
                  <span className="text-lg">🤵</span>
                  <span className="hidden sm:inline"> {guardiansLabels.addGuardian}</span>
                </Button>
              )}
              <Button
                onClick={() => handleAddStudent()}
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                title={studentsLabels.addStudent}
              >
                <span className="text-lg">🧑</span>
                <span className="hidden sm:inline">{studentsLabels.addStudent}</span>
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="mt-2 mb-2 w-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-3" dir="rtl">
              <FilterBar
                values={{
                  teacher: selectedTeacherId === 'all' || selectedTeacherId === '' ? null : selectedTeacherId,
                  circle: studyCircleId === 'all' || studyCircleId === '' ? null : studyCircleId,
                  guardian: selectedGuardianIds.length === 1 ? selectedGuardianIds[0] : null,
                  grade: filterGrade === 'all' ? null : filterGrade,
                  q: searchTerm || ''
                }}
                showFieldLabels={false}
                onValuesChange={(vals) => {
                  const newQ = String(vals.q ?? '');
                  if (newQ !== searchTerm) setSearchTerm(newQ);
                  // المعلم
                  if (vals.teacher === null || vals.teacher === '__ALL__') {
                    if (selectedTeacherId) {
                      setSelectedTeacherId('');
                      setStudyCircleId('');
                    }
                  } else if (vals.teacher !== selectedTeacherId) {
                    handleTeacherChange(String(vals.teacher));
                  }
                  // الحلقة
                  if (vals.circle === null || vals.circle === '__ALL__') {
                    if (studyCircleId) setStudyCircleId('');
                  } else if (vals.circle !== studyCircleId) {
                    setStudyCircleId(String(vals.circle));
                  }
                  // ولي الأمر (هنا مفرد 
                  if (vals.guardian === null || vals.guardian === '__ALL__') {
                    if (selectedGuardianIds.length) setSelectedGuardianIds([]);
                  } else if (!selectedGuardianIds.includes(String(vals.guardian))) {
                    setSelectedGuardianIds([String(vals.guardian)]);
                  }
                  // الصف الدراسي
                  if (vals.grade === null || vals.grade === '__ALL__') {
                    if (filterGrade && filterGrade !== 'all') setFilterGrade('all');
                  } else if (vals.grade !== filterGrade) {
                    setFilterGrade(String(vals.grade));
                  }
                  setTimeout(() => handleSearch(), 120);
                }}
                fields={[
                  {
                    id: 'teacher',
                    label: 'المعلم',
                    type: 'select',
                    showSearch: true,
                    clearable: true,
                    options: [
                      { value: '__ALL__', label: 'جميع المعلمين', icon: '👨‍🏫', meta: { count: studyCircles.length } },
                      ...teachers.map(t => ({
                        value: t.id,
                        label: t.full_name || '—',
                        icon: '👨‍🏫',
                        meta: { count: teacherCirclesCountMap[t.id] || 0 }
                      }))
                    ],
                    value: selectedTeacherId || null,
                    showCountsFromMetaKey: 'count',
                    onChange: (val) => {
                      if (!val || val === '__ALL__') {
                        setSelectedTeacherId('');
                        setStudyCircleId('');
                      } else {
                        handleTeacherChange(val);
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
                      { value: '__ALL__', label: 'جميع الحلقات', icon: '🕋', meta: { count: allCirclesForSelection.length } },
                      ...allCirclesForSelection.map(c => ({
                        value: c.id,
                        label: c.name || '—',
                        icon: '🕋',
                        meta: { count: circleStudentsCountMap[c.id] || 0 }
                      }))
                    ],
                    value: studyCircleId || null,
                    showCountsFromMetaKey: 'count',
                    onChange: (val) => {
                      if (!val || val === '__ALL__') setStudyCircleId(''); else setStudyCircleId(val);
                    }
                  },
                  {
                    id: 'guardian',
                    label: 'ولي الأمر',
                    type: 'select',
                    showSearch: true,
                    clearable: true,
                    options: [
                      { value: '__ALL__', label: 'جميع أولياء الأمور', icon: '🤵', meta: { count: students.filter(s => s.guardian).length } },
                      ...guardians.map(g => ({
                        value: g.id || g.phone_number || '',
                        label: g.full_name || '—',
                        icon: '🤵',
                        meta: { count: guardianStudentsCountMap[g.id || g.phone_number || ''] || 0 }
                      }))
                    ],
                    value: selectedGuardianIds.length === 1 ? selectedGuardianIds[0] : null,
                    showCountsFromMetaKey: 'count',
                    onChange: (val) => {
                      if (!val || val === '__ALL__') setSelectedGuardianIds([]); else setSelectedGuardianIds([val]);
                    }
                  },
                  {
                    id: 'grade',
                    label: 'الصف',
                    type: 'select',
                    clearable: true,
                    options: [
                      { value: '__ALL__', label: 'كل الصفوف', icon: '🏷️' },
                      ...studentsLabels.gradeOptions.map((g: any) => ({ value: g.value, label: g.label, icon: '🏷️' }))
                    ],
                    value: filterGrade === 'all' ? null : filterGrade,
                    onChange: (val) => {
                      if (!val || val === '__ALL__') setFilterGrade('all'); else setFilterGrade(val);
                    }
                  },
                  {
                    id: 'q',
                    label: 'بحث',
                    type: 'text',
                    placeholder: '🔍 بحث باسم الطالب أو الهاتف أو ولي الأمر...',
                    value: searchTerm,
                    debounceMs: 400,
                    onChange: (v) => setSearchTerm(v)
                  }
                ]}
                actions={[{
                  id: 'reset',
                  label: 'إعادة تعيين',
                  variant: 'outline',
                  className: 'w-full sm:w-auto justify-center font-semibold text-[11px] sm:text-xs h-9 bg-white dark:bg-gray-900 border-green-300 hover:bg-green-50 dark:hover:bg-green-800 text-green-700 dark:text-green-200 mt-2 sm:mt-0',
                  onClick: () => {
                    resetFilters(false);
                    setSelectedGuardianIds([]);
                    setTimeout(() => handleSearch(), 50);
                  }
                }]}
                enableDefaultApplyButton={false}
                enableDefaultResetButton={false}
                actionsPlacement="wrap"
                className="bg-transparent p-0"
              />
            </div>
          )}
          {/* تمت إزالة واجهة الفلاتر النشطة بناء على طلب المستخدم */}
        </CardContent>

      </Card>

      {/* جدول الطلاب بنمط محسّن مع ترقيم داخلي */}
      <GenericTable
        title={
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                  بيانات الطلاب :
                  <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span
                  aria-label={`عدد الطلاب: ${filteredStudents.length}`}
                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-300 to-yellow-400 text-green-900 text-[11px] sm:text-[12px] font-extrabold shadow-sm ring-1 ring-yellow-200/60 tracking-wide"
                >
                  {filteredStudents.length} طالب/طالبة
                </span>
              </div>
            </div>
          </div>
        }
        data={(listSortDirection ? [...filteredStudents].sort((a, b) => {
          if (listSortDirection === 'asc') return a.full_name.localeCompare(b.full_name, 'ar');
          if (listSortDirection === 'desc') return b.full_name.localeCompare(a.full_name, 'ar');
          return 0;
        }) : filteredStudents)}
        defaultView="table"
        enablePagination
        defaultPageSize={6}
        pageSizeOptions={[6, 12, 24, 48, 100, 200, 500]}
        cardMaxFieldsCollapsed={4}
        enableCardExpand={true}
        hideSortToggle={false}
        cardPageSize={4}
        className={`overflow-hidden ${TABLE_BASE_CLASS} ${TABLE_TEXT_BASE}`}
        getRowClassName={(_, index) => getZebraRowClass(index)}
        columns={([
          {
            key: 'row_index',
            header: '🔢',
            align: 'center',
            width: '50px',
            render: (_item: any, globalIndex?: number) => <span className="font-medium">{(globalIndex ?? 0) + 1}</span>
          },
          {
            key: 'full_name',
            header: `🧑 ${studentsLabels.name}`,
            important: true,
            render: (item: any) => (
              <div className="flex flex-col">
                <span className="font-medium leading-snug">{'🧑 ' + item.full_name + ' ' + item.guardian.full_name}</span>
              </div>
            )
          },
          ...(userRole !== 'teacher' ? [{
            key: 'teacher',
            header: `👨‍🏫 ${studentsLabels.teacherColumn}`,

            render: (item: any) => item.study_circle?.teacher?.full_name ? (
              <div className="flex gap-1">
                👨‍🏫
                <span className="text-xs">{item.study_circle.teacher.full_name}</span>
              </div>
            ) : <span className="text-muted-foreground">—</span>
          }] : []),
          {
            key: 'study_circle',
            header: `🕋 ${studentsLabels.studyCircleShort}`,
            //align: 'center',
            render: (item: any) => (
              <div className="flex gap-1">
                🕋
                <span className="text-xs">{item.study_circle?.name || '-'}</span>
              </div>
            )
          },
          {
            key: 'grade',
            header: `🏷️ ${studentsLabels.gradeShort}`,
            //align: 'center',
            render: (item: any) => (
              <span className="text-xs">{'🏷️ ' + studentsLabels.gradeOptions.find(g => g.value === (item.grade_level || item.grade))?.label || (item.grade_level || item.grade || '-')}</span>
            )
          },
          {
            key: 'memorized_parts',
            header: `📖 ${studentsLabels.memorizeLevelHeader}`,
            //align: 'center',
            render: (item: any) => (
              <span className="text-xs">{'📖 ' + studentsLabels.quranPartsOptions.find(p => p.value === item.memorized_parts)?.label || item.memorized_parts || '-'}</span>
            )
          },
          {
            key: 'gender',
            header: `👫 ${studentsLabels.gender || 'الجنس'}`,
            align: 'center',
            render: (item: any) => (
              <span className="text-xs">{item.gender === 'male' ? '👦 ' + studentsLabels.genderMale : item.gender === 'female' ? '👧 ' + studentsLabels.genderFemale : '-'}</span>
            )
          },
          {
            key: 'image',
            header: '🖼️',
            align: 'center',
            width: '52px',
            render: (item: any) => {
              const driveId = item.image_drive_id;
              const hasImage = !!driveId;
              const url = driveId ? `https://drive.google.com/uc?export=view&id=${driveId}` : null;
              return (
                <div className="flex items-center justify-center relative">
                  {hasImage ? (
                    <button
                      type="button"
                      onClick={() => openImageViewer(item, url)}
                      title="عرض الصورة"
                      className="h-8 w-8 rounded-md flex items-center justify-center border bg-white border-green-300 hover:bg-green-50 transition"
                    >
                      🖼️
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setUploadTargetStudent(item); setIsUploadImageDialogOpen(true); setUploadError(null); setLastUploadInfo(null); }}
                      title="إضافة صورة"
                      className="h-8 w-8 rounded-md flex items-center justify-center border bg-gray-50 border-gray-300 hover:bg-green-50 text-green-600 transition"
                    >
                      ➕
                    </button>
                  )}
                  {/* مؤشر نجاح حفظ الصورة */}
                  {hasImage && savedImageStudentIds.has(item.id) && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-green-500 text-white rounded-full px-[4px] py-[1px] shadow" title="تم الحفظ في القاعدة">✓</span>
                  )}
                  {/* زر إعادة المحاولة إذا فشل حفظ المعرف */}
                  {hasImage && failedPersistImageStudentIds.has(item.id) && !savedImageStudentIds.has(item.id) && (
                    <button
                      type="button"
                      onClick={async () => {
                        const target = students.find(s => s.id === item.id);
                        if (!target?.image_drive_id) return;
                        try {
                          const res = await updateStudentImageDriveId(item.id, target.image_drive_id || null);
                          if (res.success) {
                            setSavedImageStudentIds(prev => new Set([...prev, item.id]));
                            setFailedPersistImageStudentIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
                            toast({ title: 'تم حفظ الصورة بعد المحاولة', className: 'bg-green-50 border-green-200' });
                          } else {
                            toast({ title: 'فشل إعادة حفظ معرف الصورة', description: res.message || 'حاول لاحقاً', variant: 'destructive' });
                          }
                        } catch (err: any) {
                          toast({ title: 'خطأ أثناء إعادة المحاولة', description: err.message || 'غير معروف', variant: 'destructive' });
                        }
                      }}
                      className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-[11px] shadow hover:bg-yellow-600"
                      title="إعادة محاولة حفظ المعرف"
                    >↻</button>
                  )}
                </div>
              );
            }
          },
          {
            key: 'actions',
            header: `⚙️ ${studentsLabels.actions}`,
            align: 'center',
            render: (item: any) => (
              <div className="flex justify-center items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditStudent(item)}
                  title={studentsLabels.editTooltip}
                  className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <Pencil className="h-4 w-4 text-green-600" />
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(item)}
                    title={studentsLabels.deleteTooltip}
                    className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleViewteacherHistory(item)}
                  title={teacherHistoryLabels.title}
                  className="h-8 w-8 p-0 rounded-lg flex items-center justify-center bg-white dark:bg-green-900/40 border border-green-300 dark:border-green-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <History className="h-4 w-4 text-blue-500" />
                </button>
              </div>
            )
          }
        ]) as Column<any>[]}
        emptyMessage={studentsLabels.noStudents || 'لا يوجد طلاب'}
        onRefresh={loadStudents}
        onAddNew={(userRole === 'superadmin' || userRole === 'admin') ? handleAddStudent : undefined}
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

      {/* حوار عرض صورة الطالب */}
      <FormDialog
        title={imageDialogStudent ? `صورة الطالب: ${imageDialogStudent.full_name}` : 'صورة الطالب'}
        open={isImageDialogOpen}
        onOpenChange={setIsImageDialogOpen}
        // إخفاء زر الحفظ (الإغلاق) في الأسفل حسب طلب المستخدم
        showSaveButton={false}
        onSave={() => setIsImageDialogOpen(false)}
        mode="edit"
        hideCancelButton
        maxWidth="420px"
      >
        {imageDialogUrl ? (
          <div className="flex flex-col gap-2">
            <div className="rounded-lg overflow-hidden border shadow-sm relative h-[260px] w-full max-w-full">
              <img
                src={imageViewerUrls[imageViewerIndex]}
                alt={imageDialogStudent?.full_name}
                className={`w-full h-full ${isCoverMode ? 'object-cover' : 'object-contain'} bg-black`}
                onError={() => {
                  // جرّب الرابط التالي
                  const next = imageViewerIndex + 1;
                  if (next < imageViewerUrls.length) {
                    console.warn('🔁 فشل عرض الصورة، تجربة رابط بديل:', imageViewerUrls[next]);
                    setImageViewerIndex(next);
                    setImageDialogUrl(imageViewerUrls[next]);
                  } else {
                    console.error('❌ فشل عرض جميع الروابط المحتملة للصورة');
                    setImageDialogUrl(null);
                  }
                  // إذا كان الرابط الحالي مخزن وتم فشله نحذفه من الكاش
                  if (imageDialogStudent?.image_drive_id) {
                    setImageUrlCache(prev => {
                      const copy = { ...prev };
                      if (copy[imageDialogStudent.image_drive_id] === imageViewerUrls[imageViewerIndex]) {
                        delete copy[imageDialogStudent.image_drive_id];
                      }
                      return copy;
                    });
                  }
                }}
                onLoad={() => {
                  // حفظ الرابط الناجح في الكاش إذا لم يكن محفوظاً بالفعل (فقط عند النجاح)
                  if (imageDialogStudent?.image_drive_id) {
                    setImageUrlCache(prev => {
                      if (!prev[imageDialogStudent.image_drive_id]) {
                        return { ...prev, [imageDialogStudent.image_drive_id]: imageViewerUrls[imageViewerIndex] };
                      }
                      return prev;
                    });
                  }
                }}
              />
              {imageViewerUrls.length > 1 && (
                <div className="absolute top-1 left-1 bg-white/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-gray-700 border">
                  محاولة {imageViewerIndex + 1} / {imageViewerUrls.length}
                </div>
              )}
            </div>
            {/* أزرار الإجراءات أسفل الصورة */}
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex gap-2">
                {imageDialogUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(imageViewerUrls[imageViewerIndex], '_blank')}
                    className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs shadow"
                    title="فتح في تبويب جديد"
                  >🔗</button>
                )}
                {/* تبديل الاحتواء/الملء */}
                {imageDialogUrl && (
                  <button
                    type="button"
                    onClick={() => setIsCoverMode(prev => !prev)}
                    className="h-8 w-8 flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 text-white text-xs shadow"
                    title={isCoverMode ? 'وضع احتواء' : 'وضع ملء'}
                  >{isCoverMode ? '🞅' : '⬛'}</button>
                )}
              </div>
              {/* زر حذف وإعادة رفع */}
              {imageDialogStudent?.image_drive_id && (
                <button
                  type="button"
                  onClick={() => { setPendingDeleteImageStudent(imageDialogStudent); setIsDeleteImageConfirmOpen(true); }}
                  className="h-8 px-3 flex items-center justify-center rounded-md bg-red-600 hover:bg-red-700 text-white text-xs shadow"
                  title="حذف الصورة وإعادة الرفع"
                >🗑️</button>
              )}
            </div>
            {imageDialogUrl === null && (
              <div className="text-center text-xs text-red-600">تعذر عرض الصورة – تحقق من إعدادات المشاركة في Google Drive.</div>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">لا توجد صورة محفوظة لهذا الطالب حالياً أو فشلت كل المحاولات</div>
        )}
      </FormDialog>
      {/* حوار تأكيد حذف الصورة */}
      <DeleteConfirmationDialog
        isOpen={isDeleteImageConfirmOpen}
        onOpenChange={setIsDeleteImageConfirmOpen}
        onConfirm={async () => {
          if (!pendingDeleteImageStudent?.image_drive_id) return;
          try {
            const token = await getDriveAccessToken(['https://www.googleapis.com/auth/drive']);
            const deletedOk = await deleteDriveFile(pendingDeleteImageStudent.image_drive_id, token);
            if (deletedOk) {
              setStudents(prev => prev.map(s => s.id === pendingDeleteImageStudent.id ? { ...s, image_drive_id: null } : s));
              setSavedImageStudentIds(prev => { const n = new Set(prev); n.delete(pendingDeleteImageStudent.id); return n; });
              setFailedPersistImageStudentIds(prev => { const n = new Set(prev); n.delete(pendingDeleteImageStudent.id); return n; });
              try {
                const saveRes = await updateStudentImageDriveId(pendingDeleteImageStudent.id, null);
                if (!saveRes.success) {
                  toast({ title: 'تم الحذف لكن فشل تحديث القاعدة', description: saveRes.message || 'تحقق لاحقاً', variant: 'destructive' });
                } else {
                  toast({ title: 'تم حذف الصورة بنجاح', className: 'bg-green-50 border-green-200' });
                }
              } catch (persistErr: any) {
                toast({ title: 'حذف من Drive لكن خطأ في القاعدة', description: persistErr.message || 'غير معروف', variant: 'destructive' });
              }
              // إغلاق عارض الصورة وفتح حوار الرفع مباشرة
              setIsDeleteImageConfirmOpen(false);
              setIsImageDialogOpen(false);
              const studentAfter = students.find(s => s.id === pendingDeleteImageStudent.id) || pendingDeleteImageStudent;
              setUploadTargetStudent({ ...studentAfter, image_drive_id: null } as Student);
              setIsUploadImageDialogOpen(true);
            } else {
              toast({ title: 'تعذر حذف الصورة من Drive', description: pendingDeleteImageStudent.image_drive_id, variant: 'destructive' });
            }
          } catch (err: any) {
            toast({ title: 'خطأ أثناء حذف الصورة', description: err.message || 'غير معروف', variant: 'destructive' });
          }
        }}
        title={'حذف صورة الطالب'}
        description={<div className="text-sm">سيتم حذف الصورة نهائياً من Google Drive ولن يمكن استرجاعها. هل أنت متأكد؟</div>}
        deleteButtonText={'تأكيد الحذف'}
        cancelButtonText={'إلغاء'}
      />

      {/* حوار رفع صورة جديدة */}
      <FormDialog
        title={uploadTargetStudent ? `رفع صورة للطالب: ${uploadTargetStudent.full_name}` : 'رفع صورة طالب'}
        open={isUploadImageDialogOpen}
        onOpenChange={(o) => { setIsUploadImageDialogOpen(o); if (!o) { setUploadTargetStudent(null); setUploadingImage(false); } }}
        onSave={() => setIsUploadImageDialogOpen(false)}
        mode="edit"
        hideCancelButton
        saveButtonText="إغلاق"
        maxWidth="380px"
      >
        {uploadTargetStudent ? (
          <div className="flex flex-col gap-3 py-1">
            <div className="text-xs text-muted-foreground">اختر صورة (الاسم سيتم توليده: studentId.ext)</div>
            {uploadError && <div className="text-[11px] text-destructive">{uploadError}</div>}
            {lastUploadInfo && (
              <div className="text-[10px] bg-muted rounded p-1 leading-4">
                <div className="font-semibold">نتيجة الرفع:</div>
                <div>الاسم: {lastUploadInfo.name}</div>
                {lastUploadInfo.size !== undefined && <div>الحجم: {(lastUploadInfo.size/1024).toFixed(1)} KB</div>}
                <div>الحالة: {lastUploadInfo.message}</div>
              </div>
            )}
            <label className="relative inline-flex items-center px-3 py-1.5 rounded-md bg-islamic-green text-white text-xs cursor-pointer hover:opacity-90 disabled:opacity-50 w-fit">
              {uploadingImage ? 'جار الرفع...' : 'اختيار صورة'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingImage}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (uploadingImage) return; // حماية من السباق
                  setUploadingImage(true);
                  setUploadError(null);
                  setLastUploadInfo(null);
                  try {
                    let token: string | null = null;
                    try {
                      token = await getDriveAccessToken();
                    } catch {
                      clearDriveAccessToken();
                      token = await getDriveAccessToken(['https://www.googleapis.com/auth/drive']);
                    }
                    if (!token) throw new Error('تعذر الحصول على صلاحيات Drive');
                    const ext = (file.name.includes('.') ? file.name.split('.').pop() : 'jpg') || 'jpg';
                    const customName = `${uploadTargetStudent.id}.${ext}`;
                    const folderId = import.meta.env.VITE_GOOGLE_DRIVE_STUDENT_FOLDER_ID as string | undefined;
                    if (!folderId) throw new Error('لم يتم ضبط متغير المجلد VITE_GOOGLE_DRIVE_STUDENT_FOLDER_ID');
                    const previousId = uploadTargetStudent.image_drive_id;
                    const uploaded = await uploadDriveImage(file, folderId, token, customName);
                    if (!uploaded) {
                      // إعادة محاولة مع صلاحيات أوسع
                      clearDriveAccessToken();
                      const retryToken = await getDriveAccessToken(['https://www.googleapis.com/auth/drive']);
                      const retryUploaded = await uploadDriveImage(file, folderId, retryToken, customName);
                      if (!retryUploaded) throw new Error('فشل رفع الصورة بعد إعادة المحاولة');
                      const driveId = retryUploaded.id;
                      // تأكيد حذف الصورة القديمة ثم حذفها
                      if (previousId) {
                        const wantDelete = window.confirm('هل تريد حذف الصورة القديمة؟');
                        if (wantDelete) {
                          setDeletingOldImage(true);
                          try {
                            const delToken = token || retryToken;
                            const deletedOk = await deleteDriveFile(previousId, delToken);
                            if (deletedOk) {
                              toast({ title: 'تم حذف الصورة القديمة', className: 'bg-green-50 border-green-200' });
                            } else {
                              toast({ title: 'تعذر حذف الصورة القديمة', description: previousId, variant: 'destructive' });
                            }
                          } catch (delErr: any) {
                            toast({ title: 'خطأ في حذف الصورة القديمة', description: delErr.message || 'غير معروف', variant: 'destructive' });
                          } finally {
                            setDeletingOldImage(false);
                          }
                        }
                      }
                      // تحديث واجهة المستخدم محلياً
                      setStudents(prev => prev.map(s => s.id === uploadTargetStudent.id ? { ...s, image_drive_id: driveId } : s));
                      setLastUploadInfo({ name: retryUploaded.name, size: file.size, message: 'تم الرفع بنجاح (إعادة محاولة)' });
                      // حفظ في قاعدة البيانات
                      try {
                        const saveResult = await updateStudentImageDriveId(uploadTargetStudent.id, driveId);
                        if (saveResult.success) {
                          setSavedImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                          setFailedPersistImageStudentIds(prev => { const n = new Set(prev); n.delete(uploadTargetStudent.id); return n; });
                          toast({ title: 'تم حفظ الصورة في قاعدة البيانات', className: 'bg-green-50 border-green-200' });
                        } else {
                          setFailedPersistImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                          toast({ title: 'تم الرفع لكن فشل حفظ معرف الصورة', description: saveResult.message || 'تحقق من الصلاحيات أو الاتصال', variant: 'destructive' });
                        }
                      } catch (persistErr: any) {
                        setFailedPersistImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                        toast({ title: 'تم رفع الصورة لكن حدث خطأ أثناء الحفظ', description: persistErr.message || 'خطأ غير متوقع', variant: 'destructive' });
                      }
                    } else {
                      const driveId = uploaded.id;
                      // تأكيد حذف الصورة القديمة ثم حذفها
                      if (previousId) {
                        const wantDelete = window.confirm('هل تريد حذف الصورة القديمة؟');
                        if (wantDelete) {
                          setDeletingOldImage(true);
                          try {
                            const deletedOk = await deleteDriveFile(previousId, token);
                            if (deletedOk) {
                              toast({ title: 'تم حذف الصورة القديمة', className: 'bg-green-50 border-green-200' });
                            } else {
                              toast({ title: 'تعذر حذف الصورة القديمة', description: previousId, variant: 'destructive' });
                            }
                          } catch (delErr: any) {
                            toast({ title: 'خطأ في حذف الصورة القديمة', description: delErr.message || 'غير معروف', variant: 'destructive' });
                          } finally {
                            setDeletingOldImage(false);
                          }
                        }
                      }
                      setStudents(prev => prev.map(s => s.id === uploadTargetStudent.id ? { ...s, image_drive_id: driveId } : s));
                      setLastUploadInfo({ name: uploaded.name, size: file.size, message: 'تم الرفع بنجاح' });
                      // حفظ في قاعدة البيانات
                      try {
                        const saveResult = await updateStudentImageDriveId(uploadTargetStudent.id, driveId);
                        if (saveResult.success) {
                          setSavedImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                          setFailedPersistImageStudentIds(prev => { const n = new Set(prev); n.delete(uploadTargetStudent.id); return n; });
                          toast({ title: 'تم حفظ الصورة في قاعدة البيانات', className: 'bg-green-50 border-green-200' });
                        } else {
                          setFailedPersistImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                          toast({ title: 'تم الرفع لكن فشل حفظ معرف الصورة', description: saveResult.message || 'تحقق من الصلاحيات أو الاتصال', variant: 'destructive' });
                        }
                      } catch (persistErr: any) {
                        setFailedPersistImageStudentIds(prev => new Set([...prev, uploadTargetStudent.id]));
                        toast({ title: 'تم رفع الصورة لكن حدث خطأ أثناء الحفظ', description: persistErr.message || 'خطأ غير متوقع', variant: 'destructive' });
                      }
                    }
                  } catch (err: any) {
                    setUploadError(err.message || 'خطأ أثناء الرفع');
                    setLastUploadInfo({ name: file.name, size: file.size, message: 'فشل الرفع' });
                  } finally {
                    setUploadingImage(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {deletingOldImage && (
              <div className="flex items-center gap-2 text-[11px] mt-1 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>جار حذف الصورة القديمة...</span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              تتم تسمية الملف تلقائياً بمعرف الطالب لضمان الربط: studentId.ext.
              بعد الرفع يمكن إغلاق الحوار وستظهر الأيقونة 🖼️.
            </p>
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-6">لا يوجد طالب محدد</div>
        )}
      </FormDialog>

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

      {/* حوار اختيار ولي الأمر */}
      <FormDialog
        title={'اختيار أولياء الأمور'}
        open={isGuardianPickerOpen}
        onOpenChange={setIsGuardianPickerOpen}
        onSave={() => setIsGuardianPickerOpen(false)}
        mode="edit"
        showSaveButton={false}
        maxWidth="640px"
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
              <Input
                placeholder={guardiansLabels.searchPlaceholder || '🔍 اسم ولي الأمر'}
                value={guardianPickerSearch}
                onChange={(e) => setGuardianPickerSearch(e.target.value)}
                className="pr-8 h-8 text-[11px] rounded-lg bg-white dark:bg-green-950 border-green-300 dark:border-green-700 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSelectAllGuardians}
                className="h-8 px-2 rounded-lg text-[10px] font-semibold bg-green-600 hover:bg-green-700 text-white shadow transition"
                title="تحديد/إلغاء تحديد المعروض"
              >
                الكل
              </button>
              {!isAllGuardiansSelected && selectedGuardianIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => { clearAllGuardians(); }}
                  className="h-8 px-2 rounded-lg text-[10px] font-semibold bg-red-500 hover:bg-red-600 text-white shadow transition"
                  title="إزالة جميع التحديد"
                >
                  مسح
                </button>
              )}
              <div
                className={`h-8 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center
                  ${isAllGuardiansSelected
                    ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100'}`}
                title="عدد المحددين"
              >
                {isAllGuardiansSelected ? 'الجميع' : selectedGuardianIds.length}
              </div>
            </div>
          </div>
          <GenericTable
            title={(
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[12.5px] font-bold text-emerald-800">
                      🤵 أولياء الأمور
                    </span>
                  </div>
                </div>
              </div>
            )}
            defaultView="table"
            enablePagination
            defaultPageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
            cardPageSize={5}
            data={filteredGuardiansForPicker}
            getRowClassName={(item: any, index) => `${getSelectableRowClass((selectedGuardianIds.includes(item.id) || selectedGuardianIds.includes(item.phone_number || '')), index)} cursor-pointer`}
            hideSortToggle={false}
            className={`${TABLE_BASE_CLASS} text-[10px] sm:text-[11px]`}
            columns={([
              {
                key: 'row_index',
                header: '🔢',
                width: '40px',
                align: 'center',
                render: (_: any, globalIndex?: number) => <span className="text-[11px] font-medium">{(globalIndex ?? 0) + 1}</span>
              },
              {
                key: 'full_name',
                header: guardiansLabels.fullNameFull || guardiansLabels.fullName || 'الاسم',
                render: (item: any) => (
                  <button
                    type="button"
                    onClick={() => handleSelectGuardian(item)}
                    className="flex items-center justify-between w-full group"
                  >
                    <span className={`text-sm font-medium group-hover:text-green-700 ${(selectedGuardianIds.includes(item.id) || selectedGuardianIds.includes(item.phone_number || '')) ? 'text-green-700' : ''}`}>{item.full_name}</span>
                    {(selectedGuardianIds.includes(item.id) || selectedGuardianIds.includes(item.phone_number || ''))}
                  </button>
                )
              },
              {
                key: 'phone_number',
                header: guardiansLabels.phoneNumber || 'الهاتف',
                align: 'center',
                render: (item: any) => <span className="text-xs" dir="ltr">{item.phone_number || '-'}</span>
              },
              {
                key: 'actions',
                header: `⚙️ ${studentsLabels.actions}`,
                align: 'center',
                render: (item: any) => {
                  const sel = (selectedGuardianIds.includes(item.id) || selectedGuardianIds.includes(item.phone_number || ''));
                  return (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleSelectGuardian(item)}
                        className={`w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors shadow-sm
                          ${sel ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-green-300 text-green-600 hover:bg-green-50'}`}
                        title={sel ? 'إزالة من التحديد' : 'تحديد'}
                      >
                        ✓
                      </button>
                    </div>
                  );
                }
              }
            ]) as Column<any>[]}
            emptyMessage={guardiansLabels.noGuardians || 'لا يوجد بيانات'}
          />
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
                  header: `🎓 ${studentsLabels.teacherColumn}`,
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
              className={`${TABLE_BASE_CLASS} ${TABLE_TEXT_BASE}`}
              getRowClassName={(_, index) => getHistoryRowClass(index)}
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
