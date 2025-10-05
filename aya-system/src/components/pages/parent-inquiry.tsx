import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Smartphone, Users, BookOpen,
    AlertCircle, School, UserCircle, Edit, Star, History,
    Search, Check, X, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentsLabels, studyCirclesLabels } from "@/lib/arabic-labels";
import { getStudentsByGuardianId } from "@/lib/supabase-service";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GenericTable } from "@/components/ui/generic-table";

interface Grade {
    id: string;
    studentName: string;
    date: string;
    memorization: number;
    recitation: number;
    tajweed: number;
    recordedBy?: string;  // إضافة مسجل التقييم
}

interface Attendance {
    id: string;
    date: string;
    status: string;
    notes?: string;  // Keeping as notes to avoid changing all code references
    recordedBy?: string; // إضافة مسجل الحضور
}

interface StudentNote {
    id: string;
    date: string;
    note: string;
    type: string;
}

interface Guardian {
    id: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
}

interface Student {
    id: string;
    fullName: string;
    grade: string;
    circleName: string;
    guardianId: string;
    behaviorStatus?: string;
    grades: Grade[];
    attendance: Attendance[];
    notes: StudentNote[];
    teacherName?: string;  // اسم المعلم الحالي
}

interface ParentInquiryProps {
    onNavigate: (path: string) => void;
}

interface TeacherHistory {
    id: string;
    teacherName: string;
    startDate: string;
    endDate?: string;
}

export function ParentInquiry({ onNavigate }: ParentInquiryProps) {
    
    const [phoneNumber, setPhoneNumber] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [guardian, setGuardian] = useState<Guardian | null>(null);
    const [personalInfoCollapsed, setPersonalInfoCollapsed] = useState(true); // حالة طي المعلومات الشخصية، مطوية افتراضيًا
    const [attendanceCollapsed, setAttendanceCollapsed] = useState(true); // حالة طي سجل الحضور
    const [gradesCollapsed, setGradesCollapsed] = useState(true); // حالة طي سجل الحفظ والتقييم
    const [notesCollapsed, setNotesCollapsed] = useState(true); // حالة طي ملاحظات المعلم
    const [teacherHistoryCollapsed, setTeacherHistoryCollapsed] = useState(true); // حالة طي سجل المعلمين
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justSearched, setJustSearched] = useState(false); // لعرض علامة نجاح مؤقتة
    const [triggerShake, setTriggerShake] = useState(false); // لتحريك الاهتزاز عند خطأ
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [teacherHistory, setTeacherHistory] = useState<TeacherHistory[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [guardianExpanded, setGuardianExpanded] = useState(false);
    
    // تم إزالة مفتاح إعادة التحميل، غير ضروري
    const PERSIST_KEY = 'guardianExpandedPref';

    // Load persisted preference (with desktop default override if no pref stored)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = window.localStorage.getItem(PERSIST_KEY);
            if (stored !== null) {
                setGuardianExpanded(stored === 'true');
            } else if (window.innerWidth >= 1024) {
                setGuardianExpanded(true);
            }
        } catch { /* ignore */ }
    }, []);

    // Persist preference whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try { window.localStorage.setItem(PERSIST_KEY, String(guardianExpanded)); } catch { /* ignore */ }
        }
    }, [guardianExpanded]);

    // Keyboard shortcut: press "g" (Arabic/English keyboards) to toggle when guardian exists
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (!guardian) return;
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return;
        if (e.key.toLowerCase() === 'g') {
            e.preventDefault();
            setGuardianExpanded(prev => !prev);
        }
    }, [guardian]);

    useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    // تم إزالة مؤقت العد التنازلي للتحميل لصالح عرض مؤشر تحميل بسيط

    // بيانات تجريبية للاختبار
    const mockStudents: Student[] = [];

    // الاستعلام عن البيانات من Supabase
    const fetchStudentsByGuardianPhone = async (phone: string) => {
        try {
            setError(null);

            // 1. البحث عن ولي الأمر بواسطة رقم الهاتف
            console.log('البحث عن ولي الأمر برقم الهاتف:', phone);

            // تنظيف رقم الهاتف (إزالة المسافات والرموز إن وجدت)
            const cleanPhone = phone.replace(/\s+/g, '').trim();

            // البحث مباشرة برقم الهاتف في جدول guardians
            console.log('البحث المباشر برقم الهاتف:', cleanPhone);

            let guardianData = null;
            let guardianError = null;

            // الاستعلام من جدول guardians برقم الهاتف
            const result = await supabase
                .from('guardians')
                .select('id, full_name, phone_number, email')
                .eq('phone_number', cleanPhone)
                .limit(1);

            if (result.data && result.data.length > 0) {
                guardianData = result.data;
                guardianError = result.error;
                console.log('تم العثور على ولي أمر بنجاح');
                console.log('بيانات ولي الأمر:', result.data[0]);

                // حفظ بيانات ولي الأمر للعرض
                setGuardian({
                    id: result.data[0].id,
                    fullName: result.data[0].full_name,
                    phoneNumber: result.data[0].phone_number,
                    email: result.data[0].email
                });
            } else {
                setGuardian(null);
                console.log('لم يتم العثور على ولي أمر بهذا الرقم');
            }

            if (guardianError) {
                console.error('خطأ في البحث عن ولي الأمر:', guardianError);
                return [];
            }

            if (!guardianData || guardianData.length === 0) {
                console.error('لم يتم العثور على ولي أمر بهذا الرقم:', cleanPhone);
                return [];
            }

            const guardianId = guardianData[0].id;


            // 2. جلب الطلاب المرتبطين بولي الأمر باستخدام الدالة الجديدة
            const studentsWithRelations = await getStudentsByGuardianId(guardianId);

            if (!studentsWithRelations || studentsWithRelations.length === 0) {
                return [];
            }

            // قائمة لتخزين بيانات الطلاب الكاملة
            const fullStudentsData: Student[] = [];

            // 3. لكل طالب، نقوم بجلب الدرجات وسجلات الحضور والملاحظات
            for (const student of studentsWithRelations) {
                // جلب الدرجات (من سجلات التقييم)
                const { data: assessmentsData, error: assessmentsError } = await supabase
                    .from('assessments')
                    .select(`
                        id, 
                        date, 
                        memorization_score, 
                        recitation_score, 
                        tajweed_score,
                        recorded_by,
                        profiles:recorded_by(full_name)
                    `)
                    .eq('student_id', student.id)
                    .order('date', { ascending: false })
                    .limit(10);

                if (assessmentsError) {
                    console.error('خطأ في استرجاع بيانات التقييم:', assessmentsError);
                }

                console.log('🧪 بيانات التقييم للطالب:', student.full_name,
                    'معرف الطالب:', student.id,
                    'هل هناك بيانات؟', !!assessmentsData && assessmentsData.length > 0,
                    'عدد السجلات:', assessmentsData?.length || 0,
                    assessmentsData);

                // جلب سجلات الحضور - استعلام معدل
                const { data: attendanceData, error: attendanceError } = await supabase
                    .from('attendance')
                    .select(`
                        id,
                        circle_session_id,
                        student_id,
                        status,
                        note,
                        recorded_at,
                        recorded_by,
                        circle_session:circle_session_id(id, session_date),
                        profiles:recorded_by(full_name)
                    `)
                    .eq('student_id', student.id)
                    .order('recorded_at', { ascending: false })
                    .limit(10);

                if (attendanceError) {
                    console.error('خطأ في استرجاع سجلات الحضور:', attendanceError);
                }

                console.log('سجلات الحضور للطالب:', student.full_name, attendanceData);

                // جلب ملاحظات المعلم
                const { data: notesData, error: notesError } = await supabase
                    .from('teacher_notes')
                    .select('id, date, note, type')
                    .eq('student_id', student.id)
                    .order('date', { ascending: false })
                    .limit(10);

                // تحويل البيانات إلى الشكل المطلوب
                let formattedGrades: Grade[] = assessmentsData?.map(assessment => {
                    console.log('تحويل التقييم:', assessment);
                    return {
                        id: assessment.id || `temp-${Math.random()}`,
                        studentName: student.full_name,
                        date: assessment.date,
                        memorization: Number(assessment.memorization_score) || 0,
                        recitation: Number(assessment.recitation_score) || 0,
                        tajweed: Number(assessment.tajweed_score) || 0,
                        recordedBy: assessment.profiles ? assessment.profiles['full_name'] : 'غير معروف',
                    };
                }) || [];

                // إذا لم تكن هناك تقييمات، سنضيف بيانات تجريبية للاختبار
                if (formattedGrades.length === 0) {
                    console.log('🔄 إضافة بيانات تجريبية للتقييم للطالب:', student.full_name);

                    // إضافة بيانات تجريبية - سيتم حذف هذا في الإنتاج
                    formattedGrades = [
                        {
                            id: `test-1-${student.id}`,
                            studentName: student.full_name,
                            date: new Date().toISOString().split('T')[0],
                            memorization: 85,
                            recitation: 90,
                            tajweed: 80,
                            recordedBy: 'اختبار'
                        },
                        {
                            id: `test-2-${student.id}`,
                            studentName: student.full_name,
                            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            memorization: 75,
                            recitation: 80,
                            tajweed: 70,
                            recordedBy: 'اختبار'
                        }
                    ];
                }

                console.log('✅ الدرجات المنسقة:', formattedGrades.length, formattedGrades);

                console.log('الدرجات المنسقة:', formattedGrades);

                const formattedAttendance: Attendance[] = attendanceData?.map(record => {
                    console.log('تفاصيل سجل الحضور:', record);
                    return {
                        id: record.id,
                        date: record.circle_session?.[0]?.session_date || (record.recorded_at ? record.recorded_at.split('T')[0] : ''),
                        status: mapAttendanceStatus(record.status),
                        notes: record.note,
                        recordedBy: record.profiles ? record.profiles['full_name'] : 'غير معروف',
                    };
                }) || [];

                const formattedNotes: StudentNote[] = notesData?.map(note => ({
                    id: note.id,
                    date: note.date,
                    note: note.note,
                    type: note.type
                })) || [];

                // إضافة البيانات المجمعة إلى قائمة الطلاب
                fullStudentsData.push({
                    id: student.id,
                    fullName: student.full_name,
                    grade: student.grade_level || '',
                    circleName: student.study_circle?.name || '',
                    guardianId: guardianId,
                    teacherName: student.teacher?.full_name || '',
                    grades: formattedGrades || [],
                    attendance: formattedAttendance || [],
                    notes: formattedNotes || []
                });
            }

            return fullStudentsData;
        } catch (err) {
            console.error('خطأ في الاستعلام عن بيانات الطلاب:', err);
            setError('حدث خطأ أثناء الاستعلام عن البيانات. الرجاء المحاولة مرة أخرى.');
            return [];
        }
    };

    // عرض الرقم كما هو (أرقام متصلة بدون مسافات)
    const formatPhone = (raw: string) => raw.replace(/\D/g, '');

    const handlePhoneChange = (val: string) => {
        const digits = val.replace(/[^0-9]/g, '');
        setPhoneNumber(digits);
        setError(null);
        setTriggerShake(false);
    };

    const handleSearch = async () => {
        if (!phoneNumber) {
            setError('يرجى إدخال رقم الهاتف');
            setTriggerShake(true);
            return;
        }
        if (phoneNumber.length < 10) {
            setError('يرجى إدخال رقم هاتف صحيح (10 أرقام على الأقل)');
            setTriggerShake(true);
            return;
        }

        // تفعيل حالة التحميل
        setLoading(true);
        setError(null);
        setTriggerShake(false);
        setJustSearched(false);

        try {
            // تنفيذ البحث وانتظار النتيجة
            const studentsData = await fetchStudentsByGuardianPhone(phoneNumber);

            // تحديث البيانات بعد استلامها مباشرة
            setStudents(studentsData);

            if (studentsData.length === 0) {
                setError('لم يتم العثور على بيانات حقيقية');
            } else {
                // إظهار علامة النجاح بشكل مؤقت
                setJustSearched(true);
                setTimeout(() => setJustSearched(false), 1500);
            }
        } catch (err) {
            console.error('خطأ في البحث:', err);
            setError('حدث خطأ أثناء البحث. الرجاء المحاولة مرة أخرى.');
            setTriggerShake(true);
        } finally {
            // إيقاف التحميل وإظهار القسم بغض النظر عن النتيجة
            setLoading(false);
            setSearched(true);
        }
    };

    // الوظائف المساعدة
    const getGradeColor = (grade: number) => {
        if (grade >= 90) return "bg-green-100 text-green-800 border-green-200";
        if (grade >= 80) return "bg-blue-100 text-blue-800 border-blue-200";
        if (grade >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        return "bg-red-100 text-red-800 border-red-200";
    };

    // تحويل رمز الصف الدراسي إلى المسمى العربي
    const getGradeArabicName = (gradeCode: string) => {
        // استخدام القيم من ملف arabic-labels
        const gradeOption = studentsLabels.gradeOptions.find(option =>
            option.value.toLowerCase() === gradeCode?.toLowerCase()
        );

        return gradeOption ? gradeOption.label : (gradeCode || "غير محدد");
    };

    const getAttendanceColor = (status: string) => {
        if (status === 'حاضر') return "bg-green-100 text-green-800 border-green-200";
        if (status === 'متأخر') return "bg-yellow-100 text-yellow-800 border-yellow-200";
        return "bg-red-100 text-red-800 border-red-200";
    };

    // الحصول على اسم الحلقة
    const getCircleName = (circleName: string) => {
        return circleName || studyCirclesLabels.noCircles;
    };

    // تحويل حالة الحضور من الإنجليزية إلى العربية
    const mapAttendanceStatus = (status: string): string => {
        switch (status) {
            case 'present':
                return 'حاضر';
            case 'absent':
                return 'غائب';
            case 'late':
                return 'متأخر';
            case 'excused':
                return 'غياب بعذر';
            default:
                return status; // إرجاع الحالة كما هي إذا لم تكن معروفة
        }
    };

    // استرجاع سجل المعلمين السابقين للطالب
    const fetchTeacherHistory = async (studentId: string) => {
        try {
            const { data, error } = await supabase
                .from('student_teacher_history')
                .select(`
                    id,
                    start_date,
                    end_date,
                    profiles:teacher_id (full_name)
                `)
                .eq('student_id', studentId)
                .order('start_date', { ascending: false });

            if (error) {
                console.error('خطأ في استرجاع سجل المعلمين:', error);
                return [];
            }
            
            if (!data) return [];
            
            return data.map((record: any) => ({
                id: record.id,
                teacherName: record.profiles?.full_name || 'غير معروف',
                startDate: record.start_date,
                endDate: record.end_date
            }));
        } catch (error) {
            console.error('خطأ في استرجاع سجل المعلمين:', error);
            return [];
        }
    };

    // فتح نافذة تفاصيل الطالب (مباشر + تسجيل واضح)
    const handleStudentClick = (student: Student) => {
        console.log('%c[handleStudentClick]','color:green', student.id, student.fullName);
        setSelectedStudent(student);
        setDialogOpen(true);
        fetchTeacherHistory(student.id)
            .then(history => {
                setTeacherHistory(history);
                console.log('[TeacherHistory] count =', history.length);
            })
            .catch(err => console.error('خطأ في جلب سجل المعلمين:', err));
    };

    const getNoteTypeColor = (type: string) => {
        if (type === 'إشادة') return "bg-green-100 text-green-800 border-green-200";
        if (type === 'ملاحظة') return "bg-blue-100 text-blue-800 border-blue-200";
        if (type === 'تنبيه') return "bg-yellow-100 text-yellow-800 border-yellow-200";
        return "bg-gray-100 text-gray-800 border-gray-200";
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            calendar: 'gregory'
        });
    };

    const getAverageGrade = (student: Student) => {
        if (!student.grades || student.grades.length === 0) return 0;

        const total = student.grades.reduce((sum, grade) =>
            sum + grade.memorization + grade.recitation + grade.tajweed, 0
        );
        return Math.round(total / (student.grades.length * 3));
    };

    // حساب نسبة الحضور
    const getAttendanceRate = (student: Student) => {
        if (!student.attendance || student.attendance.length === 0) return 0;

        const presentCount = student.attendance.filter(a => a.status === 'حاضر').length;
        return Math.round((presentCount / student.attendance.length) * 100);
    };

    // (Replaced by persisted preference logic above)

    return (
        // استخدم div بدلاً من main لتجنب التداخل مع الـ main في App.tsx
        <div className="flex flex-col h-full min-h-[calc(100vh-64px-160px)] bg-gradient-to-br from-background via-islamic-light to-muted/40 px-1 py-1 md:py-2">
            <div className="mx-auto w-full max-w-3xl space-y-1 md:space-y-2">
                {/* Hero */}
                <header className="text-center space-y-2 md:space-y-3 animate-in fade-in slide-in-from-top-4 duration-500 my-1 md:my-3">
                    <div className="mx-auto h-14 w-14 md:h-20 md:w-20 grid place-items-center rounded-2xl bg-gradient-to-tr from-islamic-green via-islamic-green/80 to-accent shadow-lg ring-4 ring-islamic-green/10">
                        <Users className="h-7 w-7 md:h-10 md:w-10 text-white drop-shadow-sm" />
                    </div>
                    <h1 className="text-xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-islamic-green via-islamic-green/90 to-accent bg-clip-text text-transparent leading-snug">
                        استعلام أولياء الأمور
                    </h1>
                    <p className="hidden md:block text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                        تابع تقدم أبنائك في الحفظ والتلاوة والتجويد وسجل حضورهم بشكلٍ مبسط وسريع.
                    </p>
                </header>

                {/* Search Section */}
                <section aria-labelledby="guardian-search" className="relative">
                    <Card className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-islamic-green/30 bg-gradient-to-br from-white via-emerald-50/70 to-white dark:from-[#0f1f17] dark:via-[#13261d] dark:to-[#0f1f17]">
                        {/* زخرفة علوية */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-[linear-gradient(90deg,theme(colors.islamic-green)_0%,theme(colors.accent)_50%,theme(colors.islamic-green)_100%)] opacity-90" />
                        {/* هالات زخرفية */}
                        <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-islamic-green/10 blur-xl" />
                        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
                        {/* نمط زخرفي خافت */}
                        <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply bg-[radial-gradient(circle_at_25%_25%,#059669_0%,transparent_60%),radial-gradient(circle_at_75%_75%,#10b981_0%,transparent_55%)]" />
                        <CardContent className="relative px-1 py-1 md:p-2 space-y-1 md:space-y-1">
                            {loading && (
                                <div className="absolute inset-0 bg-white/70 dark:bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 text-islamic-green">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold animate-pulse">
                                            جاري البحث...
                                        </span>
                                        <div className="h-5 w-5 border-2 border-islamic-green/30 border-t-islamic-green rounded-full animate-spin" aria-hidden="true" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2" dir="rtl">
                                <Label htmlFor="phone" className="text-sm md:text-base font-medium text-gray-700">
                                    رقم هاتف ولي الأمر
                                </Label>
                                <div className={`relative group ${triggerShake ? 'animate-shake' : ''}`}>
                                    {/* البحث والأيقونات كمجموعة */}
                                    <div className="relative">
                                        <div className="flex rounded-xl overflow-hidden border border-islamic-green/30 shadow-sm">
                                            {/* أيقونة الهاتف (يمين) */}
                                            <div className="flex items-center justify-center px-2 sm:px-3.5 bg-slate-50 border-r border-islamic-green/20">
                                                <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-islamic-green/70 group-focus-within:text-islamic-green transition-colors" aria-hidden="true" />
                                            </div>

                                            {/* حقل الإدخال */}
                                            <Input
                                                id="phone"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                type="tel"
                                                placeholder="مثال: 01000000000"
                                                value={formatPhone(phoneNumber)}
                                                onChange={(e) => handlePhoneChange(e.target.value)}
                                                className="peer h-10 md:h-12 px-3 text-left border-0 flex-1 rounded-none focus-visible:ring-2 focus-visible:ring-islamic-green/50 focus-visible:border-0 bg-white/90 dark:bg-white/10 backdrop-blur-sm text-sm md:text-base transition-all disabled:opacity-70 min-w-0"
                                                dir="ltr"
                                                aria-label="رقم هاتف ولي الأمر"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                autoComplete="tel"
                                                style={{ fontSize: phoneNumber.length > 10 ? '0.875rem' : '' }}
                                            />

                                            {/* زر البحث (يسار) */}
                                            <button
                                                type="button"
                                                onClick={handleSearch}
                                                disabled={loading || !phoneNumber}
                                                className={`h-10 md:h-12 w-10 sm:w-14 flex items-center justify-center
                                                text-white
                                                border-l border-islamic-green/30
                                                bg-gradient-to-br from-islamic-green via-emerald-600 to-accent
                                                hover:brightness-105 active:brightness-95
                                                focus:outline-none focus-visible:ring-2 focus-visible:ring-islamic-green/60
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                                ${justSearched ? 'ring-1 ring-green-400/60 animate-pulse' : ''}`}
                                                aria-label={loading ? 'جارٍ البحث' : justSearched ? 'تم' : 'بحث'}
                                                title={loading ? 'جارٍ البحث' : justSearched ? 'تم بنجاح' : 'بحث'}
                                            >
                                                {loading ? (
                                                    <span className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/30 border-t-white rounded-full" />
                                                ) : justSearched ? (
                                                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
                                                ) : (
                                                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow" />
                                                )}
                                            </button>
                                        </div>

                                        {/* زر مسح داخل حقل الإدخال (على اليسار) */}
                                        {phoneNumber && !loading && (
                                            <button
                                                type="button"
                                                onClick={() => { setPhoneNumber(''); setError(null); setJustSearched(false); }}
                                                className="absolute left-[3.75rem] top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-gray-100/80 
                                                hover:bg-gray-200/90 text-islamic-green/80 hover:text-islamic-green flex 
                                                items-center justify-center border border-gray-200/40 z-10"
                                                aria-label="مسح الرقم"
                                                title="مسح"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {error && (
                                <div className="flex items-start gap-3 rounded-xl border border-red-300/60 bg-red-50/90 p-3 text-red-700 text-xs md:text-sm font-medium shadow-sm">
                                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="pointer-events-none absolute -inset-x-6 -top-6 h-20 bg-gradient-to-b from-islamic-green/10 to-transparent blur-2xl opacity-50" />
                </section>


                {/* Results */}
                {searched && (
                    <section aria-live="polite" className="space-y-8" dir="rtl">
                        {/* Guardian Information */}
                        {/* تم حذف كارد ولي الأمر حسب طلب المستخدم */}

                        {students.length > 0 ? (
                            <div
                                className={cn(
                                    students.length === 1
                                        ? 'flex justify-center max-w-screen-2xl mx-auto'
                                        : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 max-w-screen-2xl mx-auto'
                                )}
                            >
                                {students.map((student) => {
                                    const gradeTrend = (student.grades || [])
                                        .slice() // copy
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map(g => Math.round((g.memorization + g.recitation + g.tajweed) / 3));
                                    const recentTrend = gradeTrend.slice(-8); // last 8
                                    return (
                                        <Card
                                            key={student.id}
                                            className={cn(
                                                'group relative overflow-hidden rounded-3xl border border-islamic-green/15 bg-white/90 dark:bg-white/5 shadow-md ring-1 ring-transparent hover:shadow-xl hover:ring-islamic-green/30 transition-all w-full',
                                                students.length === 1 && 'max-w-md'
                                            )}
                                        >
                                            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-islamic-green/5 via-transparent to-accent/10" />
                                            
                                            <CardHeader className="relative pb-3 bg-gradient-to-r from-islamic-green/5 to-accent/5">
                                                <CardTitle className="text-base md:text-lg font-bold text-islamic-green flex items-start justify-between gap-2">
                                                    <div className="flex flex-col gap-1 max-w-[72%]">
                                                        <span className="truncate" title={student.fullName}>{student.fullName}</span>
                                                        {guardian && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-normal text-islamic-green/80 bg-islamic-green/10 rounded-md px-2 py-0.5 max-w-full truncate" title={`ولي الأمر: ${guardian.fullName}`}>
                                                                <Users size={11} className="text-islamic-green" />
                                                                <span className="truncate">{guardian.fullName}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-medium text-islamic-green/70 bg-islamic-green/10 px-2 py-0.5 rounded-full self-start">{getAverageGrade(student)}%</span>
                                                </CardTitle>
                                                <CardDescription className="flex flex-col gap-1 text-[11px] md:text-xs leading-relaxed" dir="rtl">
                                                    <div className="flex items-center gap-1.5">
                                                        <School size={14} className="text-islamic-green shrink-0" />
                                                        <span className="truncate">الصف: {getGradeArabicName(student.grade)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <BookOpen size={14} className="text-islamic-green shrink-0" />
                                                        <span className="truncate">الحلقة: {getCircleName(student.circleName)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <UserCircle size={14} className="text-islamic-green shrink-0" />
                                                        <span className="truncate">المعلم: {student.teacherName || 'غير محدد'}</span>
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="relative pb-4 space-y-4">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-xl p-3 text-center bg-gradient-to-br from-islamic-green/10 to-green-50 shadow-sm">
                                                        <p className="text-[10px] text-muted-foreground mb-1 tracking-wide">المعدل العام</p>
                                                        <p className="text-lg font-extrabold text-islamic-green">{getAverageGrade(student)}%</p>
                                                    </div>
                                                    <div className="rounded-xl p-3 text-center bg-gradient-to-br from-accent/10 to-green-50 shadow-sm">
                                                        <p className="text-[10px] text-muted-foreground mb-1 tracking-wide">نسبة الحضور</p>
                                                        <p className="text-lg font-extrabold text-islamic-green">{getAttendanceRate(student)}%</p>
                                                    </div>
                                                </div>
                                                <Tabs defaultValue="grades" className="w-full" dir="rtl">
                                                    <TabsList className="w-full rounded-xl bg-gray-50 p-1 grid grid-cols-3 text-[11px]">
                                                        <TabsTrigger value="grades" className="data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-lg py-1">الدرجات</TabsTrigger>
                                                        <TabsTrigger value="attendance" className="data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-lg py-1">الحضور</TabsTrigger>
                                                        <TabsTrigger value="notes" className="data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-lg py-1">الملاحظات</TabsTrigger>
                                                    </TabsList>
                                                    <TabsContent value="grades" className="mt-3 min-h-[82px]">
                                                        {student.grades.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.grades.slice(0, 3).map((grade) => (
                                                                    <div key={grade.id} className="border rounded-lg p-2.5 text-[11px] shadow-sm bg-white/60 backdrop-blur">
                                                                        <div className="flex justify-between mb-1">
                                                                            <span className="text-muted-foreground text-[10px]">{formatDate(grade.date)}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-2 text-center">
                                                                            <div>
                                                                                <span className="text-[10px] block text-muted-foreground">الحفظ</span>
                                                                                <Badge className={`${getGradeColor(grade.memorization)} px-1.5 py-0.5 text-[10px]`}>{grade.memorization}%</Badge>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] block text-muted-foreground">التلاوة</span>
                                                                                <Badge className={`${getGradeColor(grade.recitation)} px-1.5 py-0.5 text-[10px]`}>{grade.recitation}%</Badge>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-[10px] block text-muted-foreground">التجويد</span>
                                                                                <Badge className={`${getGradeColor(grade.tajweed)} px-1.5 py-0.5 text-[10px]`}>{grade.tajweed}%</Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4 text-[11px]">لا توجد درجات</p>
                                                        )}
                                                    </TabsContent>
                                                    <TabsContent value="attendance" className="mt-3 min-h-[82px]">
                                                        {student.attendance.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.attendance.slice(0, 4).map((record) => (
                                                                    <div key={record.id} className="flex justify-between items-center border rounded-lg p-2.5 text-[11px] shadow-sm bg-white/60 backdrop-blur">
                                                                        <div className="space-y-0.5">
                                                                            <span className="block text-[10px] text-muted-foreground">{formatDate(record.date)}</span>
                                                                            {record.recordedBy && (
                                                                                <span className="block text-[10px] text-gray-600">المسجل: {record.recordedBy}</span>
                                                                            )}
                                                                        </div>
                                                                        <Badge className={`${getAttendanceColor(record.status)} flex items-center gap-1 px-2 py-0.5 text-[10px]`}>{record.status}</Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4 text-[11px]">لا يوجد حضور</p>
                                                        )}
                                                    </TabsContent>
                                                    <TabsContent value="notes" className="mt-3 min-h-[82px]">
                                                        {student.notes.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.notes.slice(0, 3).map((note) => (
                                                                    <div key={note.id} className="border rounded-lg p-2.5 text-[11px] shadow-sm bg-white/60 backdrop-blur">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <Badge className={`${getNoteTypeColor(note.type)} px-2 py-0.5 text-[10px]`}>{note.type}</Badge>
                                                                            <span className="text-[10px] text-muted-foreground">{formatDate(note.date)}</span>
                                                                        </div>
                                                                        <p className="text-gray-700 leading-relaxed line-clamp-3">{note.note}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4 text-[11px]">لا توجد ملاحظات</p>
                                                        )}
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>
                                            <CardFooter className="pt-0">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full rounded-xl border-islamic-green text-islamic-green hover:bg-islamic-green/10 font-medium text-[12px] tracking-wide focus-visible:ring-2 focus-visible:ring-islamic-green/50"
                                                    data-btn="student-details"
                                                    onClick={(e) => {
                                                        console.log('%c[Button onClick fired]','color:purple', 'studentId=', student.id);
                                                        handleStudentClick(student);
                                                    }}
                                                >
                                                    عرض التفاصيل
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4"></div>
                        )}
                    </section>
                )}

                {/* Student Details Dialog */}
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) setSelectedStudent(null);
                    }}
                >
                    <DialogContent
                        dir="rtl"
                        className="w-[94vw] max-w-[320px] max-h-[90vh] sm:max-w-3xl overflow-y-auto rounded-xl p-2 sm:p-3 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100 text-xs sm:text-sm"
                    >
                        {selectedStudent && (
                            <>
                                <div className="space-y-4 mt-2">
                                    <div></div>
                                    {/* Personal Information */}
                                    <div className="bg-gradient-to-b from-green-900 via-green-500 to-green-200 dark:from-green-900 dark:via-green-800 dark:to-green-600 rounded-xl p-2 sm:p-4 shadow-md border border-green-200 dark:border-green-700">
                                        <h3 className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-white dark:text-white mb-2 sm:mb-4 border-b border-green-200 dark:border-green-700 pb-1 sm:pb-2">
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                🧾 المعلومات الشخصية :
                                                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span className="text-yellow-300 text-xs sm:text-sm truncate">{selectedStudent.fullName}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPersonalInfoCollapsed(!personalInfoCollapsed);
                                                }}
                                                className={cn(
                                                    'h-7 w-7 inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20 transition-all shadow-sm transform',
                                                    !personalInfoCollapsed && 'rotate-180'
                                                )}
                                                aria-label={personalInfoCollapsed ? "عرض المعلومات الشخصية" : "إخفاء المعلومات الشخصية"}
                                                title={personalInfoCollapsed ? "عرض المعلومات الشخصية" : "إخفاء المعلومات الشخصية"}
                                            >
                                                <ChevronDown className="h-4 w-4 transition-transform" />
                                            </button>
                                        </h3>

                                        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 ${personalInfoCollapsed ? 'hidden' : ''}`}>

                                            {/* الصف الدراسي */}
                                            <div className="bg-sky-200 dark:bg-sky-700 rounded-lg shadow-sm p-2 border border-green-200 dark:border-green-700">
                                                <Label className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">الصف الدراسي</Label>
                                                <p className="font-medium text-[11px] sm:text-sm text-gray-800 dark:text-green-200 mt-0.5 sm:mt-1 truncate">
                                                    {getGradeArabicName(selectedStudent.grade)}
                                                </p>
                                            </div>

                                            {/* الحلقة */}
                                            <div className="bg-sky-200 dark:bg-sky-700 rounded-lg shadow-sm p-2 border border-green-200 dark:border-green-700">
                                                <Label className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">الحلقة</Label>
                                                <p className="font-medium text-[11px] sm:text-sm text-gray-800 dark:text-green-200 mt-0.5 sm:mt-1 truncate">
                                                    {getCircleName(selectedStudent.circleName)}
                                                </p>
                                            </div>

                                            {/* المعلم الحالي */}
                                            <div className="bg-sky-200 dark:bg-sky-700 rounded-lg shadow-sm p-3 border border-green-200 dark:border-green-700">
                                                <Label className="text-xs text-gray-500 dark:text-gray-300">المعلم الحالي</Label>
                                                <p className="font-medium text-gray-800 dark:text-green-200 mt-1">
                                                    {selectedStudent.teacherName || 'غير محدد'}
                                                </p>
                                            </div>

                                        </div>
                                    </div>



                                    {/* Attendance */}
                                    <div>
                                        <GenericTable
                                            title={<h3 className="flex flex-wrap items-center gap-1 sm:gap-2 
                                                                            text-xs sm:text-sm font-semibold text-white dark:text-purple-500 
                                                                            mb-2 sm:mb-4 border-b border-white pb-1 sm:pb-2">
                                                📅 سجل الحضور
                                            </h3>}
                                            defaultView="table"
                                            enablePagination
                                            defaultPageSize={5}
                                            pageSizeOptions={[5, 10, 15, 20]}
                                            data={selectedStudent.attendance}
                                            hideSortToggle={false}
                                            isCollapsed={attendanceCollapsed}
                                            collapsible={true}
                                            onCollapseChange={(collapsed) => setAttendanceCollapsed(collapsed)}
                                            className="rounded-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
                                            getRowClassName={(_, index) =>
                                                `${index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'} transition-colors`
                                            }
                                            columns={[
                                                {
                                                    key: 'row_index',
                                                    header: '🔢',
                                                    width: '40px',
                                                    align: 'center',
                                                    render: (_: any, globalIndex?: number) => <span className="text-[11px] font-medium">{(globalIndex ?? 0) + 1}</span>
                                                },
                                                {
                                                    key: 'recordedBy',
                                                    header: '👤 المسجل',
                                                    align: 'right',
                                                    render: (record) => (
                                                        <span className="font-medium text-gray-700 text-xs">
                                                            {record.recordedBy || <span className="text-gray-400">غير معروف</span>}
                                                        </span>
                                                    )
                                                },
                                                {
                                                    key: 'date',
                                                    header: '📅 التاريخ',
                                                    align: 'center',
                                                    render: (record) => formatDate(record.date)
                                                },
                                                {
                                                    key: 'status',
                                                    header: '📋 الحالة',
                                                    align: 'center',
                                                    render: (record) => (
                                                        <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shadow-sm ${getAttendanceColor(record.status)}`}>
                                                            {record.status === "present" ? "✅ حاضر"
                                                                : record.status === "absent" ? "❌ غائب"
                                                                    : record.status === "late" ? "⏰ متأخر"
                                                                        : record.status === "excused" ? "📝 معذور"
                                                                            : record.status}
                                                        </Badge>
                                                    )
                                                },
                                                {
                                                    key: 'notes',
                                                    header: '📝 ملاحظات',
                                                    align: 'right',
                                                    render: (record) => (
                                                        <span className="text-gray-600 text-xs">
                                                            {record.notes || <span className="text-gray-400">لا توجد ملاحظات</span>}
                                                        </span>
                                                    )
                                                }
                                            ]}
                                            emptyMessage="لا توجد سجلات حضور"
                                        />
                                    </div>

                                    {/* Grades/Assessments */}
                                    <div>
                                        {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                                            <GenericTable
                                                title={<h3 className="flex flex-wrap items-center gap-1 sm:gap-2 
                                                                                text-xs sm:text-sm font-semibold text-white 
                                                                                dark:text-white 
                                                                                mb-2 sm:mb-4 border-b border-white pb-1 sm:pb-2">
                                                    📖 سجل الحفظ والتقييم
                                                </h3>}
                                                defaultView="table"
                                                enablePagination
                                                defaultPageSize={5}
                                                pageSizeOptions={[5, 10, 15, 20]}
                                                data={selectedStudent.grades}
                                                hideSortToggle={false}
                                                isCollapsed={gradesCollapsed}
                                                collapsible={true}
                                                onCollapseChange={(collapsed) => setGradesCollapsed(collapsed)}
                                                className="rounded-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
                                                getRowClassName={(_, index) =>
                                                    `${index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'} transition-colors`
                                                }
                                                columns={[
                                                    {
                                                        key: 'row_index',
                                                        header: '🔢',
                                                        width: '40px',
                                                        align: 'center',
                                                        render: (_: any, globalIndex?: number) => <span className="text-[11px] font-medium">{(globalIndex ?? 0) + 1}</span>
                                                    },
                                                    { key: 'date', header: '📅 التاريخ', align: 'center', render: (grade) => formatDate(grade.date) },
                                                    { key: 'recordedBy', header: '👤 المقيم', align: 'right', render: (grade) => <span className="font-medium text-gray-700 text-xs">{grade.recordedBy || <span className="text-gray-400">غير معروف</span>}</span> },
                                                    { key: 'memorization', header: '📝 الحفظ', align: 'center', render: (grade) => <span className="text-xs">{grade.memorization}%</span> },
                                                    { key: 'recitation', header: '📝 التلاوة', align: 'center', render: (grade) => <span className="text-xs">{grade.recitation}%</span> },
                                                    { key: 'tajweed', header: '📝 التجويد', align: 'center', render: (grade) => <span className="text-xs">{grade.tajweed}%</span> },
                                                    {
                                                        key: 'average', header: '📊 المعدل', align: 'center', render: (grade) => {
                                                            const average = Math.round((grade.memorization + grade.recitation + grade.tajweed) / 3);
                                                            return <Badge className={getGradeColor(average)}>{average}%</Badge>
                                                        }
                                                    }
                                                ]}
                                                emptyMessage="لا توجد تقييمات مسجلة"
                                            />
                                        ) : (
                                            <div className="text-center py-2 bg-white rounded-lg shadow-sm border border-blue-100 text-xs">
                                                <p className="text-gray-400">لا توجد تقييمات مسجلة</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <GenericTable
                                            title={<h3 className="flex flex-wrap items-center gap-1 sm:gap-2 
                                                                            text-xs sm:text-sm font-semibold text-white dark:text-purple-500 
                                                                            mb-2 sm:mb-4 border-b border-white pb-1 sm:pb-2">
                                                📝 ملاحظات المعلم
                                            </h3>}
                                            defaultView="table"
                                            enablePagination
                                            defaultPageSize={5}
                                            pageSizeOptions={[5, 10, 15, 20]}
                                            data={selectedStudent.notes}
                                            hideSortToggle={false}
                                            isCollapsed={notesCollapsed}
                                            collapsible={true}
                                            onCollapseChange={(collapsed) => setNotesCollapsed(collapsed)}
                                            className="rounded-xl border border-amber-300 shadow-sm text-[10px] sm:text-[11px]"
                                            getRowClassName={(_, index) =>
                                                `${index % 2 === 0 ? 'bg-white hover:bg-amber-50' : 'bg-amber-50/30 hover:bg-amber-100/50'} transition-colors`
                                            }
                                            columns={[
                                                {
                                                    key: 'row_index',
                                                    header: '🔢',
                                                    width: '40px',
                                                    align: 'center',
                                                    render: (_: any, globalIndex?: number) => <span className="text-[11px] font-medium">{(globalIndex ?? 0) + 1}</span>
                                                },
                                                {
                                                    key: 'type',
                                                    header: '📌 النوع',
                                                    align: 'center',
                                                    render: (record) => <Badge className={getNoteTypeColor(record.type)}>{record.type}</Badge>
                                                },
                                                {
                                                    key: 'date',
                                                    header: '📅 التاريخ',
                                                    align: 'center',
                                                    render: (record) => formatDate(record.date)
                                                },
                                                {
                                                    key: 'note',
                                                    header: '📝 الملاحظة',
                                                    align: 'right',
                                                    render: (record) => <span className="text-gray-600 text-xs">{record.note}</span>
                                                }
                                            ]}
                                            emptyMessage="لا توجد ملاحظات مسجلة"
                                        />
                                    </div>

                                    {/* Teacher History */}
                                    <div>
                                        <GenericTable
                                            title={<h3 className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold text-white dark:text-purple-500 mb-2 sm:mb-4 border-b border-white pb-1 sm:pb-2">
                                                👨‍🏫 سجل المعلمين السابقين
                                            </h3>}
                                            defaultView="table"
                                            enablePagination
                                            defaultPageSize={5}
                                            pageSizeOptions={[5, 10, 15, 20]}
                                            data={teacherHistory}
                                            hideSortToggle={false}
                                            isCollapsed={teacherHistoryCollapsed}
                                            collapsible={true}
                                            onCollapseChange={(collapsed) => setTeacherHistoryCollapsed(collapsed)}
                                            className="rounded-b-xl border border-green-300 shadow-sm text-[10px] sm:text-[11px]"
                                            getRowClassName={(_, index) =>
                                                `${index % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'} transition-colors`
                                            }
                                            columns={[
                                                {
                                                    key: 'row_index',
                                                    header: '�',
                                                    width: '40px',
                                                    align: 'center',
                                                    render: (_: any, globalIndex?: number) => <span className="text-[11px] font-medium">{(globalIndex ?? 0) + 1}</span>
                                                },
                                                { key: 'teacherName', header: '👨‍🏫 المعلم', align: 'right' },
                                                { key: 'startDate', header: '📅 تاريخ البداية', align: 'center', render: (record) => formatDate(record.startDate) },
                                                { key: 'endDate', header: '📅 تاريخ النهاية', align: 'center', render: (record) => record.endDate ? formatDate(record.endDate) : 'حتى الآن' }
                                            ]}
                                            emptyMessage="لا يوجد سجل معلمين سابقين"
                                        />
                                    </div>

                                </div>

                                <DialogFooter dir="rtl" className="flex justify-center mt-2 sm:mt-3">
                                    <Button
                                        onClick={() => setDialogOpen(false)}
                                        className="bg-yellow-300 hover:bg-yellow-400 text-gray-800 text-[10px] sm:text-xs px-4 py-1 rounded-lg shadow-md"
                                    >
                                        إغلاق
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}