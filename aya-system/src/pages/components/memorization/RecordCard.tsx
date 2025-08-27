import React from 'react';
import { 
  MemorizationRecord, 
  getMemorizationTypeName, 
  getMemorizationTypeColor, 
  formatMemorizationRange, 
  formatScore, 
  formatTajweedErrors 
} from '@/types/memorization-record';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pencil, Trash2 } from 'lucide-react';

interface RecordCardProps {
  record: MemorizationRecord;
  onEdit: (record: MemorizationRecord) => void;
  onDelete: (id: number) => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, onEdit, onDelete }) => {
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className={`${getMemorizationTypeColor(record.type).replace('bg-', 'bg-opacity-10 bg-')}`}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold line-clamp-1">
            {record.student?.full_name || 'غير معروف'}
          </CardTitle>
          <Badge className={`${getMemorizationTypeColor(record.type)} px-2 py-1 rounded-lg`}>
            {getMemorizationTypeName(record.type)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
          <span className="inline-block bg-gray-200 rounded-full p-1">
            <Calendar className="h-3 w-3" />
          </span>
          {new Date(record.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-semibold mb-1 text-gray-600">نطاق الحفظ:</h4>
          <p className="text-lg font-medium">{formatMemorizationRange(record)}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <h4 className="text-sm font-semibold mb-1 text-gray-600">الدرجة:</h4>
            <p className="text-md font-medium">{formatScore(record.score)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <h4 className="text-sm font-semibold mb-1 text-gray-600">أخطاء التجويد:</h4>
            <p className="text-md font-medium">{formatTajweedErrors(record.tajweed_errors)}</p>
          </div>
        </div>
        
        {record.notes && (
          <div className="bg-yellow-50 p-3 rounded-lg">
            <h4 className="text-sm font-semibold mb-1 text-gray-700">ملاحظات:</h4>
            <p className="text-sm text-gray-700">{record.notes}</p>
          </div>
        )}
        
        <div className="bg-green-50 p-2 rounded-lg text-center">
          <h4 className="text-xs font-semibold text-gray-600">المُسجل بواسطة:</h4>
          <p className="text-sm font-medium">{record.recorder?.full_name || 'غير معروف'}</p>
        </div>
        
        <div className="flex justify-center space-x-2 rtl:space-x-reverse pt-2 border-t mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100" 
            onClick={() => onEdit(record)}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>تعديل</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 bg-red-50 hover:bg-red-100" 
            onClick={() => onDelete(record.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>حذف</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecordCard;
