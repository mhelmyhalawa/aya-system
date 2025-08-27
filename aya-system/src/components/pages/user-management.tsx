import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { StudyCircle, StudyCircleUpdate, StudyCircleCreate } from '@/types/study-circle';
import { StudyCircleSchedule, StudyCircleScheduleCreate, StudyCircleScheduleUpdate, weekdayOptions, getWeekdayName, formatTime } from '@/types/study-circle-schedule';
import { Profile, UserRole, ProfileCreate, ProfileUpdate } from "@/types/profile";
import {
  getAdmins,
  getteachersForManagement,
  getSuperAdmins,
  createProfile,
  updateProfile,
  getProfileById,
  deleteProfile,
  changePassword,
  adminChangePassword
} from "@/lib/profile-service";
import { getStudyCircleCountByTeacherIds, getStudyCirclesByTeacherId, updateStudyCircle, createStudyCircle, deleteStudyCircle } from '@/lib/study-circle-service';
import { getStudyCircleSchedules, createStudyCircleSchedule, updateStudyCircleSchedule, deleteStudyCircleSchedule } from '@/lib/study-circle-schedule-service';
import { Shield, User, UserCheck, Eye, EyeOff, Pencil, UserPlus, AlertTriangle, Trash2, KeyRound, Crown, BookOpen, Calendar, Clock, MapPin, Plus, Info, NotebookPenIcon, User2Icon, RefreshCwIcon } from "lucide-react";
import { userManagementLabels, errorMessages, successMessages, commonLabels } from "@/lib/arabic-labels";

interface UserManagementProps {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | null;
  currentUserId?: string; // ID of the current logged-in user
  teacherOnly?: boolean;  // Flag to show only the teacher's own profile
}

export function UserManagement({ onNavigate, userRole, currentUserId, teacherOnly = false }: UserManagementProps) {
  // List state
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [teachers, setteachers] = useState<Profile[]>([]);
  const [superadmins, setSuperadmins] = useState<Profile[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(teacherOnly ? "teachers" : "admins");

  // دالة إعادة تحميل أعداد الحلقات
  const refreshCircleCounts = async () => {
    try {
      let usersList: Profile[] = [];
      if (activeTab === "teachers") {
        usersList = teachers;
      } else if (activeTab === "admins") {
        usersList = admins;
      } else if (activeTab === "superadmins") {
        usersList = superadmins;
      }

      if (usersList.length > 0) {
        const ids = usersList.map(u => u.id);
        console.log('🔄 refreshCircleCounts - ids to refresh:', ids);

        const counts = await getStudyCircleCountByTeacherIds(ids);
        console.log('🔄 refreshCircleCounts - updated counts:', counts);

        setTeacherCircleCounts(counts);
      }
    } catch (error) {
      console.error('❌ Error refreshing circle counts:', error);
    }
  };

  // Dialog state

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(userManagementLabels.addUserForm.title);

  // Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleteCircleDialogOpen, setIsDeleteCircleDialogOpen] = useState(false);
  const [circleToDelete, setCircleToDelete] = useState<StudyCircle | null>(null);
  const [isDeleteScheduleDialogOpen, setIsDeleteScheduleDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<StudyCircleSchedule | null>(null);

  // Change password dialog
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<Profile | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User form
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<UserRole>("admin");
  const [showPassword, setShowPassword] = useState(false);

  // Dialog to show study circles for selected teacher/supervisor
  const [openCirclesDialog, setOpenCirclesDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null);
  const [teacherCircles, setTeacherCircles] = useState<StudyCircle[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(false);

  // Edit circle dialog state
  const [openEditCircleDialog, setOpenEditCircleDialog] = useState(false);
  const [editingCircle, setEditingCircle] = useState<StudyCircle | null>(null);
  const [savingCircleEdit, setSavingCircleEdit] = useState(false);
  const [editCircleForm, setEditCircleForm] = useState({
    name: '',
    max_students: ''
  });

  // Add circle dialog state
  const [openAddCircleDialog, setOpenAddCircleDialog] = useState(false);
  const [savingNewCircle, setSavingNewCircle] = useState(false);
  const [addCircleForm, setAddCircleForm] = useState({
    name: '',
    max_students: ''
  });

  // جدولة الحلقات
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [selectedCircleForSchedule, setSelectedCircleForSchedule] = useState<StudyCircle | null>(null);
  const [circleSchedules, setCircleSchedules] = useState<StudyCircleSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // إضافة جدولة جديدة
  const [openAddScheduleDialog, setOpenAddScheduleDialog] = useState(false);
  const [savingNewSchedule, setSavingNewSchedule] = useState(false);
  const [addScheduleForm, setAddScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // تعديل جدولة
  const [openEditScheduleDialog, setOpenEditScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<StudyCircleSchedule | null>(null);
  const [savingScheduleEdit, setSavingScheduleEdit] = useState(false);
  const [editScheduleForm, setEditScheduleForm] = useState({
    weekday: '0',
    start_time: '08:00',
    end_time: '09:00',
    location: ''
  });

  // State to hold the count of study circles for each teacher
  const [teacherCircleCounts, setTeacherCircleCounts] = useState<Record<string, number>>({});

  const { toast } = useToast();

  // Load data
  useEffect(() => {
    loadUsers();
  }, []);

  // بعد تحميل قائمة المعلمين أو المشرفين، اجلب عدد الحلقات لكل مستخدم
  useEffect(() => {
    async function fetchCircleCounts() {
      let usersList = [];
      if (activeTab === 'teachers') {
        usersList = teachers;
      } else if (activeTab === 'admins') {
        usersList = admins;
      }

      console.log('🔍 fetchCircleCounts - activeTab:', activeTab);
      console.log('📝 fetchCircleCounts - usersList length:', usersList.length);
      console.log('👥 fetchCircleCounts - usersList:', usersList.map(u => ({ id: u.id, name: u.full_name })));

      if (usersList.length > 0) {
        const ids = usersList.map(u => u.id);
        console.log('🆔 fetchCircleCounts - ids to fetch:', ids);

        try {
          const counts = await getStudyCircleCountByTeacherIds(ids);
          console.log('📊 fetchCircleCounts - counts received:', counts);
          console.log('🔢 fetchCircleCounts - total counts entries:', Object.keys(counts).length);

          setTeacherCircleCounts(counts);
        } catch (error) {
          console.error('❌ Error fetching circle counts:', error);
        }
      } else {
        console.log('⚠️ No users to fetch circle counts for');
      }
    }
    fetchCircleCounts();
  }, [teachers, admins, activeTab]);

  const loadUsers = async () => {
    setLoading(true);

    try {
      // إذا كان المستخدم معلم ويريد عرض بياناته فقط
      if (teacherOnly && userRole === 'teacher' && currentUserId) {
        const profile = await getProfileById(currentUserId);
        if (profile) {
          setTeacherProfile(profile);
          setteachers([profile]); // تعيين بيانات المعلم في قائمة المعلمين
        }
      } else {
        // تحميل البيانات المعتادة
        if (userRole === 'superadmin' || userRole === 'admin') {
          const adminsList = await getAdmins();
          setAdmins(adminsList);

          const teachersList = await getteachersForManagement();
          setteachers(teachersList);
        }

        // تحميل السوبر أدمن إذا كان المستخدم سوبر أدمن
        if (userRole === 'superadmin') {
          const superadminsList = await getSuperAdmins();
          setSuperadmins(superadminsList);
        }
      }
    } catch (error) {
      console.error(errorMessages.consoleUserLoadError, error);
      toast({
        title: userManagementLabels.loadError.title,
        description: userManagementLabels.loadError.description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const handleAddUser = () => {
    setDialogMode("add");
    setDialogTitle(userManagementLabels.addUserForm.title);
    setUserId("");
    setFullName("");
    setUsername("");
    setPassword("");
    setRole(activeTab === "admins" ? "admin" : "teacher");
    setIsDialogOpen(true);
  };

  // Edit user
  const handleEditUser = async (user: Profile) => {
    setDialogMode("edit");
    setDialogTitle(userManagementLabels.editUserForm.title);
    setUserId(user.id);
    setFullName(user.full_name);
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setIsDialogOpen(true);
  };

  // Delete user
  const handleDeleteUser = (user: Profile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete user
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const result = await deleteProfile(userToDelete.id);

      if (result.success) {
        toast({
          title: userManagementLabels.deleteSuccess,
          description: userManagementLabels.deleteSuccessMessage,
        });
        loadUsers();
      } else {
        toast({
          title: userManagementLabels.deleteFailed,
          description: result.message || userManagementLabels.deleteUserError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(errorMessages.consoleUserSaveError, error);
      toast({
        title: errorMessages.generalError,
        description: userManagementLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Change password
  const handleChangePassword = (user: Profile) => {
    setUserToChangePassword(user);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangePasswordDialogOpen(true);
  };

  // Save new password
  const handleSavePassword = async () => {
    if (!userToChangePassword) return;

    // Check if new password matches confirmation
    if (newPassword !== confirmNewPassword) {
      toast({
        title: errorMessages.generalError,
        description: userManagementLabels.changePasswordForm.passwordsMismatch,
        variant: "destructive",
      });
      return;
    }

    try {
      let result;

      // If changing own password, require current password
      if (userToChangePassword.id === currentUserId) {
        if (!currentPassword) {
          toast({
            title: errorMessages.generalError,
            description: userManagementLabels.incompleteDataMessage,
            variant: "destructive",
          });
          return;
        }
        result = await changePassword(userToChangePassword.id, currentPassword, newPassword);
      } else {
        // Admin changing someone else's password
        if (userRole === 'superadmin' || (userRole === 'admin' && userToChangePassword.role === 'teacher')) {
          result = await adminChangePassword(userToChangePassword.id, newPassword);
        } else {
          toast({
            title: errorMessages.permissionError,
            description: userManagementLabels.accessDeniedMessage,
            variant: "destructive",
          });
          return;
        }
      }

      if (result.success) {
        toast({
          title: userManagementLabels.changePasswordForm.success,
          description: result.message,
        });
        setIsChangePasswordDialogOpen(false);
        setUserToChangePassword(null);
      } else {
        toast({
          title: userManagementLabels.changePasswordForm.error,
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(errorMessages.consoleUserSaveError, error);
      toast({
        title: errorMessages.generalError,
        description: userManagementLabels.unexpectedError,
        variant: "destructive",
      });
    }
  };

  // Save data
  const handleSaveUser = async () => {
    if (!fullName || !username || (dialogMode === "add" && !password)) {
      toast({
        title: userManagementLabels.incompleteData,
        description: userManagementLabels.incompleteDataMessage,
        variant: "destructive",
      });
      return;
    }

    // Check permissions for role
    if (userRole === 'admin' && role !== 'teacher') {
      toast({
        title: errorMessages.permissionError,
        description: userManagementLabels.adminEditRestriction,
        variant: "destructive",
      });
      return;
    }

    try {
      if (dialogMode === "add") {
        // Create new user
        const newUser: ProfileCreate = {
          full_name: fullName,
          username,
          password,
          role
        };

        const result = await createProfile(newUser);

        if (result.success) {
          toast({
            title: userManagementLabels.addSuccess,
            description: userManagementLabels.addSuccessMessage,
          });
          setIsDialogOpen(false);
          loadUsers();
        } else {
          toast({
            title: userManagementLabels.addFailed,
            description: result.message || userManagementLabels.addUserError,
            variant: "destructive",
          });
        }
      } else {
        // Update existing user
        const updatedUser: ProfileUpdate = {
          id: userId,
          full_name: fullName,
          username,
          role
        };

        // Add password only if entered
        if (password) {
          updatedUser.password = password;
        }

        const result = await updateProfile(updatedUser);

        if (result.success) {
          toast({
            title: userManagementLabels.updateSuccess,
            description: userManagementLabels.updateSuccessMessage,
          });
          setIsDialogOpen(false);
          loadUsers();
        } else {
          toast({
            title: userManagementLabels.updateFailed,
            description: result.message || userManagementLabels.updateUserError,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error(errorMessages.consoleUserSaveError, error);
      toast({
        title: errorMessages.generalError,
        description: userManagementLabels.unexpectedError,
        variant: "destructive",
      });
    }
  };

  // Load teacher's circles
  const loadTeacherCircles = async (teacherId: string) => {
    setLoadingCircles(true);

    try {
      // جلب الحلقات الحقيقية من قاعدة البيانات
      const circles = await getStudyCirclesByTeacherId(teacherId);

      console.log('🔍 Loading circles for teacher:', teacherId);
      console.log('📚 Found circles:', circles);

      setTeacherCircles(circles);
    } catch (error) {
      console.error("❌ Error loading teacher circles:", error);
      toast({
        title: errorMessages.generalError,
        description: "حدث خطأ أثناء تحميل الحلقات. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setLoadingCircles(false);
    }
  };

  // Open circles dialog
  const handleOpenCirclesDialog = (teacher: Profile) => {
    setSelectedTeacher(teacher);
    loadTeacherCircles(teacher.id);
    setOpenCirclesDialog(true);
  };

  // Add new circle
  const handleAddCircle = () => {
    // إعادة تعيين نموذج إضافة الحلقة
    setAddCircleForm({
      name: '',
      max_students: ''
    });

    // فتح نموذج إضافة الحلقة
    setOpenAddCircleDialog(true);
  };

  // Handle add circle form changes
  const handleAddFormChange = (field: string, value: string) => {
    setAddCircleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save new circle
  const handleSaveNewCircle = async () => {
    if (!selectedTeacher || savingNewCircle) return;

    try {
      setSavingNewCircle(true);

      // التحقق من صحة البيانات
      if (!addCircleForm.name.trim()) {
        toast({
          title: "خطأ في البيانات",
          description: "اسم الحلقة مطلوب",
          variant: "destructive",
        });
        setSavingNewCircle(false);
        return;
      }

      // إعداد بيانات الإضافة
      const newCircleData: StudyCircleCreate = {
        teacher_id: selectedTeacher.id,
        name: addCircleForm.name.trim(),
        max_students: addCircleForm.max_students ? parseInt(addCircleForm.max_students) : null
      };

      console.log('💾 Creating new circle:', newCircleData);

      // استدعاء API لإضافة الحلقة
      const result = await createStudyCircle(newCircleData);

      if (result.success) {
        toast({
          title: "✅ تمت الإضافة بنجاح",
          description: `تم إضافة الحلقة "${addCircleForm.name}" بنجاح`,
          variant: "default",
        });

        // إعادة تحميل قائمة الحلقات لإظهار الإضافة
        await loadTeacherCircles(selectedTeacher.id);

        // تحديث عدد الحلقات في جدول المستخدمين
        await refreshCircleCounts();

        // إغلاق dialog الإضافة
        setOpenAddCircleDialog(false);
      } else {
        toast({
          title: "خطأ في الإضافة",
          description: result.message || "حدث خطأ أثناء إضافة الحلقة الجديدة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error creating new circle:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء إضافة الحلقة الجديدة",
        variant: "destructive",
      });
    } finally {
      setSavingNewCircle(false);
    }
  };

  // Edit circle
  const handleEditCircle = (circle: StudyCircle) => {
    setEditingCircle(circle);
    setEditCircleForm({
      name: circle.name || '',
      max_students: circle.max_students?.toString() || ''
    });
    setOpenEditCircleDialog(true);
  };

  // Save circle edits
  const handleSaveCircleEdit = async () => {
    if (!editingCircle || savingCircleEdit) return;

    try {
      setSavingCircleEdit(true);

      // التحقق من صحة البيانات
      if (!editCircleForm.name.trim()) {
        toast({
          title: "خطأ في البيانات",
          description: "اسم الحلقة مطلوب",
          variant: "destructive",
        });
        return;
      }

      // إعداد بيانات التحديث
      const updateData = {
        id: editingCircle.id,
        name: editCircleForm.name.trim(),
        max_students: editCircleForm.max_students ? parseInt(editCircleForm.max_students) : null
      };

      console.log('💾 Updating circle with data:', updateData);

      // استدعاء API لتحديث الحلقة
      const result = await updateStudyCircle(updateData);

      if (result.success) {
        toast({
          title: "✅ تم التحديث بنجاح",
          description: `تم تحديث بيانات الحلقة "${editCircleForm.name}" بنجاح`,
          variant: "default",
        });

        // إعادة تحميل قائمة الحلقات لإظهار التحديث
        if (selectedTeacher) {
          await loadTeacherCircles(selectedTeacher.id);
        }

        // تحديث عدد الحلقات في جدول المستخدمين
        await refreshCircleCounts();

        // إغلاق dialog التعديل
        setOpenEditCircleDialog(false);
        setEditingCircle(null);
      } else {
        toast({
          title: "خطأ في التحديث",
          description: result.message || "حدث خطأ أثناء تحديث بيانات الحلقة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error updating circle:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء تحديث بيانات الحلقة",
        variant: "destructive",
      });
    } finally {
      setSavingCircleEdit(false);
    }
  };

  // Handle form input changes
  const handleEditFormChange = (field: string, value: string) => {
    setEditCircleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Delete circle
  const handleDeleteCircle = (circle: StudyCircle) => {
    setCircleToDelete(circle);
    setIsDeleteCircleDialogOpen(true);
  };

  // Confirm delete circle
  const confirmDeleteCircle = async () => {
    if (!circleToDelete) return;

    try {
      // تنفيذ عملية الحذف الفعلية
      const result = await deleteStudyCircle(circleToDelete.id);

      if (result.success) {
        toast({
          title: "🗑️ حذف الحلقة",
          description: `تم حذف الحلقة: "${circleToDelete.name}" بنجاح`,
          variant: "destructive",
        });

        console.log('✅ Circle deleted successfully:', circleToDelete.id);

        // إعادة تحميل الحلقات للمعلم المحدد
        if (selectedTeacher) {
          await loadTeacherCircles(selectedTeacher.id);
        }

        // تحديث عدد الحلقات في الجدول الرئيسي
        await refreshCircleCounts();
      } else {
        toast({
          title: "خطأ في الحذف",
          description: result.message || "حدث خطأ أثناء حذف الحلقة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error deleting circle:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء حذف الحلقة",
        variant: "destructive",
      });
    } finally {
      setIsDeleteCircleDialogOpen(false);
      setCircleToDelete(null);
    }
  };

  // فتح شاشة جدولة الحلقة
  const handleOpenScheduleDialog = async (circle: StudyCircle) => {
    setSelectedCircleForSchedule(circle);
    await loadCircleSchedules(circle.id);
    setOpenScheduleDialog(true);
  };

  // تحميل جدولة الحلقة
  const loadCircleSchedules = async (circleId: string) => {
    setLoadingSchedules(true);

    try {
      const schedules = await getStudyCircleSchedules(circleId);
      console.log('📅 Loaded schedules for circle:', schedules);
      setCircleSchedules(schedules);
    } catch (error) {
      console.error('❌ Error loading circle schedules:', error);
      toast({
        title: "خطأ في تحميل الجدولة",
        description: "حدث خطأ أثناء تحميل جدولة الحلقة",
        variant: "destructive",
      });
    } finally {
      setLoadingSchedules(false);
    }
  };

  // إضافة جدولة جديدة
  const handleAddSchedule = () => {
    // إعادة تعيين نموذج إضافة الجدولة
    setAddScheduleForm({
      weekday: '0',
      start_time: '08:00',
      end_time: '09:00',
      location: ''
    });

    // فتح نموذج إضافة الجدولة
    setOpenAddScheduleDialog(true);
  };

  // معالجة تغييرات نموذج إضافة الجدولة
  const handleAddScheduleFormChange = (field: string, value: string) => {
    setAddScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // حفظ جدولة جديدة
  const handleSaveNewSchedule = async () => {
    if (!selectedCircleForSchedule || savingNewSchedule) return;

    try {
      setSavingNewSchedule(true);

      // التحقق من صحة البيانات
      if (!addScheduleForm.start_time || !addScheduleForm.end_time) {
        toast({
          title: "خطأ في البيانات",
          description: "الرجاء تحديد وقت البداية والنهاية",
          variant: "destructive",
        });
        setSavingNewSchedule(false);
        return;
      }

      // التحقق من أن وقت النهاية بعد وقت البداية
      if (addScheduleForm.start_time >= addScheduleForm.end_time) {
        toast({
          title: "خطأ في الأوقات",
          description: "يجب أن يكون وقت النهاية بعد وقت البداية",
          variant: "destructive",
        });
        setSavingNewSchedule(false);
        return;
      }

      // إعداد بيانات الإضافة
      const newScheduleData: StudyCircleScheduleCreate = {
        study_circle_id: selectedCircleForSchedule.id,
        weekday: parseInt(addScheduleForm.weekday),
        start_time: addScheduleForm.start_time,
        end_time: addScheduleForm.end_time,
        location: addScheduleForm.location.trim() || null
      };

      console.log('💾 Creating new schedule:', newScheduleData);

      // استدعاء API لإضافة الجدولة
      const result = await createStudyCircleSchedule(newScheduleData);

      if (result.success) {
        toast({
          title: "✅ تمت الإضافة بنجاح",
          description: `تم إضافة جدولة جديدة للحلقة "${selectedCircleForSchedule.name}" بنجاح`,
          variant: "default",
        });

        // إعادة تحميل قائمة الجدولة لإظهار الإضافة
        await loadCircleSchedules(selectedCircleForSchedule.id);

        // إغلاق dialog الإضافة
        setOpenAddScheduleDialog(false);
      } else {
        toast({
          title: "خطأ في الإضافة",
          description: result.message || "حدث خطأ أثناء إضافة الجدولة الجديدة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error creating new schedule:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء إضافة الجدولة الجديدة",
        variant: "destructive",
      });
    } finally {
      setSavingNewSchedule(false);
    }
  };

  // تعديل جدولة
  const handleEditSchedule = (schedule: StudyCircleSchedule) => {
    setEditingSchedule(schedule);
    setEditScheduleForm({
      weekday: schedule.weekday.toString(),
      start_time: schedule.start_time.substring(0, 5), // تنسيق HH:MM
      end_time: schedule.end_time.substring(0, 5), // تنسيق HH:MM
      location: schedule.location || ''
    });
    setOpenEditScheduleDialog(true);
  };

  // معالجة تغييرات نموذج تعديل الجدولة
  const handleEditScheduleFormChange = (field: string, value: string) => {
    setEditScheduleForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // حفظ تعديل الجدولة
  const handleSaveScheduleEdit = async () => {
    if (!editingSchedule || savingScheduleEdit) return;

    try {
      setSavingScheduleEdit(true);

      // التحقق من صحة البيانات
      if (!editScheduleForm.start_time || !editScheduleForm.end_time) {
        toast({
          title: "خطأ في البيانات",
          description: "الرجاء تحديد وقت البداية والنهاية",
          variant: "destructive",
        });
        return;
      }

      // التحقق من أن وقت النهاية بعد وقت البداية
      if (editScheduleForm.start_time >= editScheduleForm.end_time) {
        toast({
          title: "خطأ في الأوقات",
          description: "يجب أن يكون وقت النهاية بعد وقت البداية",
          variant: "destructive",
        });
        return;
      }

      // إعداد بيانات التحديث
      const updateData: StudyCircleScheduleUpdate = {
        id: editingSchedule.id,
        weekday: parseInt(editScheduleForm.weekday),
        start_time: editScheduleForm.start_time,
        end_time: editScheduleForm.end_time,
        location: editScheduleForm.location.trim() || null
      };

      console.log('💾 Updating schedule with data:', updateData);

      // استدعاء API لتحديث الجدولة
      const result = await updateStudyCircleSchedule(updateData);

      if (result.success) {
        toast({
          title: "✅ تم التحديث بنجاح",
          description: `تم تحديث بيانات الجدولة بنجاح`,
          variant: "default",
        });

        // إعادة تحميل قائمة الجدولة لإظهار التحديث
        if (selectedCircleForSchedule) {
          await loadCircleSchedules(selectedCircleForSchedule.id);
        }

        // إغلاق dialog التعديل
        setOpenEditScheduleDialog(false);
        setEditingSchedule(null);
      } else {
        toast({
          title: "خطأ في التحديث",
          description: result.message || "حدث خطأ أثناء تحديث بيانات الجدولة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error updating schedule:', error);
      toast({
        title: "خطأ غير متوقع",
        description: "حدث خطأ غير متوقع أثناء تحديث بيانات الجدولة",
        variant: "destructive",
      });
    } finally {
      setSavingScheduleEdit(false);
    }
  };

  // حذف جدولة
  const handleDeleteSchedule = (schedule: StudyCircleSchedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteScheduleDialogOpen(true);
  };

  // تأكيد حذف جدولة
  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    
    try {
      // تنفيذ عملية الحذف الفعلية
      const result = await deleteStudyCircleSchedule(scheduleToDelete.id);

      if (result.success) {
        toast({
          title: "🗑️ حذف الجدولة",
          description: `تم حذف الجدولة بنجاح`,
          variant: "destructive",
        });

        console.log('✅ Schedule deleted successfully:', scheduleToDelete.id);

        // إعادة تحميل الجدولة للحلقة المحددة
        if (selectedCircleForSchedule) {
          await loadCircleSchedules(selectedCircleForSchedule.id);
        }
      } else {
        toast({
          title: "خطأ في الحذف",
          description: result.message || "حدث خطأ أثناء حذف الجدولة",
          variant: "destructive",
        });
        }
      } catch (error) {
        console.error('❌ Error deleting schedule:', error);
        toast({
          title: "خطأ غير متوقع",
          description: "حدث خطأ غير متوقع أثناء حذف الجدولة",
          variant: "destructive",
        });
      } finally {
        setIsDeleteScheduleDialogOpen(false);
        setScheduleToDelete(null);
      }
    };

  // Check permissions
  if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="container mx-auto p-8 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">{userManagementLabels.accessDenied}</h2>
        <p className="mb-4">{userManagementLabels.accessDeniedMessage}</p>
        <Button onClick={() => onNavigate('/')}>{userManagementLabels.returnToHome}</Button>
      </div>
    );
  }

  const refreshData = async () => {
    try {
      // Show loading state
      setLoading(true);

      // Toast notification to inform user that refresh is in progress
      toast({
        title: "تحديث البيانات",
        description: "جاري تحديث البيانات...",
      });

      // Load all user data
      await loadUsers();

      // Refresh circle counts if we're on a tab that shows them
      if (activeTab === 'teachers' || activeTab === 'admins') {
        await refreshCircleCounts();
      }

      // Success notification
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح",
        variant: "default",
      });
    } catch (error) {
      console.error("خطأ في تحديث البيانات:", error);
      toast({
        title: errorMessages.generalError,
        description: "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render page
  return (

    <div className="container mx-auto py-6" dir="rtl">

      <Card className="border border-green-300 shadow-xl rounded-2xl overflow-hidden">
        {/* الهيدر */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-xl md:text-2xl font-extrabold text-green-50 flex items-center gap-2">
                <User2Icon className="h-5 w-5 text-yellow-300" />
                {teacherOnly && userRole === 'teacher'
                  ? userManagementLabels.teacherProfileTitle || "بياناتي الشخصية"
                  : userManagementLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {teacherOnly && userRole === 'teacher'
                  ? userManagementLabels.teacherProfileDescription || "إدارة بياناتك الشخصية وكلمة المرور"
                  : userManagementLabels.description}
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
          {/* إذا كان المستخدم معلم ويريد عرض بياناته فقط */}
          {teacherOnly && userRole === 'teacher' ? (
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="text-center p-4">{userManagementLabels.loading}</div>
                ) : (
                  <UsersTable
                    users={teachers}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                    onChangePassword={handleChangePassword}
                    userRole={userRole}
                    currentUserId={currentUserId}
                    userType="teacher"
                    showOnlyChangePassword={true}
                    teacherCircleCounts={teacherCircleCounts}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            /* عرض الواجهة المعتادة لإدارة المستخدمين */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  {userRole === 'superadmin' && (
                    <TabsTrigger value="superadmins" className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span>{userManagementLabels.superadmins}</span>
                    </TabsTrigger>
                  )}
                  {(userRole === 'superadmin' || userRole === 'admin') && (
                    <TabsTrigger value="admins" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>{userManagementLabels.administrators}</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="teachers" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>{userManagementLabels.teachers}</span>
                  </TabsTrigger>
                </TabsList>

                {(userRole === 'superadmin' || (userRole === 'admin' && activeTab === 'teachers')) && (
                  <Button onClick={handleAddUser} className="bg-islamic-green hover:bg-islamic-green/90">
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span>
                      {activeTab === "admins"
                        ? userManagementLabels.addNewAdmin
                        : activeTab === "superadmins"
                          ? userManagementLabels.addNewSuperadmin
                          : userManagementLabels.addNewteacher}
                    </span>
                  </Button>
                )}
              </div>

              {userRole === 'superadmin' && (
                <TabsContent value="superadmins" className="mt-0">
                  <Card>
                    <CardContent className="p-4">
                      {loading ? (
                        <div className="text-center p-4">{userManagementLabels.loading}</div>
                      ) : (
                        <UsersTable
                          users={superadmins}
                          onEdit={handleEditUser}
                          onDelete={handleDeleteUser}
                          onChangePassword={handleChangePassword}
                          userRole={userRole}
                          currentUserId={currentUserId}
                          userType="superadmin"
                          teacherCircleCounts={teacherCircleCounts}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {(userRole === 'superadmin' || userRole === 'admin') && (
                <TabsContent value="admins" className="mt-0">
                  <Card>
                    <CardContent className="p-4">
                      {loading ? (
                        <div className="text-center p-4">{userManagementLabels.loading}</div>
                      ) : (
                        <UsersTable
                          users={admins}
                          onEdit={handleEditUser}
                          onDelete={handleDeleteUser}
                          onChangePassword={handleChangePassword}
                          userRole={userRole}
                          currentUserId={currentUserId}
                          userType="admin"
                          teacherCircleCounts={teacherCircleCounts}
                          onShowCircles={handleOpenCirclesDialog} // Pass the dialog open handler for admins
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="teachers" className="mt-0">
                <Card>
                  <CardContent className="p-4">
                    {loading ? (
                      <div className="text-center p-4">{userManagementLabels.loading}</div>
                    ) : (
                      <UsersTable
                        users={teachers}
                        onEdit={handleEditUser}
                        onDelete={handleDeleteUser}
                        onChangePassword={handleChangePassword}
                        userRole={userRole}
                        currentUserId={currentUserId}
                        userType="teacher"
                        teacherCircleCounts={teacherCircleCounts}
                        onShowCircles={handleOpenCirclesDialog} // Pass the dialog open handler here
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* User Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4" dir="rtl">
            <div className="grid gap-2">
              <Label htmlFor="full_name">{userManagementLabels.fullName}</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={userManagementLabels.fullName}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">{userManagementLabels.username}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={userManagementLabels.username}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{userManagementLabels.addUserForm.password} {dialogMode === "edit" && userManagementLabels.passwordKeep}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={dialogMode === "add" ? userManagementLabels.enterPassword : userManagementLabels.enterNewPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role selection based on user permissions */}
            {userRole === 'superadmin' && (
              <div className="grid gap-2">
                <Label htmlFor="role">{userManagementLabels.role}</Label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder={userManagementLabels.chooseRole} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>{userManagementLabels.superadmin}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>{userManagementLabels.admin}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span>{userManagementLabels.teacher}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {userRole === 'admin' && (
              <div className="grid gap-2">
                <Label htmlFor="role">{userManagementLabels.role}</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={userManagementLabels.chooseRole} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        <span>{userManagementLabels.teacher}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter dir="rtl" className="flex justify-start gap-2">
            <Button onClick={handleSaveUser} className="bg-islamic-green hover:bg-islamic-green/90">
              {dialogMode === "add" ? userManagementLabels.addUser : userManagementLabels.saveChanges}
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-islamic-green text-islamic-green hover:bg-islamic-green/10">
              {userManagementLabels.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* مربع حوار تأكيد حذف المستخدم */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteUser}
        isLoading={loading}
        title={`تأكيد حذف المستخدم`}
        description={userToDelete ? `هل أنت متأكد من رغبتك في حذف المستخدم "${userToDelete.full_name}"؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
        deleteButtonText="نعم، احذف المستخدم"
        cancelButtonText="إلغاء"
      />

      {/* مربع حوار تأكيد حذف الحلقة */}
      <DeleteConfirmationDialog
        isOpen={isDeleteCircleDialogOpen}
        onOpenChange={setIsDeleteCircleDialogOpen}
        onConfirm={confirmDeleteCircle}
        isLoading={false}
        title={`تأكيد حذف الحلقة`}
        description={circleToDelete ? `هل أنت متأكد من رغبتك في حذف الحلقة "${circleToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
        deleteButtonText="نعم، احذف الحلقة"
        cancelButtonText="إلغاء"
      />

      {/* مربع حوار تأكيد حذف الجدول */}
      <DeleteConfirmationDialog
        isOpen={isDeleteScheduleDialogOpen}
        onOpenChange={setIsDeleteScheduleDialogOpen}
        onConfirm={confirmDeleteSchedule}
        isLoading={false}
        title={`تأكيد حذف الموعد`}
        description={scheduleToDelete ? `هل أنت متأكد من رغبتك في حذف موعد الحلقة في يوم ${getWeekdayName(scheduleToDelete.weekday)}؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
        deleteButtonText="نعم، احذف الموعد"
        cancelButtonText="إلغاء"
      />

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">
              {userManagementLabels.changePasswordForm.title}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4" dir="rtl">
            {/* Only show current password field if user is changing their own password */}
            {userToChangePassword && userToChangePassword.id === currentUserId && (
              <div className="grid gap-2">
                <Label htmlFor="current_password">{userManagementLabels.changePasswordForm.currentPassword}</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={userManagementLabels.changePasswordForm.currentPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="new_password">{userManagementLabels.changePasswordForm.newPassword}</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.newPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm_password">{userManagementLabels.changePasswordForm.confirmNewPassword}</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.confirmNewPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter dir="rtl" className="flex justify-start gap-2">
            <Button onClick={handleSavePassword} className="bg-islamic-green hover:bg-islamic-green/90">
              {userManagementLabels.changePasswordForm.submit}
            </Button>
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)} className="border-islamic-green text-islamic-green hover:bg-islamic-green/10">
              {userManagementLabels.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Circles Dialog */}
      <Dialog open={openCirclesDialog} onOpenChange={setOpenCirclesDialog}>

        <DialogContent dir="rtl" className="sm:max-w-[700px] max-h-[80vh] overflow-auto">
          <DialogHeader className="flex flex-col items-center border-b border-islamic-green/20 pb-4">
            <DialogTitle className="text-xl text-islamic-green flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {selectedTeacher ? `حلقات ${selectedTeacher.full_name}` : 'حلقات المستخدم'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              عرض وإدارة الحلقات الدراسية الخاصة بالمستخدم
            </DialogDescription>
          </DialogHeader>


          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-islamic-green border-islamic-green/40">
                    {teacherCircles.length} حلقة
                  </Badge>
                  <span className="text-sm text-muted-foreground">إجمالي الحلقات</span>
                </div>
                {selectedTeacher && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      المعلم: {selectedTeacher.full_name}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                onClick={handleAddCircle}
                className="bg-islamic-green hover:bg-islamic-green/90 text-white"
                size="sm"
              >
                <UserPlus className="h-4 w-4 ml-2" />
                إضافة حلقة جديدة
              </Button>
            </div>

            {loadingCircles ? (
              <div className="text-center p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green mb-4"></div>
                  <span className="text-muted-foreground">جاري تحميل الحلقات...</span>
                </div>
              </div>
            ) : teacherCircles.length === 0 ? (
              <div className="text-center p-8 bg-muted/30 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد حلقات</h3>
                <p className="text-muted-foreground mb-4">لم يتم تسجيل أي حلقات لهذا المستخدم بعد</p>
                <Button
                  onClick={handleAddCircle}
                  className="bg-islamic-green hover:bg-islamic-green/90"
                >
                  <UserPlus className="h-4 w-4 ml-2" />
                  إضافة أول حلقة
                </Button>
              </div>
            ) : (
              <div className="border border-islamic-green/20 rounded-lg overflow-hidden">
                <Table className="min-w-full border border-green-300 rounded-2xl overflow-hidden shadow-lg">
                  <TableHeader className="bg-islamic-green">
                    <TableRow>
                      <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">📖 اسم الحلقة</TableHead>
                      <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">👥 الحد الأقصى للطلاب</TableHead>
                      <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">📅 تاريخ الإنشاء</TableHead>
                      <TableHead className="text-center font-bold text-white py-3 px-4">⚙️ الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherCircles.map((circle) => (
                      <TableRow
                        key={circle.id}
                        className="border-b border-green-200 hover:bg-green-50 dark:hover:bg-green-900 transition-colors duration-200"
                      >
                        <TableCell className="text-right font-medium py-2 px-4 border-r border-green-200">{circle.name}</TableCell>
                        <TableCell className="text-center py-2 px-4 border-r border-green-200">
                          <Badge variant="secondary" className="text-sm px-2 py-1 rounded-lg">
                            {circle.max_students || 'غير محدد'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground py-2 px-4 border-r border-green-200">
                          {circle.created_at
                            ? new Date(circle.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center py-2 px-4">
                          <div className="flex justify-center items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenScheduleDialog(circle)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors rounded-lg"
                              title="جدولة الحلقة"
                            >
                              <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCircle(circle)}
                              className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
                              title="تعديل الحلقة"
                            >
                              <Pencil className="h-4 w-4 text-islamic-green dark:text-green-300" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCircle(circle)}
                              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                              title="حذف الحلقة"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t" dir="rtl">
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setOpenCirclesDialog(false)}
                className="border-islamic-green text-islamic-green hover:bg-islamic-green/10"
              >
                إغلاق
              </Button>
              <Button
                onClick={handleAddCircle}
                className="bg-islamic-green hover:bg-islamic-green/90 text-white"
              >
                <UserPlus className="h-4 w-4 ml-2" />
                إضافة حلقة
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Circle Dialog */}
      <Dialog open={openEditCircleDialog} onOpenChange={setOpenEditCircleDialog}>
        <DialogContent dir="rtl" className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-col items-center border-b border-islamic-green/20 pb-4">
            <DialogTitle className="text-xl text-islamic-green flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل الحلقة
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              قم بتعديل بيانات الحلقة الدراسية
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-circle-name" className="text-right">اسم الحلقة *</Label>
              <Input
                id="edit-circle-name"
                value={editCircleForm.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder="أدخل اسم الحلقة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-circle-max-students" className="text-right">الحد الأقصى للطلاب</Label>
              <Input
                id="edit-circle-max-students"
                type="number"
                value={editCircleForm.max_students}
                onChange={(e) => handleEditFormChange('max_students', e.target.value)}
                placeholder="أدخل العدد الأقصى للطلاب"
                min="1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setOpenEditCircleDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveCircleEdit}
              className="bg-islamic-green hover:bg-islamic-green/90"
              disabled={!editCircleForm.name.trim() || savingCircleEdit}
            >
              {savingCircleEdit ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Circle Dialog */}
      <Dialog open={openAddCircleDialog} onOpenChange={setOpenAddCircleDialog}>
        <DialogContent dir="rtl" className="sm:max-w-[400px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-col items-center border-b border-islamic-green/20 pb-4">
            <DialogTitle className="text-xl text-islamic-green flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              إضافة حلقة جديدة
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              قم بإدخال بيانات الحلقة الدراسية الجديدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-circle-name" className="text-right">اسم الحلقة *</Label>
              <Input
                id="add-circle-name"
                value={addCircleForm.name}
                onChange={(e) => handleAddFormChange('name', e.target.value)}
                placeholder="أدخل اسم الحلقة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-circle-max-students" className="text-right">الحد الأقصى للطلاب</Label>
              <Input
                id="add-circle-max-students"
                type="number"
                value={addCircleForm.max_students}
                onChange={(e) => handleAddFormChange('max_students', e.target.value)}
                placeholder="أدخل العدد الأقصى للطلاب"
                min="1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setOpenAddCircleDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveNewCircle}
              className="bg-islamic-green hover:bg-islamic-green/90"
              disabled={!addCircleForm.name.trim() || savingNewCircle}
            >
              {savingNewCircle ? "جارٍ الإضافة..." : "إضافة الحلقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* جدولة الحلقة Dialog */}
      <Dialog open={openScheduleDialog} onOpenChange={setOpenScheduleDialog}>
        <DialogContent dir="rtl" className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-col items-center border-b border-islamic-green/20 pb-4">
            <DialogTitle className="text-xl text-islamic-green flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedCircleForSchedule ? `جدولة حلقة: ${selectedCircleForSchedule.name} | المعلم: ${selectedTeacher?.full_name}` : 'جدولة الحلقة'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              إدارة مواعيد وأيام انعقاد الحلقة الدراسية
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-islamic-green border-islamic-green/40">
                    {circleSchedules.length} موعد
                  </Badge>
                  <span className="text-sm text-muted-foreground">إجمالي المواعيد</span>
                </div>
                {selectedCircleForSchedule && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      الحلقة: {selectedCircleForSchedule.name}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                onClick={handleAddSchedule}
                className="bg-islamic-green hover:bg-islamic-green/90 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة موعد جديد
              </Button>
            </div>

            {loadingSchedules ? (
              <div className="text-center p-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green mb-4"></div>
                  <span className="text-muted-foreground">جاري تحميل جدولة الحلقة...</span>
                </div>
              </div>
            ) : circleSchedules.length === 0 ? (
              <div className="text-center p-8 bg-muted/30 rounded-lg">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">لا توجد مواعيد محددة</h3>
                <p className="text-muted-foreground mb-4">لم يتم تسجيل أي مواعيد لهذه الحلقة بعد</p>
                <Button
                  onClick={handleAddSchedule}
                  className="bg-islamic-green hover:bg-islamic-green/90"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة أول موعد
                </Button>
              </div>
            ) : (
              <div className="border border-islamic-green/20 rounded-lg overflow-hidden">
                <Table className="min-w-full border border-green-300 rounded-2xl overflow-hidden shadow-lg">
                  <TableHeader className="bg-islamic-green">
                    <TableRow>
                      <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">📅 اليوم</TableHead>
                      <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">⏱ من</TableHead>
                      <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">⏱ إلى</TableHead>
                      <TableHead className="text-right font-bold text-white py-3 px-4 border-r border-green-700">📍 الموقع</TableHead>
                      <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">🗓 تاريخ الإضافة</TableHead>
                      <TableHead className="text-center font-bold text-white py-3 px-4">⚙️ الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {circleSchedules.map((schedule) => (
                      <TableRow
                        key={schedule.id}
                        className="border-b border-green-200 hover:bg-green-50 dark:hover:bg-green-900 transition-colors duration-200"
                      >
                        <TableCell className="text-right font-medium py-2 px-4 border-r border-green-200">{getWeekdayName(schedule.weekday)}</TableCell>

                        <TableCell className="text-right py-2 px-4 border-r border-green-200">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="h-4 w-4 text-blue-500" />
                            {formatTime(schedule.start_time)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-2 px-4 border-r border-green-200">
                          <div className="flex items-center gap-1 justify-end">
                            <Clock className="h-4 w-4 text-red-500" />
                            {formatTime(schedule.end_time)}
                          </div>
                        </TableCell>

                        <TableCell className="text-right py-2 px-4 border-r border-green-200">
                          {schedule.location ? (
                            <div className="flex items-center gap-1 justify-end">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              {schedule.location}
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic text-sm">استخدام موقع الحلقة الافتراضي</div>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-sm text-muted-foreground py-2 px-4 border-r border-green-200">
                          {schedule.created_at
                            ? new Date(schedule.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                            : '-'}
                        </TableCell>

                        <TableCell className="text-center py-2 px-4">
                          <div className="flex justify-center items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSchedule(schedule)}
                              className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
                              title="تعديل الموعد"
                            >
                              <Pencil className="h-4 w-4 text-islamic-green dark:text-green-300" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSchedule(schedule)}
                              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                              title="حذف الموعد"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              </div>
            )}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t" dir="rtl">
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setOpenScheduleDialog(false)}
                className="border-islamic-green text-islamic-green hover:bg-islamic-green/10"
              >
                إغلاق
              </Button>
              <Button
                onClick={handleAddSchedule}
                className="bg-islamic-green hover:bg-islamic-green/90 text-white"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة موعد
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة موعد جديد Dialog */}
      <Dialog open={openAddScheduleDialog} onOpenChange={setOpenAddScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-islamic-green flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة موعد جديد
            </DialogTitle>
            <DialogDescription>
              قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-schedule-weekday" className="text-right">اليوم *</Label>
              <Select
                value={addScheduleForm.weekday}
                onValueChange={(value) => handleAddScheduleFormChange('weekday', value)}
              >
                <SelectTrigger id="add-schedule-weekday">
                  <SelectValue placeholder="اختر اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {weekdayOptions.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-schedule-start-time" className="text-right">وقت البداية *</Label>
                <Input
                  id="add-schedule-start-time"
                  type="time"
                  value={addScheduleForm.start_time}
                  onChange={(e) => handleAddScheduleFormChange('start_time', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-schedule-end-time" className="text-right">وقت النهاية *</Label>
                <Input
                  id="add-schedule-end-time"
                  type="time"
                  value={addScheduleForm.end_time}
                  onChange={(e) => handleAddScheduleFormChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="add-schedule-location" className="text-right">الموقع (اختياري)</Label>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
                </div>
              </div>
              <Input
                id="add-schedule-location"
                value={addScheduleForm.location}
                onChange={(e) => handleAddScheduleFormChange('location', e.target.value)}
                placeholder="أدخل موقع الموعد (اختياري)"
              />
            </div>
          </div>

          <DialogFooter className="gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setOpenAddScheduleDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveNewSchedule}
              className="bg-islamic-green hover:bg-islamic-green/90"
              disabled={!addScheduleForm.start_time || !addScheduleForm.end_time || savingNewSchedule}
            >
              {savingNewSchedule ? "جارٍ الإضافة..." : "إضافة الموعد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تعديل موعد Dialog */}
      <Dialog open={openEditScheduleDialog} onOpenChange={setOpenEditScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-islamic-green flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل موعد
            </DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الموعد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-schedule-weekday" className="text-right">اليوم *</Label>
              <Select
                value={editScheduleForm.weekday}
                onValueChange={(value) => handleEditScheduleFormChange('weekday', value)}
              >
                <SelectTrigger id="edit-schedule-weekday">
                  <SelectValue placeholder="اختر اليوم" />
                </SelectTrigger>
                <SelectContent>
                  {weekdayOptions.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-schedule-start-time" className="text-right">وقت البداية *</Label>
                <Input
                  id="edit-schedule-start-time"
                  type="time"
                  value={editScheduleForm.start_time}
                  onChange={(e) => handleEditScheduleFormChange('start_time', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-schedule-end-time" className="text-right">وقت النهاية *</Label>
                <Input
                  id="edit-schedule-end-time"
                  type="time"
                  value={editScheduleForm.end_time}
                  onChange={(e) => handleEditScheduleFormChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-schedule-location" className="text-right">الموقع (اختياري)</Label>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mr-1" />
                  اتركه فارغاً لاستخدام موقع الحلقة الافتراضي
                </div>
              </div>
              <Input
                id="edit-schedule-location"
                value={editScheduleForm.location}
                onChange={(e) => handleEditScheduleFormChange('location', e.target.value)}
                placeholder="أدخل موقع الموعد (اختياري)"
              />
            </div>
          </div>

          <DialogFooter className="gap-2" dir="rtl">
            <Button
              variant="outline"
              onClick={() => setOpenEditScheduleDialog(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveScheduleEdit}
              className="bg-islamic-green hover:bg-islamic-green/90"
              disabled={!editScheduleForm.start_time || !editScheduleForm.end_time || savingScheduleEdit}
            >
              {savingScheduleEdit ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Users table component
interface UsersTableProps {
  users: Profile[];
  onEdit: (user: Profile) => void;
  onDelete: (user: Profile) => void;
  onChangePassword: (user: Profile) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | null;
  currentUserId?: string;
  userType: 'superadmin' | 'admin' | 'teacher';
  showOnlyChangePassword?: boolean;
  teacherCircleCounts?: Record<string, number>;
  onShowCircles?: (teacher: Profile) => void;
  onAddCircle?: (teacher: Profile) => void;
}

function UsersTable({ users, onEdit, onDelete, onChangePassword, userRole, currentUserId, userType, showOnlyChangePassword = false, teacherCircleCounts = {}, onShowCircles, onAddCircle }: UsersTableProps) {
  const showCircleCount = userType === 'teacher' || userType === 'admin';

  if (users.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/50 rounded-lg">
        <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-medium text-lg mb-1">
          {userType === "admin"
            ? userManagementLabels.noAdmins
            : userType === "superadmin"
              ? userManagementLabels.noSuperadmins
              : userManagementLabels.noteachers}
        </h3>
        <p className="text-muted-foreground text-sm">
          {userType === "admin"
            ? userManagementLabels.addAdminText
            : userType === "superadmin"
              ? userManagementLabels.addSuperadminText
              : userManagementLabels.addteacherText}
        </p>
      </div>
    );
  }

  // Determine permissions for actions
  const canEdit = (user: Profile): boolean => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'admin' && userType === 'teacher') return true;
    return false;
  };

  const canDelete = (user: Profile): boolean => {
    if (userRole === 'superadmin' && user.role !== 'superadmin') return true;
    if (userRole === 'admin' && userType === 'teacher') return true;
    return false;
  };

  const canChangePassword = (user: Profile): boolean => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'admin' && user.role === 'teacher') return true;
    if (user.id === currentUserId) return true;
    return false;
  };

  return (
    <>
      <div className="overflow-x-auto border border-islamic-green/20 rounded-lg" dir="rtl">
        <Table className="min-w-full border border-green-300 rounded-2xl overflow-hidden shadow-lg">
          <TableHeader className="bg-islamic-green">
            <TableRow>
              <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">👤 الاسم الكامل</TableHead>
              <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">🆔 اسم المستخدم</TableHead>
              <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">🔑 الدور</TableHead>
              {showCircleCount && (
                <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">📚 عدد الحلقات</TableHead>
              )}
              <TableHead className="text-center font-bold text-white py-3 px-4 border-r border-green-700">🗓 آخر تسجيل دخول</TableHead>
              <TableHead className="text-center font-bold text-white py-3 px-4">⚙️ الإجراءات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="border-b border-green-200 hover:bg-green-50 dark:hover:bg-green-900 transition-colors duration-200"
              >
                <TableCell className="text-center font-medium text-islamic-green/90 py-2 px-4 border-r border-green-200">{user.full_name}</TableCell>
                <TableCell className="text-center text-islamic-green/80 py-2 px-4 border-r border-green-200">{user.username}</TableCell>
                <TableCell className="text-center text-islamic-green/80 py-2 px-4 border-r border-green-200">
                  {user.role === 'superadmin'
                    ? userManagementLabels.superadmin
                    : user.role === 'admin'
                      ? userManagementLabels.admin
                      : userManagementLabels.teacher}
                </TableCell>
                {showCircleCount && (
                  <TableCell className="text-center py-2 px-4 border-r border-green-200">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-islamic-green/10 hover:border-islamic-green/40 border-islamic-green/20 text-islamic-green font-medium px-3 py-1"
                      onClick={() => onShowCircles && onShowCircles(user)}
                      title="عرض الحلقات وإضافة جديدة"
                    >
                      {teacherCircleCounts[user.id] ?? 0} حلقة
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-center text-islamic-green/80 text-sm py-2 px-4 border-r border-green-200">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString('en-EG', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                    : '-'}
                </TableCell>

                <TableCell className="text-center py-2 px-4">
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onChangePassword(user)}
                      disabled={!canChangePassword(user)}
                      title={userManagementLabels.changePasswordTooltip}
                      className="h-8 w-8 p-0 hover:bg-amber-50 transition-colors rounded-lg"
                    >
                      <KeyRound className="h-4 w-4 text-amber-600/80" />
                    </Button>

                    {!showOnlyChangePassword && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(user)}
                          disabled={!canEdit(user)}
                          title={canEdit(user) ? userManagementLabels.editTooltip : userManagementLabels.cannotEditSuperadmin}
                          className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
                        >
                          <Pencil className="h-4 w-4 text-islamic-green/80" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(user)}
                          disabled={!canDelete(user)}
                          title={canDelete(user) ? userManagementLabels.deleteTooltip : userManagementLabels.cannotDeleteSuperadmin}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-red-500/80" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

      </div>
    </>
  );
}