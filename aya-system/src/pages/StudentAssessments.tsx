import React, { useState, useEffect, useMemo } from 'react';
import { assessmentService } from '../lib/assessment-service';
import { getAllStudents } from '../lib/supabase-service';
import { getAllTeachers, getStudentsByTeacherId } from '../lib/teacher-service';
import { getAllStudyCircles, getTeacherStudyCircles } from '../lib/study-circle-service';
import { getCurrentUser } from '../lib/auth-service';
import { useToast } from '../hooks/use-toast';
import {
  Assessment,
  AssessmentCreate,
  AssessmentUpdate,
  AssessmentType,
  assessmentTypeOptions,
  getAssessmentTypeName,
  getAssessmentTypeColor,
  formatAssessmentRange,
  formatScore,
  quranSurahs,
  getSurahName
} from '../types/assessment';
import { Profile } from '../types/profile';
import { StudyCircle } from '../types/study-circle';
import { Table2, LayoutGrid, Plus, Pencil, Trash2, Award, Trophy, ClipboardList, RefreshCwIcon } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

interface StudentAssessmentsProps {
  onNavigate: (path: string) => void;
  currentUser: Profile;
}

const StudentAssessments: React.FC<StudentAssessmentsProps> = ({ onNavigate, currentUser: propCurrentUser }) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<{
    id: string;
    full_name: string;
    role?: 'teacher' | 'admin' | 'superadmin' | string;
  }[]>([]);
  const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all-students');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all-teachers');
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all-circles');
  const [assessmentToEdit, setAssessmentToEdit] = useState<Assessment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [activeTab, setActiveTab] = useState(propCurrentUser?.role === 'teacher' ? 'my-assessments' : 'all-assessments');
  const [tableExists, setTableExists] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  // متغيرات مربع حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  const { toast } = useToast();

  // بيانات النموذج
  const [formData, setFormData] = useState<AssessmentCreate>({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'juz',
    from_surah: 1,
    from_ayah: 1,
    to_surah: 1,
    to_ayah: 1,
    tajweed_score: undefined,
    memorization_score: undefined,
    recitation_score: undefined,
    total_score: undefined,
    notes: '',
    recorded_by: ''
  });

  // التحقق من بيانات النموذج
  const [formErrors, setFormErrors] = useState<{
    student_id?: string;
    recorded_by?: string;
    from_surah?: string;
    from_ayah?: string;
    to_surah?: string;
    to_ayah?: string;
    tajweed_score?: string;
    memorization_score?: string;
    recitation_score?: string;
  }>({});

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // اختبار الاتصال بالجدول أولاً
        const connectionTest = await assessmentService.testConnection();
        if (!connectionTest) {
          setTableExists(false);
          toast({
            title: 'جدول تقييمات الطلاب غير موجود',
            description: 'يرجى تنفيذ سكريبت إنشاء الجدول أولاً',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const user = propCurrentUser;
        setCurrentUser(user);

        // التحقق مما إذا كان هناك معرف حلقة في URL
        const urlParams = new URLSearchParams(window.location.search);
        const circleId = urlParams.get('circle');
        if (circleId) {
          setSelectedCircleId(circleId);
        }

        // جلب البيانات حسب دور المستخدم
        if (user && user.role === 'teacher') {
          console.log('StudentAssessments - Loading data for teacher role');
          // المعلم يرى فقط طلابه
          const studentsData = await getStudentsByTeacherId(user.id);
          setStudents(studentsData);

          // جلب الحلقات التي يشرف عليها المعلم
          const circlesData = await getTeacherStudyCircles(user.id);
          setStudyCircles(circlesData);

          // تعيين المعلم الحالي
          setTeachers([{
            id: user.id,
            full_name: user.full_name || 'المعلم',
            role: 'teacher'
          }]);
          setSelectedTeacherId(user.id);

          // جلب التقييمات
          const assessmentsData = await assessmentService.getAssessmentsByTeacher(user.id);
          setAssessments(assessmentsData);
          setFilteredAssessments(assessmentsData);
        } else {
          console.log('StudentAssessments - Loading data for admin/superadmin role');
          // المشرف/المدير يرى كل شيء
          const [studentsData, teachersData, assessmentsData, circlesData] = await Promise.all([
            getAllStudents(),
            getAllTeachers(),
            assessmentService.getAllAssessments(),
            getAllStudyCircles()
          ]);
          
          // تحليل بيانات الطلاب للتشخيص
          if (studentsData && studentsData.length > 0) {
            console.log(`تم تحميل ${studentsData.length} طالب`);
            
            // تحقق من وجود study_circle_id للطلاب
            const studentsWithCircle = studentsData.filter(s => s.study_circle_id);
            console.log(`عدد الطلاب المرتبطين بحلقات: ${studentsWithCircle.length} (${Math.round(studentsWithCircle.length / studentsData.length * 100)}%)`);
            
            // عرض معرفات الحلقات الفريدة
            const uniqueCircleIds = [...new Set(studentsData.map(s => s.study_circle_id).filter(Boolean))];
            console.log(`معرفات الحلقات الفريدة في بيانات الطلاب: ${uniqueCircleIds.length}`, uniqueCircleIds);
            
            // تحقق من تطابق معرفات الحلقات مع الحلقات المحملة
            const circleIdsInData = circlesData.map(c => c.id);
            const matchingCircleIds = uniqueCircleIds.filter(id => circleIdsInData.includes(id));
            console.log(`عدد معرفات الحلقات المطابقة: ${matchingCircleIds.length} من أصل ${uniqueCircleIds.length}`);
            
            if (matchingCircleIds.length < uniqueCircleIds.length) {
              console.warn('هناك معرفات حلقات في بيانات الطلاب غير موجودة في بيانات الحلقات!');
            }
          }
          
          setStudents(studentsData);
          setTeachers(teachersData);
          setAssessments(assessmentsData);
          setFilteredAssessments(assessmentsData);
          setStudyCircles(circlesData);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading data for StudentAssessments:', error);
        toast({
          title: 'خطأ في تحميل البيانات',
          description: 'حدث خطأ أثناء تحميل البيانات، يرجى المحاولة مرة أخرى',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [propCurrentUser, toast]);

  // تصفية التقييمات حسب المعايير المحددة
  useEffect(() => {
    if (assessments.length === 0) return;

    let filtered = [...assessments];

    // فلترة حسب المعلم المحدد
    if (selectedTeacherId !== 'all-teachers') {
      filtered = filtered.filter(a => a.recorded_by === selectedTeacherId);
    }

    // فلترة حسب الطالب المحدد
    if (selectedStudentId !== 'all-students') {
      filtered = filtered.filter(a => a.student_id === selectedStudentId);
    }

    // فلترة حسب الحلقة المحددة
    if (selectedCircleId !== 'all-circles') {
      // الحصول على معرفات الطلاب في الحلقة المحددة
      const studentIdsInCircle = students
        .filter(s => s.study_circle_id === selectedCircleId)
        .map(s => s.id);

      filtered = filtered.filter(a => studentIdsInCircle.includes(a.student_id));
    }

    // فلترة حسب نوع التقييم
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // فلترة حسب كلمة البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        // البحث في بيانات الطالب
        const student = students.find(s => s.id === a.student_id);
        const studentName = student?.full_name?.toLowerCase() || '';

        // البحث في بيانات المعلم
        const teacher = teachers.find(t => t.id === a.recorded_by);
        const teacherName = teacher?.full_name?.toLowerCase() || '';

        // البحث في تفاصيل التقييم
        const surahFrom = getSurahName(a.from_surah)?.toLowerCase() || '';
        const surahTo = getSurahName(a.to_surah)?.toLowerCase() || '';
        const notes = a.notes?.toLowerCase() || '';

        return (
          studentName.includes(query) ||
          teacherName.includes(query) ||
          surahFrom.includes(query) ||
          surahTo.includes(query) ||
          notes.includes(query)
        );
      });
    }

    setFilteredAssessments(filtered);
  }, [assessments, selectedTeacherId, selectedStudentId, selectedCircleId, filterType, searchQuery, students, teachers]);

  // حساب الدرجة الكلية
  const calculateTotalScore = () => {
    let scores = [];

    if (formData.tajweed_score !== undefined) scores.push(formData.tajweed_score);
    if (formData.memorization_score !== undefined) scores.push(formData.memorization_score);
    if (formData.recitation_score !== undefined) scores.push(formData.recitation_score);

    if (scores.length === 0) return undefined;

    const total = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(total * 100) / 100; // تقريب إلى رقمين عشريين
  };

  // الحصول على المعلمين المرئيين حسب الفلاتر
  const visibleTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      // إذا كان المستخدم الحالي معلمًا، فقط أظهر هذا المعلم
      if (currentUser?.role === 'teacher') {
        return teacher.id === currentUser.id;
      }

      // إذا تم تحديد حلقة، أظهر فقط المعلم المسؤول عنها
      if (selectedCircleId !== 'all-circles') {
        const circle = studyCircles.find(c => c.id === selectedCircleId);
        if (circle) {
          return circle.teacher_id === teacher.id;
        }
      }

      return true;
    });
  }, [teachers, currentUser, selectedCircleId, studyCircles]);

  // الحصول على الطلاب المرئيين حسب الفلاتر
  const visibleStudents = useMemo(() => {
    if (students.length === 0) {
      console.log('لا توجد بيانات طلاب متاحة');
      return [];
    }
    
    // عند إضافة/تعديل تقييم، نريد عرض جميع الطلاب إذا كان النموذج مفتوحًا
    if (isDialogOpen) {
      // في حالة تحديد حلقة في النموذج، أظهر فقط طلاب تلك الحلقة
      if (selectedCircleId !== 'all-circles') {
        const filtered = students.filter(student => student.study_circle_id === selectedCircleId);
        console.log(`تم فلترة الطلاب للحلقة ${selectedCircleId} في وضع النموذج:`, filtered.length);
        return filtered;
      }
      
      // في حالة تحديد معلم في النموذج، أظهر فقط طلاب ذلك المعلم
      if (selectedTeacherId !== 'all-teachers') {
        // الطلاب الذين يشرف عليهم المعلم مباشرة
        const teacherStudents = students.filter(student => student.teacher_id === selectedTeacherId);
        // الطلاب في الحلقات التي يشرف عليها المعلم
        const teacherCircleIds = studyCircles
          .filter(circle => circle.teacher_id === selectedTeacherId)
          .map(circle => circle.id);
        const circleStudents = students.filter(student => 
          student.study_circle_id && teacherCircleIds.includes(student.study_circle_id)
        );
        
        // دمج القائمتين وإزالة التكرار
        const filtered = [...new Set([...teacherStudents, ...circleStudents])];
        console.log(`تم فلترة الطلاب للمعلم ${selectedTeacherId} في وضع النموذج:`, filtered.length);
        return filtered;
      }
      
      // إذا لم يتم تحديد أي فلتر، أظهر جميع الطلاب
      console.log('عرض جميع الطلاب في وضع النموذج:', students.length);
      return students;
    }
    
    // فلترة عادية للعرض في الواجهة الرئيسية
    const filtered = students.filter(student => {
      // إذا تم تحديد معلم، أظهر فقط طلاب هذا المعلم
      if (selectedTeacherId !== 'all-teachers') {
        const teacherCircleIds = studyCircles
          .filter(circle => circle.teacher_id === selectedTeacherId)
          .map(circle => circle.id);
          
        if (student.teacher_id !== selectedTeacherId && 
            !(student.study_circle_id && teacherCircleIds.includes(student.study_circle_id))) {
          return false;
        }
      }

      // إذا تم تحديد حلقة، أظهر فقط طلاب هذه الحلقة
      if (selectedCircleId !== 'all-circles') {
        if (student.study_circle_id !== selectedCircleId) {
          return false;
        }
      }

      return true;
    });
    
    console.log('تم فلترة الطلاب للعرض العادي:', {
      total: students.length,
      filtered: filtered.length,
      selectedTeacher: selectedTeacherId,
      selectedCircle: selectedCircleId
    });
    
    return filtered;
  }, [students, selectedTeacherId, selectedCircleId, isDialogOpen, studyCircles]);

  // الحصول على الحلقات المرئية حسب الفلاتر
  const visibleStudyCircles = useMemo(() => {
    return studyCircles.filter(circle => {
      // إذا تم تحديد معلم، أظهر فقط حلقات هذا المعلم
      if (selectedTeacherId !== 'all-teachers') {
        return circle.teacher_id === selectedTeacherId;
      }

      return true;
    });
  }, [studyCircles, selectedTeacherId]);

  // التعامل مع تغيير المعلم المحدد في الفورم
  const handleTeacherChange = (teacherId: string) => {
    setFormData(prev => ({ ...prev, recorded_by: teacherId }));

    // إذا كان المعلم المحدد في الفلتر مختلفًا، قم بتحديثه
    if (selectedTeacherId !== teacherId && teacherId !== 'all-teachers') {
      setSelectedTeacherId(teacherId);

      // إذا كان هناك حلقة واحدة فقط لهذا المعلم، حددها تلقائيًا
      const teacherCircles = studyCircles.filter(c => c.teacher_id === teacherId);
      if (teacherCircles.length === 1) {
        handleCircleChange(teacherCircles[0].id);
      } else if (teacherCircles.length === 0) {
        // إذا لم يكن هناك حلقات لهذا المعلم، أعد تعيين الحلقة المحددة
        setSelectedCircleId('all-circles');
      }
    }
  };

  // التعامل مع تغيير الحلقة المحددة في الفورم
  const handleCircleChange = (circleId: string) => {
    setSelectedCircleId(circleId);

    // إذا كانت الحلقة تنتمي لمعلم مختلف، قم بتحديث المعلم المحدد
    if (circleId !== 'all-circles') {
      const circle = studyCircles.find(c => c.id === circleId);
      if (circle && circle.teacher_id && circle.teacher_id !== selectedTeacherId) {
        setSelectedTeacherId(circle.teacher_id);
        setFormData(prev => ({ ...prev, recorded_by: circle.teacher_id }));
      }
    }
  };

  // التعامل مع تغيير السورة في نطاق التقييم
  const handleSurahChange = (field: 'from_surah' | 'to_surah', value: number) => {
    setFormData(prev => {
      // تحديث قيمة السورة
      const updated = { ...prev, [field]: value };

      // إعادة تعيين رقم الآية إذا كان أكبر من عدد آيات السورة الجديدة
      const ayahField = field === 'from_surah' ? 'from_ayah' : 'to_ayah';
      const maxAyahs = quranSurahs.find(s => s.number === value)?.ayahs || 1;

      if (prev[ayahField] > maxAyahs) {
        updated[ayahField] = 1;
      }

      return updated;
    });
  };

  // إضافة تقييم جديد
  const handleAddAssessment = () => {
    setAssessmentToEdit(null);
    setFormData({
      student_id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'juz',
      from_surah: 1,
      from_ayah: 1,
      to_surah: 1,
      to_ayah: 1,
      tajweed_score: undefined,
      memorization_score: undefined,
      recitation_score: undefined,
      total_score: undefined,
      notes: '',
      recorded_by: currentUser ? currentUser.id : ''
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // تعديل تقييم موجود
  const handleEditAssessment = (assessment: Assessment) => {
    setAssessmentToEdit(assessment);
    setFormData({
      student_id: assessment.student_id,
      date: assessment.date.split('T')[0],
      type: assessment.type,
      from_surah: assessment.from_surah,
      from_ayah: assessment.from_ayah,
      to_surah: assessment.to_surah,
      to_ayah: assessment.to_ayah,
      tajweed_score: assessment.tajweed_score,
      memorization_score: assessment.memorization_score,
      recitation_score: assessment.recitation_score,
      total_score: assessment.total_score,
      notes: assessment.notes || '',
      recorded_by: assessment.recorded_by
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  // التحقق من صحة البيانات المدخلة
  const validateForm = (): boolean => {
    const errors: any = {};

    // التحقق من اختيار الطالب
    if (!formData.student_id) {
      errors.student_id = 'يرجى اختيار الطالب';
    }

    // التحقق من اختيار المعلم المسجل
    if (!formData.recorded_by) {
      errors.recorded_by = 'يرجى اختيار المعلم المسجل';
    }

    // التحقق من نطاق التقييم
    if (formData.from_surah > formData.to_surah) {
      errors.from_surah = 'يجب أن تكون سورة البداية قبل أو تساوي سورة النهاية';
    } else if (formData.from_surah === formData.to_surah && formData.from_ayah > formData.to_ayah) {
      errors.from_ayah = 'في نفس السورة، يجب أن تكون آية البداية قبل أو تساوي آية النهاية';
    }

    // التحقق من درجات التقييم
    if (formData.tajweed_score !== undefined && (formData.tajweed_score < 0 || formData.tajweed_score > 100)) {
      errors.tajweed_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    if (formData.memorization_score !== undefined && (formData.memorization_score < 0 || formData.memorization_score > 100)) {
      errors.memorization_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    if (formData.recitation_score !== undefined && (formData.recitation_score < 0 || formData.recitation_score > 100)) {
      errors.recitation_score = 'يجب أن تكون الدرجة بين 0 و 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // حفظ التقييم (إضافة/تعديل)
  const handleSaveAssessment = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // حساب الدرجة الكلية
      const totalScore = calculateTotalScore();
      const dataToSave = {
        ...formData,
        total_score: totalScore
      };

      let result;

      if (assessmentToEdit) {
        // تعديل تقييم موجود
        const updateData: AssessmentUpdate = {
          id: assessmentToEdit.id,
          ...dataToSave
        };

        try {
          await assessmentService.updateAssessment(updateData);

          toast({
            title: 'تم تحديث التقييم بنجاح',
            className: "bg-green-50 border-green-200",
          });

          // تحديث قائمة التقييمات
          const updatedAssessments = assessments.map(a =>
            a.id === assessmentToEdit.id ? { ...a, ...updateData } : a
          );
          setAssessments(updatedAssessments);

          // إغلاق النافذة المنبثقة في حالة النجاح
          setIsDialogOpen(false);
        } catch (error: any) {
          toast({
            title: 'خطأ في تحديث التقييم',
            description: error.message || 'حدث خطأ غير متوقع',
            variant: 'destructive',
          });
        }
      } else {
        // إضافة تقييم جديد
        try {
          const newAssessmentResult = await assessmentService.createAssessment(dataToSave);

          if (newAssessmentResult && newAssessmentResult.id) {
            toast({
              title: 'تم إضافة التقييم بنجاح',
              className: "bg-green-50 border-green-200",
            });

            // إضافة التقييم الجديد إلى القائمة
            const newAssessment = {
              id: newAssessmentResult.id,
              ...dataToSave
            };
            setAssessments([newAssessment, ...assessments]);

            // إغلاق النافذة المنبثقة في حالة النجاح
            setIsDialogOpen(false);
          } else {
            throw new Error('فشل في إضافة التقييم');
          }
        } catch (error: any) {
          toast({
            title: 'خطأ في إضافة التقييم',
            description: error.message || 'حدث خطأ غير متوقع',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      toast({
        title: 'خطأ في حفظ التقييم',
        description: 'حدث خطأ غير متوقع أثناء حفظ التقييم',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // حذف تقييم
  const handleDeleteAssessment = async (assessment: Assessment) => {
    // فتح مربع حوار تأكيد الحذف
    setAssessmentToDelete(assessment);
    setIsDeleteDialogOpen(true);
  };

  // تنفيذ عملية الحذف بعد التأكيد
  const executeDeleteAssessment = async () => {
    if (!assessmentToDelete) return;

    try {
      setIsLoading(true);

      await assessmentService.deleteAssessment(assessmentToDelete.id);

      toast({
        title: 'تم حذف التقييم بنجاح',
        className: "bg-green-50 border-green-200",
      });

      // إزالة التقييم من القائمة
      setAssessments(assessments.filter(a => a.id !== assessmentToDelete.id));
    } catch (error: any) {
      console.error('Error deleting assessment:', error);
      toast({
        title: 'خطأ في حذف التقييم',
        description: error.message || 'حدث خطأ غير متوقع أثناء حذف التقييم',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تكوين نص عرض التقييم
  const formatAssessmentDisplay = (assessment: Assessment) => {
    // إذا كان لدينا student في assessment (من استعلام الـ join) نستخدمه
    const studentFromAssessment = assessment.student;
    // وإلا نبحث في قائمة الطلاب
    const studentFromList = students.find(s => s.id === assessment.student_id);
    
    // نستخدم البيانات المتاحة
    const student = studentFromAssessment || studentFromList;
    const teacher = teachers.find(t => t.id === assessment.recorded_by);
    
    // نحصل على بيانات ولي الأمر - قد تكون في student أو في student.guardian
    let guardianName;
    if (student?.guardian?.full_name) {
      guardianName = student.guardian.full_name;
    } else if (studentFromList?.guardian?.full_name) {
      guardianName = studentFromList.guardian.full_name;
    }

    return {
      student: student ? student.full_name : 'طالب غير معروف',
      guardian: guardianName || 'ولي أمر غير مسجل',
      hasGuardian: !!guardianName,
      teacher: teacher ? teacher.full_name : 'معلم غير معروف',
      type: getAssessmentTypeName(assessment.type),
      typeColor: getAssessmentTypeColor(assessment.type),
      range: formatAssessmentRange(assessment),
      score: formatScore(assessment.total_score),
      date: new Date(assessment.date).toLocaleDateString('ar-SA')
    };
  };

  // تعطيل الصفحة إذا لم يكن جدول التقييمات موجودًا
  if (!tableExists) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h1 className="text-3xl font-bold mb-4">تقييمات الطلاب</h1>
        <div className="p-6 bg-red-50 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-2 text-red-700">جدول تقييمات الطلاب غير موجود</h2>
          <p className="mb-4">يرجى التواصل مع مسؤول النظام لإنشاء الجدول المطلوب.</p>
          <Button onClick={() => onNavigate('/database-management')}>
            الذهاب إلى إدارة قاعدة البيانات
          </Button>
        </div>
      </div>
    );
  }

  // تحديث البيانات
  const refreshData = async () => {
    try {
      setIsLoading(true);
      toast({
        title: "جاري تحديث البيانات...",
        description: "يرجى الانتظار",
      });

      // جلب البيانات حسب دور المستخدم
      if (currentUser?.role === 'teacher') {
        // المعلم يرى فقط طلابه
        const studentsData = await getStudentsByTeacherId(currentUser.id);
        setStudents(studentsData);

        // جلب الحلقات التي يشرف عليها المعلم
        const circlesData = await getTeacherStudyCircles(currentUser.id);
        setStudyCircles(circlesData);

        // جلب التقييمات
        const assessmentsData = await assessmentService.getAssessmentsByTeacher(currentUser.id);
        setAssessments(assessmentsData);
        setFilteredAssessments(assessmentsData);
      } else {
        // المشرف/المدير يرى كل شيء
        const [studentsData, teachersData, assessmentsData, circlesData] = await Promise.all([
          getAllStudents(),
          getAllTeachers(),
          assessmentService.getAllAssessments(),
          getAllStudyCircles()
        ]);
        setStudents(studentsData);
        setTeachers(teachersData);
        setAssessments(assessmentsData);
        setFilteredAssessments(assessmentsData);
        setStudyCircles(circlesData);
      }

      toast({
        title: "تم تحديث البيانات بنجاح",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'خطأ في تحديث البيانات',
        description: 'حدث خطأ أثناء تحديث البيانات، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6" dir="rtl">
      <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">

        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-blue-50 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-yellow-300" />
                تقييمات الطلاب
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-blue-100">
                هنا يمكنك عرض وتسجيل تقييمات الطلاب بشكل تفصيلي
              </CardDescription>
            </div>

            {/* زر العودة */}
            <Button
              variant="outline"
              className="flex items-center gap-2 rounded-3xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg hover:scale-105 transition-transform duration-200 px-4 py-1.5 font-semibold"
              onClick={refreshData}
            >
              <RefreshCwIcon className="h-4 w-4" />
              تحديث
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Content goes here */}
          <>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md border border-green-200 dark:border-green-700">
              <div className="flex-1 min-w-[180px]">
                <Input
                  placeholder="🔍 بحث عن طالب أو ولي أمر أو سورة أو ملاحظات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green focus:border-islamic-green text-sm text-gray-800 dark:text-gray-200 transition-all duration-200"
                />
              </div>

              {/* اختيار المعلم */}
              <div className="min-w-[140px]">
                <Select
                  value={selectedTeacherId}
                  onValueChange={(value) => {
                    setSelectedTeacherId(value);
                    setSelectedCircleId('all-circles');
                    setSelectedStudentId('all-students');
                  }}
                >
                  <SelectTrigger className="rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green hover:scale-102 transition-transform duration-200 text-sm">
                    <SelectValue placeholder="👨‍🏫 اختر معلماً" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-teachers">جميع المعلمين</SelectItem>
                    {visibleTeachers.length > 0
                      ? visibleTeachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.full_name ?? `المعلم ${teacher.id.slice(0, 4)}`}
                          {teacher.role && (
                            teacher.role === 'teacher'
                              ? ' (معلم)'
                              : ` (${teacher.role === 'admin' ? 'مشرف' : teacher.role})`
                          )}
                        </SelectItem>
                      ))
                      : <SelectItem disabled value="__no__">لا يوجد معلمين أو مشرفين</SelectItem>
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* اختيار الحلقة */}
              <div className="min-w-[140px]">
                <Select
                  value={selectedCircleId}
                  onValueChange={(value) => {
                    console.log('تم اختيار الحلقة:', value);
                    setSelectedCircleId(value);
                    setSelectedStudentId('all-students');
                    
                    // طباعة معلومات تشخيصية عن الطلاب في الحلقة المحددة
                    if (value !== 'all-circles') {
                      const studentsInCircle = students.filter(s => s.study_circle_id === value);
                      console.log(`الطلاب في الحلقة المحددة (${value}):`, studentsInCircle.length);
                      console.log('معرفات الطلاب في الحلقة:', studentsInCircle.map(s => s.id));
                      
                      if (studentsInCircle.length === 0) {
                        console.log('لا يوجد طلاب في هذه الحلقة!');
                        console.log('جميع معرفات الحلقات المتاحة في الطلاب:', 
                          [...new Set(students.map(s => s.study_circle_id))]
                            .filter(Boolean)
                            .join(', ')
                        );
                      }
                    }
                  }}
                  disabled={selectedTeacherId === 'all-teachers' && visibleStudyCircles.length === 0}
                >
                  <SelectTrigger className="rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green hover:scale-102 transition-transform duration-200 text-sm">
                    <SelectValue placeholder={
                      selectedTeacherId === 'all-teachers'
                        ? "📚 جميع الحلقات"
                        : visibleStudyCircles.length === 0
                          ? "لا توجد حلقات"
                          : "اختر حلقة"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-circles">جميع الحلقات</SelectItem>
                    {visibleStudyCircles.map(circle => (
                      <SelectItem key={circle.id} value={circle.id}>
                        {circle.name || `حلقة ${circle.id}`} {selectedTeacherId === 'all-teachers' && circle.teacher ? ` - ${circle.teacher.full_name}` : ''} ({circle.students_count} طالب)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* اختيار الطالب */}
              {/* اختيار الطالب */}
              <div className="min-w-[140px]">
                <Select
                  value={selectedStudentId}
                  onValueChange={(value) => {
                    console.log('تم اختيار الطالب:', value);
                    setSelectedStudentId(value);
                    
                    // إذا تم اختيار طالب محدد، اطبع معلومات عنه للتشخيص
                    if (value !== 'all-students') {
                      const selectedStudent = students.find(s => s.id === value);
                      console.log('معلومات الطالب المحدد:', {
                        id: selectedStudent?.id,
                        name: selectedStudent?.full_name,
                        study_circle_id: selectedStudent?.study_circle_id,
                        teacher_id: selectedStudent?.teacher_id
                      });
                    }
                  }}
                  disabled={visibleStudents.length === 0}
                >
                  <SelectTrigger className="rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green hover:scale-102 transition-transform duration-200 text-sm">
                    <SelectValue placeholder={visibleStudents.length === 0 ? "لا يوجد طلاب" : "👦 جميع الطلاب"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-students">جميع الطلاب</SelectItem>
                    {visibleStudents.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex flex-col text-sm">
                          <span className="font-medium">{student.full_name}</span>
                          {student.guardian && student.guardian.full_name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">ولي الأمر: {student.guardian.full_name}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* اختيار نوع التقييم */}

              <div className="min-w-[140px]">
                <Select
                  value={filterType}
                  onValueChange={setFilterType}
                  disabled={visibleStudents.length === 0}
                >
                  <SelectTrigger className="rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green hover:scale-102 transition-transform duration-200 text-sm">
                    <SelectValue placeholder="اختر نوع التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    {assessmentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddAssessment}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 px-3 py-1.5 shadow-md hover:scale-105 transition-transform duration-200 text-sm font-semibold ring-1 ring-green-500/30 hover:ring-2 hover:ring-green-500/50 active:scale-95"
              >
                <Plus className="w-3 h-3" />
                إضافة سجل جديد
              </Button>

            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-md border border-green-200 dark:border-green-700">
              {/* التابات */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full md:w-[420px] bg-green-50 rounded-xl shadow-inner p-1"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-green-300">
                  <TabsTrigger
                    value="all-records"
                    className="
                                flex items-center justify-center gap-2 text-sm font-medium
                                rounded-lg
                                text-green-800
                                hover:bg-green-100 hover:text-green-900
                                data-[state=active]:bg-islamic-green
                                data-[state=active]:text-white
                                transition-all duration-300
                              "
                  >
                    📋 جميع السجلات
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-records"
                    className="
                              flex items-center justify-center gap-2 text-sm font-medium
                              rounded-lg
                              text-green-800
                              hover:bg-green-100 hover:text-green-900
                              data-[state=active]:bg-islamic-green
                              data-[state=active]:text-white
                              transition-all duration-300
                            "
                  >
                    👤 سجلاتي
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* أزرار تبديل العرض */}
              <div className="flex items-center gap-2 border rounded-lg p-1 bg-green-50 dark:bg-green-900 shadow-sm">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex items-center justify-center w-10 h-10 p-0 rounded-lg hover:bg-green-100 hover:scale-105 transition-transform duration-200"
                  title="عرض جدول"
                >
                  <Table2 className="w-5 h-5 text-green-800" />
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="flex items-center justify-center w-10 h-10 p-0 rounded-lg hover:bg-green-100 hover:scale-105 transition-transform duration-200"
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="w-5 h-5 text-green-800" />
                </Button>
              </div>
            </div>
            {/* عرض التقييمات */}
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4">جاري تحميل البيانات...</p>
              </div>
            ) : (
              <>
                {filteredAssessments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-xl text-gray-600">لا توجد تقييمات متطابقة مع معايير التصفية</p>
                    <Button variant="outline" className="mt-4" onClick={() => {
                      setSelectedTeacherId(currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers');
                      setSelectedStudentId('all-students');
                      setSelectedCircleId('all-circles');
                      setFilterType('all');
                      setSearchQuery('');
                    }}>
                      إعادة تعيين الفلاتر
                    </Button>
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الطالب</TableHead>
                          <TableHead className="text-right">المعلم</TableHead>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">النطاق</TableHead>
                          <TableHead className="text-right">الدرجة</TableHead>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssessments.map((assessment) => {
                          const display = formatAssessmentDisplay(assessment);
                          return (
                            <TableRow key={assessment.id}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{display.student}</span>
                                  {display.hasGuardian && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                      <span className="font-medium text-blue-600">ولي الأمر:</span>
                                      <span>{display.guardian}</span>
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{display.teacher}</TableCell>
                              <TableCell>
                                <Badge className={`bg-${display.typeColor}-100 text-${display.typeColor}-800 border-${display.typeColor}-200`}>
                                  {display.type}
                                </Badge>
                              </TableCell>
                              <TableCell dir="rtl">{display.range}</TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  {display.score}
                                </Badge>
                              </TableCell>
                              <TableCell>{display.date}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditAssessment(assessment)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteAssessment(assessment)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssessments.map((assessment) => {
                      const display = formatAssessmentDisplay(assessment);
                      const student = students.find(s => s.id === assessment.student_id);

                      return (
                        <Card key={assessment.id} className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-all duration-200">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <Badge className={`bg-${display.typeColor}-100 text-${display.typeColor}-800 border-${display.typeColor}-200`}>
                                {display.type}
                              </Badge>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditAssessment(assessment)}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAssessment(assessment)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            <CardTitle className="text-xl mt-1">{display.student}</CardTitle>
                            {display.hasGuardian && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <span className="font-medium text-blue-600">ولي الأمر:</span> 
                                <span>{display.guardian}</span>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent className="pb-4">
                            <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
                              <div>
                                <p className="text-gray-500">المعلم</p>
                                <p className="font-medium">{display.teacher}</p>
                              </div>
                              <div>
                                <p className="text-gray-500">التاريخ</p>
                                <p className="font-medium">{display.date}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-gray-500">النطاق</p>
                                <p className="font-medium" dir="rtl">{display.range}</p>
                              </div>
                            </div>

                            {/* عرض درجات التقييم */}
                            <div className="mt-3 border-t pt-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                  <span className="font-semibold">الدرجة الكلية</span>
                                </div>
                                <Badge className="text-lg py-1 px-3 bg-yellow-100 text-yellow-800 border-yellow-200">
                                  {display.score}
                                </Badge>
                              </div>

                              {/* عرض الدرجات التفصيلية إذا كانت متوفرة */}
                              {(assessment.tajweed_score !== undefined ||
                                assessment.memorization_score !== undefined ||
                                assessment.recitation_score !== undefined) && (
                                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                                    {assessment.tajweed_score !== undefined && (
                                      <div className="text-center">
                                        <p className="text-gray-500">التجويد</p>
                                        <p className="font-medium">{formatScore(assessment.tajweed_score)}</p>
                                      </div>
                                    )}
                                    {assessment.memorization_score !== undefined && (
                                      <div className="text-center">
                                        <p className="text-gray-500">الحفظ</p>
                                        <p className="font-medium">{formatScore(assessment.memorization_score)}</p>
                                      </div>
                                    )}
                                    {assessment.recitation_score !== undefined && (
                                      <div className="text-center">
                                        <p className="text-gray-500">التلاوة</p>
                                        <p className="font-medium">{formatScore(assessment.recitation_score)}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>

                            {/* عرض الملاحظات إذا كانت موجودة */}
                            {assessment.notes && (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-gray-500 text-sm">ملاحظات</p>
                                <p className="text-sm mt-1 text-gray-700">{assessment.notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        </CardContent>

      </Card>


      {/* حوار إضافة/تعديل تقييم */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          // عند إغلاق الحوار، إعادة تعيين الفلاتر
          if (!open) {
            // استعادة الفلاتر المستخدمة في العرض
            const defaultTeacherId = currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers';
            if (selectedTeacherId !== defaultTeacherId) {
              setSelectedTeacherId(defaultTeacherId);
            }
            if (selectedCircleId !== 'all-circles') {
              setSelectedCircleId('all-circles');
            }
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-[520px] w-full rounded-xl p-3 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-xl font-bold text-center">
              <h3 className="text-center leading-tight text-green-800 bg-gradient-to-r from-green-100 to-blue-100 py-2 px-3 rounded-lg">
                {assessmentToEdit ? '✏️ تعديل تقييم الطالب' : '✨ إضافة تقييم طالب جديد'}
              </h3>
            </DialogTitle>
            {assessmentToEdit && visibleStudents.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                <div className="flex flex-col gap-1 text-center">
                  <span className="text-sm font-medium">
                    <span className="text-blue-700">الطالب:</span> {visibleStudents.find(s => s.id === assessmentToEdit.student_id)?.full_name}
                  </span>
                  <span className="text-xs text-gray-600">
                    <span className="text-blue-700">ولي الأمر:</span> {
                      visibleStudents.find(s => s.id === assessmentToEdit.student_id)?.guardian?.full_name || 
                      'لم يتم تسجيل بيانات ولي الأمر'
                    }
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>
          <div className="bg-white dark:bg-gray-900 p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="flex flex-row-reverse w-full mb-3 bg-gradient-to-r from-blue-100 to-green-100 p-1 rounded-lg">
                <TabsTrigger value="basic" className="flex-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm">
                  <span className="flex items-center justify-center gap-1">📋 معلومات أساسية</span>
                </TabsTrigger>
                <TabsTrigger value="range" className="flex-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm">
                  <span className="flex items-center justify-center gap-1">📖 نطاق الاختبار</span>
                </TabsTrigger>
                <TabsTrigger value="scores" className="flex-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm">
                  <span className="flex items-center justify-center gap-1">🏆 الدرجات</span>
                </TabsTrigger>
              </TabsList>

              {/* الصفحة الأولى - المعلومات الأساسية */}
              <TabsContent value="basic" className="mt-0">
                <div className="grid gap-3 py-2">
                  {/* المعلم/المشرف والحلقة */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1 order-last ">
                      <Label htmlFor="recorded_by" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">المسجل <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.recorded_by || (currentUser ? currentUser.id : '')}
                        onValueChange={handleTeacherChange}
                      >
                        <SelectTrigger id="recorded_by" className="h-9 bg-white text-right"><SelectValue placeholder="اختر المعلم" /></SelectTrigger>
                        <SelectContent className=" text-right">
                          {visibleTeachers.length > 0 ? (
                            visibleTeachers.map(teacher => (
                              <SelectItem key={teacher.id} value={teacher.id} className=" text-right">
                                <div className="flex flex-col text-right">
                                  <span className="font-medium">{teacher.full_name ?? `المعلم ${teacher.id.slice(0, 4)}`}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="no-teachers">لا يوجد معلمين متاحين</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {formErrors.recorded_by && <p className="text-xs text-red-500 text-right">{formErrors.recorded_by}</p>}
                    </div>

                    <div className="grid gap-1 order-first">
                      <Label htmlFor="circle_info" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">الحلقة</Label>
                      <Select
                        value={selectedCircleId !== 'all-circles' ? selectedCircleId : ''}
                        onValueChange={handleCircleChange}
                      >
                        <SelectTrigger id="circle_info" className="h-9 bg-white text-right"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
                        <SelectContent className=" text-right">
                          {visibleStudyCircles.length > 0 ? (
                            visibleStudyCircles.map(circle => (
                              <SelectItem key={circle.id} value={circle.id} className=" text-right">
                                {circle.name || `حلقة ${circle.id}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="no-circles">لا توجد حلقات متاحة</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* اختيار الطالب */}
                  <div className="grid gap-1">
                    <Label htmlFor="student_id" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">الطالب <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.student_id}
                      onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    >
                      <SelectTrigger id="student_id" className="h-9 bg-white text-right">
                      <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent className="text-right max-h-[200px]">
                        {visibleStudents.length > 0 ? (
                        visibleStudents.map(student => (
                        <SelectItem key={student.id} value={student.id} className="text-right">
                          <div className="flex flex-col">
                          <span className="font-medium">{student.full_name}</span>
                          <span className="text-xs text-gray-600">
                            <span className="text-blue-700">ولي الأمر:</span> {
                              visibleStudents.find(s => s.id === formData.student_id)?.guardian?.full_name || 
                              'لم يتم تسجيل بيانات ولي الأمر'
                            }
                          </span>
                          </div>
                        </SelectItem>
                        ))
                        ) : (
                        <SelectItem disabled value="no-students">
                        {selectedCircleId !== 'all-circles'
                          ? 'لا يوجد طلاب في هذه الحلقة'
                          : selectedTeacherId !== 'all-teachers'
                          ? 'لا يوجد طلاب لهذا المعلم'
                          : 'لا يوجد طلاب متاحين'
                        }
                        </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.student_id && <p className="text-xs text-red-500 text-right">{formErrors.student_id}</p>}
                  </div>

                  {/* تاريخ التقييم ونوع الاختبار */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1 order-last">
                      <Label htmlFor="date" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">تاريخ الاختبار <span className="text-red-500">*</span></Label>
                      <Input
                        id="date"
                        type="date"
                        className="h-9 bg-white text-right"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]} // تحديد الحد الأدنى للتاريخ هو اليوم الحالي
                      />
                    </div>

                    <div className="grid gap-1 order-first">
                      <Label htmlFor="type" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">نوع الاختبار <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as AssessmentType })}
                      >
                        <SelectTrigger id="type" className="h-9 bg-white text-right"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                        <SelectContent className=" text-right">
                          {assessmentTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* ملاحظات */}
                  <div className="grid gap-1">
                    <Label htmlFor="notes" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أدخل ملاحظات إضافية"
                      className="min-h-[70px] bg-white text-right"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* الصفحة الثانية - نطاق الاختبار */}
              <TabsContent value="range" className="mt-0">
                <div className="grid gap-3 py-2">
                  {/* نطاق التقييم - من */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1 order-last">
                      <Label htmlFor="from_ayah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">من آية <span className="text-red-500">*</span></Label>
                      <Input
                        id="from_ayah"
                        type="number"
                        className="h-9 bg-white text-right"
                        min="1"
                        max={quranSurahs.find(s => s.number === formData.from_surah)?.ayahs || 1}
                        value={formData.from_ayah}
                        onChange={(e) => setFormData({ ...formData, from_ayah: parseInt(e.target.value) })}
                      />
                      {formErrors.from_ayah && <p className="text-xs text-red-500 text-right">{formErrors.from_ayah}</p>}
                    </div>

                    <div className="grid gap-1 order-first">
                      <Label htmlFor="from_surah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">من سورة <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.from_surah?.toString()}
                        onValueChange={(value) => handleSurahChange('from_surah', parseInt(value))}
                      >
                        <SelectTrigger id="from_surah" className="h-9 bg-white text-right"><SelectValue placeholder="اختر السورة" /></SelectTrigger>
                        <SelectContent className=" text-right max-h-[200px]">
                          {quranSurahs.map(surah => (
                            <SelectItem key={surah.number} value={surah.number.toString()}>
                              {surah.name} ({surah.number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.from_surah && <p className="text-xs text-red-500 text-right">{formErrors.from_surah}</p>}
                    </div>
                  </div>

                  {/* نطاق التقييم - إلى */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1 order-last">
                      <Label htmlFor="to_surah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">إلى سورة <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.to_surah?.toString()}
                        onValueChange={(value) => handleSurahChange('to_surah', parseInt(value))}
                      >
                        <SelectTrigger id="to_surah" className="h-9 bg-white text-right"><SelectValue placeholder="اختر السورة" /></SelectTrigger>
                        <SelectContent className=" text-right max-h-[200px]">
                          {quranSurahs.map(surah => (
                            <SelectItem key={surah.number} value={surah.number.toString()}>
                              {surah.name} ({surah.number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.to_surah && <p className="text-xs text-red-500 text-right">{formErrors.to_surah}</p>}
                    </div>

                    <div className="grid gap-1 order-first">
                      <Label htmlFor="to_ayah" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">إلى آية <span className="text-red-500">*</span></Label>
                      <Input
                        id="to_ayah"
                        type="number"
                        className="h-9 bg-white text-right"
                        min="1"
                        max={quranSurahs.find(s => s.number === formData.to_surah)?.ayahs || 1}
                        value={formData.to_ayah}
                        onChange={(e) => setFormData({ ...formData, to_ayah: parseInt(e.target.value) })}
                      />
                      {formErrors.to_ayah && <p className="text-xs text-red-500 text-right">{formErrors.to_ayah}</p>}
                    </div>
                  </div>

                  <div dir="rtl" className="py-3 px-4 mt-2 bg-blue-50 rounded-lg text-sm border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-800">
                      <span>📖 نطاق الاختبار:</span>
                      <span className="font-bold">
                        {formData.from_surah && formData.to_surah ?
                          formatAssessmentRange(formData as Assessment) :
                          'غير محدد بعد'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>


              {/* الصفحة الثالثة - درجات التقييم */}
              <TabsContent value="scores" className="mt-0">
                <div className="grid gap-3 py-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1 order-3">
                      <Label htmlFor="tajweed_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                        <span>درجة التجويد</span>
                      </Label>
                      <Input
                        id="tajweed_score"
                        type="text"
                        inputMode="decimal"
                        dir="rtl"
                        className="h-9 bg-white text-right"
                        value={formData.tajweed_score !== undefined ? formData.tajweed_score : ''}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val)) val = undefined;
                          else if (val > 100) val = 100;
                          else if (val < 0) val = 0;
                          setFormData({ ...formData, tajweed_score: val });
                        }}
                        placeholder="0 - 100"
                      />
                      {formErrors.tajweed_score && <p className="text-xs text-red-500 text-right">{formErrors.tajweed_score}</p>}
                    </div>

                    <div className="grid gap-1 order-2">
                      <Label htmlFor="memorization_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                        <span>درجة الحفظ</span>
                      </Label>
                      <Input
                        id="memorization_score"
                        type="text"
                        inputMode="decimal"
                        dir="rtl"
                        className="h-9 bg-white text-right"
                        value={formData.memorization_score !== undefined ? formData.memorization_score : ''}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val)) val = undefined;
                          else if (val > 100) val = 100;
                          else if (val < 0) val = 0;
                          setFormData({ ...formData, memorization_score: val });
                        }}
                        placeholder="0 - 100"
                      />
                      {formErrors.memorization_score && <p className="text-xs text-red-500 text-right">{formErrors.memorization_score}</p>}
                    </div>

                    <div className="grid gap-1 order-1">
                      <Label htmlFor="recitation_score" className="text-xs font-medium text-gray-700 flex flex-row-reverse items-center gap-1">
                        <span>درجة التلاوة</span>
                      </Label>
                      <Input
                        id="recitation_score"
                        type="text"
                        inputMode="decimal"
                        dir="rtl"
                        className="h-9 bg-white text-right"
                        value={formData.recitation_score !== undefined ? formData.recitation_score : ''}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val)) val = undefined;
                          else if (val > 100) val = 100;
                          else if (val < 0) val = 0;
                          setFormData({ ...formData, recitation_score: val });
                        }}
                        placeholder="0 - 100"
                      />
                      {formErrors.recitation_score && <p className="text-xs text-red-500 text-right">{formErrors.recitation_score}</p>}
                    </div>
                  </div>


                  <div dir="rtl" className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg mt-3 border border-amber-100">
                    <div className="flex flex-row-reverse justify-between items-center">
                      <span className="text-lg font-bold text-amber-700 px-3 py-1 bg-white rounded-lg shadow-sm">
                        {calculateTotalScore() !== undefined ? calculateTotalScore() : '-'}
                      </span>
                      <Label htmlFor="total_score" className="font-bold text-right text-sm text-amber-800">
                        الدرجة الكلية:
                      </Label>
                    </div>
                    <p className="text-xs text-amber-700 mt-2 text-right">
                      (يتم حساب الدرجة الكلية تلقائيًا كمتوسط للدرجات المدخلة)
                    </p>
                  </div>
                </div>
              </TabsContent>




            </Tabs>

            <DialogFooter dir="rtl" className="flex space-x-2 rtl:space-x-reverse justify-end">
              <Button type="button" onClick={handleSaveAssessment} disabled={isLoading}>
                {isLoading ? 'جاري الحفظ...' : assessmentToEdit ? '✓ تحديث التقييم' : '✓ إضافة التقييم'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDeleteAssessment}
        isLoading={isLoading}
        title="تأكيد حذف التقييم"
        description="هل أنت متأكد من رغبتك في حذف هذا التقييم؟"
        itemDetails={assessmentToDelete ? {
          "الطالب": assessmentToDelete.student?.full_name || '-',
          "النوع": getAssessmentTypeName(assessmentToDelete.type),
          "التاريخ": new Date(assessmentToDelete.date).toLocaleDateString('ar-SA')
        } : null}
        detailsLabels={[
          { key: "الطالب", label: "الطالب" },
          { key: "النوع", label: "نوع التقييم" },
          { key: "التاريخ", label: "تاريخ التقييم" }
        ]}
        deleteButtonText="نعم، احذف التقييم"
        cancelButtonText="إلغاء"
      />

    </div>
  );
};

export default StudentAssessments;
