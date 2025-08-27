import { StudyCircles } from "@/components/pages/study-circles";

interface StudyCirclesPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
  userId?: string;
}

export function StudyCirclesPage({ onNavigate, userRole, userId }: StudyCirclesPageProps) {
  return (
    <StudyCircles onNavigate={onNavigate} userRole={userRole} userId={userId} />
  );
}
