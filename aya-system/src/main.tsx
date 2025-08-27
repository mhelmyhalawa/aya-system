import { createRoot } from 'react-dom/client'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// استيراد ملف تهيئة التطبيق لإنشاء المستخدم المسؤول الرئيسي
import './lib/app-startup'
// مؤقتًا لعرض كلمة المرور المشفرة (قم بإزالة هذا السطر بعد الحصول على كلمة المرور)
import './lib/show-hashed-password'

createRoot(document.getElementById("root")!).render(<App />);
