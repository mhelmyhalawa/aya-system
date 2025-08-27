-- Fixed SQL to correct the assessments table
-- First, check if table exists and drop it if needed
DROP TABLE IF EXISTS assessments;

-- Create the assessments table with proper columns
CREATE TABLE IF NOT EXISTS assessments (
  id bigserial PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL CHECK (type IN ('juz','half_quran','full_quran','periodic')), 
  -- تفاصيل الاختبار
  from_surah int,       -- من أي سورة
  from_ayah int,        -- من أي آية
  to_surah int,         -- إلى أي سورة
  to_ayah int,          -- إلى أي آية
  tajweed_score numeric(5,2),  -- درجة التجويد
  memorization_score numeric(5,2), -- درجة الحفظ
  recitation_score numeric(5,2),   -- درجة التلاوة
  total_score numeric(5,2),       -- المجموع الكلي
  notes text,                       -- ملاحظات عامة
  recorded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  description text  -- Added proper type for description column
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assessments_student_id ON assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(date);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(type);
CREATE INDEX IF NOT EXISTS idx_assessments_recorded_by ON assessments(recorded_by);

-- Enable RLS if needed
-- ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if needed
-- CREATE POLICY "Users can view assessments" ON assessments FOR SELECT USING (true);
-- CREATE POLICY "Users can insert assessments" ON assessments FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update assessments" ON assessments FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete assessments" ON assessments FOR DELETE USING (true);
