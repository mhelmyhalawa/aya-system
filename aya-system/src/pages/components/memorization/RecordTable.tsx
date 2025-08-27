import React from 'react';
import { 
  MemorizationRecord,
  getMemorizationTypeName,
  getMemorizationTypeColor,
  formatMemorizationRange,
  formatScore,
  formatTajweedErrors
} from '@/types/memorization-record';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from 'lucide-react';

interface RecordTableProps {
  records: MemorizationRecord[];
  onEdit: (record: MemorizationRecord) => void;
  onDelete: (id: number) => void;
}

const RecordTable: React.FC<RecordTableProps> = ({ records, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الطالب</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">نطاق الحفظ</TableHead>
            <TableHead className="text-right">الدرجة</TableHead>
            <TableHead className="text-right">أخطاء التجويد</TableHead>
            <TableHead className="text-right">المُسجل بواسطة</TableHead>
            <TableHead className="text-center">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">
                {record.student?.full_name || 'غير معروف'}
              </TableCell>
              <TableCell>{new Date(record.date).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</TableCell>
              <TableCell>
                <Badge className={getMemorizationTypeColor(record.type)}>
                  {getMemorizationTypeName(record.type)}
                </Badge>
              </TableCell>
              <TableCell>{formatMemorizationRange(record)}</TableCell>
              <TableCell>{formatScore(record.score)}</TableCell>
              <TableCell>{formatTajweedErrors(record.tajweed_errors)}</TableCell>
              <TableCell>{record.recorder?.full_name || 'غير معروف'}</TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onEdit(record)} 
                    className="h-8 w-8 p-0 hover:text-blue-600 hover:bg-blue-50"
                    title="تعديل"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(record.id)} 
                    className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecordTable;
