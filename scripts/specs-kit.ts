#!/usr/bin/env tsx
/**
 * SPECS KIT - أداة لتحليل وتنفيذ الخطط من مجلد specs
 * 
 * الاستخدام:
 *   npx tsx scripts/specs-kit.ts [command]
 * 
 * الأوامر المتاحة:
 *   analyze    - تحليل جميع ملفات specs
 *   list       - عرض قائمة الخطط المتاحة
 *   execute    - تنفيذ خطة محددة
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SPECS_DIR = join(process.cwd(), 'specs');

interface SpecFile {
  name: string;
  path: string;
  content: string;
  type: 'plan' | 'task' | 'checklist' | 'data-model' | 'other';
}

function getSpecFiles(): SpecFile[] {
  const files: SpecFile[] = [];
  
  try {
    const entries = readdirSync(SPECS_DIR);
    
    for (const entry of entries) {
      const fullPath = join(SPECS_DIR, entry);
      const stats = statSync(fullPath);
      
      if (stats.isFile() && entry.endsWith('.md')) {
        const content = readFileSync(fullPath, 'utf-8');
        const type = categorizeFile(entry, content);
        
        files.push({
          name: entry,
          path: fullPath,
          content,
          type
        });
      }
    }
  } catch (error) {
    console.error('❌ خطأ في قراءة مجلد specs:', error);
    process.exit(1);
  }
  
  return files;
}

function categorizeFile(name: string, content: string): SpecFile['type'] {
  if (name.includes('PLAN') || name.includes('plan')) return 'plan';
  if (name.includes('TASK') || name.includes('task')) return 'task';
  if (name.includes('CHECKLIST') || name.includes('checklist')) return 'checklist';
  if (name.includes('data-model')) return 'data-model';
  return 'other';
}

function analyzeSpecs() {
  console.log('📋 تحليل ملفات specs...\n');
  
  const files = getSpecFiles();
  
  console.log(`✅ تم العثور على ${files.length} ملف specs\n`);
  
  // تصنيف الملفات
  const plans = files.filter(f => f.type === 'plan');
  const tasks = files.filter(f => f.type === 'task');
  const checklists = files.filter(f => f.type === 'checklist');
  const dataModels = files.filter(f => f.type === 'data-model');
  const others = files.filter(f => f.type === 'other');
  
  console.log('📊 إحصائيات:');
  console.log(`   - الخطط (Plans): ${plans.length}`);
  console.log(`   - المهام (Tasks): ${tasks.length}`);
  console.log(`   - قوائم التحقق (Checklists): ${checklists.length}`);
  console.log(`   - نماذج البيانات (Data Models): ${dataModels.length}`);
  console.log(`   - أخرى: ${others.length}\n`);
  
  // عرض الخطط الرئيسية
  if (plans.length > 0) {
    console.log('📝 الخطط المتاحة:');
    plans.forEach(file => {
      const titleMatch = file.content.match(/^#+\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : file.name;
      console.log(`   - ${file.name}: ${title}`);
    });
    console.log('');
  }
  
  // استخراج المهام
  const allTasks: string[] = [];
  files.forEach(file => {
    const taskMatches = file.content.matchAll(/-\s+\[([ x])\]\s+(.+)/g);
    for (const match of taskMatches) {
      const status = match[1] === 'x' ? '✅' : '⏳';
      allTasks.push(`${status} ${match[2]} (${file.name})`);
    }
  });
  
  if (allTasks.length > 0) {
    console.log(`📋 إجمالي المهام: ${allTasks.length}`);
    const completed = allTasks.filter(t => t.includes('✅')).length;
    const pending = allTasks.filter(t => t.includes('⏳')).length;
    console.log(`   - مكتملة: ${completed}`);
    console.log(`   - قيد الانتظار: ${pending}\n`);
  }
}

function listSpecs() {
  console.log('📚 قائمة ملفات specs:\n');
  
  const files = getSpecFiles();
  
  files.forEach(file => {
    const titleMatch = file.content.match(/^#+\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'بدون عنوان';
    const size = (file.content.length / 1024).toFixed(2);
    
    console.log(`📄 ${file.name}`);
    console.log(`   العنوان: ${title}`);
    console.log(`   النوع: ${file.type}`);
    console.log(`   الحجم: ${size} KB\n`);
  });
}

function executePlan(planName?: string) {
  console.log('🚀 تنفيذ خطة...\n');
  
  if (!planName) {
    console.log('⚠️  يرجى تحديد اسم الخطة');
    console.log('   مثال: npx tsx scripts/specs-kit.ts execute COMPREHENSIVE_REVIEW_PLAN_PART1_BASICS.md\n');
    return;
  }
  
  const files = getSpecFiles();
  const plan = files.find(f => f.name === planName || f.name.includes(planName));
  
  if (!plan) {
    console.log(`❌ لم يتم العثور على الخطة: ${planName}`);
    console.log('   استخدم "list" لعرض الخطط المتاحة\n');
    return;
  }
  
  console.log(`✅ تم العثور على الخطة: ${plan.name}\n`);
  
  // استخراج المهام
  const taskMatches = Array.from(plan.content.matchAll(/-\s+\[([ x])\]\s+(.+)/g));
  
  console.log(`📋 عدد المهام: ${taskMatches.length}\n`);
  
  const pendingTasks = taskMatches
    .filter(m => m[1] !== 'x')
    .map(m => m[2]);
  
  if (pendingTasks.length > 0) {
    console.log('⏳ المهام قيد الانتظار:');
    pendingTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task}`);
    });
  } else {
    console.log('✅ جميع المهام مكتملة!');
  }
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

console.log('🔧 SPECS KIT - أداة إدارة الخطط\n');

switch (command) {
  case 'analyze':
    analyzeSpecs();
    break;
  case 'list':
    listSpecs();
    break;
  case 'execute':
    executePlan(arg);
    break;
  default:
    console.log('الاستخدام:');
    console.log('  npx tsx scripts/specs-kit.ts analyze   - تحليل جميع ملفات specs');
    console.log('  npx tsx scripts/specs-kit.ts list      - عرض قائمة الخطط');
    console.log('  npx tsx scripts/specs-kit.ts execute [plan] - تنفيذ خطة محددة');
    console.log('');
    console.log('أمثلة:');
    console.log('  npx tsx scripts/specs-kit.ts analyze');
    console.log('  npx tsx scripts/specs-kit.ts list');
    console.log('  npx tsx scripts/specs-kit.ts execute COMPREHENSIVE_REVIEW_PLAN_PART1_BASICS.md');
}
