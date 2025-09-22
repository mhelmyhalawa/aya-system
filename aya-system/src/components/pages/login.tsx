import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed unused RadioGroup imports after layout simplification
import { Eye, EyeOff, KeyRound, Home, User2, LogIn } from "lucide-react";
import { login, getProfileByUsername, changePassword } from "@/lib/profile-service";
import { useToast } from "@/components/ui/use-toast";
import { Profile, UserRole } from "@/types/profile";
import { getLabels } from '@/lib/labels';
import { FormDialog, FormRow } from "@/components/ui/form-dialog";
import logoImage from "@/assets/logo.png";
// Removed hero background usage for simplified clean layout

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
  const { loginLabels, errorMessages, successMessages, userManagementLabels, commonLabels } = getLabels('ar');

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

  // Change password handler (refactored for FormDialog onSave)
  const handleChangePassword = async () => {

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
    <div dir="rtl" className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <div className="flex-1 flex items-start justify-center px-3 py-4 sm:py-8 sm:px-4">
        <div className="w-full max-w-[340px] sm:max-w-md mt-2 sm:mt-8">
          <Card className="shadow-md sm:shadow-lg border border-gray-200 dark:border-gray-800 rounded-xl sm:rounded-2xl bg-white dark:bg-gray-900">
            <CardHeader className="text-center space-y-1 sm:space-y-3 pb-1 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex justify-center">
                <img src={logoImage} alt={loginLabels.backToHome} className="h-10 sm:h-20 w-auto" />
              </div>
              <CardTitle className="text-[12px] sm:text-sm font-bold text-islamic-green leading-snug tracking-wide">
                {loginLabels.title}
              </CardTitle>
              {/* <CardDescription className="text-s sm:text-sm text-muted-foreground leading-relaxed">
              {loginLabels.description}
            </CardDescription> */}
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-5 pt-1 sm:pt-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4" dir="rtl" noValidate>
                <div className="group relative flex flex-col gap-0 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus-within:border-islamic-green focus-within:ring-2 focus-within:ring-islamic-green/30 transition-all">
                  {/* Username row */}
                  <div className="flex items-center h-9 sm:h-11 text-[12px] sm:text-[13px]">
                    <div className="px-2.5 sm:px-3.5 text-gray-400 dark:text-gray-300 flex items-center justify-center">
                      <User2 className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />
                    </div>
                    <div className="flex-1 flex">
                      <input
                        id="username"
                        dir="rtl"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={loginLabels.usernamePrompt}
                        className="w-full bg-transparent focus:outline-none text-right px-1 sm:px-1 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        aria-required="true"
                      />
                    </div>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700" />
                  {/* Password row */}
                  <div className="flex items-center h-9 sm:h-11 text-[12px] sm:text-[13px] relative">
                    <div className="flex-1 flex pr-10 sm:pr-12 pl-9 sm:pl-10">
                      <input
                        id="password"
                        dir="rtl"
                        autoComplete="current-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={loginLabels.passwordPrompt}
                        className="w-full bg-transparent focus:outline-none text-right text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 tracking-wide"
                        aria-required="true"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={showPassword ? loginLabels.hidePassword : loginLabels.showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-gray-400 dark:text-gray-300 hover:text-islamic-green focus:outline-none focus:ring-2 focus:ring-islamic-green/40 rounded-md transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /> : <Eye className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 text-[11px] sm:text-sm pt-2 sm:pt-3">
                  <Button
                    title={loginLabels.login}
                    type="submit"
                    disabled={loading || !username || !password}
                    aria-label={loading ? loginLabels.loginInProgress : loginLabels.login}
                    className="flex-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-islamic-green to-emerald-600 text-white hover:from-islamic-green/90 hover:to-emerald-600/90 shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-islamic-green flex items-center justify-center gap-1 transition-colors py-1 sm:py-2"
                  >
                    {loading ? (
                      <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle className="opacity-25" cx="12" cy="12" r="10" />
                        <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                      </svg>
                    ) : (
                      <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline">{loginLabels.login}</span>
                  </Button>

                  <Button
                    title={loginLabels.backToHome}
                    onClick={() => onNavigate('/')}
                    aria-label={loginLabels.backToHome}
                    className="flex-1 rounded-lg sm:rounded-xl bg-gradient-to-r from-islamic-green to-emerald-600 text-white hover:from-islamic-green/90 hover:to-emerald-600/90 shadow-sm hover:shadow focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-islamic-green flex items-center justify-center gap-1 transition-colors py-1 sm:py-2"
                  >
                    <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{loginLabels.backToHome}</span>
                  </Button>
                </div>
              </form>
              {/* <div className="grid grid-cols-2 gap-2 text-[11px] sm:text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="col-span-2 font-semibold text-islamic-green text-center">{loginLabels.loginInfoTitle}</div>
              <div className="col-span-2 space-y-1 text-gray-600 dark:text-gray-300 text-center">
                <p>{loginLabels.loginInfoMessage1}</p>
                <p>{loginLabels.loginInfoMessage2}</p>
              </div>
            </div> */}
              
              <div className="w-full text-center mt-1 sm:mt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  aria-label={loginLabels.changePassword}
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline text-[11px] sm:text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-500"
                >
                  <KeyRound className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{loginLabels.changePassword}</span>
                </button>
              </div>
            </CardContent>
          </Card>
          <FormDialog
            title={userManagementLabels.changePasswordForm.title}
            description={undefined}
            open={isChangePasswordOpen}
            onOpenChange={setIsChangePasswordOpen}
            onSave={handleChangePassword}
            saveButtonText={userManagementLabels.changePasswordForm.submit}
            isLoading={changePwdLoading}
            hideCancelButton={true}
            mode="edit"
            maxWidth="320px"
          >
            <FormRow label={userManagementLabels.changePasswordForm.username}>
              <div className="relative">
              <Input
                id="reset_username"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder={userManagementLabels.changePasswordForm.username}
                dir="rtl"
                className="pr-7 sm:pr-9 h-7 sm:h-8 text-xs sm:text-sm"
              />
              <User2
                size={12}
                className="sm:w-3.5 sm:h-3.5 absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              </div>
            </FormRow>
            <FormRow label={userManagementLabels.changePasswordForm.currentPassword}>
              <div className="relative">
                <Input
                  id="current_password"
                  type={showCurrentPwd ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.currentPassword}
                  dir="rtl"
                  className="pr-7 sm:pr-9 h-7 sm:h-8 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  aria-label={showCurrentPwd ? loginLabels.hidePassword : loginLabels.showPassword}
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-islamic-green"
                >
                  {showCurrentPwd ? <EyeOff size={12} className="sm:w-3.5 sm:h-3.5" /> : <Eye size={12} className="sm:w-3.5 sm:h-3.5" />}
                </button>
              </div>
            </FormRow>
            <FormRow label={userManagementLabels.changePasswordForm.newPassword}>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.newPassword}
                  dir="rtl"
                  className="pr-7 sm:pr-9 h-7 sm:h-8 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  aria-label={showNewPwd ? loginLabels.hidePassword : loginLabels.showPassword}
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-islamic-green"
                >
                  {showNewPwd ? <EyeOff size={12} className="sm:w-3.5 sm:h-3.5" /> : <Eye size={12} className="sm:w-3.5 sm:h-3.5" />}
                </button>
              </div>
            </FormRow>
            <FormRow label={userManagementLabels.changePasswordForm.confirmNewPassword}>
              <div className="relative">
                <Input
                  id="confirm_new_password"
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={userManagementLabels.changePasswordForm.confirmNewPassword}
                  dir="rtl"
                  className="pr-7 sm:pr-9 h-7 sm:h-8 text-xs sm:text-sm"
                />
                <button
                  type="button"
                  aria-label={showConfirmPwd ? loginLabels.hidePassword : loginLabels.showPassword}
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-islamic-green"
                >
                  {showConfirmPwd ? <EyeOff size={12} className="sm:w-3.5 sm:h-3.5" /> : <Eye size={12} className="sm:w-3.5 sm:h-3.5" />}
                </button>
              </div>
            </FormRow>
          </FormDialog>
        </div>
      </div>
    </div>
  );
}