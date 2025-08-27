import React from 'react';
import { 
  memorizationTypeOptions,
} from '@/types/memorization-record';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Filter, Calendar, CircleUser, BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedTeacherId: string;
  setSelectedTeacherId: (value: string) => void;
  selectedCircleId: string;
  setSelectedCircleId: (value: string) => void;
  selectedStudentId: string;
  setSelectedStudentId: (value: string) => void;
  filterType: string;
  setFilterType: (value: string) => void;
  visibleTeachers: any[];
  studyCircles: any[];
  students: any[];
  onAddNewRecord: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  selectedTeacherId,
  setSelectedTeacherId,
  selectedCircleId,
  setSelectedCircleId,
  selectedStudentId,
  setSelectedStudentId,
  filterType,
  setFilterType,
  visibleTeachers,
  studyCircles,
  students,
  onAddNewRecord
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="بحث عن طالب أو سورة أو ملاحظات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10"
        />
      </div>
      
      {/* قائمة المعلمين */}
      <div className="w-full md:w-64">
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger className="flex items-center">
            <CircleUser className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="اختر معلماً" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all-teachers">جميع المعلمين</SelectItem>
            {visibleTeachers.length > 0 ? (
              visibleTeachers.map(teacher => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.full_name ?? teacher.display_name ?? `المعلم ${teacher.id.slice(0,4)}`}
                  {teacher.role && teacher.role !== 'teacher' &&
                    ` (${teacher.role === 'admin' ? 'مشرف' : teacher.role})`
                  }
                </SelectItem>
              ))
            ) : (
              <SelectItem disabled value="__no__">لا يوجد معلمين أو مشرفين متاحين</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* قائمة الحلقات */}
      <div className="w-full md:w-64">
        <Select value={selectedCircleId} onValueChange={setSelectedCircleId}>
          <SelectTrigger className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="جميع الحلقات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-circles">جميع الحلقات</SelectItem>
            {studyCircles.map(circle => (
              <SelectItem key={circle.id} value={circle.id}>
                {circle.name || `حلقة ${circle.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* قائمة الطلاب */}
      <div className="w-full md:w-64">
        <Select 
          value={selectedStudentId} 
          onValueChange={setSelectedStudentId}
          disabled={selectedCircleId === 'all-circles'}
        >
          <SelectTrigger className="flex items-center">
            <Filter className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder={selectedCircleId === 'all-circles' ? "اختر حلقة أولاً" : "جميع الطلاب"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-students">جميع الطلاب</SelectItem>
            {students
              .filter(student => 
                selectedCircleId === 'all-circles' || 
                student.study_circle_id === selectedCircleId || 
                (student.study_circle && student.study_circle.id === selectedCircleId)
              )
              .map(student => (
                <SelectItem key={student.id} value={student.id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{student.full_name}</span>
                    {student.guardian && student.guardian.full_name && (
                      <span className="text-gray-500 text-xs mr-2">
                        (ولي الأمر: {student.guardian.full_name})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>
      
      {/* قائمة نوع التسميع */}
      <div className="w-full md:w-64">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="flex items-center">
            <Calendar className="mr-2 h-4 w-4 text-gray-500" />
            <SelectValue placeholder="جميع الأنواع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            {memorizationTypeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={onAddNewRecord} className="md:w-auto flex items-center gap-1">
        <Plus className="w-4 h-4" />
        <span>إضافة سجل جديد</span>
      </Button>
    </div>
  );
};

export default FilterBar;
