import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Smartphone, Users, BookOpen, Award, Volume2, Calendar, ClipboardCheck,
    Info, AlertCircle, CheckCircle, XCircle, Clock, School, UserCircle, Edit, Star, History
} from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentsLabels, studyCirclesLabels } from "@/lib/arabic-labels";
import { getStudentsByGuardianId } from "@/lib/supabase-service";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";


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
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [teacherHistory, setTeacherHistory] = useState<TeacherHistory[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

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

    const handleSearch = async () => {
        if (!phoneNumber) {
            setError('يرجى إدخال رقم الهاتف');
            return;
        }

        if (phoneNumber.length < 10) {
            setError('يرجى إدخال رقم هاتف صحيح (10 أرقام على الأقل)');
            return;
        }
        setLoading(true);
        setSearched(true);
        setError(null);
        try {
            const studentsData = await fetchStudentsByGuardianPhone(phoneNumber);
            setStudents(studentsData);
            if (studentsData.length === 0) {
                setError('لم يتم العثور على بيانات حقيقية');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (err) {
            console.error('خطأ في البحث:', err);
            setError('حدث خطأ أثناء البحث. الرجاء المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
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

    // فتح نافذة تفاصيل الطالب
    const handleStudentClick = async (student: Student) => {
        setSelectedStudent(student);
        const history = await fetchTeacherHistory(student.id);
        setTeacherHistory(history);
        setDialogOpen(true);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-islamic-light to-muted p-4">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-islamic-green to-accent rounded-full w-fit">
                        <Users className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-islamic-green to-accent bg-clip-text text-transparent mb-2">
                        استعلام أولياء الأمور
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        تابع تقدم أبنائك في حفظ وتلاوة القرآن الكريم
                    </p>
                </div>

                {/* Search Card */}
                <Card className="mb-10 rounded-2xl overflow-hidden shadow-xl border border-islamic-green/20 bg-white">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-islamic-green to-green-700 text-white p-5">
                        <CardTitle className="text-xl flex items-center gap-3 font-semibold">
                            <Smartphone size={26} className="text-yellow-200" />
                            البحث برقم الهاتف
                        </CardTitle>
                        <CardDescription className="text-white/80">
                            أدخل رقم هاتف ولي الأمر للاطلاع على بيانات الطلاب
                        </CardDescription>
                    </CardHeader>

                    {/* Content */}
                    <CardContent className="p-6 space-y-5">
                        {/* Input + Button */}
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-base font-medium text-gray-700">
                                رقم هاتف ولي الأمر
                            </Label>
                            <div className="flex w-full overflow-hidden rounded-xl border border-islamic-green/30 shadow-sm focus-within:ring-2 focus-within:ring-islamic-green">
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="مثال: 0100000000"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="flex-1 text-right px-4 py-2 border-0 focus:ring-0"
                                    dir="rtl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSearch();
                                    }}
                                />
                                <Button
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="px-8 rounded-none bg-gradient-to-r from-islamic-green to-accent hover:from-islamic-green/90 hover:to-accent/90"
                                >
                                    {loading ? "جاري البحث..." : "بحث"}
                                </Button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
                                <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                                <span>{error}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>


                {/* Results */}
                {searched && (
                    <div className="space-y-6">
                        {/* Guardian Information */}
                        {guardian && (
                            <Card className="border border-green-200/40 shadow-xl rounded-2xl overflow-hidden mb-6 bg-gradient-to-b from-white to-green-50">
                                <CardHeader className="bg-green-600/90 text-white p-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xl flex items-center gap-2 font-semibold">
                                        <Users size={22} className="text-yellow-200" />
                                        بيانات ولي الأمر
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* الاسم */}
                                        <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
                                            <Label className="text-sm text-green-700">الاسم</Label>
                                            <p className="font-semibold text-lg text-gray-800 mt-1">{guardian.fullName}</p>
                                        </div>

                                        {/* رقم الهاتف */}
                                        <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100">
                                            <Label className="text-sm text-green-700">رقم الهاتف</Label>
                                            <p className="font-semibold text-lg text-gray-800 mt-1">{guardian.phoneNumber}</p>
                                        </div>

                                        {/* البريد الإلكتروني */}
                                        {guardian.email && (
                                            <div className="bg-white rounded-lg shadow-sm p-4 border border-green-100 md:col-span-2">
                                                <Label className="text-sm text-green-700">البريد الإلكتروني</Label>
                                                <p className="font-semibold text-gray-800 mt-1">{guardian.email}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                        )}

                        {students.length > 0 ? (
                            <>
                                {/* Students Summary */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {students.map((student) => (
                                        <Card
                                            key={student.id}
                                            className="rounded-2xl border border-islamic-green/10 hover:border-islamic-green/40 transition-all shadow-md hover:shadow-xl overflow-hidden cursor-pointer"

                                        >
                                            {/* Header */}
                                            <CardHeader className="pb-3 bg-gradient-to-r from-islamic-green/5 to-accent/5">
                                                <CardTitle className="text-lg font-bold text-islamic-green">{student.fullName}</CardTitle>
                                                <CardDescription className="flex flex-col gap-1 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <School size={16} className="text-islamic-green" />
                                                        <span>
                                                            الصف: {getGradeArabicName(student.grade)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen size={16} className="text-islamic-green" />
                                                        <span> الحلقة: {getCircleName(student.circleName)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle size={16} className="text-islamic-green" />
                                                        <span> المعلم: {student.teacherName || 'غير محدد'}</span>
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>

                                            {/* Content */}
                                            <CardContent className="pb-4">
                                                {/* Summary Boxes */}
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="bg-gradient-to-br from-islamic-green/10 to-green-50 rounded-xl p-3 text-center shadow-sm">
                                                        <p className="text-xs text-muted-foreground mb-1">المعدل العام</p>
                                                        <p className="text-xl font-extrabold text-islamic-green">{getAverageGrade(student)}%</p>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-accent/10 to-green-50 rounded-xl p-3 text-center shadow-sm">
                                                        <p className="text-xs text-muted-foreground mb-1">نسبة الحضور</p>
                                                        <p className="text-xl font-extrabold text-islamic-green">{getAttendanceRate(student)}%</p>
                                                    </div>
                                                </div>

                                                {/* Tabs */}
                                                <Tabs defaultValue="grades" className="w-full">
                                                    <TabsList className="w-full rounded-lg bg-gray-50 p-1">
                                                        <TabsTrigger
                                                            value="grades"
                                                            className="flex-1 data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-md"
                                                        >
                                                            الدرجات
                                                        </TabsTrigger>
                                                        <TabsTrigger
                                                            value="attendance"
                                                            className="flex-1 data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-md"
                                                        >
                                                            الحضور
                                                        </TabsTrigger>
                                                        <TabsTrigger
                                                            value="notes"
                                                            className="flex-1 data-[state=active]:bg-islamic-green data-[state=active]:text-white rounded-md"
                                                        >
                                                            الملاحظات
                                                        </TabsTrigger>
                                                    </TabsList>

                                                    {/* Grades */}
                                                    <TabsContent value="grades" className="mt-3">
                                                        {student.grades.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.grades.slice(0, 3).map((grade) => (
                                                                    <div key={grade.id} className="border rounded-lg p-3 text-sm shadow-sm">
                                                                        <div className="flex justify-between mb-2">
                                                                            <span className="text-muted-foreground text-xs">{formatDate(grade.date)}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-3 gap-2 text-center">
                                                                            <div>
                                                                                <span className="text-xs block text-muted-foreground">الحفظ</span>
                                                                                <Badge className={getGradeColor(grade.memorization)}>
                                                                                    {grade.memorization}%
                                                                                </Badge>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs block text-muted-foreground">التلاوة</span>
                                                                                <Badge className={getGradeColor(grade.recitation)}>
                                                                                    {grade.recitation}%
                                                                                </Badge>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-xs block text-muted-foreground">التجويد</span>
                                                                                <Badge className={getGradeColor(grade.tajweed)}>
                                                                                    {grade.tajweed}%
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4">لا توجد درجات مسجلة بعد</p>
                                                        )}
                                                    </TabsContent>

                                                    {/* Attendance */}
                                                    <TabsContent value="attendance" className="mt-3">
                                                        {student.attendance.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.attendance.slice(0, 5).map((record) => (
                                                                    <div key={record.id} className="flex justify-between items-center border rounded-lg p-3 text-sm shadow-sm">
                                                                        <div>
                                                                            <span className="block text-xs text-muted-foreground">{formatDate(record.date)}</span>
                                                                            {record.recordedBy && (
                                                                                <span className="block text-xs text-gray-600 mt-1">
                                                                                    <span className="text-gray-500">المسجل:</span> {record.recordedBy}
                                                                                </span>
                                                                            )}
                                                                            {record.notes && (
                                                                                <span className="block text-xs text-gray-600 mt-1">
                                                                                    <span className="text-gray-500">ملاحظات:</span> {record.notes}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <Badge className={getAttendanceColor(record.status)}>
                                                                            {record.status === 'present' ? (
                                                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                                            ) : record.status === 'late' ? (
                                                                                <Clock className="h-3 w-3 mr-1" />
                                                                            ) : (
                                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                            )}
                                                                            {record.status === "present" ? "حاضر"
                                                                                : record.status === "absent" ? "غائب"
                                                                                    : record.status === "late" ? "متأخر"
                                                                                        : record.status === "excused" ? "معذور"
                                                                                            : record.status}
                                                                        </Badge>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4">لا توجد سجلات حضور بعد</p>
                                                        )}
                                                    </TabsContent>

                                                    {/* Notes */}
                                                    <TabsContent value="notes" className="mt-3">
                                                        {student.notes.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {student.notes.map((note) => (
                                                                    <div key={note.id} className="border rounded-lg p-3 text-sm shadow-sm">
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <Badge className={getNoteTypeColor(note.type)}>{note.type}</Badge>
                                                                            <span className="text-xs text-muted-foreground">{formatDate(note.date)}</span>
                                                                        </div>
                                                                        <p className="text-gray-700">{note.note}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-muted-foreground py-4">لا توجد ملاحظات مسجلة بعد</p>
                                                        )}
                                                    </TabsContent>
                                                </Tabs>
                                            </CardContent>

                                            {/* Footer */}
                                            <CardFooter>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full rounded-lg border-islamic-green text-islamic-green hover:bg-islamic-green/10 font-medium"
                                                    onClick={() => {
                                                        setSelectedStudent(student);
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    عرض التفاصيل الكاملة
                                                </Button>
                                            </CardFooter>
                                        </Card>


                                    ))}
                                </div>
                            </>
                        ) : (
                            <Card className="border-yellow-200 bg-yellow-50">
                                <CardContent className="text-center py-8">
                                    <p className="text-lg text-yellow-800">
                                        لم يتم العثور على بيانات مرتبطة بهذا الرقم
                                    </p>
                                    <p className="text-yellow-600 mt-2">
                                        تأكد من صحة رقم الهاتف أو تواصل مع إدارة المكتب
                                    </p>
                                    <p className="text-yellow-600 mt-2">
                                        إذا كنت تبحث عن الرقم 0102000000 فنحن نقوم بتشخيص المشكلة، يرجى التحقق من سجلات الخادم
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Back to Home */}
                <div className="text-center mt-8">
                    <Button
                        variant="outline"
                        onClick={() => onNavigate('/')}
                        className="border-islamic-green text-islamic-green hover:bg-islamic-green/30"
                    >
                        العودة للصفحة الرئيسية
                    </Button>
                </div>

                {/* Student Details Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent
                        dir="rtl"
                        className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl p-3 shadow-lg bg-gradient-to-r from-blue-50 to-green-50 border border-gray-100 text-sm"
                    >
                        {selectedStudent && (
                            <>
                                <div className="space-y-4 mt-2">
                                    <div></div>
                                    {/* Personal Information */}
                                    <div className="bg-gradient-to-b from-green-900 via-green-500 to-green-200 dark:from-green-900 dark:via-green-800 dark:to-green-600 rounded-2xl p-4 shadow-md border border-green-200 dark:border-green-700">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold text-white dark:text-white mb-4 border-b border-green-200 dark:border-green-700 pb-2">
                                            🧾 المعلومات الشخصية :
                                            <UserCircle className="h-5 w-5" />
                                            <span className="text-yellow-300">{selectedStudent.fullName}</span>
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

                                            {/* الصف الدراسي */}
                                            <div className="bg-sky-200 dark:bg-sky-700 rounded-lg shadow-sm p-3 border border-green-200 dark:border-green-700">
                                                <Label className="text-xs text-gray-500 dark:text-gray-300">الصف الدراسي</Label>
                                                <p className="font-medium text-gray-800 dark:text-green-200 mt-1">
                                                    {getGradeArabicName(selectedStudent.grade)}
                                                </p>
                                            </div>

                                            {/* الحلقة */}
                                            <div className="bg-sky-200 dark:bg-sky-700 rounded-lg shadow-sm p-3 border border-green-200 dark:border-green-700">
                                                <Label className="text-xs text-gray-500 dark:text-gray-300">الحلقة</Label>
                                                <p className="font-medium text-gray-800 dark:text-green-200 mt-1">
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
                                        <h3 className="text-sm font-medium text-green-700 mb-2 border-b border-green-200 pb-1">
                                            📅 سجل الحضور (آخر 5 جلسات)
                                        </h3>
                                        <GenericTable
                                            data={selectedStudent.attendance.slice(0, 5)}
                                            columns={[
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
                                            className="overflow-hidden rounded-lg text-xs"
                                            getRowClassName={(_, index) =>
                                                `${index % 2 === 0 ? "bg-white" : "bg-green-50/70"} hover:bg-green-100/60`
                                            }
                                        />
                                    </div>

                                    {/* Grades/Assessments */}
                                    <div>
                                        <h3 className="text-sm font-medium text-green-700 mb-2 border-b border-green-200 pb-1">
                                            📖 الحفظ والتقييم (آخر 5 تسجيلات)
                                        </h3>
                                        {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
                                            <GenericTable
                                                data={selectedStudent.grades.slice(0, 5)}
                                                columns={[
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
                                                className="overflow-hidden rounded-lg text-xs"
                                                getRowClassName={(_, index) =>
                                                    `${index % 2 === 0 ? "bg-white" : "bg-blue-50/70"} hover:bg-blue-100/60`
                                                }
                                            />
                                        ) : (
                                            <div className="text-center py-2 bg-white rounded-lg shadow-sm border border-blue-100 text-xs">
                                                <p className="text-gray-400">لا توجد تقييمات مسجلة</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <h3 className="text-sm font-medium text-green-700 mb-2 border-b border-green-200 pb-1">
                                            📝 ملاحظات المعلم
                                        </h3>
                                        <div className="space-y-1">
                                            {selectedStudent.notes.map(note => (
                                                <div key={note.id} className="bg-white rounded-lg shadow-sm p-2 border border-green-200 text-xs">
                                                    <div className="flex justify-between items-start">
                                                        <Badge className={getNoteTypeColor(note.type)}>{note.type}</Badge>
                                                        <span className="text-xs text-gray-500">{formatDate(note.date)}</span>
                                                    </div>
                                                    <p className="mt-1">{note.note}</p>
                                                </div>
                                            ))}
                                            {selectedStudent.notes.length === 0 && (
                                                <div className="text-center text-gray-400 py-2 text-xs">
                                                    لا توجد ملاحظات مسجلة
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Teacher History */}
                                    <div>
                                        <h3 className="text-sm font-medium text-green-700 mb-2 border-b border-green-200 pb-1">
                                            👨‍🏫 سجل المعلمين السابقين
                                        </h3>
                                        <GenericTable
                                            data={teacherHistory}
                                            columns={[
                                                { key: 'teacherName', header: '👨‍🏫 المعلم', align: 'right' },
                                                { key: 'startDate', header: '📅 تاريخ البداية', align: 'center', render: (record) => formatDate(record.startDate) },
                                                { key: 'endDate', header: '📅 تاريخ النهاية', align: 'center', render: (record) => record.endDate ? formatDate(record.endDate) : 'حتى الآن' }
                                            ]}
                                            emptyMessage="لا يوجد سجل معلمين سابقين"
                                            className="overflow-hidden rounded-lg text-xs"
                                            getRowClassName={(_, index) =>
                                                `${index % 2 === 0 ? "bg-white" : "bg-purple-50/50"} hover:bg-purple-100/40`
                                            }
                                        />
                                    </div>

                                </div>

                                <DialogFooter dir="rtl" className="flex justify-center mt-3">
                                    <Button
                                        onClick={() => setDialogOpen(false)}
                                        className="bg-yellow-300 hover:bg-yellow-400 text-gray-800 text-xs px-4 py-1 rounded-lg shadow-md"
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