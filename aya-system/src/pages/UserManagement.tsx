import { UserManagement } from "@/components/pages/user-management";

interface UserManagementPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  currentUserId?: string;
  teacherOnly?: boolean; // تمرير مباشر بدلاً من استخدام useSearchParams
}

export function UserManagementPage({ 
  onNavigate, 
  userRole = null, 
  currentUserId,
  teacherOnly = false 
}: UserManagementPageProps) {
  // تمت إزالة useSearchParams لأنها تتطلب وجود <Router>
  
  try {
    console.log('UserManagementPage props:', { userRole, currentUserId, teacherOnly });
    
    return (
      <UserManagement 
        onNavigate={onNavigate} 
        userRole={userRole} 
        currentUserId={currentUserId}
        teacherOnly={teacherOnly}
      />
    );
  } catch (error) {
    console.error('Error in UserManagementPage:', error);
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="text-destructive text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">حدث خطأ في صفحة إدارة المستخدمين</h2>
        <p className="mb-4">حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة أو التواصل مع الدعم.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          إعادة تحميل الصفحة
        </button>
      </div>
    );
  }
}
