import * as bcrypt from 'bcryptjs';

/**
 * تشفير كلمة المرور باستخدام bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  // استخدام bcrypt لتشفير كلمة المرور
  // يمكن تغيير هذه الوظيفة لاستخدام أي مكتبة تشفير أخرى
  return await bcrypt.hash(password, 10);
};

/**
 * مقارنة كلمة المرور المدخلة مع كلمة المرور المشفرة
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  // مقارنة كلمة المرور باستخدام bcrypt
  return await bcrypt.compare(password, hashedPassword);
};
