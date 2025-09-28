import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Removed direct Dialog primitive usage after migrating to FormDialog
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"; // legacy
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Removed legacy Table components after migrating all tables to GenericTable
import { GenericTable, Column } from "@/components/ui/generic-table";
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
import { Shield, User, UserCheck, Eye, EyeOff, Pencil, UserPlus, AlertTriangle, Trash2, KeyRound, Crown, BookOpen, Calendar, Clock, MapPin, Plus, Info, NotebookPenIcon, User2Icon, RefreshCwIcon, AtSign, Lock, Users, Filter, ArrowDownUp, ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { getLabels } from '@/lib/labels';

interface UserManagementProps {
  onNavigate: (path: string) => void;
  userRole: 'superadmin' | 'admin' | 'teacher' | null;
  currentUserId?: string; // ID of the current logged-in user
  teacherOnly?: boolean;  // Flag to show only the teacher's own profile
}

export function UserManagement({ onNavigate, userRole, currentUserId, teacherOnly = false }: UserManagementProps) {
  const { userManagementLabels, errorMessages, successMessages, commonLabels, studyCircleSchedulesLabels: scsLabels } = getLabels('ar');
  // List state
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [teachers, setteachers] = useState<Profile[]>([]);
  const [superadmins, setSuperadmins] = useState<Profile[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(teacherOnly ? "teachers" : "admins");
  // Compact control bar state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // null = no sort, 'asc' | 'desc'
  const [listSortDirection, setListSortDirection] = useState<null | 'asc' | 'desc'>(null);

  const toggleListSort = () => {
    setListSortDirection(prev => prev === null ? 'asc' : prev === 'asc' ? 'desc' : null);
  };

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
  // Initialized after labels to avoid use-before-init; fallback empty then set in handlers
  const [dialogTitle, setDialogTitle] = useState<string>("");

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
  // Labels already destructured at top

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
      <div className="w-full max-w-[1600px] mx-auto p-8 text-center">
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

  // Filtering & sorting logic (applies to currently active dataset only at render usage)
  const normalize = (v: string) => v.toLowerCase();
  const matchesSearch = (u: Profile) => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);
    return [u.full_name, u.username, u.role].some(f => f && normalize(f).includes(q));
  };
  const applySort = (arr: Profile[]) => {
    if (!listSortDirection) return arr;
    return [...arr].sort((a, b) => {
      const A = a.full_name.localeCompare(b.full_name, 'ar');
      return listSortDirection === 'asc' ? A : -A;
    });
  };
  const filteredSuperadmins = applySort(superadmins.filter(matchesSearch));
  const filteredAdmins = applySort(admins.filter(matchesSearch));
  const filteredTeachers = applySort(teachers.filter(matchesSearch));

  // Render page
  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <Card className="pt-2 pb-0 px-0 sm:px-0 shadow-lg border-0">
        {/* الهيدر */}
        <CardHeader className="pb-2 bg-gradient-to-r from-green-800 via-green-700 to-green-600 border-b border-green-300 duration-300 rounded-t-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            {/* العنوان والوصف */}
            <div className="flex flex-col">
              <CardTitle className="text-lg md:text-xl font-extrabold text-green-50 flex items-center gap-2">
                <User2Icon className="h-5 w-5 text-yellow-300" />
                {teacherOnly && userRole === 'teacher'
                  ? userManagementLabels.teacherProfileTitle || 'بياناتي الشخصية'
                  : userManagementLabels.title}
              </CardTitle>
              <CardDescription className="text-xs md:text-sm text-green-100 mt-1">
                {teacherOnly && userRole === 'teacher'
                  ? userManagementLabels.teacherProfileDescription || 'إدارة بياناتك الشخصية وكلمة المرور'
                  : userManagementLabels.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0.5 pb-0 px-0 sm:px-0">
          {/* شريط علوي مضغوط */}
          {!teacherOnly && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 
                            mb-1 rounded-lg bg-white dark:bg-gray-900 p-2 shadow-sm border 
                            border-green-200 dark:border-green-700">
              {/* التابات */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full md:w-[380px] bg-green-50 rounded-lg shadow-inner p-0.5"
              >
                <TabsList className="flex w-full gap-0.5 rounded-lg bg-white dark:bg-gray-900 shadow-sm ring-1 ring-green-300 p-0.5">
                  {userRole === 'superadmin' && (
                    <TabsTrigger
                      value="superadmins"
                      className="flex flex-1 items-center justify-center gap-1 text-center text-[11px] sm:text-xs font-medium rounded-md text-green-800 py-1.5 px-2 hover:bg-green-100 hover:text-green-900 data-[state=active]:bg-islamic-green data-[state=active]:text-white transition-all duration-200"
                      title={userManagementLabels.superadmins}
                    >
                      👑 <span className="hidden sm:inline">{userManagementLabels.superadmins}</span>
                    </TabsTrigger>
                  )}
                  {(userRole === 'superadmin' || userRole === 'admin') && (
                    <TabsTrigger
                      value="admins"
                      className="flex flex-1 items-center justify-center gap-1 text-center text-[11px] sm:text-xs font-medium rounded-md text-green-800 py-1.5 px-2 hover:bg-green-100 hover:text-green-900 data-[state=active]:bg-islamic-green data-[state=active]:text-white transition-all duration-200"
                      title={userManagementLabels.administrators}
                    >
                      🛡️ <span className="hidden sm:inline">{userManagementLabels.administrators}</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="teachers"
                    className="flex flex-1 items-center justify-center gap-1 text-center text-[11px] sm:text-xs font-medium rounded-md text-green-800 py-1.5 px-2 hover:bg-green-100 hover:text-green-900 data-[state=active]:bg-islamic-green data-[state=active]:text-white transition-all duration-200"
                    title={userManagementLabels.teachers}
                  >
                    👨‍🏫 <span className="hidden sm:inline">{userManagementLabels.teachers}</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2 items-center">
                {/* زر الفلتر */}
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  className={`flex items-center gap-1.5 rounded-2xl ${showFilters ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'} dark:bg-green-700 dark:hover:bg-green-600 shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8`}
                  onClick={() => setShowFilters(p => !p)}
                  title={showFilters ? 'إخفاء أدوات الفلترة' : 'إظهار أدوات الفلترة'}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">فلتر</span>
                </Button>
                {/* زر الترتيب */}
                <Button
                  type="button"
                  variant={listSortDirection ? 'default' : 'outline'}
                  onClick={toggleListSort}
                  title={listSortDirection === null ? 'ترتيب تصاعدي حسب الاسم' : listSortDirection === 'asc' ? 'ترتيب تنازلي' : 'إلغاء الترتيب'}
                  className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold h-8 shadow-md hover:scale-105 transition-transform duration-200 ${listSortDirection === null ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600' : listSortDirection === 'asc' ? 'bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600'}`}
                >
                  {listSortDirection === null && <ArrowDownUp className="h-3.5 w-3.5" />}
                  {listSortDirection === 'asc' && <ArrowDownAZ className="h-3.5 w-3.5" />}
                  {listSortDirection === 'desc' && <ArrowUpZA className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{listSortDirection === null ? 'ترتيب' : listSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}</span>
                </Button>
                {/* زر التحديث */}
                <Button
                  variant="outline"
                  className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                  onClick={refreshData}
                  title='تحديث البيانات'
                >
                  <RefreshCwIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">تحديث</span>
                </Button>
                {/* زر إضافة مستخدم */}
                {(userRole === 'superadmin' || (userRole === 'admin' && activeTab === 'teachers')) && (
                  <Button
                    onClick={handleAddUser}
                    variant="outline"
                    className="flex items-center gap-1.5 rounded-2xl bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-md hover:scale-105 transition-transform duration-200 px-3 py-1.5 text-xs font-semibold h-8"
                    title='إضافة مستخدم'
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {activeTab === 'admins'
                        ? userManagementLabels.addNewAdmin
                        : activeTab === 'superadmins'
                          ? userManagementLabels.addNewSuperadmin
                          : userManagementLabels.addNewteacher}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}
          {showFilters && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-2 bg-white dark:bg-gray-900 p-2 md:p-2 shadow-md border border-green-200 dark:border-green-700 rounded-lg animate-fade-in">
              {/* البحث */}
              <div className="w-full md:flex-1 min-w-0 md:min-w-[180px]">
                <Input
                  title='🔍 بحث عن اسم أو اسم المستخدم'
                  placeholder="🔍 بحث عن اسم أو اسم المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-green-300 bg-green-50 shadow-sm focus:ring-2 focus:ring-islamic-green focus:border-islamic-green text-sm text-gray-800 dark:text-gray-200 transition-all duration-200"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* جدول المستخدمين منفصل تحت الهيدر ويتأثر بالتاب */}
      {teacherOnly && userRole === 'teacher' ? (
        <div className="pt-0 pb-0 px-0 sm:px-0 w-full">
          {loading ? (
            <div className="text-center p-0">{userManagementLabels.loading}</div>
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
        </div>
      ) : (
        <div className="pt-0 pb-0 px-0 sm:px-0 w-full">
          {loading ? (
            <div className="text-center p-6">{userManagementLabels.loading}</div>
          ) : activeTab === 'superadmins' && userRole === 'superadmin' ? (
            <div className="p-2 sm:p-3 md:p-4 w-full">
              <UsersTable
                users={filteredSuperadmins}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onChangePassword={handleChangePassword}
                userRole={userRole}
                currentUserId={currentUserId}
                userType="superadmin"
                teacherCircleCounts={teacherCircleCounts}
              />
            </div>
          ) : activeTab === 'admins' && (userRole === 'superadmin' || userRole === 'admin') ? (
            <div className="p-2 sm:p-3 md:p-4 w-full">
              <UsersTable
                users={filteredAdmins}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onChangePassword={handleChangePassword}
                userRole={userRole}
                currentUserId={currentUserId}
                userType="admin"
                teacherCircleCounts={teacherCircleCounts}
                onShowCircles={handleOpenCirclesDialog}
              />
            </div>
          ) : (
            <div className="p-2 sm:p-3 md:p-4 w-full">
              <UsersTable
                users={filteredTeachers}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onChangePassword={handleChangePassword}
                userRole={userRole}
                currentUserId={currentUserId}
                userType="teacher"
                teacherCircleCounts={teacherCircleCounts}
                onShowCircles={handleOpenCirclesDialog}
              />
            </div>
          )}
        </div>
      )}

      {/* User Add/Edit Dialog migrated to FormDialog */}
      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={dialogTitle}
        mode={dialogMode === 'edit' ? 'edit' : 'add'}
        hideCancelButton={true}
        saveButtonText={dialogMode === 'add' ? userManagementLabels.addUser : userManagementLabels.saveChanges}
        onSave={handleSaveUser}
      >
        <div className="grid gap-4 py-2" dir="rtl">

          {/* الاسم الكامل */}
          <div className="grid gap-2 relative">
            <Label htmlFor="full_name" className="flex items-center gap-1">
              <User className="h-4 w-4 text-green-600" />
              {userManagementLabels.fullName}
            </Label>
            <div className="relative">
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={userManagementLabels.fullName}
                className="pl-10"
              />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* اسم المستخدم */}
          <div className="grid gap-2 relative">
            <Label htmlFor="username" className="flex items-center gap-1">
              <AtSign className="h-4 w-4 text-green-600" />
              {userManagementLabels.usernameLabel}
            </Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={userManagementLabels.usernameLabel}
                className="pl-10"
              />
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="grid gap-2 relative">
            <Label htmlFor="password" className="flex items-center gap-1">
              <Lock className="h-4 w-4 text-green-600" />
              {userManagementLabels.addUserForm.password}
              {dialogMode === "edit" && (
                <span className="text-sm text-gray-400">({userManagementLabels.passwordKeep})</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={dialogMode === "add" ? userManagementLabels.enterPassword : userManagementLabels.enterNewPassword}
                className="pl-10 pr-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* اختيار الدور - Superadmin */}
          {userRole === 'superadmin' && (
            <div className="grid gap-2">
              <Label htmlFor="role" className="mb-1 flex items-center gap-1 text-sm font-medium">
                <Users className="h-4 w-4 text-green-600" />
                {userManagementLabels.role} <span className="text-destructive">*</span>
              </Label>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger
                  id="role"
                  dir="rtl"
                  className={`text-right truncate leading-none rounded-lg border px-2 pr-2 h-9 text-sm transition-all
                    focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 bg-white dark:bg-gray-800
                    ${role
                      ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-semibold'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500'}
                  `}
                >
                  <SelectValue placeholder={userManagementLabels.chooseRole} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  dir="rtl"
                  align="end"
                  side="bottom"
                  className="max-h-[260px] text-sm rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900"
                >
                  <SelectItem
                    value="superadmin"
                    className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      <span>{userManagementLabels.superadmin}</span>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="admin"
                    className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>{userManagementLabels.admin}</span>
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="teacher"
                    className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span>{userManagementLabels.teacher}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* اختيار الدور - Admin */}
          {userRole === 'admin' && (
            <div className="grid gap-2">
              <Label htmlFor="role" className="mb-1 flex items-center gap-1 text-sm font-medium">
                <Shield className="h-4 w-4 text-green-600" />
                {userManagementLabels.role} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled
              >
                <SelectTrigger
                  id="role"
                  dir="rtl"
                  className={`text-right truncate leading-none rounded-lg border px-2 pr-2 h-9 text-sm transition-all cursor-not-allowed opacity-80
                    bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500`}
                >
                  <SelectValue placeholder={userManagementLabels.chooseRole} />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  dir="rtl"
                  align="end"
                  side="bottom"
                  className="max-h-[260px] text-sm rounded-lg border border-green-200 dark:border-green-700 shadow-md bg-white dark:bg-gray-900"
                >
                  <SelectItem
                    value="teacher"
                    className="cursor-pointer data-[highlighted]:bg-green-900/80 data-[state=checked]:font-semibold rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      <span>{userManagementLabels.teacher}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

        </div>
      </FormDialog>

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
      <FormDialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
        title={userManagementLabels.changePasswordForm.title}
        mode="edit"
        hideCancelButton={false}
        saveButtonText={userManagementLabels.changePasswordForm.submit}
        onSave={handleSavePassword}
        maxWidth="380px"
      >
        <div className="grid gap-4 py-2" dir="rtl">

          {/* كلمة المرور الحالية */}
          {userToChangePassword && userToChangePassword.id === currentUserId && (
            <div className="grid gap-2 relative">
              <Label htmlFor="current_password" className="flex items-center gap-1 text-sm">
                <Lock className="h-4 w-4 text-green-600" />
                {userManagementLabels.changePasswordForm.currentPassword}
              </Label>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.currentPassword}
                  className="pl-10 pr-10 h-8 text-sm"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

          {/* كلمة المرور الجديدة */}
          <div className="grid gap-2 relative">
            <Label htmlFor="new_password" className="flex items-center gap-1 text-sm">
              <Lock className="h-4 w-4 text-green-600" />
              {userManagementLabels.changePasswordForm.newPassword}
            </Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={userManagementLabels.changePasswordForm.newPassword}
                className="pl-10 pr-10 h-8 text-sm"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* تأكيد كلمة المرور الجديدة */}
          <div className="grid gap-2 relative">
            <Label htmlFor="confirm_password" className="flex items-center gap-1 text-sm">
              <Lock className="h-4 w-4 text-green-600" />
              {userManagementLabels.changePasswordForm.confirmNewPassword}
            </Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={userManagementLabels.changePasswordForm.confirmNewPassword}
                className="pl-10 pr-10 h-8 text-sm"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
      </FormDialog>


      {/* Circles Dialog migrated to FormDialog */}
      <FormDialog
        open={openCirclesDialog}
        onOpenChange={setOpenCirclesDialog}
        title={selectedTeacher ? `حلقات ${selectedTeacher.full_name}` : 'حلقات المستخدم'}
        mode="edit"
        maxWidth="760px"
        showSaveButton={false}
        hideCancelButton
        fullBleedBody
        mobileFullScreen
        mobileInlineActions
        compactFooterSpacing
        mobileFooterShadow
        onSave={() => { /* view-only dialog */ }}
        extraButtons={
          <div className="flex gap-2 w-full justify-end">
            <Button
              onClick={handleAddCircle}
              className="bg-islamic-green hover:bg-islamic-green/90 text-white"
            >
              <UserPlus className="h-4 w-4 ml-2" />
              إضافة حلقة
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
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
            </div>
          ) : (
            <div className="border border-islamic-green/20 rounded-lg 
                            max-h-[calc(100dvh-160px)] sm:max-h-[60vh] overflow-auto custom-scrollbar 
                            scrollbar-green scroll-fade-overlay 
                            bg-white/50 dark:bg-green-950/30 transition-[max-height] duration-300 ease-in-out">
              <GenericTable
                data={teacherCircles.map(c => ({
                  ...c,
                  id: c.id,
                  __createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
                  __max: c.max_students || 'غير محدد'
                })) as any}
                columns={([
                  {
                    key: '__index', header: '🔢', align: 'center', render: (_r: any, idx?: number) => (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full
                        bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500
                        text-white text-[11px] font-bold shadow-inner ring-1 ring-white/40"
                      >
                        {(idx ?? 0) + 1}
                      </span>
                    )
                  },
                  { key: 'name', header: '📖 اسم الحلقة', align: 'right', render: (r: any) => <span className="font-medium">{r.name}</span> },
                  { key: '__max', header: '👥 الحد الأقصى للطلاب', align: 'center', render: (r: any) => <Badge variant="secondary" className="text-sm px-2 py-1 rounded-lg">{r.__max}</Badge> },
                  { key: '__createdAt', header: '📅 تاريخ الإنشاء', align: 'center', render: (r: any) => <span className="text-xs text-muted-foreground">{r.__createdAt}</span> },
                  {
                    key: '__actions', header: '⚙️ الإجراءات', align: 'center', render: (r: any) => (
                      <div className="flex justify-center items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenScheduleDialog(r)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors rounded-lg"
                          title="جدولة الحلقة"
                        >
                          <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCircle(r)}
                          className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
                          title="تعديل الحلقة"
                        >
                          <Pencil className="h-4 w-4 text-islamic-green dark:text-green-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCircle(r)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                          title="حذف الحلقة"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                        </Button>
                      </div>
                    )
                  }
                ]) as any}
                defaultView="table"
                hideSortToggle={false}
                enablePagination
                defaultPageSize={2}
                pageSizeOptions={[2, 4, 8, 16]}
                className="rounded-none border-0 text-sm"
                getRowClassName={(_: any, i: number) => `${i % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
              />
            </div>
          )}
        </div>
      </FormDialog>

      {/* Edit Circle Dialog migrated to FormDialog */}
      <FormDialog
        open={openEditCircleDialog}
        onOpenChange={setOpenEditCircleDialog}
        title="تعديل الحلقة"
        description="قم بتعديل بيانات الحلقة الدراسية"
        mode="edit"
        maxWidth="520px"
        hideCancelButton={false}
        onSave={handleSaveCircleEdit}
        saveButtonText={savingCircleEdit ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        isLoading={savingCircleEdit}
        mobileFullScreen
        mobileInlineActions
        mobileFooterShadow
        compactFooterSpacing
      >
        <div className="space-y-4 py-2">
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
      </FormDialog>

      {/* Add New Circle Dialog migrated to FormDialog */}
      <FormDialog
        open={openAddCircleDialog}
        onOpenChange={setOpenAddCircleDialog}
        title="إضافة حلقة جديدة"
        description="قم بإدخال بيانات الحلقة الدراسية الجديدة"
        mode="add"
        maxWidth="520px"
        hideCancelButton={false}
        onSave={handleSaveNewCircle}
        saveButtonText={savingNewCircle ? "جارٍ الإضافة..." : "إضافة الحلقة"}
        isLoading={savingNewCircle}
        mobileFullScreen
        mobileInlineActions
        mobileFooterShadow
        compactFooterSpacing
      >
        <div className="space-y-4 py-2">
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
      </FormDialog>

      {/* Schedule Dialog migrated to FormDialog */}
      <FormDialog
        open={openScheduleDialog}
        onOpenChange={setOpenScheduleDialog}
        title={selectedCircleForSchedule ? `جدولة حلقة : ${selectedCircleForSchedule.name}` : 'جدولة الحلقة'}
        description="إدارة مواعيد وأيام انعقاد الحلقة الدراسية"
        mode="edit"
        maxWidth="960px"
        showSaveButton={false}
        hideCancelButton
        fullBleedBody
        mobileFullScreen
        mobileInlineActions
        mobileFooterShadow
        compactFooterSpacing
        lightOverlay
        onSave={() => { /* view-only dialog */ }}
        extraButtons={
          <div className="flex gap-2 w-full justify-end">
            <Button
              onClick={handleAddSchedule}
              className="bg-islamic-green hover:bg-islamic-green/90 text-white"
            >
              <Plus className="h-4 w-4 ml-2" />
              إضافة موعد
            </Button>
          </div>
        }
      >
        <div className="space-y-0">
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
            </div>
          ) : (
            <div className="border border-islamic-green/20 rounded-lg 
                            max-h-[calc(100dvh-160px)] sm:max-h-[60vh] overflow-auto custom-scrollbar 
                            scrollbar-green scroll-fade-overlay 
                            bg-white/50 dark:bg-green-950/30 transition-[max-height] duration-300 ease-in-out">
              <GenericTable
                data={circleSchedules.map(s => ({
                  ...s,
                  id: s.id,
                  __weekday: getWeekdayName(s.weekday),
                  __from: formatTime(s.start_time),
                  __to: formatTime(s.end_time),
                  __location: s.location || 'غير محدد',
                  __created: s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '-',
                })) as any}
                columns={([
                  {
                    key: '__index', header: '🔢', align: 'center', render: (_r: any, idx?: number) => (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full
                        bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500
                        text-white text-[11px] font-bold shadow-inner ring-1 ring-white/40"
                      >
                        {(idx ?? 0) + 1}
                      </span>
                    )
                  },
                  { key: '__weekday', header: '📅 اليوم', align: 'right', render: (r: any) => <span className="font-medium">{r.__weekday}</span> },
                  { key: '__from', header: '⏱ من', align: 'center', render: (r: any) => <div className="flex items-center gap-1 justify-center"><Clock className="h-4 w-4 text-blue-500" />{r.__from}</div> },
                  { key: '__to', header: '⏱ إلى', align: 'center', render: (r: any) => <div className="flex items-center gap-1 justify-center"><Clock className="h-4 w-4 text-red-500" />{r.__to}</div> },
                  {
                    key: '__location', header: '📍 الموقع', align: 'center', render: (r: any) => r.location ? (
                      <div className="flex items-center gap-1 justify-center"><MapPin className="h-4 w-4 text-gray-500" />{r.location}</div>
                    ) : <div className="text-muted-foreground italic text-xs">{r.__location}</div>
                  },
                  { key: '__created', header: '🗓 تاريخ الإضافة', align: 'center', render: (r: any) => <span className="text-xs text-muted-foreground">{r.__created}</span> },
                  {
                    key: '__actions', header: '⚙️ الإجراءات', align: 'center', render: (r: any) => (
                      <div className="flex justify-center items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditSchedule(r)}
                          className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
                          title="تعديل الموعد"
                        >
                          <Pencil className="h-4 w-4 text-islamic-green dark:text-green-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSchedule(r)}
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
                          title="حذف الموعد"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-300" />
                        </Button>
                      </div>
                    )
                  }
                ]) as any}
                title={`المعلم : ${selectedTeacher?.full_name}`}
                defaultView="table"
                hideSortToggle={false}
                enablePagination
                defaultPageSize={4}
                pageSizeOptions={[4, 8, 16, 32]}
                className="rounded-none border-0 text-sm"
                noMaxHeight
                getRowClassName={(_: any, i: number) => `${i % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
              />
            </div>
          )}
        </div>
      </FormDialog>

      {/* Unified Add/Edit Schedule Dialog */}
      <FormDialog
        open={openAddScheduleDialog || openEditScheduleDialog}
        onOpenChange={(o) => {
          if (!o) {
            setOpenAddScheduleDialog(false);
            setOpenEditScheduleDialog(false);
          }
        }}
        title={openAddScheduleDialog ? 'إضافة موعد جديد' : 'تعديل موعد'}
        description={openAddScheduleDialog ? 'قم بتحديد اليوم والوقت لإضافة موعد جديد للحلقة' : 'قم بتعديل بيانات الموعد'}
        mode={openAddScheduleDialog ? 'add' : 'edit'}
        maxWidth="380px"
        hideCancelButton
        onSave={openAddScheduleDialog ? handleSaveNewSchedule : handleSaveScheduleEdit}
        saveButtonText={openAddScheduleDialog
          ? (savingNewSchedule ? 'جارٍ الإضافة...' : 'إضافة الموعد')
          : (savingScheduleEdit ? 'جارٍ الحفظ...' : 'حفظ التغييرات')}
        isLoading={openAddScheduleDialog ? savingNewSchedule : savingScheduleEdit}
        mobileFullScreen
        mobileInlineActions
        mobileFooterShadow
        compactFooterSpacing
      >
        {openAddScheduleDialog || openEditScheduleDialog ? (
          <div className="border border-islamic-green/20 rounded-md 
                  max-h-[calc(100dvh-140px)] sm:max-h-[55vh] 
                  overflow-auto custom-scrollbar scrollbar-green scroll-fade-overlay 
                  bg-white/50 dark:bg-green-950/30 transition-[max-height] duration-300 ease-in-out
                  p-2 space-y-2 text-[11px]">

            {/* اختيار اليوم */}
            <div className="border border-gray-200 rounded-md shadow-sm p-2 bg-white">
              <Label className="text-right text-gray-800 text-[11px] mb-1 block">
                {scsLabels?.fieldDay || 'اليوم *'}
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1 w-full">
                {weekdayOptions.map(day => {
                  const activeForm = openAddScheduleDialog ? addScheduleForm : editScheduleForm;
                  const isSelected = activeForm.weekday === day.value.toString();
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => (openAddScheduleDialog ? handleAddScheduleFormChange : handleEditScheduleFormChange)('weekday', day.value.toString())}
                      className={`flex items-center justify-center h-6 px-2 text-[10px] font-medium rounded-sm border transition-all duration-150 ease-out focus:outline-none focus:ring-1 focus:ring-blue-300 ${isSelected
                        ? 'bg-blue-500 text-white border-blue-600 shadow-sm scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400'}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* وقت البداية والنهاية */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="schedule-start-time" className="text-[11px]">وقت البداية *</Label>
                <Input
                  id="schedule-start-time"
                  type="time"
                  value={(openAddScheduleDialog ? addScheduleForm : editScheduleForm).start_time}
                  onChange={(e) => (openAddScheduleDialog ? handleAddScheduleFormChange : handleEditScheduleFormChange)('start_time', e.target.value)}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="schedule-end-time" className="text-[11px]">وقت النهاية *</Label>
                <Input
                  id="schedule-end-time"
                  type="time"
                  value={(openAddScheduleDialog ? addScheduleForm : editScheduleForm).end_time}
                  onChange={(e) => (openAddScheduleDialog ? handleAddScheduleFormChange : handleEditScheduleFormChange)('end_time', e.target.value)}
                  className="h-7 text-[11px]"
                  required
                />
              </div>
            </div>

            {/* الموقع */}
            <div className="space-y-1">
              <Label htmlFor="schedule-location" className="text-[11px]">الموقع</Label>
              <Input
                id="schedule-location"
                value={(openAddScheduleDialog ? addScheduleForm : editScheduleForm).location}
                onChange={(e) => (openAddScheduleDialog ? handleAddScheduleFormChange : handleEditScheduleFormChange)('location', e.target.value)}
                placeholder="أدخل موقع الموعد (اختياري)"
                className="h-7 text-[11px] placeholder:text-[10px]"
              />
            </div>
          </div>
        ) : null}
      </FormDialog>


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
  // Access labels inside table component (scoped)
  const { userManagementLabels } = getLabels('ar');
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

  // Columns for GenericTable
  const columns: Column<Profile & { __lastLogin: string; __circleCount?: number }>[] = [
    // فهرس الصف (يُعرض كأول عمود وفي البطاقات يظهر كشارة بجانب الاسم)
    {
      key: '__index',
      header: '🔢',
      align: 'center',
      render: (_u, idx) => (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full
            bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500
            text-white text-[11px] font-bold shadow-inner ring-1 ring-white/40"
        >
          {(idx ?? 0) + 1}
        </span>
      )
    },
    {
      key: 'full_name',
      header: `👤 ${userManagementLabels.fullName}`,
      align: 'center',
      // إزالة تلوين أخضر ثابت حتى يرث اللون المناسب: في هيدر البطاقة يكون أبيض، وفي الجدول يرث لون الخلية (أخضر داكن)
      render: (u) => <span className="font-medium">{u.full_name}</span>
    },
    {
      key: 'username',
      header: `🆔 ${userManagementLabels.usernameLabel}`,
      align: 'center',
      render: (u) => <span className="text-islamic-green/80">{u.username}</span>
    },
    {
      key: 'role',
      header: `🔑 ${userManagementLabels.role}`,
      align: 'center',
      render: (u) => (
        <span className="text-islamic-green/80">
          {u.role === 'superadmin'
            ? userManagementLabels.superadmin
            : u.role === 'admin'
              ? userManagementLabels.admin
              : userManagementLabels.teacher}
        </span>
      )
    }
  ];

  if (showCircleCount) {
    columns.push({
      key: '__circleCount',
      header: `📚 ${userManagementLabels.teacherCircleCount || 'عدد الحلقات'}`,
      align: 'center',
      render: (u) => (
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-islamic-green/10 hover:border-islamic-green/40 border-islamic-green/20 text-islamic-green font-medium px-3 py-1"
          onClick={() => onShowCircles && onShowCircles(u)}
          title="عرض الحلقات وإضافة جديدة"
        >
          {(teacherCircleCounts[u.id] ?? 0)} {userManagementLabels.circleUnit || 'حلقة'}
        </Badge>
      )
    });
  }

  columns.push({
    key: '__lastLogin',
    header: `🗓 ${userManagementLabels.lastLogin || 'آخر تسجيل دخول'}`,
    align: 'center',
    render: (u) => <span className="text-islamic-green/80 text-xs">{u.__lastLogin}</span>
  });

  columns.push({
    key: '__actions',
    header: `⚙️ ${userManagementLabels.actions}`,
    align: 'center',
    render: (u) => (
      <div className="flex justify-center items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChangePassword(u)}
          disabled={!canChangePassword(u)}
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
              onClick={() => onEdit(u)}
              disabled={!canEdit(u)}
              title={canEdit(u) ? userManagementLabels.editTooltip : userManagementLabels.cannotEditSuperadmin}
              className="h-8 w-8 p-0 hover:bg-islamic-green/10 transition-colors rounded-lg"
            >
              <Pencil className="h-4 w-4 text-islamic-green/80" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(u)}
              disabled={!canDelete(u)}
              title={canDelete(u) ? userManagementLabels.deleteTooltip : userManagementLabels.cannotDeleteSuperadmin}
              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-700 transition-colors rounded-lg"
            >
              <Trash2 className="h-4 w-4 text-red-500/80" />
            </Button>
          </>
        )}
      </div>
    )
  });

  const dataForTable = users.map(u => ({
    ...u,
    __lastLogin: u.last_login_at
      ? new Date(u.last_login_at).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })
      : '-',
    __circleCount: teacherCircleCounts[u.id] ?? 0,
  }));

  return (
    <div dir="rtl" className="border border-islamic-green/20 rounded-lg overflow-hidden w-full">
      <GenericTable
        data={dataForTable as any}
        columns={columns as any}
        defaultView="table"
        hideSortToggle
        title={userType === 'teacher' ? userManagementLabels.teachers : userType === 'admin' ? userManagementLabels.administrators : userManagementLabels.superadmins}
        className="rounded-none border-0 text-sm w-full"
        getRowClassName={(_, index) => `${index % 2 === 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-green-50'} transition-colors`}
        enablePagination
        defaultPageSize={10}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}