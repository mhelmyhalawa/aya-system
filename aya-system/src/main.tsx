// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// استيراد ملفات التهيئة
import './lib/app-startup';
// مؤقتًا لعرض كلمة المرور المشفرة (قم بإزالة هذا السطر بعد الحصول على كلمة المرور)
import './lib/show-hashed-password';

// Render التطبيق مع BrowserRouter وبناء basename تلقائي من PUBLIC_URL
createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={process.env.PUBLIC_URL}>
    <App />
  </BrowserRouter>
);
