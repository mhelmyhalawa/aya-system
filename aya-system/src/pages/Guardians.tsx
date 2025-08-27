import { Guardians } from "@/components/pages/guardians";

interface GuardiansPageProps {
  onNavigate: (path: string) => void;
  userRole?: 'superadmin' | 'admin' | 'teacher' | null;
}

export function GuardiansPage({ onNavigate, userRole }: GuardiansPageProps) {
  return <Guardians onNavigate={onNavigate} userRole={userRole} />;
}
