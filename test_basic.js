// 基础测试 - 检查关键函数是否存在
const fs = require('fs');

const jsContent = fs.readFileSync('app.js', 'utf8');

// 检查关键函数
const checks = [
  { name: 'formatByType', pattern: /function formatByType/ },
  { name: 'formatBabyAge', pattern: /function formatBabyAge/ },
  { name: 'updateWatermarkPosition', pattern: /function updateWatermarkPosition/ },
  { name: 'exportPhotos', pattern: /async function exportPhotos/ },
  { name: 'processImage', pattern: /async function processImage/ },
  { name: 'handleFileUpload', pattern: /async function handleFileUpload/ },
];

console.log('=== 函数检查 ===');
checks.forEach(check => {
  const found = check.pattern.test(jsContent);
  console.log(`${found ? '✅' : '❌'} ${check.name}: ${found ? '存在' : '缺失'}`);
});

// 检查事件监听器
console.log('\n=== 事件监听器检查 ===');
const events = [
  { name: 'fileInput change', pattern: /fileInput\.addEventListener\('change'/ },
  { name: 'startBtn click', pattern: /startBtn\.addEventListener\('click'/ },
  { name: 'batchExportBtn click', pattern: /batchExportBtn.*addEventListener\('click'/ },
  { name: 'mergeExportBtn click', pattern: /mergeExportBtn.*addEventListener\('click'/ },
];

events.forEach(event => {
  const found = event.pattern.test(jsContent);
  console.log(`${found ? '✅' : '❌'} ${event.name}: ${found ? '存在' : '缺失'}`);
});

// 检查关键变量
console.log('\n=== 变量声明检查 ===');
const vars = [
  { name: 'photos array', pattern: /let photos = \[\]/ },
  { name: 'currentIndex', pattern: /let currentIndex = -1/ },
  { name: 'isPro', pattern: /let isPro = false/ },
];

vars.forEach(v => {
  const found = v.pattern.test(jsContent);
  console.log(`${found ? '✅' : '❌'} ${v.name}: ${found ? '存在' : '缺失'}`);
});

console.log('\n=== 测试完成 ===');
