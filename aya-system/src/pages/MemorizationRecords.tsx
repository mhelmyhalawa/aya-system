import React, { useState, useEffect, useMemo } from 'react';
import {
  memorizationRecordService
} from '../lib/memorization-record-service';
import { getAllStudents } from '../lib/supabase-service';
import { getAllTeachers, getStudentsByTeacherId } from '../lib/teacher-service';
import { getAllStudyCircles, getTeacherStudyCircles } from '../lib/study-circle-service';
import { useToast } from '../hooks/use-toast';
import {
  MemorizationRecord,
  MemorizationRecordCreate,
  MemorizationRecordUpdate,
  MemorizationType,
  memorizationTypeOptions,
  getMemorizationTypeName,
  getMemorizationTypeColor,
  formatMemorizationRange,
  formatScore,
  formatTajweedErrors,
  quranSurahs,
  getSurahName
} from '../types/memorization-record';
import { Profile } from '../types/profile';
import { StudyCircle } from '../types/study-circle';
import { Table2, LayoutGrid, Plus, Pencil, Trash2, SaveIcon, NotebookPenIcon, RefreshCwIcon, List, Filter, ArrowDownAZ, ArrowUpZA, ArrowDownUp, ChevronRight } from 'lucide-react';
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
import { User, BookOpen, Music, GraduationCap, ChevronDown, Search } from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import { GenericTable } from '@/components/ui/generic-table';

interface MemorizationRecordsProps {
  onNavigate: (path: string) => void;
  currentUser: Profile;
}

const MemorizationRecords: React.FC<MemorizationRecordsProps> = ({ onNavigate, currentUser: propCurrentUser }) => {
  const [records, setRecords] = useState<MemorizationRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MemorizationRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<{
    id: string;
    full_name: string;
    display_name?: string;
    role?: 'teacher' | 'admin' | 'superadmin' | string;
  }[]>([]);
  const [studyCircles, setStudyCircles] = useState<StudyCircle[]>([]);
  // Multi-student selection: empty array => all students
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const isAllStudentsSelected = selectedStudentIds.length === 0;
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };
  const clearStudentSelection = () => setSelectedStudentIds([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all-teachers');
  const [selectedCircleId, setSelectedCircleId] = useState<string>('all-circles');
  const [recordToEdit, setRecordToEdit] = useState<MemorizationRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(propCurrentUser);
  const [activeTab, setActiveTab] = useState(propCurrentUser?.role === 'teacher' ? 'my-records' : 'all-records');
  const [tableExists, setTableExists] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0); // Add refresh trigger
  // اتجاه الترتيب الخارجي للجدول الرئيسي
  const [listSortDirection, setListSortDirection] = useState<'asc' | 'desc' | null>(null);
  // اظهار/اخفاء فلاتر البحث
  const [showFilters, setShowFilters] = useState<boolean>(false);
  // طي/فتح الكارد الرئيسي
  const [mainMemCardCollapsed, setMainMemCardCollapsed] = useState(false);
  // قوائم منسدلة مخصصة (بديلة عن Select) لنمط الستايل المطلوب
  // Dialog pickers (بدلاً من القوائم المنسدلة المطلوبة الآن)

  const [isTeacherPickerOpen, setIsTeacherPickerOpen] = useState(false);
  const [isCirclePickerOpen, setIsCirclePickerOpen] = useState(false);
  const [teacherSearchTerm, setteacherSearchTerm] = useState('');
  const [circlePickerSearch, setCirclePickerSearch] = useState('');
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // سيتم تعريف الميموز الخاصة بالجداول بعد تعريف visibleTeachers و visibleStudyCircles بالأسفل
  // متغيرات للتحكم في النموذج
  const [formSelectedTeacherId, setFormSelectedTeacherId] = useState<string>('');
  const [formSelectedCircleId, setFormSelectedCircleId] = useState<string>('');
  const [formFilteredCircles, setFormFilteredCircles] = useState<StudyCircle[]>([]);
  const [formFilteredStudents, setFormFilteredStudents] = useState<any[]>([]);
  // متغيرات مربع حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  // حوار عرض جميع سجلات الطالب
  const [isStudentRecordsDialogOpen, setIsStudentRecordsDialogOpen] = useState(false);
  const [selectedStudentAllRecords, setSelectedStudentAllRecords] = useState<MemorizationRecord[] | null>(null);
  // NOTE: تم نقل الترقيم (Pagination) إلى المكون العام GenericTable لإعادة الاستخدام عبر النظام.

  const { toast } = useToast();

  // اشتقاقات مساعدة للستايل الجديد
  const userRole = currentUser?.role;
  const selectedTeacher = useMemo(() => {
    if (selectedTeacherId === 'all-teachers') return null;
    return teachers.find(t => t.id === selectedTeacherId) || null;
  }, [selectedTeacherId, teachers]);
  const teacherStudyCircles = useMemo(() => {
    if (userRole === 'teacher') {
      return studyCircles.filter(c => c.teacher_id === currentUser?.id);
    }
    if (selectedTeacherId !== 'all-teachers') {
      return studyCircles.filter(c => c.teacher_id === selectedTeacherId);
    }
    return studyCircles;
  }, [studyCircles, userRole, currentUser, selectedTeacherId]);
  const selectedCircle = useMemo(() => {
    if (!selectedCircleId || selectedCircleId === 'all-circles') return null;
    return studyCircles.find(c => c.id === selectedCircleId) || null;
  }, [selectedCircleId, studyCircles]);

  // بيانات النموذج
  const [formData, setFormData] = useState<MemorizationRecordCreate & { circle_id?: string }>({
    student_id: '',
    date: new Date().toISOString().split('T')[0],
    type: 'new',
    from_surah: 1,
    from_ayah: 1,
    to_surah: 1,
    to_ayah: 1,
    score: undefined,
    tajweed_errors: undefined,
    notes: '',
    recorded_by: '',
    circle_id: ''
  });

  // التحقق من بيانات النموذج
  const [formErrors, setFormErrors] = useState<{
    student_id?: string;
    recorded_by?: string;
    date?: string;
    type?: string;
    from_surah?: string;
    from_ayah?: string;
    to_surah?: string;
    to_ayah?: string;
    score?: string;
  }>({});

  // جلب البيانات عند تحميل الصفحة
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // اختبار الاتصال بالجدول أولاً
        const connectionTest = await memorizationRecordService.testConnection();
        if (!connectionTest) {
          setTableExists(false);
          toast({
            title: 'جدول سجلات الحفظ غير موجود',
            description: 'يرجى تنفيذ سكريبت إنشاء الجدول أولاً (create_memorization_table.sql)',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const user = propCurrentUser;
        console.log('MemorizationRecords - Current User:', user);
        setCurrentUser(user);

        // التحقق مما إذا كان هناك معرف حلقة في URL
        const urlParams = new URLSearchParams(window.location.search);
        const circleId = urlParams.get('circle');
        if (circleId) {
          setSelectedCircleId(circleId);
        }

        // تحضير البيانات للنموذج
        setFormFilteredCircles([]);
        setFormFilteredStudents([]);

        // جلب البيانات حسب دور المستخدم
        if (user && user.role === 'teacher') {
          console.log('Loading data for teacher role');
          // المعلم يرى فقط طلابه
          const studentsData = await getStudentsByTeacherId(user.id);
          setStudents(studentsData);

          // جلب حلقات المعلم
          const circlesData = await getTeacherStudyCircles(user.id);

          // إضافة عدد الطلاب إلى كل حلقة
          const circlesWithStudentCounts = circlesData.map(circle => {
            const studentsInCircle = studentsData.filter(student =>
              student.study_circle_id === circle.id ||
              (student.study_circle && student.study_circle.id === circle.id)
            );
            return {
              ...circle,
              students_count: studentsInCircle.length
            };
          });

          setStudyCircles(circlesWithStudentCounts);

          // جلب سجلات الحفظ للمعلم
          const recordsData = await memorizationRecordService.getMemorizationRecordsByTeacher(user.id);
          setRecords(recordsData);
          setFilteredRecords(recordsData);
          setActiveTab('my-records');
        } else {
          console.log('Loading data for admin/superadmin role');
          // المدير والمشرف يرون جميع الطلاب وجميع المعلمين
          const studentsData = await getAllStudents();
          // الحفاظ على جميع بيانات الطالب بما في ذلك ولي الأمر والحلقة
          setStudents(studentsData);

          // جلب قائمة المعلمين
          const teachersData = await getAllTeachers();
          console.log('قائمة المعلمين المسترجعة (admin/superadmin):', teachersData);

          if (!teachersData || teachersData.length === 0) {
            console.warn('لا توجد بيانات معلمين مسترجعة!');
            // محاولة إضافة المستخدم الحالي إلى قائمة المعلمين إذا كان مديرًا
            if (user && (user.role === 'admin' || user.role === 'teacher')) {
              console.log('إضافة المستخدم الحالي (مدير) إلى قائمة المعلمين:', user);
              setTeachers([{
                id: user.id,
                full_name: user.full_name || 'المستخدم الحالي',
                display_name: user.full_name || 'المستخدم الحالي',
                role: user.role
              }]);
            } else {
              setTeachers([]);
            }
          } else {
            setTeachers(teachersData);
          }

          // جلب قائمة الحلقات
          const circlesData = await getAllStudyCircles();

          // إضافة عدد الطلاب إلى كل حلقة
          const circlesWithStudentCounts = circlesData.map(circle => {
            const studentsInCircle = studentsData.filter(student =>
              student.study_circle_id === circle.id ||
              (student.study_circle && student.study_circle.id === circle.id)
            );
            return {
              ...circle,
              students_count: studentsInCircle.length
            };
          });

          setStudyCircles(circlesWithStudentCounts);

          // جلب جميع سجلات الحفظ
          const recordsData = await memorizationRecordService.getAllMemorizationRecords();
          setRecords(recordsData);
          setFilteredRecords(recordsData);
          setActiveTab('all-records');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء تحميل البيانات',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, refreshTrigger]);

  // تصفية الطلاب عند تغيير الحلقة (تحديث قائمة الطلاب المختارين وإزالة غير المتوافق)
  useEffect(() => {
    if (selectedCircleId && selectedCircleId !== 'all-circles' && selectedStudentIds.length > 0) {
      const studentsInCircleIds = students
        .filter(student => student.study_circle_id === selectedCircleId || (student.study_circle && student.study_circle.id === selectedCircleId))
        .map(s => s.id);
      const remaining = selectedStudentIds.filter(id => studentsInCircleIds.includes(id));
      if (remaining.length !== selectedStudentIds.length) {
        setSelectedStudentIds(remaining);
      }
    }
  }, [selectedCircleId, students, selectedStudentIds]);

  // تصفية السجلات عند تغيير المعايير
  useEffect(() => {
    console.log('Filtering criteria changed, updating filtered records');
    console.log('Records to filter:', records.length);
    console.log('Filter criteria:', {
      circleId: selectedCircleId,
      studentIds: selectedStudentIds,
      teacherId: selectedTeacherId,
      type: filterType,
      searchQuery: searchQuery ? searchQuery.substring(0, 20) + '...' : '',
      activeTab
    });

    let result = [...records];

    // تصفية حسب الحلقة
    if (selectedCircleId && selectedCircleId !== 'all-circles') {
      // استخدام مصفوفة الطلاب التي تحتوي على معلومات الحلقة
      const studentsInCircle = students
        .filter(student => (student.study_circle && student.study_circle.id === selectedCircleId))
        .map(student => student.id);

      if (studentsInCircle.length > 0) {
        result = result.filter(record => studentsInCircle.includes(record.student_id));
      }
    }

    // تصفية حسب الطلاب المختارين (متعدد)
    if (selectedStudentIds.length > 0) {
      result = result.filter(record => selectedStudentIds.includes(record.student_id));
    }

    // تصفية حسب المعلم
    if (selectedTeacherId && selectedTeacherId !== 'all-teachers') {
      result = result.filter(record => record.recorder?.id === selectedTeacherId);
    }

    // تصفية حسب النوع
    if (filterType !== 'all') {
      result = result.filter(record => record.type === filterType);
    }

    // تصفية حسب البحث
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(record =>
        record.student?.full_name?.toLowerCase().includes(query) ||
        (record.student?.guardian?.full_name?.toLowerCase().includes(query)) ||
        formatMemorizationRange(record).toLowerCase().includes(query) ||
        record.notes?.toLowerCase().includes(query)
      );
    }

    // تصفية حسب علامة التبويب النشطة
    if (activeTab === 'my-records' && currentUser) {
      result = result.filter(record => record.recorded_by === currentUser.id);
    }

    console.log(`Filtered to ${result.length} records`);
    setFilteredRecords(result);
  }, [records, selectedStudentIds, selectedTeacherId, selectedCircleId, filterType, searchQuery, activeTab, currentUser, students]);

  // استعادة بيانات سورة من القرآن
  const handleSurahChange = (field: 'from_surah' | 'to_surah', value: number) => {
    const surah = quranSurahs.find(s => s.number === value);
    if (surah) {
      if (field === 'from_surah') {
        setFormData(prev => ({
          ...prev,
          [field]: value,
          from_ayah: prev.from_ayah > surah.ayahs ? 1 : prev.from_ayah
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [field]: value,
          to_ayah: prev.to_ayah > surah.ayahs ? 1 : prev.to_ayah
        }));
      }
    }
  };

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const errors: any = {};

    if (!formData.student_id) {
      errors.student_id = 'يجب اختيار الطالب';
    }

    if (!formData.recorded_by) {
      errors.recorded_by = 'يجب تحديد المعلم/المشرف';
    }

    if (formData.from_surah > formData.to_surah) {
      errors.from_surah = 'يجب أن تكون سورة البداية قبل سورة النهاية';
    }

    if (formData.from_surah === formData.to_surah && formData.from_ayah > formData.to_ayah) {
      errors.from_ayah = 'يجب أن تكون آية البداية قبل آية النهاية';
    }

    const fromSurah = quranSurahs.find(s => s.number === formData.from_surah);
    if (fromSurah && (formData.from_ayah < 1 || formData.from_ayah > fromSurah.ayahs)) {
      errors.from_ayah = `رقم الآية يجب أن يكون بين 1 و ${fromSurah.ayahs}`;
    }

    const toSurah = quranSurahs.find(s => s.number === formData.to_surah);
    if (toSurah && (formData.to_ayah < 1 || formData.to_ayah > toSurah.ayahs)) {
      errors.to_ayah = `رقم الآية يجب أن يكون بين 1 و ${toSurah.ayahs}`;
    }

    if (formData.score !== undefined && (formData.score < 0 || formData.score > 100)) {
      errors.score = 'الدرجة يجب أن تكون بين 0 و 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // حفظ السجل (إنشاء أو تحديث)
  const handleSaveRecord = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // إضافة معرف المستخدم الحالي إذا لم يكن موجودا
      const dataToSave: MemorizationRecordCreate = {
        ...formData,
        recorded_by: formData.recorded_by || (currentUser ? currentUser.id : undefined)
      };

      // Remove circle_id as it's not part of the memorization_records table
      if ('circle_id' in dataToSave) {
        delete (dataToSave as any).circle_id;
      }

      let savedRecord: MemorizationRecord;

      if (recordToEdit) {
        // تحديث سجل موجود
        const updateData: MemorizationRecordUpdate = {
          id: recordToEdit.id,
          ...dataToSave
        };
        console.log('Updating record with data:', updateData);
        savedRecord = await memorizationRecordService.updateMemorizationRecord(updateData);
        console.log('Update response from service:', savedRecord);
        toast({
          title: 'تم التحديث',
          description: 'تم تحديث سجل الحفظ بنجاح',
        });
      } else {
        // إنشاء سجل جديد
        console.log('Creating new record with data:', dataToSave);
        savedRecord = await memorizationRecordService.createMemorizationRecord(dataToSave);
        console.log('Create response from service:', savedRecord);
        toast({
          title: 'تم الإضافة',
          description: 'تم إضافة سجل الحفظ بنجاح',
        });
      }

      // تحديث قائمة السجلات وإعادة تطبيق المرشح
      console.log('Updating records state with saved record:', savedRecord);

      // عمل نسخة جديدة من القائمة مع التغييرات
      const updatedRecords = recordToEdit
        ? records.map(r => r.id === savedRecord.id ? { ...savedRecord } : r)
        : [{ ...savedRecord }, ...records];

      console.log('Setting new records state with length:', updatedRecords.length);
      setRecords(updatedRecords);

      // ضمان تحديث المرشح مباشرة بدلاً من انتظار useEffect
      // تصفية السجلات باستخدام نفس المعايير المستخدمة في useEffect
      let filteredResult = [...updatedRecords];

      // تطبيق نفس منطق التصفية هنا كما في useEffect
      if (selectedCircleId && selectedCircleId !== 'all-circles') {
        const studentsInCircle = students
          .filter(student => (student.study_circle && student.study_circle.id === selectedCircleId))
          .map(student => student.id);

        if (studentsInCircle.length > 0) {
          filteredResult = filteredResult.filter(record => studentsInCircle.includes(record.student_id));
        }
      }

      if (selectedStudentIds.length > 0) {
        filteredResult = filteredResult.filter(record => selectedStudentIds.includes(record.student_id));
      }

      if (selectedTeacherId && selectedTeacherId !== 'all-teachers') {
        filteredResult = filteredResult.filter(record => record.recorder?.id === selectedTeacherId);
      }

      if (filterType !== 'all') {
        filteredResult = filteredResult.filter(record => record.type === filterType);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredResult = filteredResult.filter(record =>
          record.student?.full_name?.toLowerCase().includes(query) ||
          (record.student?.guardian?.full_name?.toLowerCase().includes(query)) ||
          formatMemorizationRange(record).toLowerCase().includes(query) ||
          record.notes?.toLowerCase().includes(query)
        );
      }

      if (activeTab === 'my-records' && currentUser) {
        filteredResult = filteredResult.filter(record => record.recorded_by === currentUser.id);
      }

      setFilteredRecords(filteredResult);

      // إغلاق الحوار وإعادة تعيين النموذج
      setIsDialogOpen(false);
      resetForm();

      // تحديث إلزامي للتأكد من تزامن واجهة المستخدم
      console.log('Scheduling forced refresh after operation');
      setTimeout(() => {
        refreshData();
      }, 300);
    } catch (error) {
      console.error('Error saving record:', error);
      let errorMessage = 'حدث خطأ أثناء حفظ السجل';

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // حذف سجل
  const handleDeleteRecord = async (id: number) => {
    // فتح مربع حوار تأكيد الحذف
    setRecordToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  // تنفيذ عملية الحذف بعد التأكيد
  const executeDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setIsLoading(true);
      console.log(`Deleting record with ID: ${recordToDelete}`);
      await memorizationRecordService.deleteMemorizationRecord(recordToDelete);

      // تحديث قائمة السجلات
      console.log('Updating records state after deletion');
      const updatedRecords = records.filter(r => r.id !== recordToDelete);
      setRecords(updatedRecords);

      // تحديث القائمة المفلترة مباشرة
      setFilteredRecords(prev => prev.filter(r => r.id !== recordToDelete));

      toast({
        title: 'تم الحذف',
        description: 'تم حذف سجل الحفظ بنجاح',
      });

      // تحديث إلزامي للتأكد من تزامن واجهة المستخدم
      console.log('Scheduling forced refresh after deletion');
      setTimeout(() => {
        refreshData();
      }, 300);
    } catch (error) {
      console.error('Error deleting record:', error);
      let errorMessage = 'حدث خطأ أثناء حذف السجل';

      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // إعادة تحميل البيانات بالكامل
  const refreshData = async () => {
    console.log('Manual refresh of all data requested');
    setIsLoading(true);

    try {
      // إعادة تحميل السجلات
      let recordsData;
      if (currentUser && currentUser.role === 'teacher') {
        console.log('Reloading teacher-specific records');
        recordsData = await memorizationRecordService.getMemorizationRecordsByTeacher(currentUser.id);
      } else {
        console.log('Reloading all records');
        recordsData = await memorizationRecordService.getAllMemorizationRecords();
      }

      console.log(`Loaded ${recordsData.length} records during refresh`);
      setRecords(recordsData);

      // إعادة تطبيق التصفية
      let result = [...recordsData];

      // تطبيق نفس التصفية المستخدمة في useEffect
      if (selectedCircleId && selectedCircleId !== 'all-circles') {
        const studentsInCircle = students
          .filter(student => (student.study_circle && student.study_circle.id === selectedCircleId))
          .map(student => student.id);

        if (studentsInCircle.length > 0) {
          result = result.filter(record => studentsInCircle.includes(record.student_id));
        }
      }

      if (selectedStudentIds.length > 0) {
        result = result.filter(record => selectedStudentIds.includes(record.student_id));
      }

      if (selectedTeacherId && selectedTeacherId !== 'all-teachers') {
        result = result.filter(record => record.recorder?.id === selectedTeacherId);
      }

      if (filterType !== 'all') {
        result = result.filter(record => record.type === filterType);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(record =>
          record.student?.full_name?.toLowerCase().includes(query) ||
          (record.student?.guardian?.full_name?.toLowerCase().includes(query)) ||
          formatMemorizationRange(record).toLowerCase().includes(query) ||
          record.notes?.toLowerCase().includes(query)
        );
      }

      if (activeTab === 'my-records' && currentUser) {
        result = result.filter(record => record.recorded_by === currentUser.id);
      }

      console.log(`Filtered to ${result.length} records after refresh`);
      setFilteredRecords(result);
    } catch (error) {
      console.error('Error during refresh:', error);
      toast({
        title: 'خطأ في التحديث',
        description: 'حدث خطأ أثناء تحديث البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // تحرير سجل موجود
  const handleEditRecord = (record: MemorizationRecord) => {
    setRecordToEdit(record);

    // تعيين بيانات النموذج من السجل
    setFormData({
      student_id: record.student_id,
      date: record.date,
      type: record.type,
      from_surah: record.from_surah,
      from_ayah: record.from_ayah,
      to_surah: record.to_surah,
      to_ayah: record.to_ayah,
      score: record.score,
      tajweed_errors: record.tajweed_errors,
      notes: record.notes || '',
      recorded_by: record.recorded_by,
      circle_id: record.student?.study_circle ? record.student.study_circle.id : ''
    });

    // تحضير قوائم الفلترة للنموذج
    setFormSelectedTeacherId(record.recorded_by);

    // تحديد المعلم والحلقة والطالب
    if (record.recorded_by) {
      // تصفية الحلقات التي يشرف عليها المعلم المسجل
      const teacherCircles = studyCircles.filter(circle =>
        circle.teacher_id === record.recorded_by ||
        (circle.teacher && circle.teacher.id === record.recorded_by)
      );
      setFormFilteredCircles(teacherCircles);

      // تحديد الحلقة
      const circleId = record.student?.study_circle ? record.student.study_circle.id : '';
      if (circleId) {
        setFormSelectedCircleId(circleId);

        // تصفية الطلاب في الحلقة المحددة
        const circleStudents = students.filter(student =>
          (student.study_circle && student.study_circle.id === circleId)
        );
        setFormFilteredStudents(circleStudents);
      } else {
        // إذا لم يكن هناك حلقة محددة، عرض جميع طلاب المعلم
        const teacherCircleIds = teacherCircles.map(circle => circle.id);
        const teacherStudents = students.filter(student =>
          (student.study_circle && teacherCircleIds.includes(student.study_circle.id))
        );
        setFormFilteredStudents(teacherStudents);
      }
    } else {
      // إذا لم يكن هناك معلم مسجل، عرض جميع الحلقات والطلاب
      setFormFilteredCircles(studyCircles);
      setFormFilteredStudents(students);
    }

    setIsDialogOpen(true);
    setWizardStep(0);
  };

  // إعادة تعيين النموذج
  const resetForm = () => {
    // استعادة الفلاتر الأصلية
    const originalTeacherId = currentUser?.role === 'teacher' ? currentUser.id : 'all-teachers';

    setFormData({
      student_id: '',
      date: new Date().toISOString().split('T')[0],
      type: 'new',
      from_surah: 1,
      from_ayah: 1,
      to_surah: 1,
      to_ayah: 1,
      score: undefined,
      tajweed_errors: undefined,
      notes: '',
      recorded_by: currentUser ? currentUser.id : ''
    });
    setRecordToEdit(null);
    setFormErrors({});
  };

  // فتح نموذج إضافة سجل جديد
  const handleAddNewRecord = () => {
    resetForm();
    setIsDialogOpen(true);

    console.log(`إعداد بيانات النموذج. عدد الحلقات الكلي: ${studyCircles.length}`);

    // تهيئة القوائم للنموذج بجميع البيانات المتاحة أولاً
    setFormFilteredCircles(studyCircles);
    setFormFilteredStudents(students);

    // التعامل مع تغيير المعلم في نافذة الإضافة/التعديل
    const handleTeacherChange = (value: string) => {
      // تحديث قيمة المعلم في نموذج البيانات
      if (value === 'select-teacher') {
        // إذا اختار المستخدم "اختر معلم"، فقم بإعادة تعيين القيمة إلى فارغة
        handleInputChange('recorded_by', '');
        setFormSelectedTeacherId('');

        // إفراغ قائمة الحلقات والطلاب
        setFormFilteredCircles([]);
        setFormFilteredStudents([]);
        setFormData(prev => ({ ...prev, circle_id: '', student_id: '' }));
        return;
      }

      handleInputChange('recorded_by', value);
      setFormSelectedTeacherId(value);

      // تصفية الحلقات التي يشرف عليها المعلم المحدد
      if (value && value !== 'all-teachers') {
        console.log(`تصفية الحلقات للمعلم: ${value}`);
        console.log(`إجمالي الحلقات قبل التصفية: ${studyCircles.length}`);

        const teacherCircles = studyCircles.filter(circle => {
          const matches = circle.teacher_id === value || (circle.teacher && circle.teacher.id === value);
          if (matches) {
            console.log(`حلقة متطابقة: ${circle.name || circle.id}`);
          }
          return matches;
        });

        console.log(`عدد الحلقات بعد التصفية: ${teacherCircles.length}`);

        // إذا لم يتم العثور على حلقات، استخدم جميع الحلقات
        if (teacherCircles.length === 0) {
          console.log('لم يتم العثور على حلقات للمعلم، عرض جميع الحلقات');
          setFormFilteredCircles(studyCircles);
        } else {
          setFormFilteredCircles(teacherCircles);
        }

        // إعادة ضبط اختيار الحلقة والطالب
        setFormSelectedCircleId('');
        setFormData(prev => ({ ...prev, circle_id: '', student_id: '' }));
        setFormFilteredStudents([]);
      } else {
        // إذا لم يتم تحديد معلم، عرض جميع الحلقات
        console.log('لم يتم تحديد معلم، عرض جميع الحلقات');
        setFormFilteredCircles(studyCircles);
        setFormFilteredStudents(students);
      }
    };

    // إذا كان المستخدم معلمًا، حدد المعلم تلقائيًا
    if (currentUser?.role === 'teacher') {
      console.log(`المستخدم معلم، معرف: ${currentUser.id}`);
      setFormSelectedTeacherId(currentUser.id);
      setFormData(prev => ({ ...prev, recorded_by: currentUser.id }));

      // تصفية الحلقات التي يشرف عليها المعلم
      const teacherCircles = studyCircles.filter(circle =>
        circle.teacher_id === currentUser.id ||
        (circle.teacher && circle.teacher.id === currentUser.id)
      );

      setFormFilteredCircles(teacherCircles);

      // إعادة ضبط اختيار الحلقة والطالب
      setFormSelectedCircleId('');
      setFormData(prev => ({ ...prev, circle_id: '', student_id: '' }));
      setFormFilteredStudents([]);
    } else {
      // إذا لم يتم تحديد معلم، عرض جميع الحلقات
      setFormFilteredCircles(studyCircles);
      setFormFilteredStudents(students);
    }
  };

  // التعامل مع تغيير الحلقة في نافذة الإضافة/التعديل
  const handleCircleChange = (value: string) => {
    setFormSelectedCircleId(value);
    setFormData(prev => ({ ...prev, circle_id: value }));

    // تصفية الطلاب في الحلقة المحددة
    if (value && value !== 'all-circles') {
      const circleStudents = students.filter(student =>
        (student.study_circle && student.study_circle.id === value)
      );
      setFormFilteredStudents(circleStudents);

      // إعادة ضبط اختيار الطالب
      setFormData(prev => ({ ...prev, student_id: '' }));
    } else if (formSelectedTeacherId && formSelectedTeacherId !== 'all-teachers') {
      // إذا تم إعادة ضبط الحلقة ولكن تم اختيار معلم، عرض جميع طلاب المعلم
      const teacherCircleIds = formFilteredCircles.map(circle => circle.id);
      const teacherStudents = students.filter(student =>
        (student.study_circle && teacherCircleIds.includes(student.study_circle.id))
      );
      setFormFilteredStudents(teacherStudents);
      setFormData(prev => ({ ...prev, student_id: '' }));
    } else {
      // إذا لم يتم تحديد حلقة أو معلم، عرض جميع الطلاب
      setFormFilteredStudents(students);
      setFormData(prev => ({ ...prev, student_id: '' }));
    }
  };

  // معالجة تغيير قيم النموذج
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // إزالة خطأ الحقل عند التعديل لتحسين تجربة المستخدم
    setFormErrors(prev => {
      const next = { ...prev } as any;
      if (field in next) delete next[field as keyof typeof next];
      // معالجة خاصة لحقول الآيات المرتبطة
      if (field === 'from_ayah' && next.to_ayah) delete next.to_ayah;
      if (field === 'to_ayah' && next.from_ayah) delete next.from_ayah;
      return next;
    });
  };

  // حالة المعالج (Wizard) متعدد الخطوات
  const [wizardStep, setWizardStep] = useState<number>(0); // 0: الطالب، 1: الحفظ، 2: التسميع
  const wizardSteps = [
    { key: 'student', label: 'الطالب' },
    { key: 'memorization', label: 'الحفظ' },
    { key: 'recitation', label: 'التسميع' },
  ] as const;

  // تحقق خاص بكل خطوة قبل الانتقال
  const validateWizardStep = (step: number): boolean => {
    const errors: any = {};

    if (step === 0) {
      if (!formData.recorded_by) {
        errors.recorded_by = 'الرجاء اختيار المعلم';
      }
      if (!formData.student_id) {
        errors.student_id = 'الرجاء اختيار الطالب';
      }
    }

    if (step === 1) {
      if (!formData.date) {
        errors.date = 'الرجاء اختيار التاريخ';
      }
      if (!formData.type) {
        errors.type = 'الرجاء اختيار النوع';
      }
      if (!formData.from_surah) {
        errors.from_surah = 'الرجاء اختيار السورة';
      }
      if (!formData.to_surah) {
        errors.to_surah = 'الرجاء اختيار السورة';
      }
      if (formData.from_surah && formData.to_surah && formData.from_surah > formData.to_surah) {
        errors.to_surah = 'لا بد أن تكون السورة الأخيرة بعد الأولى';
      }
      if (!formData.from_ayah || formData.from_ayah < 1) {
        errors.from_ayah = 'أدخل رقم آية صحيح';
      }
      if (!formData.to_ayah || formData.to_ayah < 1) {
        errors.to_ayah = 'أدخل رقم آية صحيح';
      }
      if (
        formData.from_surah === formData.to_surah &&
        formData.from_ayah && formData.to_ayah &&
        formData.from_ayah > formData.to_ayah
      ) {
        errors.to_ayah = 'لا بد أن تكون آية النهاية بعد البداية';
      }
    }

    setFormErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateWizardStep(wizardStep)) return;
    setWizardStep((s) => Math.min(s + 1, wizardSteps.length - 1));
  };

  const goBack = () => setWizardStep((s) => Math.max(s - 1, 0));

  // معالجة تغيير أخطاء التجويد
  const handleTajweedErrorChange = (errorType: 'lahn_jali' | 'lahn_khafi', value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setFormData(prev => ({
      ...prev,
      tajweed_errors: {
        ...prev.tajweed_errors,
        [errorType]: numValue
      }
    }));
  };

  // تحديد المعلمين المرئيين حسب دور المستخدم
  const visibleTeachers = useMemo(() => {
    if (!teachers || teachers.length === 0) {
      console.log("لا يوجد معلمين في القائمة!");
      return [];
    }

    console.log("عدد المعلمين المتاحين قبل التصفية:", teachers.length);
    console.log("المعلمون المتاحون:", teachers.map(t => ({ id: t.id, name: t.full_name, role: t.role })));

    // تصفية المعلمين حسب دور المستخدم
    let filteredTeachers = [];
    if (currentUser?.role === 'teacher') {
      // المعلم يرى نفسه فقط
      filteredTeachers = teachers.filter(t => t.id === currentUser.id);
      console.log("معلم: يظهر فقط نفسه", filteredTeachers.map(t => ({ id: t.id, name: t.full_name, role: t.role })));
    } else if (currentUser?.role === 'admin' || currentUser?.role === 'superadmin') {
      // المشرف/المدير يرى جميع المعلمين والمشرفين
      filteredTeachers = teachers;
      console.log("مشرف/مدير: يظهر جميع المعلمين والمشرفين", filteredTeachers.map(t => ({ id: t.id, name: t.full_name, role: t.role })));
    }

    console.log("عدد المعلمين بعد التصفية:", filteredTeachers.length);
    return filteredTeachers;
  }, [teachers, currentUser]);

  // تصفية الحلقات حسب المعلم المحدد
  const visibleStudyCircles = useMemo(() => {
    // إذا لم يتم اختيار معلم محدد، أعرض جميع الحلقات
    if (selectedTeacherId === 'all-teachers') {
      return studyCircles;
    }

    // تصفية الحلقات التي يشرف عليها المعلم المحدد
    return studyCircles.filter(circle =>
      circle.teacher_id === selectedTeacherId ||
      (circle.teacher && circle.teacher.id === selectedTeacherId)
    );
  }, [studyCircles, selectedTeacherId]);

  // تصفية الطلاب حسب المعلم والحلقة المحددة
  const visibleStudents = useMemo(() => {
    // إذا لم يتم تحميل بيانات الطلاب بعد
    if (!students || students.length === 0) {
      return [];
    }

    let filteredStudents = [...students];

    // تصفية حسب المعلم المحدد
    if (selectedTeacherId !== 'all-teachers') {
      // الطلاب الذين ينتمون إلى حلقات المعلم المحدد
      const teacherCircleIds = visibleStudyCircles.map(circle => circle.id);

      filteredStudents = filteredStudents.filter(student =>
        // الطالب موجود في إحدى حلقات المعلم
        (student.study_circle_id && teacherCircleIds.includes(student.study_circle_id)) ||
        (student.study_circle && teacherCircleIds.includes(student.study_circle.id))
      );
    }

    // تصفية حسب الحلقة المحددة
    if (selectedCircleId !== 'all-circles') {
      filteredStudents = filteredStudents.filter(student =>
        student.study_circle_id === selectedCircleId ||
        (student.study_circle && student.study_circle.id === selectedCircleId)
      );
    }

    // تصفية حسب البحث (اسم الطالب أو اسم ولي الأمر)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredStudents = filteredStudents.filter(student =>
        student.full_name?.toLowerCase().includes(query) ||
        (student.guardian && student.guardian.full_name?.toLowerCase().includes(query))
      );
    }

    return filteredStudents;
  }, [students, selectedTeacherId, selectedCircleId, visibleStudyCircles, searchQuery]);

  // ===== ميموز حوارات الاختيار (تعتمد على visibleTeachers و visibleStudyCircles) =====
  const filteredTeachersForPicker = useMemo(() => {
    const term = teacherSearchTerm.trim();
    let list = visibleTeachers;
    if (term) list = list.filter(t => (t.full_name || '').includes(term));
    return list.map((t, idx) => ({ ...t, row_index: idx + 1 }));
  }, [teacherSearchTerm, visibleTeachers]);

  const teacherCirclesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    studyCircles.forEach(c => {
      if (c.teacher_id) map[c.teacher_id] = (map[c.teacher_id] || 0) + 1;
    });
    return map;
  }, [studyCircles]);

  const filteredCirclesForPicker = useMemo(() => {
    const term = circlePickerSearch.trim();
    let list = visibleStudyCircles;
    if (term) list = list.filter(c => (c.name || '').includes(term));
    return list.map((c, idx) => ({ ...c, row_index: idx + 1 }));
  }, [circlePickerSearch, visibleStudyCircles]);

  const circleStudentsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    students.forEach(s => {
      if (s.study_circle_id) map[s.study_circle_id] = (map[s.study_circle_id] || 0) + 1;
    });
    return map;
  }, [students]);

  // طلاب للحوار
  const filteredStudentsForPicker = useMemo(() => {
    const term = studentSearchTerm.trim().toLowerCase();
    let list = visibleStudents;
    if (term) {
      list = list.filter(st => (st.full_name || '').toLowerCase().includes(term) || (st.guardian?.full_name || '').toLowerCase().includes(term));
    }
    return list.map((s, idx) => ({ ...s, row_index: idx + 1 }));
  }, [studentSearchTerm, visibleStudents]);

  // خريطة سجلات الطلاب (حسب الطالب) بعد تطبيق كل الفلاتر الحالية
  const studentRecordsMap = useMemo(() => {
    const map: Record<string, MemorizationRecord[]> = {};
    filteredRecords.forEach(r => {
      if (!r.student_id) return;
      if (!map[r.student_id]) map[r.student_id] = [];
      map[r.student_id].push(r);
    });
    // ترتيب سجلات كل طالب تنازلياً حسب التاريخ (الأحدث أولاً)
    Object.values(map).forEach(arr => arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return map;
  }, [filteredRecords]);

  // السجل الأحدث لكل طالب ليتم عرضه في الجدول الرئيسي
  const latestStudentRecords: MemorizationRecord[] = useMemo(() => {
    const base = Object.values(studentRecordsMap).map(arr => arr[0]);
    if (!listSortDirection) return base;
    // نرتب حسب اسم الطالب (student.full_name) أبجدياً
    return [...base].sort((a, b) => {
      const aName = a.student?.full_name || '';
      const bName = b.student?.full_name || '';
      if (listSortDirection === 'asc') return aName.localeCompare(bName, 'ar');
      return bName.localeCompare(aName, 'ar');
    });
  }, [studentRecordsMap, listSortDirection]);

  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

  // لم نعد نستخدم الترقيم المحلي هنا؛ GenericTable سيتولى التقطيع (slicing) داخلياً.

  // فتح حوار عرض جميع السجلات لطالب معين
  const openStudentRecordsDialog = (studentId: string) => {
    const all = studentRecordsMap[studentId] || [];
    setSelectedStudentAllRecords(all);
    setIsStudentRecordsDialogOpen(true);
  };

  const handleTeacherChange = (value: string) => {
    // Handle "select-teacher" option (reset case)
    if (value === 'select-teacher') {
      handleInputChange('recorded_by', '');
      setFormSelectedTeacherId('');

      // Reset circle and student selections
      setFormFilteredCircles([]);
      setFormFilteredStudents([]);
      setFormData(prev => ({ ...prev, circle_id: '', student_id: '' }));
      return;
    }

    // Update the form data with the selected teacher
    handleInputChange('recorded_by', value);
    setFormSelectedTeacherId(value);

    // Filter study circles for the selected teacher
    if (value && value !== 'all-teachers') {
      console.log(`Filtering circles for teacher: ${value}`);

      const teacherCircles = studyCircles.filter(circle =>
        circle.teacher_id === value || (circle.teacher && circle.teacher.id === value)
      );

      console.log(`Found ${teacherCircles.length} circles for the selected teacher`);

      if (teacherCircles.length === 0) {
        console.log('No circles found for teacher, showing all circles');
        setFormFilteredCircles(studyCircles);
      } else {
        setFormFilteredCircles(teacherCircles);
      }

      // Reset circle and student selections
      setFormSelectedCircleId('');
      setFormData(prev => ({ ...prev, circle_id: '', student_id: '' }));
      setFormFilteredStudents([]);
    } else {
      // If no specific teacher is selected, show all circles and students
      setFormFilteredCircles(studyCircles);
      setFormFilteredStudents(students);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-row justify-between items-center gap-2 w-full">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <NotebookPenIcon className="h-4 w-4 text-yellow-300" />
                سجلات الحفظ والمراجعة
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-0.5 hidden sm:block">
                إدارة سجلات حفظ ومراجعة الطلاب، مع إمكانية إضافة وتعديل السجلات الحالية.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={() => setMainMemCardCollapsed(v => !v)}
              aria-label={mainMemCardCollapsed ? 'فتح المحتوى' : 'طي المحتوى'}
              aria-expanded={!mainMemCardCollapsed}
              aria-controls="main-memorization-card-body"
              className={`inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/30 text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 ${mainMemCardCollapsed ? 'rotate-180' : ''}`}
              title={mainMemCardCollapsed ? 'عرض المحتوى' : 'إخفاء المحتوى'}
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent
          id="main-memorization-card-body"
          className={`pt-0.5 pb-0 px-0 sm:px-0 transition-all duration-300 ease-in-out origin-top ${mainMemCardCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[3000px] opacity-100'}`}
          aria-hidden={mainMemCardCollapsed}
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-1 rounded-lg
            bg-white dark:bg-gray-900 p-2 shadow-sm border border-green-200 dark:border-green-700">
            {/* التابات */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-[380px] bg-green-50 rounded-lg shadow-inner p-0.5"
            >
              <TabsList className="grid w-full grid-cols-2 gap-0.5 rounded-lg bg-white dark:bg-gray-900 shadow-sm ring-1 ring-green-300">
                {/* Tab جميع السجلات */}
                <TabsTrigger
                  value="all-records"
                  className="
                              flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium
                              rounded-md text-green-800 py-1.5 px-2
                              hover:bg-green-100 hover:text-green-900
                              data-[state=active]:bg-islamic-green
                              data-[state=active]:text-white
                              transition-all duration-200
                "
                  title='جميع السجلات'
                >
                  📋 <span className="hidden sm:inline">جميع السجلات</span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-records"
                  className="
                            flex items-center justify-center gap-2 text-center text-xs sm:text-sm font-medium
                            rounded-md text-green-800 py-1.5 px-2
                            hover:bg-green-100 hover:text-green-900
                            data-[state=active]:bg-islamic-green
                            data-[state=active]:text-white
                            transition-all duration-200
                "
                  title='سجلاتي فقط'
                >
                  👤 <span className="hidden sm:inline">سجلاتي</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2 items-center">
              {/* زر الفلتر */}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                className={`flex items-center gap-1.5 rounded-2xl 
              ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              dark:bg-green-700 dark:hover:bg-green-600 
              shadow-md hover:scale-105 
              transition-transform duration-200 
              px-3 py-1.5 text-xs font-semibold h-8`}
                onClick={() => setShowFilters(p => !p)}
                title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة'}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">فلتر</span>
              </Button>
              {/* زر الترتيب الخارجي */}
              <Button
                type="button"
                variant={listSortDirection ? 'default' : 'outline'}
                onClick={toggleListSort}
                title={listSortDirection === null ? 'ترتيب تصاعدي حسب اسم الطالب' : listSortDirection === 'asc' ? 'ترتيب تنازلي' : 'إلغاء الترتيب'}
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
                className="flex items-center gap-1.5 rounded-2xl 
              bg-green-600 hover:bg-green-700 
              dark:bg-green-700 dark:hover:bg-green-600 
              text-white shadow-md hover:scale-105 
              transition-transform duration-200 
              px-3 py-1.5 text-xs font-semibold h-8"
                onClick={refreshData}
                title='تحديث البيانات'
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>

              {/* زر إضافة سجل */}
              <Button
                onClick={handleAddNewRecord}
                variant="outline"
                className="flex items-center gap-1.5 rounded-2xl 
              bg-green-600 hover:bg-green-700 
              dark:bg-green-700 dark:hover:bg-green-600 
              text-white shadow-md hover:scale-105 
              transition-transform duration-200 
              px-3 py-1.5 text-xs font-semibold h-8"
                title='إضافة سجل جديد'
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إضافة سجل جديد</span>
              </Button>
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-2 bg-white 
                    dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 
                    rounded-lg animate-fade-in">

              <div className="w-full md:flex-1 min-w-0 md:min-w-[180px]">
                <Input
                  title='🔍 بحث عن طالب أو ولي أمر أو سورة أو ملاحظات...'
                  placeholder="🔍 بحث عن طالب أو ولي أمر أو سورة أو ملاحظات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green focus:border-islamic-green text-sm text-gray-800 dark:text-gray-200 transition-all duration-200"
                />
              </div>
              {/* اختيار المعلم - زر يفتح حوار */}
              <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                {userRole === 'teacher' ? (
                  <div className="relative w-full h-10 px-3 rounded-xl border flex items-center gap-2 bg-gradient-to-br from-white to-green-50/60 dark:from-green-900/40 dark:to-green-900 border-green-400" title="المعلم">
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600"><GraduationCap className="h-4 w-4" /></div>
                    <span className="truncate text-sm text-green-700 font-medium">{currentUser?.full_name || 'المعلم'}</span>
                    <div className="ml-auto flex items-center gap-1"><span className="text-[10px] px-2 py-1 rounded-full bg-green-600 text-white">ثابت</span><span className="text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white" title="عدد الحلقات">{teacherStudyCircles.length}</span></div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTeacherPickerOpen(true)}
                    className={`group relative w-full h-10 px-3 rounded-xl border text-right transition-all duration-200 flex items-center justify-between overflow-hidden
                    ${selectedTeacher ? 'border-green-400 bg-gradient-to-br from-white to-green-50/60 dark:from-green-900/40 dark:to-green-900' : 'border-green-300 dark:border-green-700 bg-white dark:bg-green-950'}
                    hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                    title="اختر معلماً"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600"><GraduationCap className="h-4 w-4" /></div>
                      <span className={`truncate text-sm ${selectedTeacher ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{selectedTeacher ? selectedTeacher.full_name : 'اختر معلماً'}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      {selectedTeacher && (
                        <span onClick={(e) => { e.stopPropagation(); setSelectedTeacherId('all-teachers'); setSelectedCircleId('all-circles'); clearStudentSelection(); }} className="cursor-pointer text-[10px] leading-none px-2 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">ازالة</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="pointer-events-none absolute inset-0 rounded-xl border border-transparent group-hover:border-green-300/60" />
                  </button>
                )}
              </div>

              {/* اختيار الحلقة - زر يفتح حوار */}
              <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                {userRole === 'teacher' && teacherStudyCircles.length === 1 ? (
                  <div className="relative w-full h-10 px-3 rounded-xl border border-green-300 dark:border-green-700 bg-white dark:bg-green-950 flex items-center gap-2">
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600"><BookOpen className="h-4 w-4" /></div>
                    <span className="truncate text-sm text-green-700 font-medium">{teacherStudyCircles[0]?.name || 'حلقة'}</span>
                    <div className="ml-auto flex items-center gap-1"><span className="text-[10px] px-2 py-1 rounded-full bg-green-600 text-white">ثابت</span><span className="text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white" title="عدد الحلقات">1</span></div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={selectedTeacherId === 'all-teachers' && visibleStudyCircles.length === 0}
                    onClick={() => {
                      if (visibleStudyCircles.length === 0) {
                        toast({ title: 'لا توجد حلقات متاحة', description: 'لا توجد حلقات مرتبطة بالمعلم الحالي', variant: 'destructive' });
                        return;
                      }
                      setIsCirclePickerOpen(true);
                    }}
                    className={`group relative w-full h-10 px-3 rounded-xl border text-right transition-all duration-200 flex items-center justify-between overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed
                    ${selectedCircle ? 'border-green-400 bg-gradient-to-br from-white to-green-50/60 dark:from-green-900/40 dark:to-green-900' : 'border-green-300 dark:border-green-700 bg-white dark:bg-green-950'}
                    hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                    title="اختر حلقة"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600"><BookOpen className="h-4 w-4" /></div>
                      <span className={`truncate text-sm ${selectedCircle ? 'text-green-700 font-medium' : 'text-gray-500'}`}>{selectedCircle ? selectedCircle.name : (visibleStudyCircles.length === 0 ? 'لا توجد حلقات' : 'اختر حلقة')}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      {selectedCircle && (
                        <span onClick={(e) => { e.stopPropagation(); setSelectedCircleId('all-circles'); clearStudentSelection(); }} className="cursor-pointer text-[10px] leading-none px-2 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors">ازالة</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="pointer-events-none absolute inset-0 rounded-xl border border-transparent group-hover:border-green-300/60" />
                  </button>
                )}
              </div>

              {/* اختيار الطالب - زر يفتح حوار */}
              <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                <button
                  type="button"
                  disabled={visibleStudents.length === 0}
                  onClick={() => {
                    if (visibleStudents.length === 0) return;
                    setIsStudentPickerOpen(true);
                  }}
                  className={`group relative w-full h-10 px-3 rounded-xl border text-right transition-all duration-200 flex items-center justify-between overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed
                  ${!isAllStudentsSelected ? 'border-green-400 bg-gradient-to-br from-white to-green-50/60 dark:from-green-900/40 dark:to-green-900' : 'border-green-300 dark:border-green-700 bg-white dark:bg-green-950'}
                  hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                  title="اختر طالباً"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600"><User className="h-4 w-4" /></div>
                    <span className={`truncate text-sm ${!isAllStudentsSelected ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                      {isAllStudentsSelected
                        ? (visibleStudents.length === 0 ? 'لا يوجد طلاب' : 'اختر طلاباً / جميع الطلاب')
                        : selectedStudentIds.length === 1
                          ? (visibleStudents.find(s => s.id === selectedStudentIds[0])?.full_name || 'طالب')
                          : `عدد (${selectedStudentIds.length}) طالب`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-1">
                    {!isAllStudentsSelected && (
                      <span
                        onClick={(e) => { e.stopPropagation(); clearStudentSelection(); }}
                        className="cursor-pointer text-[10px] leading-none px-2 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >ازالة</span>
                    )}
                    <ChevronDown className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="pointer-events-none absolute inset-0 rounded-xl border border-transparent group-hover:border-green-300/60" />
                </button>
              </div>

              {/* اختيار النوع */}
              <div className="flex-1 min-w-[160px] flex flex-col gap-1 relative">
                {/* نسخة مُبسطة محسّنة بدون تدرجات مزعجة أو ألوان أرجوانية */}
                <div className="w-full">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger
                      className={`w-full h-10 ps-3 pe-2 rounded-xl border text-right flex items-center gap-2 overflow-hidden text-sm transition-colors
                      ${filterType !== 'all'
                        ? 'border-green-500 bg-green-50/70 dark:bg-green-900/40'
                        : 'border-green-300 dark:border-green-700 bg-white dark:bg-green-950'}
                      hover:bg-green-50 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400`}
                    >
                      {/* أيقونة القسم (يمين) */}
                      <div className="h-7 w-7 shrink-0 rounded-lg bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 text-base">۝</div>
                      {/* النص */}
                      <span className={`truncate flex-1 ${filterType !== 'all' ? 'text-green-700 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {filterType === 'all'
                          ? 'جميع الأنواع'
                          : memorizationTypeOptions.find(o => o.value === filterType)?.label || 'نوع'}
                      </span>
                      {/* السهم (يسار) */}
                    </SelectTrigger>
                    <SelectContent
                      dir="rtl"
                      className="text-sm bg-white dark:bg-green-950 border border-green-200 dark:border-green-700 rounded-lg shadow-lg p-1"
                    >
                      <SelectItem
                        value="all"
                        className="text-right text-[12px] cursor-pointer rounded-md px-2 py-1.5 data-[highlighted]:bg-green-100 data-[highlighted]:text-green-800 focus:bg-green-100 focus:text-green-800 transition-colors"
                      >
                        جميع الأنواع
                      </SelectItem>
                      {memorizationTypeOptions.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-right text-[12px] cursor-pointer rounded-md px-2 py-1.5 data-[highlighted]:bg-green-100 data-[highlighted]:text-green-800 focus:bg-green-100 focus:text-green-800 transition-colors"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>



      {isLoading ? (
        <div className="text-center py-10">جاري التحميل...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gradient-to-br 
        from-green-50 to-blue-50 rounded-xl border border-green-200 shadow-md mt-4">
          <div className="text-center">
            <div className="mb-4">
              <BookOpen className="h-16 w-16 text-green-300 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-green-800 mb-2">
              لا توجد سجلات حفظ متطابقة مع معايير البحث
            </h2>
            <p className="text-green-600 text-sm mb-4">
              جرب تغيير معايير التصفية أو إضافة سجل جديد
            </p>
            <Button
              onClick={handleAddNewRecord}
              className="bg-islamic-green hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-all shadow-md"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة سجل جديد
            </Button>
          </div>
        </div>

      ) :
        <>
          <GenericTable<Omit<MemorizationRecord, 'id'> & { id: string }>
            /* إظهار فقط أحدث سجل لكل طالب مع الترقيم */
            data={latestStudentRecords.map((record, idx) => ({
              ...record,
              id: record.id.toString(),
              __index: idx + 1, // رقم تسلسلي
            })) as any}
            enablePagination
            defaultPageSize={5}
            pageSizeOptions={[5, 10, 20, 50]}
            hideSortToggle
            columns={[
              {
                key: '__index',
                header: '🔢',
                align: 'center' as const,
                render: (record: any) => (
                  <span className="text-xs font-bold text-gray-600">{record.__index}</span>
                ),
              },
              {
                key: 'student',
                header: '👦 الطالب',
                align: 'right' as const,
                render: (record: any) => (
                  <div className="font-medium text-right">
                    {record.student?.full_name}
                    {record.student?.guardian && (
                      <div className="text-xs text-red-800 dark:text-red-800">
                        {" " + record.student.guardian.full_name}
                      </div>
                    )}
                  </div>
                ),
              },
              ...(activeTab !== 'my-records'
                ? [
                  {
                    key: 'teacher',
                    header: '👨‍🏫 المعلم',
                    align: 'right' as const,
                    render: (record) => record.recorder?.full_name || 'غير معروف',
                  },
                ]
                : []),
              {
                key: 'study_circle',
                header: '📚 الحلقة',
                align: 'right' as const,
                render: (record) =>
                  record.student?.study_circle
                    ? record.student.study_circle.name || `حلقة ${record.student.study_circle.id}`
                    : 'غير محدد',
              },
              {
                key: 'date',
                header: '📅 التاريخ',
                align: 'right' as const,
                render: (record) =>
                  new Date(record.date).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  }),
              },
              {
                key: 'type',
                header: '📂 النوع',
                align: 'right' as const,
                render: (record) => (
                  <Badge className={`${getMemorizationTypeColor(record.type)} px-2 py-1 rounded-lg`}>
                    {getMemorizationTypeName(record.type)}
                  </Badge>
                ),
              },
              {
                key: 'memorization_range',
                header: '🔖 نطاق الحفظ',
                align: 'right' as const,
                render: (record) => {
                  const compatibleRecord = {
                    ...record,
                    id: parseInt(record.id)
                  };
                  return formatMemorizationRange(compatibleRecord as MemorizationRecord);
                },
              },
              {
                key: 'score',
                header: '🏆 الدرجة',
                align: 'right' as const,
                render: (record) => formatScore(record.score),
              },
              {
                key: 'tajweed_errors',
                header: '❌ أخطاء التجويد',
                align: 'right' as const,
                render: (record) => formatTajweedErrors(record.tajweed_errors),
              },
              {
                key: 'recorder',
                header: '🖊 المُسجل بواسطة',
                align: 'right' as const,
                render: (record) => record.recorder?.full_name || 'غير معروف',
              },
              {
                key: 'more',
                header: '📜 باقي السجلات',
                align: 'center' as const,
                render: (record) => {
                  const all = studentRecordsMap[record.student_id || ''] || [];
                  const remaining = all.length - 1; // باستثناء الظاهر الآن
                  if (remaining <= 0) return <span className="text-gray-400 text-xs">لا يوجد</span>;
                  return (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); openStudentRecordsDialog(record.student_id); }}
                      className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors rounded-lg"
                      title={`عرض باقي (${remaining}) سجل / سجلات`}
                    >
                      <List className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    </Button>
                  );
                }
              },
              {
                key: 'actions',
                header: '⚙️ الإجراءات',
                align: 'center' as const,
                render: (record) => (
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRecord({ ...record, id: parseInt(record.id) })}
                      className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-700 transition-colors rounded-lg"
                      title="تعديل"
                    >
                      <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRecord(parseInt(record.id))}
                      className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                    </Button>
                  </div>
                ),
              },
            ]}
            emptyMessage="لا توجد سجلات"
            className="overflow-hidden rounded-xl border border-green-300 shadow-md text-xs"
            getRowClassName={(_, index) =>
              `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} cursor-pointer transition-colors`
            }
          />
        </>
      }

      {/* معالج (Wizard) إضافة/تعديل سجل باستخدام FormDialog */}
      <FormDialog
        title={recordToEdit ? '✏️ تعديل سجل الحفظ' : '👨‍🏫 إضافة سجل حفظ جديد'}
        open={isDialogOpen}
        onOpenChange={(o) => { if (!o) setIsDialogOpen(false); else setIsDialogOpen(true); }}
        mode={recordToEdit ? 'edit' : 'add'}
        onSave={() => {
          if (wizardStep < wizardSteps.length - 1) {
            goNext();
          } else {
            handleSaveRecord();
          }
        }}
        saveButtonText={wizardStep < wizardSteps.length - 1 ? 'التالي' : (isLoading ? 'جاري الحفظ...' : (recordToEdit ? 'تحديث السجل' : 'إضافة السجل'))}
        isLoading={isLoading}
        hideCancelButton
        maxWidth="680px"
        /* تحسينات الموبايل (نفس معالجة شاشة التقييم) */
        mobileFullScreen
        mobileFullWidth
        mobileFlatStyle
        mobileStickyHeader
        mobileInlineActions
        mobileFooterShadow
        compactFooterSpacing
        extraButtons={wizardStep > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={isLoading}
            className="flex-1 basis-0 sm:w-auto py-1.5 text-sm font-medium flex items-center justify-center"
          >
            <ChevronRight className="h-4 w-4" />
            رجوع
          </Button>
        )}
      >
        {/* مؤشرات الخطوات (نقاط) */}
        <div className="w-full mb-2">
          <div className="flex items-center justify-center gap-3">
            {wizardSteps.map((s, i) => {
              const active = i === wizardStep; const done = i < wizardStep;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`الخطوة ${i + 1}: ${s.label}`}
                  onClick={() => (i < wizardStep ? setWizardStep(i) : null)}
                  className={`relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${active
                    ? 'bg-islamic-green ring-2 ring-green-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                    : done
                      ? 'bg-green-300 hover:bg-green-400'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'} `}
                >
                  <span className="sr-only">{`الخطوة ${i + 1} - ${s.label}`}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-islamic-green transition-all"
              style={{ width: `${((wizardStep + 1) / wizardSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* شريط حالة الطالب */}
        <div className="text-[11px] sm:text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap overflow-hidden overflow-ellipsis mb-2">
          {formData.student_id ? (
            <>
              <span>الطالب: </span>
              <span>
                {formFilteredStudents.find(s => s.id === formData.student_id)?.full_name ?? ''}
                {formFilteredStudents.find(s => s.id === formData.student_id)?.guardian?.full_name ? ` ${formFilteredStudents.find(s => s.id === formData.student_id)?.guardian?.full_name}` : ''}
              </span>
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">الرجاء اختيار طالب</span>
          )}
        </div>

        {/* محتوى الخطوات */}
        <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
          {wizardStep === 0 && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4">
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="teacher" className="flex items-center gap-1">المعلم <span className="text-red-500">*</span></Label>
                  <Select value={formData.recorded_by || (currentUser ? currentUser.id : '')} onValueChange={(value) => handleTeacherChange(value)}>
                    <SelectTrigger
                      id="teacher"
                      dir="rtl"
                      className={`select-trigger-base ${(formData.recorded_by || currentUser?.id) ? 'select-trigger-active' : 'select-trigger-empty'}`}
                    >
                      <SelectValue placeholder="اختر المعلم" />
                    </SelectTrigger>
                    <SelectContent position="popper" dir="rtl" className="select-content-base">
                      {visibleTeachers && visibleTeachers.length > 0 ? (
                        visibleTeachers.map(teacher => (
                          <SelectItem key={teacher.id} value={teacher.id} 
                          className="select-item-base">
                            {teacher.full_name || teacher.display_name || `معلم ${teacher.id.slice(0,4)}`}
                            {teacher.role && (teacher.role === 'teacher' ? ' (معلم)' : ` (${teacher.role === 'admin' ? 'مشرف' : teacher.role})`)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={currentUser?.id || 'initial'}>{currentUser?.full_name || 'المستخدم الحالي'}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.recorded_by && <p className="text-sm text-red-500">{formErrors.recorded_by}</p>}
                </div>
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="circle">الحلقة</Label>
                  <Select value={formData.circle_id || ''} onValueChange={(value) => handleCircleChange(value)} disabled={!formData.recorded_by}>
                    <SelectTrigger
                      id="circle"
                      dir="rtl"
                      className={`select-trigger-base ${(formData.circle_id) ? 'select-trigger-active' : 'select-trigger-empty'} ${!formData.recorded_by ? 'select-trigger-disabled' : ''}`}
                    >
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent position="popper" dir="rtl" className="select-content-base">
                      {formFilteredCircles.length > 0 ? (
                        formFilteredCircles.map(circle => (
                          <SelectItem
                            key={circle.id}
                            value={circle.id}
                            className="select-item-base">
                            {circle.name || `حلقة ${circle.id.slice(0,4)}`}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-circles" disabled className="select-item-base select-item-disabled">لا توجد حلقات للمعلم المحدد</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5 sm:gap-2">
                  <Label htmlFor="student" className="flex items-center gap-1">الطالب <span className="text-red-500">*</span></Label>
                  <Select value={formData.student_id || ''} onValueChange={(value) => handleInputChange('student_id', value)} disabled={!formData.recorded_by}>
                    <SelectTrigger
                      id="student"
                      dir="rtl"
                      className={`h-9 text-right truncate max-w-full min-w-0 text-[11px] sm:text-xs rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${(formData.student_id)
                        ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500'} ${!formData.recorded_by ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent position="popper" dir="rtl" className="max-h-[300px] text-right text-[11px] sm:text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900">
                      {formFilteredStudents.length > 0 ? (
                        formFilteredStudents.map(student => (
                          <SelectItem key={student.id} value={student.id} className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/40 rounded-md">{student.full_name || 'طالب بدون اسم'}{student.guardian?.full_name ? ` - ${student.guardian.full_name}` : ''}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-students" disabled>{formData.circle_id ? 'لا يوجد طلاب في الحلقة المحددة' : 'اختر المعلم والحلقة أولاً'}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.student_id && <p className="text-sm text-red-500">{formErrors.student_id}</p>}
                </div>
              </div>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="space-y-3 sm:space-y-4 pr-0 pb-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <Label htmlFor="memorization_type" className="flex items-center gap-1 mb-2 text-sm">نوع السجل <span className="text-red-500">*</span></Label>
                  <div className="flex flex-nowrap pb-1 -mx-2 px-2 gap-1 sm:gap-2 sm:flex-wrap mt-1.5 sm:mt-2">
                    {memorizationTypeOptions.map(option => (
                      <button key={option.value} type="button" onClick={() => handleInputChange('type', option.value)} className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${formData.type === option.value ? 'bg-islamic-green text-white shadow-md ring-2 ring-offset-1 ring-islamic-green' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>{option.label}</button>
                    ))}
                  </div>
                  {formErrors.type && <p className="text-xs text-red-500 mt-1">{formErrors.type}</p>}
                </div>
                <div>
                  <Label htmlFor="date" className="flex items-center gap-1 mb-1.5 sm:mb-2 text-sm">التاريخ <span className="text-red-500">*</span></Label>
                  <Input id="date" type="date" dir="rtl" className="text-right h-9" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} />
                  {formErrors.date && <p className="text-xs text-red-500 mt-1">{formErrors.date}</p>}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 mb-2.5 sm:mb-3">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">نطاق الحفظ</h4>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div>
                    <Label htmlFor="from_surah" className="flex items-center gap-1 mb-1 text-xs">من سورة <span className="text-red-500">*</span></Label>
                    <Select value={formData.from_surah ? formData.from_surah.toString() : ''} onValueChange={(value) => handleSurahChange('from_surah', parseInt(value))}>
                      <SelectTrigger
                        id="from_surah"
                        dir="rtl"
                        className={`h-9 text-right truncate text-xs rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${(formData.from_surah)
                          ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500'} `}
                      >
                        <SelectValue placeholder="اختر السورة">{formData.from_surah ? `${formData.from_surah}. ${getSurahName(formData.from_surah)}` : 'اختر السورة'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] text-right text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900" dir="rtl">{quranSurahs.map(surah => (<SelectItem key={surah.number} value={surah.number.toString()} className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/40 rounded-md">{surah.number}. {getSurahName(surah.number)}</SelectItem>))}</SelectContent>
                    </Select>
                    {formErrors.from_surah && <p className="text-xs text-red-500 mt-1">{formErrors.from_surah}</p>}
                  </div>
                  <div>
                    <Label htmlFor="from_ayah" className="flex items-center gap-1 mb-1 text-xs">من آية <span className="text-red-500">*</span></Label>
                    <Input id="from_ayah" type="number" min={1} dir="rtl" className="text-right h-9 text-sm" value={formData.from_ayah || ''} onChange={(e) => handleInputChange('from_ayah', parseInt(e.target.value))} />
                    {formErrors.from_ayah && <p className="text-xs text-red-500 mt-1">{formErrors.from_ayah}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <Label htmlFor="to_surah" className="flex items-center gap-1 mb-1 text-xs">إلى سورة <span className="text-red-500">*</span></Label>
                    <Select value={formData.to_surah ? formData.to_surah.toString() : ''} onValueChange={(value) => handleSurahChange('to_surah', parseInt(value))}>
                      <SelectTrigger
                        id="to_surah"
                        dir="rtl"
                        className={`h-9 text-right truncate text-xs rounded-lg border px-2 pr-2 transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800 ${(formData.to_surah)
                          ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                          : 'border-gray-300 dark:border-gray-600 text-gray-500'} `}
                      >
                        <SelectValue placeholder="اختر السورة">{formData.to_surah ? `${formData.to_surah}. ${getSurahName(formData.to_surah)}` : 'اختر السورة'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] text-right text-xs rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900" dir="rtl">{quranSurahs.map(surah => (<SelectItem key={surah.number} value={surah.number.toString()} className="cursor-pointer data-[highlighted]:bg-green-900 dark:data-[highlighted]:bg-green-700/40 rounded-md">{surah.number}. {getSurahName(surah.number)}</SelectItem>))}</SelectContent>
                    </Select>
                    {formErrors.to_surah && <p className="text-xs text-red-500 mt-1">{formErrors.to_surah}</p>}
                  </div>
                  <div>
                    <Label htmlFor="to_ayah" className="flex items-center gap-1 mb-1 text-xs">إلى آية <span className="text-red-500">*</span></Label>
                    <Input id="to_ayah" type="number" min={1} dir="rtl" className="text-right h-9 text-sm" value={formData.to_ayah || ''} onChange={(e) => handleInputChange('to_ayah', parseInt(e.target.value))} />
                    {formErrors.to_ayah && <p className="text-xs text-red-500 mt-1">{formErrors.to_ayah}</p>}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700 mt-3"><p>قم بتحديد نطاق الحفظ أو المراجعة بشكل دقيق حتى يمكن متابعة تقدم الطالب.</p></div>
              </div>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-3 sm:space-y-4 pr-0 pb-1">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 sm:p-5 rounded-2xl shadow-md border border-blue-200 dark:border-blue-700">
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {[
                      { id: 'score', label: 'درجة التسميع', required: true, value: formData.score, onChange: (val) => handleInputChange('score', val) },
                      { id: 'lahn_jali', label: 'اللحن الجلي', hint: '(عدد الأخطاء)', value: formData.tajweed_errors?.lahn_jali, onChange: (val) => handleTajweedErrorChange('lahn_jali', val) },
                      { id: 'lahn_khafi', label: 'اللحن الخفي', hint: '(عدد الأخطاء)', value: formData.tajweed_errors?.lahn_khafi, onChange: (val) => handleTajweedErrorChange('lahn_khafi', val) },
                    ].map((field) => (
                      <div key={field.id} className="flex flex-col">
                        <Label htmlFor={field.id} className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 whitespace-nowrap">{field.label} {field.required && <span className="text-red-500">*</span>}{field.hint && <span className="text-[10px] text-gray-400 dark:text-gray-400">{field.hint}</span>}</Label>
                        <Input id={field.id} type="number" min={0} max={field.id === 'score' ? 100 : undefined} dir="rtl" className="h-9 sm:h-10 text-right bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 sm:px-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:outline-none" value={field.value || ''} onChange={(e) => { let val = parseFloat(e.target.value); if (isNaN(val)) val = undefined as any; if (field.id === 'score') { if (val > 100) val = 100; if (val < 0) val = 0; } field.onChange(val as any); }} />
                        {field.id === 'score' && formErrors.score && <p className="text-xs text-red-500 mt-1 text-right">{formErrors.score}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="mb-1.5 sm:mb-2 text-xs sm:text-sm">ملاحظات</Label>
                <Textarea id="notes" dir="rtl" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="أدخل أي ملاحظات خاصة بالتسميع..." className="h-20 sm:h-24 text-right text-xs sm:text-sm" />
              </div>
            </div>
          )}
        </div>
      </FormDialog>

      {/* مربع حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeDeleteRecord}
        isLoading={isLoading}
        title="تأكيد حذف سجل الحفظ"
        description="هل أنت متأكد من رغبتك في حذف سجل الحفظ هذا؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه."
        deleteButtonText="نعم، احذف السجل"
        cancelButtonText="إلغاء"
      />

      {/* حوار اختيار المعلم */}
      <FormDialog
        title={'المعلم'}
        open={isTeacherPickerOpen}
        onOpenChange={setIsTeacherPickerOpen}
        onSave={() => setIsTeacherPickerOpen(false)}
        mode="edit"
        showSaveButton={false}
        maxWidth="640px"
      >
        <div className="flex flex-col gap-3 py-1">
          {/* شريط أدوات مصغر للمعلمين */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
              <Input
                placeholder="🔍 اسم المعلم"
                value={teacherSearchTerm}
                onChange={(e) => setteacherSearchTerm(e.target.value)}
                className="pr-8 h-8 text-[11px] rounded-lg bg-white dark:bg-green-950 border-green-300 dark:border-green-700 focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          <GenericTable
            title=""
            defaultView="table"
            enablePagination
            defaultPageSize={4}
            pageSizeOptions={[4, 8, 16, 48, 100]}
            data={filteredTeachersForPicker}
            getRowClassName={(item: any, index: number) => `${item.id === selectedTeacherId ? 'bg-green-100/70 hover:bg-green-100' : index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'} cursor-pointer transition-colors`}
            hideSortToggle
            className="rounded-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
            columns={([
              {
                key: 'row_index',
                header: '🔢',
                width: '32px',
                align: 'center' as const,
                render: (_: any, globalIndex?: number) => (
                  <span className="text-[10px] font-medium block text-center">{(globalIndex ?? 0) + 1}</span>
                )
              },
              {
                key: 'full_name',
                header: '👨‍🏫 المعلم',
                align: 'center' as const,
                render: (item: any) => {
                  const selected = item.id === selectedTeacherId;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(item.id);
                        setSelectedCircleId('all-circles');
                        clearStudentSelection();
                        setIsTeacherPickerOpen(false);
                      }}
                      className="w-full flex items-center justify-center group px-1"
                    >
                      <span className={`truncate text-center text-[10px] sm:text-[11px] font-medium group-hover:text-green-700 ${selected ? 'text-green-700' : 'text-gray-700'}`}>{item.full_name}</span>
                    </button>
                  );
                }
              },
              {
                key: 'circles_count',
                header: '📘 الحلقات',
                align: 'center' as const,
                render: (item: any) => (
                  <span className="block w-full text-center text-[10px] sm:text-[11px] font-semibold text-green-700">{teacherCirclesCountMap[item.id] ?? 0}</span>
                )
              },
              {
                key: 'actions',
                header: `⚙️ الإجراءات`,
                align: 'center' as const,
                render: (item: any) => {
                  const selected = item.id === selectedTeacherId;
                  return (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId(item.id);
                          setSelectedCircleId('all-circles');
                          clearStudentSelection();
                          setIsTeacherPickerOpen(false);
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors shadow-sm ${selected ? 'bg-green-600 border-green-600 text-white hover:bg-green-600' : 'bg-white border-green-300 text-green-600 hover:bg-green-50'}`}
                        title={selected ? 'محدد' : 'تحديد'}
                      >
                        ✓
                      </button>
                    </div>
                  );
                }
              }
            ]) as any}
            emptyMessage={'لا يوجد بيانات'}
          />
        </div>
      </FormDialog>

      {/* حوار اختيار الطالب (منقول لأسفل بعد تعريف الحالات) */}
      <FormDialog
        title={'بحث وتحديد الطلاب'}
        open={isStudentPickerOpen}
        onOpenChange={setIsStudentPickerOpen}
        onSave={() => setIsStudentPickerOpen(false)}
        mode="edit"
        showSaveButton={false}
        maxWidth="680px"
      >
        <div className="flex flex-col gap-3 py-1">
          {/* شريط أدوات مصغر لاختيار الطلاب */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
              <Input
                placeholder="🔍 اسم الطالب / ولي الأمر"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="pr-8 h-8 text-[11px] rounded-lg bg-white dark:bg-green-950 border-green-300 dark:border-green-700 focus:ring-1 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  // تحديد جميع الظاهرين أو إلغاء الكل إذا كانوا كلهم محددين
                  const ids = filteredStudentsForPicker.map((s: any) => s.id);
                  const allSelected = ids.every((id: string) => selectedStudentIds.includes(id));
                  if (allSelected) {
                    // إزالة فقط الظاهرين
                    setSelectedStudentIds(prev => prev.filter(id => !ids.includes(id)));
                  } else {
                    // دمج مع الحاليين
                    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...ids])));
                  }
                }}
                className="h-8 px-2 rounded-lg text-[10px] font-semibold bg-green-600 hover:bg-green-700 text-white shadow transition"
                title="تحديد/إلغاء تحديد المعروض"
              >
                الكل
              </button>
              {!isAllStudentsSelected && (
                <button
                  type="button"
                  onClick={clearStudentSelection}
                  className="h-8 px-2 rounded-lg text-[10px] font-semibold bg-red-500 hover:bg-red-600 text-white shadow transition"
                  title="إزالة جميع التحديد"
                >
                  مسح
                </button>
              )}
              <div
                className={`h-8 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center
                ${isAllStudentsSelected
                    ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100'}`}
                title="عدد المحددين"
              >
                {isAllStudentsSelected ? 'الجميع' : selectedStudentIds.length}
              </div>
            </div>
          </div>

          <GenericTable
            title=""
            defaultView="table"
            enablePagination
            defaultPageSize={6}
            pageSizeOptions={[6, 12, 24, 60]}
            data={filteredStudentsForPicker}
            getRowClassName={(item: any, index: number) =>
              `${selectedStudentIds.includes(item.id)
                ? 'bg-green-100/70 hover:bg-green-100'
                : index % 2 === 0
                  ? 'bg-white hover:bg-green-50'
                  : 'bg-green-50 hover:bg-green-100'
              } cursor-pointer transition-colors`
            }
            hideSortToggle
            className="rounded-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
            columns={([
              {
                key: 'row_index',
                header: '🔢',
                width: '32px',
                align: 'center' as const,
                render: (_: any, globalIndex?: number) => (
                  <span className="text-[10px] font-medium block text-center">
                    {(globalIndex ?? 0) + 1}
                  </span>
                )
              },
              {
                key: 'full_name',
                header: '👦 الطالب',
                align: 'center' as const,
                render: (item: any) => {
                  const selected = selectedStudentIds.includes(item.id);
                  return (
                    <button
                      type="button"
                      onClick={() => { toggleStudentSelection(item.id); }}
                      className="w-full flex items-center justify-center group px-1"
                    >
                      <span
                        className={`truncate text-center text-[10px] sm:text-[11px] font-medium group-hover:text-green-700 ${selected ? 'text-green-700' : 'text-gray-700'}`}
                      >
                        {item.full_name}
                      </span>
                    </button>
                  );
                }
              },
              {
                key: 'guardian',
                header: '👪 ولي الأمر',
                align: 'center' as const,
                render: (item: any) => (
                  <span className="block w-full text-center text-[10px] sm:text-[11px]">
                    {item.guardian?.full_name || '-'}
                  </span>
                )
              },
              {
                key: 'circle',
                header: '𑁍 الحلقة',
                align: 'center' as const,
                render: (item: any) => (
                  <span className="block w-full text-center text-[10px] sm:text-[11px]">
                    {item.study_circle?.name || '-'}
                  </span>
                )
              },
              {
                key: 'actions',
                header: '⚙️ إجراءات',
                align: 'center' as const,
                render: (item: any) => {
                  const selected = selectedStudentIds.includes(item.id);
                  return (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => { toggleStudentSelection(item.id); }}
                        className={`w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors shadow-sm
              ${selected
                            ? 'bg-green-600 border-green-600 text-white hover:bg-green-600'
                            : 'bg-white border-green-300 text-green-600 hover:bg-green-50'}`}
                        title={selected ? 'إزالة من التحديد' : 'تحديد'}
                      >
                        ✓
                      </button>
                    </div>
                  );
                }
              }
            ]) as any}
            emptyMessage={'لا يوجد بيانات'}
          />
        </div>
      </FormDialog>

      {/* حوار اختيار الحلقة */}
      <FormDialog
        title={'الحلقة'}
        open={isCirclePickerOpen}
        onOpenChange={setIsCirclePickerOpen}
        onSave={() => setIsCirclePickerOpen(false)}
        mode="edit"
        showSaveButton={false}
        maxWidth="640px"
      >
        <div className="flex flex-col gap-3 py-1">
          {/* شريط أدوات مصغر للحلقات */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
              <Input
                placeholder="🔍 اسم الحلقة"
                value={circlePickerSearch}
                onChange={(e) => setCirclePickerSearch(e.target.value)}
                className="pr-8 h-8 text-[11px] rounded-lg bg-white dark:bg-green-950 border-green-300 dark:border-green-700 focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          <GenericTable
            title=""
            defaultView="table"
            enablePagination
            defaultPageSize={4}
            pageSizeOptions={[4, 8, 16, 48, 100]}
            data={filteredCirclesForPicker}
            getRowClassName={(item: any, index: number) => `${item.id === selectedCircleId ? 'bg-green-100/70 hover:bg-green-100' : index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'} cursor-pointer transition-colors`}
            hideSortToggle
            className="rounded-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
            columns={([
              {
                key: 'row_index',
                header: '🔢',
                width: '32px',
                align: 'center' as const,
                render: (_: any, globalIndex?: number) => (
                  <span className="text-[10px] font-medium block text-center">{(globalIndex ?? 0) + 1}</span>
                )
              },
              {
                key: 'name',
                header: '𑁍 الحلقة',
                align: 'center' as const,
                render: (item: any) => {
                  const selected = item.id === selectedCircleId;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCircleId(item.id);
                        clearStudentSelection();
                        setIsCirclePickerOpen(false);
                      }}
                      className="w-full flex items-center justify-center group px-1"
                    >
                      <span className={`truncate text-center text-[10px] sm:text-[11px] font-medium group-hover:text-green-700 ${selected ? 'text-green-700' : 'text-gray-700'}`}>{item.name}</span>
                    </button>
                  );
                }
              },
              {
                key: 'students_count',
                header: '👥 العدد',
                align: 'center' as const,
                render: (item: any) => (
                  <span className="block w-full text-center text-[10px] sm:text-[11px] font-semibold text-green-700">{circleStudentsCountMap[item.id] ?? 0}</span>
                )
              },
              {
                key: 'max_students',
                header: '👥 الحد',
                align: 'center' as const,
                render: (item: any) => (
                  <span className="block w-full text-center text-[10px] sm:text-[11px]">{(item.max_students ?? item.capacity) || '-'}</span>
                )
              },
              {
                key: 'actions',
                header: `⚙️ الإجراءات`,
                align: 'center' as const,
                render: (item: any) => {
                  const selected = item.id === selectedCircleId;
                  return (
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCircleId(item.id);
                          clearStudentSelection();
                          setIsCirclePickerOpen(false);
                        }}
                        className={`w-6 h-6 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors shadow-sm ${selected ? 'bg-green-600 border-green-600 text-white hover:bg-green-600' : 'bg-white border-green-300 text-green-600 hover:bg-green-50'}`}
                        title={selected ? 'محددة' : 'تحديد'}
                      >
                        ✓
                      </button>
                    </div>
                  );
                }
              }
            ]) as any}
            emptyMessage={'لا يوجد بيانات'}
          />
        </div>
      </FormDialog>

      {/* حوار عرض جميع سجلات الطالب */}
      <Dialog open={isStudentRecordsDialogOpen} onOpenChange={setIsStudentRecordsDialogOpen}>
        <DialogContent
          dir="rtl"
          className="overflow-hidden rounded-t-2xl sm:rounded-xl p-3 sm:p-4 
          shadow-lg bg-gradient-to-r from-green-50 to-blue-50 border border-gray-100 flex flex-col 
          max-h-[85vh] sm:max-h-[90vh] w-full sm:max-w-4xl max-w-[95vw]
          
          pb-2"
        >
          <DialogHeader className="flex-shrink-0 sticky top-0 z-10 bg-gradient-to-r from-green-50 to-blue-50 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold text-green-800 flex items-center gap-2">
                📜 جميع سجلات الطالب
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                onClick={() => setIsStudentRecordsDialogOpen(false)}
                title="إغلاق"
              >
                ✕
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 pr-1 -mr-1">
            <div className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
              {selectedStudentAllRecords && selectedStudentAllRecords[0]?.student?.full_name ? (
                <span>
                  الطالب: {selectedStudentAllRecords[0].student.full_name}
                  {selectedStudentAllRecords[0].student.guardian?.full_name ? ` - ${selectedStudentAllRecords[0].student.guardian.full_name}` : ''}
                </span>
              ) : '---'}
            </div>
            {selectedStudentAllRecords && selectedStudentAllRecords.length > 0 ? (
              <GenericTable<Omit<MemorizationRecord, 'id'> & { id: string; __index: number }>
                data={selectedStudentAllRecords.map((r, idx) => ({
                  ...r,
                  id: r.id.toString(),
                  __index: idx + 1,
                })) as any}
                enablePagination
                defaultPageSize={5}
                pageSizeOptions={[5, 10, 20, 50]}
                columns={[
                  {
                    key: '__index',
                    header: '🔢',
                    align: 'center' as const,
                    render: (record: any) => (
                      <span className="text-xs font-bold text-gray-600">{record.__index}</span>
                    ),
                  },
                  {
                    key: 'date',
                    header: '📅 التاريخ',
                    align: 'right' as const,
                    render: (record) =>
                      new Date(record.date).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }),
                  },
                  {
                    key: 'type',
                    header: '📂 النوع',
                    align: 'right' as const,
                    render: (record) => (
                      <Badge className={`${getMemorizationTypeColor(record.type)} px-2 py-1 rounded-lg`}>
                        {getMemorizationTypeName(record.type)}
                      </Badge>
                    ),
                  },
                  {
                    key: 'memorization_range',
                    header: '🔖 نطاق الحفظ',
                    align: 'right' as const,
                    render: (record) =>
                      formatMemorizationRange({ ...(record as any), id: parseInt(record.id) } as MemorizationRecord),
                  },
                  {
                    key: 'score',
                    header: '🏆 الدرجة',
                    align: 'right' as const,
                    render: (record) => formatScore(record.score),
                  },
                  {
                    key: 'tajweed_errors',
                    header: '❌ أخطاء التجويد',
                    align: 'right' as const,
                    render: (record) => formatTajweedErrors(record.tajweed_errors),
                  },
                  {
                    key: 'recorder',
                    header: '🖊 المُسجل',
                    align: 'right' as const,
                    render: (record) => record.recorder?.full_name || 'غير معروف',
                  },
                  {
                    key: 'actions',
                    header: `⚙️ الإجراءات`,
                    align: 'center' as const,
                    render: (record) => (
                      <div className="flex justify-center items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRecord({ ...record, id: parseInt(record.id) })}
                          className="h-7 w-7 p-0 hover:bg-green-100 dark:hover:bg-green-700 transition-colors rounded-lg"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4 text-green-600 dark:text-green-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(parseInt(record.id))}
                          className="h-7 w-7 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                emptyMessage="لا توجد سجلات"
                className="overflow-hidden rounded-xl border border-green-300 shadow-md text-[11px] sm:text-xs"
                hideSortToggle={false}
              />
            ) : (
              <div className="text-center text-gray-500 py-6">لا توجد سجلات</div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 sticky bottom-0 bg-gradient-to-r from-green-50 to-blue-50 pt-2 mt-1 border-t border-green-200 justify-end">
            <Button onClick={() => setIsStudentRecordsDialogOpen(false)} className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MemorizationRecords;