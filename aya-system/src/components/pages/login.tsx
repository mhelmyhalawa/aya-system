import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, UserCheck, Eye, EyeOff, Star, KeyRound, Crown, ArrowRight, Home } from "lucide-react";
import { login, getProfileByUsername, changePassword } from "@/lib/profile-service";
import { useToast } from "@/components/ui/use-toast";
import { Profile, UserRole } from "@/types/profile";
import { loginLabels, errorMessages, successMessages, getRoleDisplayName, userManagementLabels } from "@/lib/arabic-labels";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logoImage from "@/assets/logo.png";

interface LoginProps {
  onLogin: (user: Profile) => void;
  onNavigate: (path: string) => void;
}

export function Login({ onLogin, onNavigate }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // For change password feature
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [changePwdLoading, setChangePwdLoading] = useState(false);

  // Change password handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetUsername || !currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: errorMessages.dataError,
        description: errorMessages.missingCredentials,
        variant: "destructive"
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        title: errorMessages.dataError,
        description: userManagementLabels.changePasswordForm.passwordsMismatch,
        variant: "destructive"
      });
      return;
    }
    
    setChangePwdLoading(true);
    
    try {
      // First, check if the user exists
      const user = await getProfileByUsername(resetUsername);
      
      if (!user) {
        toast({
          title: errorMessages.loginFailed,
          description: errorMessages.invalidCredentials,
          variant: "destructive"
        });
        setChangePwdLoading(false);
        return;
      }
      
      // Change the password
      const result = await changePassword(user.id, currentPassword, newPassword);
      
      if (result.success) {
        toast({
          title: userManagementLabels.changePasswordForm.success,
          description: result.message
        });
        
        // Reset fields and close dialog
        setResetUsername('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setIsChangePasswordOpen(false);
      } else {
        toast({
          title: userManagementLabels.changePasswordForm.error,
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: errorMessages.generalError,
        description: userManagementLabels.unexpectedError,
        variant: "destructive"
      });
    } finally {
      setChangePwdLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: errorMessages.dataError,
        description: errorMessages.missingCredentials,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // استدعاء خدمة تسجيل الدخول
      const result = await login({
        username,
        password
      });
      
      if (result.success && result.user) {
        // تسجيل الدخول بنجاح
        toast({
          title: successMessages.loginSuccess,
          description: successMessages.welcome(result.user.full_name),
        });
        
        // استدعاء وظيفة تسجيل الدخول
        onLogin(result.user);
        onNavigate('/');
      } else {
        toast({
          title: errorMessages.loginFailed,
          description: result.message || errorMessages.invalidCredentials,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: errorMessages.generalError,
        description: errorMessages.loginError,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
   <div
  className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 bg-cover bg-center"
  style={{ backgroundImage: "url('/src/assets/quran-hero.jpg')" }}
>
  <div className="w-full max-w-sm">
    <Card className="border border-islamic-green/20 shadow-xl rounded-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/80">
      <CardHeader className="text-center space-y-2 pb-2">
        <div className="flex justify-center mb-2">
          <img src={logoImage} alt="مكتب آية" className="h-20 w-auto rounded-md" />
        </div>
        <CardTitle className="text-xl font-bold text-islamic-green">{loginLabels.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">{loginLabels.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">

<div
  className="p-6 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 w-full max-w-md mx-auto space-y-4 relative overflow-hidden"
  style={{
    backgroundColor: "rgba(255, 255, 255, 0.3)", // شفافية
    backdropFilter: "blur(10px)", // تأثير الزجاج
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "100px 100px",
  }}
>
  {/* Overlay خفيف لتباين النص */}
  <div className="absolute inset-0 bg-white/20 dark:bg-gray-900/30 rounded-2xl pointer-events-none"></div>

  {/* محتوى الحقول */}
  <div className="relative space-y-4 z-10">

    {/* اسم المستخدم */}
    <div className="grid gap-1">
      <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {loginLabels.username}
      </Label>
      <Input
        id="username"
        placeholder={loginLabels.usernamePrompt}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        dir="rtl"
        className="w-full text-right border border-islamic-green/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-islamic-green/40 focus:border-islamic-green transition-all duration-200 shadow-sm"
      />
    </div>

    {/* كلمة المرور */}
    <div className="grid gap-1 relative">
      <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {loginLabels.password}
      </Label>
      <Input
        id="password"
        type={showPassword ? "text" : "password"}
        placeholder={loginLabels.passwordPrompt}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        dir="rtl"
        className="w-full text-right border border-islamic-green/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-islamic-green/40 focus:border-islamic-green transition-all duration-200 shadow-sm"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-300 hover:text-islamic-green transition-colors"
      >
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>

  </div>
</div>

          {/* زر تسجيل الدخول */}
          <Button
            type="submit"
            className="w-full py-2 text-sm font-semibold bg-gradient-to-r from-islamic-green to-accent text-white rounded-lg shadow hover:from-islamic-green/90 hover:to-accent/90 transition-all duration-200"
            disabled={loading}
          >
            {loading ? loginLabels.loginInProgress : loginLabels.login}
          </Button>
        </form>

        {/* معلومات الاتصال */}
        <div className="bg-muted p-2 rounded-lg text-xs text-right border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-islamic-green mb-1">{loginLabels.loginInfoTitle}</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>{loginLabels.loginInfoMessage1}</p>
            <p>{loginLabels.loginInfoMessage2}</p>
          </div>
        </div>

        {/* روابط العودة وتغيير كلمة المرور */}
        <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2 text-sm">
          {/* العودة للصفحة الرئيسية */}
          <Button
            variant="outline"
            onClick={() => onNavigate('/')}
            className="flex-1 flex items-center justify-center gap-2 border-islamic-green text-islamic-green hover:bg-islamic-green/10 hover:scale-105 transition-transform duration-150 rounded-lg px-3 py-2"
          >
            <Home className="h-4 w-4" /> {/* أيقونة منزل */}
            العودة للصفحة الرئيسية
          </Button>

          {/* تغيير كلمة المرور */}
          <Button
            variant="outline"
            onClick={() => setIsChangePasswordOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 border-amber-600 text-amber-600 hover:bg-amber-100 hover:scale-105 transition-transform duration-150 rounded-lg px-3 py-2"
          >
            <KeyRound className="h-4 w-4" /> {/* أيقونة مفتاح */}
            تغيير كلمة المرور
          </Button>
        </div>

      </CardContent>
    </Card>
  </div>
</div>

  );

}