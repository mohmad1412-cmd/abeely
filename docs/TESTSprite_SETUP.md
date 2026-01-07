# إعداد TestSprite MCP

## خطوات إعداد API Key

### 1. إضافة API Key في Cursor MCP Settings

TestSprite MCP يحتاج إلى API key في إعدادات MCP server في Cursor. اتبع الخطوات التالية:

1. **افتح إعدادات Cursor:**
   - اضغط `Ctrl + ,` (أو `Cmd + ,` على Mac)
   - أو من القائمة: `File > Preferences > Settings`

2. **اذهب إلى MCP Settings:**
   - ابحث عن "MCP" في شريط البحث
   - أو اذهب إلى: `Cursor Settings > Features > Model Context Protocol`

3. **أضف TestSprite Server:**
   - ابحث عن TestSprite في قائمة MCP servers
   - أو أضف server جديد مع الإعدادات التالية:

```json
{
  "mcpServers": {
    "testsprite": {
      "command": "npx",
      "args": ["-y", "@testsprite/mcp-server"],
      "env": {
        "TESTSprite_API_KEY": "sk-user-xjGgEdX9yTMNvkTAdsqRzvuzaHolqKHxfyBOgn4xrCPdtmmlX8h2nn3AdoF5-MFRvbPlMj78Mk4XOxfK55npD0QC51mkHKzepLtq6hTW781W_vmvOTp2P3DW4kg9NGCf3So"
      }
    }
  }
}
```

4. **أعد تشغيل Cursor** بعد إضافة الإعدادات

### 2. التحقق من الإعداد

بعد إعادة التشغيل، يجب أن يعمل TestSprite MCP بشكل صحيح.

### 3. الملفات الموجودة

- ✅ `testsprite_tests/tmp/code_summary.json` - ملخص الكود والميزات
- ✅ `testsprite_tests/tmp/config.json` - إعدادات TestSprite
- ✅ `PRD.md` - وثيقة متطلبات المنتج (موجودة مسبقاً)

### 4. الخطوات التالية

بعد إعداد API key، سأقوم بـ:
1. إنشاء PRD محدث (إذا لزم الأمر)
2. إنشاء خطة اختبار frontend
3. توليد وتنفيذ الاختبارات
4. إنشاء تقرير بالنتائج

---

**ملاحظة:** إذا كان TestSprite MCP مُعد مسبقاً في Cursor، قد تحتاج فقط إلى تحديث API key في الإعدادات.

