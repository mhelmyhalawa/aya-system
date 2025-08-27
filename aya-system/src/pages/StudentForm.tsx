import { StudentForm } from "@/components/pages/student-form";

interface StudentFormPageProps {
  onNavigate: (path: string) => void;
  studentId?: string;
  isEditMode?: boolean;
}

export function StudentFormPage({ onNavigate, studentId, isEditMode = false }: StudentFormPageProps) {
  const handleBack = () => {
    if (isEditMode && studentId) {
      onNavigate(`/student/${studentId}`);
    } else {
      onNavigate('/students');
    }
  };

  const handleSuccess = (studentId: string) => {
    // Navigate to the student details page after successful creation or update
    onNavigate(`/student/${studentId}`);
  };

  return (
    <div dir="rtl">
      <StudentForm 
        onBack={handleBack}
        onSuccess={handleSuccess}
        studentId={studentId}
        isEditMode={isEditMode}
      />
    </div>
  );
}
