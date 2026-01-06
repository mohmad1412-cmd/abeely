# 🎯 دليل إعداد TestSprite MCP في Cursor - خطوة بخطوة

## الطريقة الأولى: من واجهة Cursor (الأسهل)

### الخطوات:

1. **افتح إعدادات Cursor:**
   - اضغط `Ctrl + Shift + P` (أو `Cmd + Shift + P` على Mac)
   - اكتب: `Preferences: Open Settings (UI)`
   - أو اضغط `Ctrl + ,` مباشرة

2. **ابحث عن MCP:**
   - في شريط البحث في أعلى صفحة الإعدادات، اكتب: `MCP`
   - أو اذهب يدوياً إلى: `Features > Model Context Protocol`

3. **أضف TestSprite Server:**
   - انقر على `+ Add MCP Server` أو `Edit in settings.json`
   - إذا ظهرت لك واجهة إضافة server، املأ:
     - **Name:** `testsprite`
     - **Command:** `npx`
     - **Args:** `-y`, `@testsprite/testsprite-mcp@latest`
     - **Env Variables:**
       - `API_KEY`: `sk-user-xjGgEdX9yTMNvkTAdsqRzvuzaHolqKHxfyBOgn4xrCPdtmmlX8h2nn3AdoF5-MFRvbPlMj78Mk4XOxfK55npD0QC51mkHKzepLtq6hTW781W_vmvOTp2P3DW4kg9NGCf3So`

4. **احفظ وأعد تشغيل Cursor**

---

## الطريقة الثانية: تعديل settings.json مباشرة

### الخطوات:

1. **افتح ملف الإعدادات:**
   - اضغط `Ctrl + Shift + P`
   - اكتب: `Preferences: Open User Settings (JSON)`
   - أو افتح الملف مباشرة: `C:\Users\moham\AppData\Roaming\Cursor\User\settings.json`

2. **أضف هذا الكود في الملف:**

```json
{
  "mcpServers": {
    "testsprite": {
      "command": "npx",
      "args": [
        "-y",
        "@testsprite/testsprite-mcp@latest"
      ],
      "env": {
        "API_KEY": "sk-user-xjGgEdX9yTMNvkTAdsqRzvuzaHolqKHxfyBOgn4xrCPdtmmlX8h2nn3AdoF5-MFRvbPlMj78Mk4XOxfK55npD0QC51mkHKzepLtq6hTW781W_vmvOTp2P3DW4kg9NGCf3So"
      }
    }
  }
}
```

3. **احفظ الملف** (`Ctrl + S`)

4. **أعد تشغيل Cursor** تماماً (أغلق وافتح من جديد)

---

## التحقق من الإعداد:

بعد إعادة التشغيل:
1. اضغط `Ctrl + Shift + P`
2. اكتب: `MCP` أو `TestSprite`
3. إذا ظهرت أدوات TestSprite، فالإعداد نجح ✅

---

## ملاحظات مهمة:

- ⚠️ **يجب إعادة تشغيل Cursor** بعد إضافة الإعدادات
- 🔒 **احتفظ بـ API key في مكان آمن** ولا تشاركه
- 📝 **إذا كان لديك إعدادات MCP موجودة**، أضف `testsprite` داخل `mcpServers` فقط

---

## الموقع الدقيق لملف الإعدادات:

```
Windows: C:\Users\moham\AppData\Roaming\Cursor\User\settings.json
```

---

## إذا واجهت مشاكل:

1. تأكد من أن Node.js مثبت (`node --version`)
2. تأكد من أن `npx` يعمل (`npx --version`)
3. تحقق من Console في Cursor (`Help > Toggle Developer Tools`)
4. جرب إعادة تثبيت TestSprite MCP:
   ```bash
   npx -y @testsprite/testsprite-mcp@latest
   ```

