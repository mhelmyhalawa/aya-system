import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { Home } from "@/components/pages/home";
import { Login } from "@/components/pages/login";
import { ParentInquiry } from "@/components/pages/parent-inquiry";
import { DatabaseManagementPage } from "@/pages/DatabaseManagement";
import { SupabaseTestPage } from "@/pages/SupabaseTest";
import { UserManagementPage } from "@/pages/UserManagement";
import { GuardiansList } from "@/pages/GuardiansList";
import { StudentsPage } from "@/pages/Students";
import { StudentsListPage } from "@/pages/StudentsList";
import { StudyCirclesPage } from "@/pages/StudyCircles";
import { StudyCircleSchedulesPage } from "@/pages/StudyCircleSchedules";
import { ProfilePage } from "@/pages/ProfilePage";
import { TeacherSessions } from "@/pages/TeacherSessions";
import { AttendanceRecord } from "@/pages/AttendanceRecord";
import MemorizationRecords from "@/pages/MemorizationRecords";
import StudentAssessments from "@/pages/StudentAssessments";
import { Profile } from "@/types/profile";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

type UserRole = 'superadmin' | 'admin' | 'teacher' | 'parent' | null;

const App = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // وظيفة تبديل حالة القائمة الجانبية
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Parse hash-based routing for student details
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const path = hash.substring(1); // Remove the # character
        setCurrentPath(path);
      } else {
        // If hash is empty, set to home
        setCurrentPath('/');
      }
    };

    // Handle initial hash if present
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // في useEffect لتحميل بيانات المستخدم من localStorage عند بدء التطبيق
  useEffect(() => {
    // محاولة استرجاع بيانات المستخدم من localStorage
    const storedUser = localStorage.getItem('currentUser');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedUser && storedRole) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
        setUserRole(storedRole as UserRole);
        console.log("App - Loaded user from localStorage:", { 
          user: parsedUser, 
          role: storedRole,
          userRole: parsedUser.role
        });
        
        // تأكد من تطابق الأدوار
        if (parsedUser.role !== storedRole) {
          console.warn("Warning: Role mismatch in localStorage:", {
            profileRole: parsedUser.role,
            storedRole: storedRole
          });
        }
      } catch (error) {
        console.error("Error parsing stored user:", error);
      }
    }
  }, []);

  const handleNavigate = (path: string) => {
    if (path.startsWith('/')) {
      // Normal navigation
      setCurrentPath(path);
      // Update URL hash for better bookmarking and history
      if (path !== '/') {
        window.location.hash = path;
      } else {
        // Clear hash for home page
        history.pushState("", document.title, window.location.pathname + window.location.search);
      }
    } else {
      // External URL
      window.location.href = path;
    }
  };

  // تحديث وظيفة handleLogin لحفظ البيانات في localStorage
  const handleLogin = async (user: { id: string; full_name: string; role: UserRole }) => {
    console.log("Login successful with user:", user);
    
    // تأكد من أن الدور متوافق مع نوع Profile
    const validProfileRoles: Array<'superadmin' | 'admin' | 'teacher'> = ['superadmin', 'admin', 'teacher'];
    const userProfile: Profile = {
      id: user.id,
      full_name: user.full_name,
      role: validProfileRoles.includes(user.role as any) ? user.role as 'superadmin' | 'admin' | 'teacher' : 'teacher', // Make sure role is valid for Profile
      username: '', // قيمة افتراضية
      password_hash: '', // قيمة افتراضية
    };
    
    // حفظ البيانات في localStorage
    localStorage.setItem('currentUser', JSON.stringify(userProfile));
    localStorage.setItem('userRole', user.role);
    
    console.log("Saving user to state:", {
      profile: userProfile,
      role: user.role
    });
    
    setCurrentUser(userProfile);
    setUserRole(user.role);
    handleNavigate('/');
  };

  // تحديث وظيفة handleLogout لمسح البيانات من localStorage
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    setCurrentUser(null);
    setUserRole(null);
    setCurrentPath('/');
    // Clear hash
    history.pushState("", document.title, window.location.pathname + window.location.search);
  };

  const renderPage = () => {
    // أعِد فقط المحتوى الداخلي للصفحات، لأن الـ Header والـ Sidebar والـ Footer سيتم تضمينهم على مستوى التطبيق
    switch (currentPath) {
      case '/':
        return <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/login':
        return <Login onLogin={handleLogin} onNavigate={handleNavigate} />;
      case '/parent-inquiry':
        return <ParentInquiry onNavigate={handleNavigate} />;
      case '/students':
        return <StudentsPage onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin' | 'teacher'} userId={currentUser?.id} />;
      case '/students-list':
        return (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') ? 
          <StudentsListPage onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin' | 'teacher'} userId={currentUser?.id} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/database-management':
        return (userRole === 'superadmin' || userRole === 'admin') ? 
          <DatabaseManagementPage onNavigate={handleNavigate} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/user-management':
        return (userRole === 'superadmin' || userRole === 'admin') ? 
          <UserManagementPage onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin'} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/guardians':
      case '/guardians-list':
        return (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') ? 
          <GuardiansList onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin' | 'teacher'} userId={currentUser?.id} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/study-circles':
        return (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') ? 
          <StudyCirclesPage onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin' | 'teacher'} userId={currentUser?.id} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/study-circle-schedules':
        return (userRole === 'superadmin' || userRole === 'admin' || userRole === 'teacher') ? 
          <StudyCircleSchedulesPage onNavigate={handleNavigate} userRole={userRole as 'superadmin' | 'admin' | 'teacher'} userId={currentUser?.id} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/supabase-test':
        return (userRole === 'superadmin' || userRole === 'admin') ? 
          <SupabaseTestPage onNavigate={handleNavigate} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/profile':
        return currentUser ? 
          <ProfilePage onNavigate={handleNavigate} currentUser={currentUser} /> : 
          <Login onLogin={handleLogin} onNavigate={handleNavigate} />;
      case '/teacher-sessions':
        console.log("Route /teacher-sessions - User Role:", userRole);
        console.log("Route /teacher-sessions - Current User:", currentUser);
        console.log("Route /teacher-sessions - Condition Check:", (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser);
        
        return (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser ? 
          <TeacherSessions onNavigate={handleNavigate} currentUser={currentUser} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/attendance-record':
        return (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser ? 
          <AttendanceRecord onNavigate={handleNavigate} currentUser={currentUser} /> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/memorization-records':
        return (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser ? 
          <ErrorBoundary>
            <MemorizationRecords onNavigate={handleNavigate} currentUser={currentUser} />
          </ErrorBoundary> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      case '/student-assessments':
        return (userRole === 'teacher' || userRole === 'admin' || userRole === 'superadmin') && currentUser ? 
          <ErrorBoundary>
            <StudentAssessments onNavigate={handleNavigate} currentUser={currentUser} />
          </ErrorBoundary> : 
          <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
      default:
        // If it's not a known route, redirect to home
        setTimeout(() => handleNavigate('/'), 0);
        return <Home onNavigate={handleNavigate} userRole={userRole as any} currentUser={currentUser} onLogout={handleLogout} />;
    }
  };

  console.log("App rendering with:", { userRole, currentUser });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col" dir="rtl">
          {/* الهيدر ثابت في جميع الشاشات */}
          <Header 
            currentPath={currentPath}
            onNavigate={handleNavigate}
            userRole={userRole}
            currentUser={currentUser}
            onLogout={handleLogout}
            onSidebarToggle={toggleSidebar}  // استخدام وظيفة تبديل القائمة الجانبية
          />
          
          <div className="flex flex-1 relative pt-16">
            {/* القائمة الجانبية ثابتة في جميع الشاشات إذا كان المستخدم مسجل دخول */}
            {userRole && (
              <Sidebar                 
                onNavigate={handleNavigate} 
                onLogout={handleLogout}
                isOpen={sidebarOpen}  // استخدام حالة القائمة الجانبية
                setIsOpen={setSidebarOpen}  // تمرير وظيفة تغيير الحالة
                userRole={userRole} 
              />
            )}
            
            {/* المحتوى الرئيسي */}
            <main className={`flex-1 ${userRole ? (sidebarOpen ? "mr-64" : "mr-16") : ""}`}>
              {renderPage()}
            </main>
          </div>
          
          {/* الفوتر ثابت في جميع الشاشات */}
          <Footer />
        </div>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;