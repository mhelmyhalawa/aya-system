import { StudentsList } from "@/components/pages/students-list";

interface StudentsPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string | null;
}

export function StudentsPage({ onNavigate, userRole, userId }: StudentsPageProps) {
  return <StudentsList onNavigate={onNavigate} userRole={userRole} userId={userId} />;
}
