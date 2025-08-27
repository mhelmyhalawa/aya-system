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
import { Table2, LayoutGrid, Plus, Pencil, Trash2, SaveIcon, NotebookPenIcon, RefreshCwIcon } from 'lucide-react';
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
import { User, BookOpen, Music } from 'lucide-react';
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
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all-students');
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
  // متغيرات للتحكم في النموذج
  const [formSelectedTeacherId, setFormSelectedTeacherId] = useState<string>('');
  const [formSelectedCircleId, setFormSelectedCircleId] = useState<string>('');
  const [formFilteredCircles, setFormFilteredCircles] = useState<StudyCircle[]>([]);
  const [formFilteredStudents, setFormFilteredStudents] = useState<any[]>([]);
  // متغيرات مربع حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  const { toast } = useToast();

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

  // تصفية الطلاب عند تغيير الحلقة
  useEffect(() => {
    // إذا تم اختيار حلقة محددة، قم بتصفية الطلاب بناءً على الحلقة المختارة
    if (selectedCircleId && selectedCircleId !== 'all-circles') {
      const studentsInCircle = students.filter(student =>
        student.study_circle_id === selectedCircleId ||
        (student.study_circle && student.study_circle.id === selectedCircleId)
      );

      // إذا كان الطالب المحدد حاليًا غير موجود في الحلقة المختارة، أعد تعيينه
      if (selectedStudentId !== 'all-students' &&
        !studentsInCircle.some(student => student.id === selectedStudentId)) {
        setSelectedStudentId('all-students');
      }
    }
  }, [selectedCircleId, students, selectedStudentId]);

  // تصفية السجلات عند تغيير المعايير
  useEffect(() => {
    console.log('Filtering criteria changed, updating filtered records');
    console.log('Records to filter:', records.length);
    console.log('Filter criteria:', {
      circleId: selectedCircleId,
      studentId: selectedStudentId,
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

    // تصفية حسب الطالب
    if (selectedStudentId && selectedStudentId !== 'all-students') {
      result = result.filter(record => record.student_id === selectedStudentId);
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
  }, [records, selectedStudentId, selectedTeacherId, selectedCircleId, filterType, searchQuery, activeTab, currentUser, students]);

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

      if (selectedStudentId && selectedStudentId !== 'all-students') {
        filteredResult = filteredResult.filter(record => record.student_id === selectedStudentId);
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

      if (selectedStudentId && selectedStudentId !== 'all-students') {
        result = result.filter(record => record.student_id === selectedStudentId);
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
  };

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
    <div className="container mx-auto py-6" dir="rtl">

      <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <NotebookPenIcon className="h-5 w-5 text-yellow-300" />
                سجلات الحفظ والمراجعة
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                هنا يمكنك إدارة سجلات الحفظ والمراجعة للطلاب، إضافة سجلات جديدة، وتحرير السجلات الحالية.
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
                    setSelectedCircleId(value);
                    if (value !== 'all-circles') setSelectedStudentId('all-students');
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
              <div className="min-w-[140px]">
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
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

              {/* اختيار النوع */}
              <div className="min-w-[120px]">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green hover:scale-102 transition-transform duration-200 text-sm">
                    <SelectValue placeholder="📂 جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    {memorizationTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* أزرار تبديل العرض */}
              {/* زر الإضافة على اليسار */}
              <Button
                onClick={handleAddNewRecord}
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
            {/* جدول السجلات أو البطاقات */}
            {isLoading ? (
              <div className="text-center py-10">جاري التحميل...</div>
            ) : filteredRecords.length === 0 ? (
              <h2 className="text-lg font-semibold text-green-800 rounded-2xl shadow-sm">لا توجد سجلات حفظ متطابقة مع معايير البحث</h2>

            ) : viewMode === 'table' ? (
              <GenericTable<Omit<MemorizationRecord, 'id'> & { id: string }>
                data={filteredRecords.map(record => ({
                  ...record,
                  id: record.id.toString() // Convert numeric ID to string
                }))}
                columns={[
                  {
                    key: 'student',
                    header: '👦 الطالب',
                    align: 'right' as const,
                    render: (record) => (
                      <div className="font-medium text-right">
                        {record.student?.full_name || 'غير معروف'}
                        {record.student?.guardian && (
                          <div className="text-xs text-green-700 dark:text-green-300">
                            ولي الأمر: {record.student.guardian.full_name || 'غير محدد'}
                          </div>
                        )}
                      </div>
                    ),
                  },
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
                      // Create a compatible record with numeric id for formatMemorizationRange
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
                    key: 'actions',
                    header: '⚙️ الإجراءات',
                    align: 'center' as const,
                    render: (record) => (
                      <div className="flex justify-center items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRecord({...record, id: parseInt(record.id)})}
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

            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl"
                  >
                    <CardHeader className={`p-4 ${getMemorizationTypeColor(record.type).replace('bg-', 'bg-opacity-10 bg-')} rounded-t-xl`}>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold line-clamp-1">
                          {record.student?.full_name || 'غير معروف'}
                        </CardTitle>
                        <Badge className={`${getMemorizationTypeColor(record.type)} px-2 py-1 rounded-lg`}>
                          {getMemorizationTypeName(record.type)}
                        </Badge>
                      </div>

                      {record.student?.guardian && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          ولي الأمر: {record.student.guardian.full_name || 'غير محدد'}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-block bg-gray-200 dark:bg-gray-700 rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </span>
                        <span>{new Date(record.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <h4 className="text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300">نطاق الحفظ:</h4>
                        <p className="text-lg font-medium">{formatMemorizationRange(record)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-2 text-center">
                          <h4 className="text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300">الدرجة:</h4>
                          <p className="text-md font-medium">{formatScore(record.score)}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-2 text-center">
                          <h4 className="text-sm font-semibold mb-1 text-gray-600 dark:text-gray-300">أخطاء التجويد:</h4>
                          <p className="text-md font-medium">{formatTajweedErrors(record.tajweed_errors)}</p>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg">
                          <h4 className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">ملاحظات:</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{record.notes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900 p-2 rounded-lg text-center">
                          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">المُسجل بواسطة:</h4>
                          <p className="text-sm font-medium">{record.recorder?.full_name || 'غير معروف'}</p>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-900 p-2 rounded-lg text-center">
                          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">الحلقة:</h4>
                          <p className="text-sm font-medium">
                            {record.student?.study_circle ?
                              (record.student.study_circle.name || `حلقة ${record.student.study_circle.id}`) :
                              'غير محدد'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center space-x-2 rtl:space-x-reverse pt-2 border-t mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800"
                          onClick={() => handleEditRecord(record)}
                        >
                          <Pencil className="h-4 w-4 text-blue-500" />
                          <span>تعديل</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                          <span>حذف</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

            )}
          </>
        </CardContent>
      </Card>

      {/* حوار إضافة/تعديل سجل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="sm:max-w-[520px] w-full rounded-xl p-3 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100"
        >
          <DialogHeader className="pb-1">
            <DialogTitle className="text-xl font-bold text-center">
              <h3 className="text-center leading-tight text-green-800 bg-gradient-to-r from-green-100 to-blue-100 py-2 px-3 rounded-lg">
                {recordToEdit ? '✏️ تعديل سجل الحفظ' : '👨‍🏫 إضافة سجل حفظ جديد'}
              </h3>
            </DialogTitle>
          </DialogHeader>



          <div className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Tabs defaultValue="student" dir="rtl" className="w-full">
              <TabsList className="grid grid-cols-3 mb-6">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <User size={16} />
                  <span>الطالب</span>
                </TabsTrigger>
                <TabsTrigger value="memorization" className="flex items-center gap-2">
                  <SaveIcon size={16} />
                  <span>الحفظ</span>
                </TabsTrigger>
                <TabsTrigger value="recitation" className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <span>التسميع</span>
                </TabsTrigger>
              </TabsList>

              {/* تب الطالب */}
              <TabsContent value="student" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="teacher" className="flex items-center gap-1">
                      المعلم <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.recorded_by || (currentUser ? currentUser.id : '')}
                      onValueChange={(value) => handleTeacherChange(value)}
                    >
                      <SelectTrigger id="teacher">
                        <SelectValue placeholder="اختر المعلم" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {visibleTeachers && visibleTeachers.length > 0 ? (
                          visibleTeachers.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.full_name || teacher.display_name || `معلم ${teacher.id.slice(0, 4)}`}
                              {teacher.role && (
                                teacher.role === 'teacher'
                                  ? ' (معلم)'
                                  : ` (${teacher.role === 'admin' ? 'مشرف' : teacher.role})`
                              )}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value={currentUser?.id || "initial"}>
                            {currentUser?.full_name || 'المستخدم الحالي'}
                            {currentUser?.role && (
                              currentUser.role === 'teacher'
                                ? ' (معلم)'
                                : ` (${currentUser.role === 'admin' ? 'مشرف' : currentUser.role})`
                            )}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.recorded_by && (
                      <p className="text-sm text-red-500">{formErrors.recorded_by}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="circle">الحلقة</Label>
                    <Select
                      value={formData.circle_id || ''}
                      onValueChange={(value) => handleCircleChange(value)}
                      disabled={!formData.recorded_by}
                    >
                      <SelectTrigger id="circle">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {formFilteredCircles.length > 0 ? (
                          formFilteredCircles.map(circle => (
                            <SelectItem key={circle.id} value={circle.id}>
                              {circle.name || `حلقة ${circle.id.slice(0, 4)}`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-circles" disabled>لا توجد حلقات للمعلم المحدد</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="student" className="flex items-center gap-1">
                      الطالب <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.student_id || ''}
                      onValueChange={(value) => handleInputChange('student_id', value)}
                      disabled={!formData.recorded_by}
                    >
                      <SelectTrigger id="student">
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {formFilteredStudents.length > 0 ? (
                          formFilteredStudents.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              <div className="flex items-center justify-between w-full">
                                {student.guardian && student.guardian.full_name && (
                                  <span className="text-gray-500 text-xs mr-2">
                                    (ولي الأمر: {student.guardian.full_name})
                                  </span>
                                )}
                                <span className="font-medium">{student.full_name || `طالب ${student.id.slice(0, 4)}`}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-students" disabled>
                            {formData.circle_id ? 'لا يوجد طلاب في الحلقة المحددة' : 'اختر المعلم والحلقة أولاً'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {formErrors.student_id && (
                      <p className="text-sm text-red-500">{formErrors.student_id}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* تب الحفظ */}
              <TabsContent value="memorization" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="memorization_type" className="flex items-center gap-1 mb-2">
                      نوع السجل <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleInputChange('type', value)}
                    >
                      <SelectTrigger id="memorization_type">
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الأنواع</SelectItem>
                        {memorizationTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date" className="flex items-center gap-1 mb-2">
                      التاريخ <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date || ''}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]} // تحديد الحد الأدنى للتاريخ هو اليوم الحالي
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_surah" className="flex items-center gap-1 mb-2">
                      من سورة <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.from_surah ? formData.from_surah.toString() : ''}
                      onValueChange={(value) => handleSurahChange('from_surah', parseInt(value))}
                    >
                      <SelectTrigger id="from_surah">
                        <SelectValue placeholder="اختر السورة">
                          {formData.from_surah ? `${formData.from_surah}. ${getSurahName(formData.from_surah)}` : "اختر السورة"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {quranSurahs.map(surah => (
                          <SelectItem key={surah.number} value={surah.number.toString()}>
                            {surah.number}. {getSurahName(surah.number)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.from_surah && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.from_surah}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="to_surah" className="flex items-center gap-1 mb-2">
                      إلى سورة <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.to_surah ? formData.to_surah.toString() : ''}
                      onValueChange={(value) => handleSurahChange('to_surah', parseInt(value))}
                    >
                      <SelectTrigger id="to_surah">
                        <SelectValue placeholder="اختر السورة">
                          {formData.to_surah ? `${formData.to_surah}. ${getSurahName(formData.to_surah)}` : "اختر السورة"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {quranSurahs.map(surah => (
                          <SelectItem key={surah.number} value={surah.number.toString()}>
                            {surah.number}. {getSurahName(surah.number)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.to_surah && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.to_surah}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from_ayah" className="flex items-center gap-1 mb-2">
                      من آية <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="from_ayah"
                      type="number"
                      min={1}
                      value={formData.from_ayah || ''}
                      onChange={(e) => handleInputChange('from_ayah', parseInt(e.target.value))}
                    />
                    {formErrors.from_ayah && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.from_ayah}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="to_ayah" className="flex items-center gap-1 mb-2">
                      إلى آية <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="to_ayah"
                      type="number"
                      min={1}
                      value={formData.to_ayah || ''}
                      onChange={(e) => handleInputChange('to_ayah', parseInt(e.target.value))}
                    />
                    {formErrors.to_ayah && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.to_ayah}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* تب التسميع */}
              <TabsContent value="recitation" className="space-y-4">

                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-2xl shadow-md border border-blue-200 dark:border-blue-700">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'score', label: 'درجة التسميع', required: true, value: formData.score, onChange: (val) => handleInputChange('score', val) },
                        { id: 'lahn_jali', label: 'اللحن الجلي', hint: '(عدد الأخطاء)', value: formData.tajweed_errors?.lahn_jali, onChange: (val) => handleTajweedErrorChange('lahn_jali', val) },
                        { id: 'lahn_khafi', label: 'اللحن الخفي', hint: '(عدد الأخطاء)', value: formData.tajweed_errors?.lahn_khafi, onChange: (val) => handleTajweedErrorChange('lahn_khafi', val) },
                      ].map((field) => (
                        <div key={field.id} className="flex flex-col">
                          <Label htmlFor={field.id} className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1 whitespace-nowrap">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                            {field.hint && <span className="text-[10px] text-gray-400 dark:text-gray-400">{field.hint}</span>}
                          </Label>
                          <Input
                            id={field.id}
                            type="number"
                            min={0}
                            max={field.id === 'score' ? 100 : undefined}
                            dir="rtl"
                            className="h-10 text-right bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:outline-none"
                            value={field.value || ''}
                            onChange={(e) => {
                              let val = parseFloat(e.target.value);
                              if (isNaN(val)) val = undefined;
                              if (field.id === 'score') {
                                if (val > 100) val = 100;
                                if (val < 0) val = 0;
                              }
                              field.onChange(val);
                            }}
                          />
                          {field.id === 'score' && formErrors.score && (
                            <p className="text-xs text-red-500 mt-1 text-right">{formErrors.score}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>


                <div>
                  <Label htmlFor="notes" className="mb-2">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="أدخل أي ملاحظات خاصة بالتسميع..."
                    className="h-24"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>


          <DialogFooter dir="rtl" className="flex items-center justify-between">

            <table className="w-full">
              <tbody>
                <tr>
                  <td className="text-right">  {/* hint بمعلومات الطالب على أقصى اليسار */}
                    <div className="text-xs text-blue-700 dark:text-blue-400 whitespace-nowrap overflow-hidden overflow-ellipsis max-w-[250px]">
                      {formData.student_id ? (
                        <>
                          <span>الطالب: </span>
                          <span className="font-semibold">{formFilteredStudents.find(s => s.id === formData.student_id)?.full_name || 'غير معروف'}</span>
                          <span> | ولي الأمر: </span>
                          <span>{formFilteredStudents.find(s => s.id === formData.student_id)?.guardian?.full_name || 'غير محدد'}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">الرجاء اختيار طالب</span>
                      )}
                    </div></td>


                  <td>
                    {/* الأزرار على اليسار */}
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        onClick={handleSaveRecord}
                        disabled={isLoading}
                        className="bg-purple-700 hover:bg-purple-800 text-white text-sm px-4 py-2 rounded transition-all"
                      >
                        {isLoading ? 'جاري الحفظ...' : recordToEdit ? 'تحديث السجل' : 'إضافة السجل'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsDialogOpen(false)}
                        className="bg-yellow-300 hover:bg-yellow-400 text-gray-800 text-sm px-4 py-2 rounded transition-all"
                      >
                        إلغاء
                      </Button>
                    </div>
                  </td>


                </tr>
              </tbody>
            </table>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

    </div>
  );
};

export default MemorizationRecords;