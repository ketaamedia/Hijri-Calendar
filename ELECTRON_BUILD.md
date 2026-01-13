# بناء تطبيق الرزنامة لـ Windows

## المتطلبات
- Node.js 18 أو أحدث
- Windows 10/11

## خطوات البناء على جهازك

### 1. تحميل المشروع
قم بتحميل المشروع من Replit أو استنساخه من Git.

### 2. تعديل package.json
أضف الإعدادات التالية إلى ملف `package.json`:

```json
{
  "name": "al-raznamah",
  "productName": "الرزنامة",
  "version": "1.0.0",
  "description": "تطبيق تقويم ثنائي اللغة يدعم التقويم الهجري والميلادي",
  "main": "electron/main.js"
}
```

### 3. إضافة سكريبتات البناء
أضف هذه السكريبتات في قسم `scripts`:

```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5000 && electron .\"",
    "electron:build": "npm run build && electron-builder --win --dir",
    "electron:dist": "npm run build && electron-builder --win"
  }
}
```

### 4. إضافة إعدادات electron-builder
أضف قسم `build` في package.json:

```json
{
  "build": {
    "appId": "com.alraznamah.calendar",
    "productName": "الرزنامة",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis", "portable"],
      "icon": "client/public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### 5. تثبيت الحزم
```bash
npm install
```

### 6. التشغيل في وضع التطوير
```bash
npm run electron:dev
```

### 7. بناء النسخة النهائية
```bash
npm run electron:dist
```

سيتم إنشاء ملفات التثبيت في مجلد `release/`.

## ملفات Electron
- `electron/main.js` - الملف الرئيسي لـ Electron
- `electron/preload.js` - ملف preload للتواصل الآمن

## ملاحظات
- التطبيق يعمل offline بالكامل - لا يحتاج اتصال بالإنترنت
- البيانات تُحفظ في IndexedDB محليًا
- تصدير PDF يعمل مع خط Amiri المدمج
