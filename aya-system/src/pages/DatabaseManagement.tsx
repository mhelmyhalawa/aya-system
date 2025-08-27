import { DatabaseManagement } from "@/components/pages/database-management";

interface DatabaseManagementPageProps {
  onNavigate: (path: string) => void;
}

export function DatabaseManagementPage({ onNavigate }: DatabaseManagementPageProps) {
  return <DatabaseManagement onNavigate={onNavigate} />;
}
