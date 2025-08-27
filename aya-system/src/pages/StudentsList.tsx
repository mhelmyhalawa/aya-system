import { StudentsList } from "../components/pages/students-list";

interface StudentsListPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string | null;
}

export function StudentsListPage({ onNavigate, userRole, userId }: StudentsListPageProps) {
  console.log("Rendering StudentsList page with role:", userRole);
  
  return (
    <div dir="rtl">
      <StudentsList 
        onNavigate={onNavigate}
        userRole={userRole}
        userId={userId}
      />
    </div>
  );
}
