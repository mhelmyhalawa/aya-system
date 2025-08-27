import { StudentDetails } from "@/components/pages/student-details";

interface StudentDetailsPageProps {
  studentId: string;
  onNavigate: (path: string) => void;
}

export function StudentDetailsPage({ studentId, onNavigate }: StudentDetailsPageProps) {
  const handleBack = () => {
    onNavigate('/students');
  };

  return (
    <StudentDetails 
      studentId={studentId}
      onBack={handleBack}
    />
  );
}
