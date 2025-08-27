-- إنشاء جدول سجلات الحفظ والمراجعة
CREATE TABLE IF NOT EXISTS memorization_records (
  id bigserial PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL CHECK (type IN ('new','review','sabqi')),
  from_surah int NOT NULL CHECK (from_surah >= 1 AND from_surah <= 114),
  from_ayah int NOT NULL CHECK (from_ayah >= 1),
  to_surah int NOT NULL CHECK (to_surah >= 1 AND to_surah <= 114),
  to_ayah int NOT NULL CHECK (to_ayah >= 1),
  score numeric(5,2) CHECK (score >= 0 AND score <= 100), -- درجة التسميع
  tajweed_errors jsonb, -- {"lahn_jali":1,"lahn_khafi":2}
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- إضافة فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_memorization_records_student_id ON memorization_records(student_id);
CREATE INDEX IF NOT EXISTS idx_memorization_records_date ON memorization_records(date);
CREATE INDEX IF NOT EXISTS idx_memorization_records_type ON memorization_records(type);
CREATE INDEX IF NOT EXISTS idx_memorization_records_recorded_by ON memorization_records(recorded_by);

-- إضافة صلاحيات RLS (Row Level Security) إذا كانت مطلوبة
-- ALTER TABLE memorization_records ENABLE ROW LEVEL SECURITY;

-- إضافة سياسات RLS للأمان
-- CREATE POLICY "Users can view memorization records" ON memorization_records FOR SELECT USING (true);
-- CREATE POLICY "Users can insert memorization records" ON memorization_records FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update memorization records" ON memorization_records FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete memorization records" ON memorization_records FOR DELETE USING (true);
