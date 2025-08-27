import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Guardian, GuardianCreate, GuardianUpdate } from "@/types/guardian";
import {
  getAllGuardians,
  getGuardianById,
  addGuardian,
  updateGuardian,
  searchGuardians,
  deleteGuardian
} from "@/lib/guardian-service";
import { Pencil, UserPlus, AlertTriangle, Trash2, Search, Users } from "lucide-react";
import { errorMessages, successMessages, commonLabels } from "@/lib/arabic-labels";

// نصوص واجهة المستخدم لصفحة أولياء الأمور
const guardiansLabels = {
  title: "إدارة أولياء الأمور",
  description: "قم بإضافة وتعديل وعرض بيانات أولياء الأمور",
  addGuardian: "إضافة ولي أمر جديد",
  editGuardian: "تعديل بيانات ولي الأمر",
  fullName: "الاسم الكامل",
  phoneNumber: "رقم الهاتف",
  email: "البريد الإلكتروني",
  address: "العنوان",
  actions: "الإجراءات",
  cancel: "إلغاء",
  save: "حفظ",
  deleteGuardian: "حذف ولي الأمر",
  deleteConfirmation: "هل أنت متأكد من حذف هذا ولي الأمر؟",
  deleteDescription: "هذا الإجراء لا يمكن التراجع عنه وقد يؤثر على الطلاب المرتبطين به.",
  confirm: "تأكيد",
  search: "بحث",
  searchPlaceholder: "البحث بالاسم أو رقم الهاتف",
  noGuardians: "لا يوجد أولياء أمور",
  addGuardianPrompt: "قم بإضافة ولي أمر جديد للبدء",
  loading: "جاري التحميل...",
  requiredField: "* حقل مطلوب",
  optionalField: "(اختياري)",
  updateSuccess: "تم تحديث بيانات ولي الأمر بنجاح",
  addSuccess: "تم إضافة ولي الأمر بنجاح",
  deleteSuccess: "تم حذف ولي الأمر بنجاح",
  unexpectedError: "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
  incompleteData: "بيانات غير مكتملة",
  incompleteDataMessage: "الرجاء تعبئة جميع الحقول المطلوبة",
  accessDenied: "ليس لديك صلاحية الوصول",
  accessDeniedMessage: "ليس لديك صلاحية للوصول لهذه الصفحة.",
  returnToHome: "العودة للصفحة الرئيسية",
  editTooltip: "تعديل",
  deleteTooltip: "حذف",
  noSearchResults: "لا توجد نتائج للبحث",
  tryAnotherSearch: "حاول تغيير كلمات البحث أو استخدام مصطلحات مختلفة"
};

interface GuardiansProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
}

export function Guardians({ onNavigate, userRole }: GuardiansProps) {
  // حالة القائمة
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // حالة الحوار
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [dialogTitle, setDialogTitle] = useState(guardiansLabels.addGuardian);
  
  // حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<Guardian | null>(null);
  
  // نموذج ولي الأمر
  const [guardianId, setGuardianId] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  
  const { toast } = useToast();

  // تحميل البيانات
  useEffect(() => {
    loadGuardians();
  }, []);

  const loadGuardians = async (searchTerm?: string) => {
    setLoading(true);
    
    try {
      let guardiansList;
      if (searchTerm) {
        guardiansList = await searchGuardians(searchTerm);
      } else {
        guardiansList = await getAllGuardians();
        // إعادة تعيين مربع البحث عند تحميل كل البيانات
        setSearchTerm('');
      }
      console.log('Loaded guardians:', guardiansList.length);
      setGuardians(guardiansList);
      
      // Show message if no guardians found
      if (guardiansList.length === 0 && !searchTerm) {
        toast({
          title: guardiansLabels.noGuardians,
          description: guardiansLabels.addGuardianPrompt,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("خطأ في تحميل أولياء الأمور:", error);
      toast({
        title: errorMessages.fetchFailed,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // البحث عن أولياء الأمور
  const handleSearch = async () => {
    setLoading(true);
    try {
      const results = await searchGuardians(searchTerm);
      setGuardians(results);
      
      // إظهار رسالة عند عدم وجود نتائج للبحث
      if (searchTerm && results.length === 0) {
        toast({
          title: guardiansLabels.noSearchResults || "لا توجد نتائج",
          description: guardiansLabels.tryAnotherSearch || "حاول تغيير كلمات البحث",
        });
      }
    } catch (error) {
      console.error("خطأ في البحث:", error);
      toast({
        title: errorMessages.fetchFailed,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // إضافة ولي أمر جديد
  const handleAddGuardian = () => {
    setDialogMode("add");
    setDialogTitle(guardiansLabels.addGuardian);
    setGuardianId("");
    setFullName("");
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

  // تعديل ولي أمر
  const handleEditGuardian = async (guardian: Guardian) => {
    setDialogMode("edit");
    setDialogTitle(guardiansLabels.editGuardian);
    setGuardianId(guardian.id);
    setFullName(guardian.full_name);
    setPhoneNumber(guardian.phone_number);
    setEmail(guardian.email || "");
    setAddress(guardian.address || "");
    setIsDialogOpen(true);
  };

  // حذف ولي أمر
  const handleDeleteGuardian = (guardian: Guardian) => {
    setGuardianToDelete(guardian);
    setIsDeleteDialogOpen(true);
  };

  // تأكيد حذف ولي أمر
  const confirmDeleteGuardian = async () => {
    if (!guardianToDelete) return;

    try {
      const result = await deleteGuardian(guardianToDelete.id);

      if (result.success) {
        toast({
          title: guardiansLabels.deleteSuccess,
          description: "",
          className: "bg-green-50 border-green-200",
        });
        loadGuardians();
      } else {
        toast({
          title: errorMessages.deleteFailed,
          description: result.message || guardiansLabels.unexpectedError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("خطأ في حذف ولي الأمر:", error);
      toast({
        title: errorMessages.generalError,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setGuardianToDelete(null);
    }
  };

  // حفظ البيانات
  const handleSaveGuardian = async () => {
    if (!fullName || !phoneNumber) {
      toast({
        title: guardiansLabels.incompleteData,
        description: guardiansLabels.incompleteDataMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      if (dialogMode === "add") {
        // إنشاء ولي أمر جديد
        const newGuardian: GuardianCreate = {
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || undefined,
          address: address || undefined
        };

        const result = await addGuardian(newGuardian);

        console.log('Guardian add result:', result);
        console.log('Guardian data sent:', newGuardian);

        if (result.success) {
          toast({
            title: guardiansLabels.addSuccess,
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadGuardians();
        } else {
          toast({
            title: errorMessages.saveFailed,
            description: result.message || guardiansLabels.unexpectedError,
            variant: "destructive",
          });
        }
      } else {
        // تحديث ولي أمر موجود
        const updatedGuardian: GuardianUpdate = {
          id: guardianId,
          full_name: fullName,
          phone_number: phoneNumber,
          email: email || undefined,
          address: address || undefined
        };

        const result = await updateGuardian(updatedGuardian);

        if (result.success) {
          toast({
            title: guardiansLabels.updateSuccess || "تم تحديث بيانات ولي الأمر بنجاح",
            description: "",
            className: "bg-green-50 border-green-200",
          });
          setIsDialogOpen(false);
          loadGuardians();
        } else {
          toast({
            title: errorMessages.updateFailed,
            description: result.message || guardiansLabels.unexpectedError,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("خطأ في حفظ بيانات ولي الأمر:", error);
      toast({
        title: errorMessages.generalError,
        description: guardiansLabels.unexpectedError,
        variant: "destructive",
      });
    }
  };

  // التحقق من الصلاحيات
  if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'teacher') {
    return (
      <div className="container mx-auto p-8 text-center">
        <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">{guardiansLabels.accessDenied}</h2>
        <p className="mb-4">{guardiansLabels.accessDeniedMessage}</p>
        <Button onClick={() => onNavigate('/')}>{guardiansLabels.returnToHome}</Button>
      </div>
    );
  }

  // عرض الصفحة
  return (
    <div className="container mx-auto p-4">
      <Card className="border-islamic-green/20 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-islamic-green">{guardiansLabels.title}</CardTitle>
          <CardDescription>
            {guardiansLabels.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Input
                  placeholder={guardiansLabels.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 focus:border-islamic-green"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button 
                variant="outline" 
                onClick={handleSearch}
                className="border-islamic-green text-islamic-green hover:bg-islamic-green/10"
              >
                {guardiansLabels.search}
              </Button>
            </div>
            
            <Button 
              onClick={handleAddGuardian} 
              className="bg-islamic-green hover:bg-islamic-green/90 w-full md:w-auto transition-all duration-300"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span>{guardiansLabels.addGuardian}</span>
            </Button>
          </div>
          
          {/* جدول أولياء الأمور */}
          {loading ? (
            <div className="text-center p-8">{guardiansLabels.loading}</div>
          ) : guardians.length === 0 ? (
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-lg mb-1">{guardiansLabels.noGuardians}</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {guardiansLabels.addGuardianPrompt}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" dir="rtl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{guardiansLabels.fullName}</TableHead>
                    <TableHead className="text-center">{guardiansLabels.phoneNumber}</TableHead>
                    <TableHead className="text-center">{guardiansLabels.email}</TableHead>
                    <TableHead className="text-center">{guardiansLabels.address}</TableHead>
                    <TableHead className="text-center">{guardiansLabels.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guardians.map((guardian) => (
                    <TableRow key={guardian.id}>
                      <TableCell className="font-medium text-center">{guardian.full_name}</TableCell>
                      <TableCell className="text-center">{guardian.phone_number}</TableCell>
                      <TableCell className="text-center">{guardian.email || "—"}</TableCell>
                      <TableCell className="text-center">{guardian.address || "—"}</TableCell>
                      <TableCell className="text-center flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGuardian(guardian)}
                          title={guardiansLabels.editTooltip}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGuardian(guardian)}
                          title={guardiansLabels.deleteTooltip}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نموذج إضافة/تعديل ولي أمر */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4" dir="rtl">
            <div className="grid gap-2">
              <Label htmlFor="full_name">
                {guardiansLabels.fullName} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={guardiansLabels.fullName}
                autoFocus={dialogMode === "add"}
                className="focus:border-islamic-green"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone_number">
                {guardiansLabels.phoneNumber} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone_number"
                value={phoneNumber}
                onChange={(e) => {
                  // السماح فقط بالأرقام والعلامات الخاصة بأرقام الهاتف
                  const value = e.target.value;
                  if (/^[0-9+\-\s]*$/.test(value) || value === '') {
                    setPhoneNumber(value);
                  }
                }}
                placeholder={guardiansLabels.phoneNumber}
                dir="ltr"  // تعيين اتجاه النص من اليسار إلى اليمين للأرقام
                className="focus:border-islamic-green"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">
                {guardiansLabels.email} <span className="text-muted-foreground text-sm">{guardiansLabels.optionalField}</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // إزالة رسالة الخطأ عند مسح الحقل
                  if (e.target.value === '') {
                    e.target.setCustomValidity('');
                  }
                }}
                onBlur={(e) => {
                  // التحقق من صحة البريد الإلكتروني عند مغادرة الحقل
                  if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                    e.target.setCustomValidity(errorMessages.invalidEmail);
                    toast({
                      title: errorMessages.invalidEmail,
                      description: "",
                      variant: "destructive",
                    });
                  } else {
                    e.target.setCustomValidity('');
                  }
                }}
                placeholder={guardiansLabels.email}
                dir="ltr"  // تعيين اتجاه النص من اليسار إلى اليمين للبريد الإلكتروني
                className="focus:border-islamic-green"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">
                {guardiansLabels.address} <span className="text-muted-foreground text-sm">{guardiansLabels.optionalField}</span>
              </Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={guardiansLabels.address}
                rows={3}
                className="focus:border-islamic-green"
              />
            </div>
          </div>

          <DialogFooter dir="rtl" className="flex justify-start gap-2">
            <Button onClick={handleSaveGuardian} className="bg-islamic-green hover:bg-islamic-green/90">
              {guardiansLabels.save}
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-islamic-green text-islamic-green hover:bg-islamic-green/10">
              {guardiansLabels.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteGuardian}
        title={guardiansLabels.deleteGuardian}
        description={
          <>
            {guardiansLabels.deleteConfirmation}
            <br />
            {guardiansLabels.deleteDescription}
          </>
        }
        deleteButtonText={guardiansLabels.confirm}
        cancelButtonText={guardiansLabels.cancel}
      />
    </div>
  );
}
