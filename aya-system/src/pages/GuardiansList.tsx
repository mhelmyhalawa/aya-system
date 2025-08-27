import { Guardians } from "../components/pages/guardians-list";

interface GuardiansListPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string | null;
}

export function GuardiansList({ onNavigate, userRole, userId }: GuardiansListPageProps) {
  console.log("Rendering GuardiansList page with role:", userRole);
  
  return (
    <div dir="rtl">
      <Guardians 
        onNavigate={onNavigate}
        userRole={userRole}
        userId={userId}
      />
    </div>
  );
}

// تصدير الصفحة كاسم افتراضي أيضًا
export default GuardiansList;




