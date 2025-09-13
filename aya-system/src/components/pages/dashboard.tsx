import React from 'react';
import { DashboardStatistics } from '@/components/pages/dashboard-statistics';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/types/profile';

interface DashboardPageProps {
  userRole?: UserRole | null;
  userId?: string | null;
}

export function Dashboard({ userRole, userId }: DashboardPageProps) {
  return (
  <div className="w-full max-w-[1600px] mx-auto py-6">
      <h1 className="text-3xl font-bold text-islamic-green mb-6 text-center">
        لوحة المعلومات
      </h1>
      
      <Card className="p-6 border-islamic-green/30 mb-8 shadow-md">
        <DashboardStatistics userRole={userRole} userId={userId} />
      </Card>
      
      {/* يمكن إضافة مكونات أخرى للوحة المعلومات هنا */}
    </div>
  );
}
