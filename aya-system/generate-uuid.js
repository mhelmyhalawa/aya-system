// generate-uuid.js
// سكريبت لإنشاء معرف فريد للمسؤول الرئيسي

const { v4: uuidv4 } = require('uuid');

// إنشاء معرف UUID فريد
function generateUUID() {
  const uuid = uuidv4();
  console.log('تم إنشاء معرف UUID جديد:');
  console.log(uuid);
  
  // إنشاء عبارة SQL مع المعرف الجديد
  const sqlStatement = `
INSERT INTO profiles (
  id, 
  full_name, 
  role, 
  username, 
  password_hash,
  login_attempts,
  created_at
) VALUES (
  '${uuid}', 
  'المسؤول الرئيسي', 
  'super_admin', 
  'superadmin', 
  '$2a$10$0lnhiRBBZs4o8HsV5fWAR.ZsqR09MK0YO6iqpqFRhLfBGgw7gaJXq',
  0,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = '$2a$10$0lnhiRBBZs4o8HsV5fWAR.ZsqR09MK0YO6iqpqFRhLfBGgw7gaJXq',
  login_attempts = 0;
  `;
  
  console.log('\nعبارة SQL مع المعرف الجديد:');
  console.log(sqlStatement);
  
  // كود TypeScript لتحديث الملف super-admin-setup.ts
  const tsCode = `
// استبدل هذا السطر في ملف super-admin-setup.ts:
const SUPER_ADMIN_ID = '${uuid}';  // معرف ثابت لضمان نفس المستخدم دائمًا
  `;
  
  console.log('\nكود TypeScript لتحديث ملف super-admin-setup.ts:');
  console.log(tsCode);
}

generateUUID();
