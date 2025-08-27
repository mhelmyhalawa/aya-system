import React from 'react';
import { 
  MemorizationRecordCreate, 
  MemorizationType, 
  memorizationTypeOptions, 
  quranSurahs, 
  getSurahName 
} from '@/types/memorization-record';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
} from "@/components/ui/dialog";

interface RecordFormProps {
  formData: MemorizationRecordCreate;
  formErrors: {
    student_id?: string;
    from_surah?: string;
    from_ayah?: string;
    to_surah?: string;
    to_ayah?: string;
    score?: string;
  };
  students: any[];
  isLoading: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  onInputChange: (field: string, value: any) => void;
  onSurahChange: (field: 'from_surah' | 'to_surah', value: number) => void;
}

const RecordForm: React.FC<RecordFormProps> = ({
  formData,
  formErrors,
  students,
  isLoading,
  isEditing,
  onCancel,
  onSave,
  onInputChange,
  onSurahChange
}) => {
  return (
    <div className="space-y-4">
      {/* اختيار الطالب */}
      <div className="grid gap-2">
        <Label htmlFor="student_id" className="text-right">
          الطالب <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={formData.student_id} 
          onValueChange={(value) => onInputChange('student_id', value)}
        >
          <SelectTrigger id="student_id">
            <SelectValue placeholder="اختر الطالب" />
          </SelectTrigger>
          <SelectContent>
            {students.map(student => (
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
            ))}
          </SelectContent>
        </Select>
        {formErrors.student_id && (
          <p className="text-sm text-red-500">{formErrors.student_id}</p>
        )}
      </div>

      {/* التاريخ ونوع السجل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="date" className="text-right">
            التاريخ <span className="text-red-500">*</span>
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onInputChange('date', e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="type" className="text-right">
            نوع السجل <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => onInputChange('type', value as MemorizationType)}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="اختر النوع" />
            </SelectTrigger>
            <SelectContent>
              {memorizationTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* نطاق الحفظ - من */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="from_surah" className="text-right">
            من سورة <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.from_surah.toString()} 
            onValueChange={(value) => onSurahChange('from_surah', parseInt(value, 10))}
          >
            <SelectTrigger id="from_surah">
              <SelectValue placeholder="اختر السورة">
                {formData.from_surah ? `${formData.from_surah}. ${getSurahName(formData.from_surah)}` : "اختر السورة"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {quranSurahs.map(surah => (
                <SelectItem key={surah.number} value={surah.number.toString()}>
                  {surah.number}. {getSurahName(surah.number)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.from_surah && (
            <p className="text-sm text-red-500">{formErrors.from_surah}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="from_ayah" className="text-right">
            من آية <span className="text-red-500">*</span>
          </Label>
          <Input
            id="from_ayah"
            type="number"
            min="1"
            max={quranSurahs.find(s => s.number === formData.from_surah)?.ayahs || 286}
            value={formData.from_ayah}
            onChange={(e) => onInputChange('from_ayah', parseInt(e.target.value, 10))}
          />
          {formErrors.from_ayah && (
            <p className="text-sm text-red-500">{formErrors.from_ayah}</p>
          )}
        </div>
      </div>

      {/* نطاق الحفظ - إلى */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="to_surah" className="text-right">
            إلى سورة <span className="text-red-500">*</span>
          </Label>
          <Select 
            value={formData.to_surah.toString()} 
            onValueChange={(value) => onSurahChange('to_surah', parseInt(value, 10))}
          >
            <SelectTrigger id="to_surah">
              <SelectValue placeholder="اختر السورة">
                {formData.to_surah ? `${formData.to_surah}. ${getSurahName(formData.to_surah)}` : "اختر السورة"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {quranSurahs.map(surah => (
                <SelectItem key={surah.number} value={surah.number.toString()}>
                  {surah.number}. {getSurahName(surah.number)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formErrors.to_surah && (
            <p className="text-sm text-red-500">{formErrors.to_surah}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="to_ayah" className="text-right">
            إلى آية <span className="text-red-500">*</span>
          </Label>
          <Input
            id="to_ayah"
            type="number"
            min="1"
            max={quranSurahs.find(s => s.number === formData.to_surah)?.ayahs || 286}
            value={formData.to_ayah}
            onChange={(e) => onInputChange('to_ayah', parseInt(e.target.value, 10))}
          />
          {formErrors.to_ayah && (
            <p className="text-sm text-red-500">{formErrors.to_ayah}</p>
          )}
        </div>
      </div>

      {/* التقييم */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="score" className="text-right">
            الدرجة (100-0)
          </Label>
          <Input
            id="score"
            type="number"
            min="0"
            max="100"
            value={formData.score !== undefined ? formData.score : ''}
            onChange={(e) => onInputChange('score', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
            placeholder="أدخل الدرجة (اختياري)"
          />
          {formErrors.score && (
            <p className="text-sm text-red-500">{formErrors.score}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tajweed_errors" className="text-right">
            أخطاء التجويد
          </Label>
          <Input
            id="tajweed_errors"
            type="number"
            min="0"
            value={formData.tajweed_errors && typeof formData.tajweed_errors === 'object' ? 
              (formData.tajweed_errors.lahn_jali || '').toString() : 
              ''}
            onChange={(e) => onInputChange('tajweed_errors', e.target.value === '' ? undefined : { lahn_jali: parseInt(e.target.value, 10) })}
            placeholder="أدخل عدد الأخطاء (اختياري)"
          />
        </div>
      </div>

      {/* الملاحظات */}
      <div className="grid gap-2">
        <Label htmlFor="notes" className="text-right">
          ملاحظات
        </Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onInputChange('notes', e.target.value)}
          placeholder="أدخل أي ملاحظات إضافية هنا..."
          className="min-h-[100px]"
        />
      </div>

      <DialogFooter className="flex space-x-2 rtl:space-x-reverse pt-4">
        {formData.student_id && students.length > 0 && (
          <div className="w-full flex justify-start mb-2">
            <div className="bg-muted px-3 py-1 rounded-md text-sm">
              <span className="font-medium">الطالب: </span>
              {students.find(s => s.id === formData.student_id)?.full_name || 'غير محدد'}
              {students.find(s => s.id === formData.student_id)?.guardian?.full_name && (
                <span className="mr-2">
                  <span className="text-gray-500">ولي الأمر: </span>
                  {students.find(s => s.id === formData.student_id)?.guardian?.full_name}
                </span>
              )}
            </div>
          </div>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="button" onClick={onSave} disabled={isLoading}>
          {isLoading ? 'جاري الحفظ...' : isEditing ? 'تحديث السجل' : 'إضافة السجل'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default RecordForm;
