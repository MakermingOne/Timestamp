import { parse } from 'https://esm.sh/exifr@7.1.3/dist/full.esm.js';

const fileInput = document.getElementById('fileInput');
const uploadLimitText = document.getElementById('uploadLimitText');
const thumbGrid = document.getElementById('thumbGrid');
const uploadMeta = document.getElementById('uploadMeta');
const clearBtn = document.getElementById('clearBtn');
const compressToggle = document.getElementById('compressToggle');

const planBadge = document.getElementById('planBadge');
const upgradeBtn = document.getElementById('upgradeBtn');
const openSubscribeBtn = document.getElementById('openSubscribeBtn');
const subscribeModal = document.getElementById('subscribeModal');
const confirmSubscribeBtn = document.getElementById('confirmSubscribeBtn');
const closeSubscribeBtn = document.getElementById('closeSubscribeBtn');

const previewImage = document.getElementById('previewImage');
const previewName = document.getElementById('previewName');
const previewIndex = document.getElementById('previewIndex');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

const watermark = document.getElementById('watermark');
const previewCanvas = document.getElementById('previewCanvas');
const progressLabel = document.getElementById('progressLabel');
const progressInner = document.getElementById('progressInner');

const formatSelect = document.getElementById('formatSelect');
const customFormatPanel = document.getElementById('customFormatPanel');
const customFormatInput = document.getElementById('customFormatInput');
const formatPreview = document.getElementById('formatPreview');
const applyBatchBtn = document.getElementById('applyBatchBtn');
const resetBatchBtn = document.getElementById('resetBatchBtn');
const batchDays = document.getElementById('batchDays');
const batchHours = document.getElementById('batchHours');

const singleDate = document.getElementById('singleDate');
const singleTime = document.getElementById('singleTime');
const applySingleBtn = document.getElementById('applySingleBtn');
const resetSingleBtn = document.getElementById('resetSingleBtn');

const startBtn = document.getElementById('startBtn');
const hintBubble = document.getElementById('hintBubble');

const proList = document.getElementById('proList');
const babyPanel = document.getElementById('babyPanel');
const batchPanel = document.getElementById('batchPanel');
const agePreview = document.getElementById('agePreview');
const birthdayInput = document.getElementById('birthday');
const nicknameInput = document.getElementById('nickname');
const babyDisplayMode = document.getElementById('babyDisplayMode');
const babyFormatSelect = document.getElementById('babyFormatSelect');

// 位置选择器和边缘距离
const positionVisual = document.getElementById('positionVisual');
const marginValue = document.getElementById('marginValue');
const marginUnit = document.getElementById('marginUnit');

let photos = [];
let exifMissing = 0;
let currentIndex = -1;
let progress = 0;
let isPro = false;
// 从DOM读取初始位置
const getInitialPos = () => {
  const activeCell = document.querySelector('.pos-cell.active');
  return activeCell?.dataset.pos || 'rb';
};

let watermarkPos = getInitialPos(); // lt, ct, rt, lc, cc, rc, lb, cb, rb
let watermarkMargin = { value: 2, unit: 'mm' }; // 默认 2mm

function maxUpload() {
  return isPro ? 200 : 20;
}

function setHint(text) {
  hintBubble.textContent = text;
}

function openSubscribe(reason = '点击了解 Pro 功能') {
  subscribeModal.classList.remove('hidden');
  setHint(`提示：${reason}`);
}

function closeSubscribe() {
  subscribeModal.classList.add('hidden');
}

function refreshPlanUI() {
  const limit = maxUpload();
  planBadge.textContent = isPro ? 'Pro（最多 200 张）' : 'Free（最多 20 张）';
  uploadLimitText.textContent = `拖拽或点击上传（最多 ${limit} 张）`;

  proList.querySelectorAll('.pro-item').forEach((item) => {
    item.classList.toggle('locked', !isPro);
    item.classList.toggle('unlocked', isPro);
  });

  if (isPro) {
    // 不自动显示所有面板，由用户点击决定
    agePreview.textContent = '年龄预览：请先输入出生日期';
  } else {
    babyPanel.classList.add('hidden');
    batchPanel.classList.add('hidden');
    agePreview.textContent = '开通 Pro 后可启用宝宝成长水印。';
    if (photos.length > 20) {
      setHint('当前照片超过 Free 上限 20 张，请升级 Pro 或清空后重传。');
    }
  }
}

function pad(v) {
  return String(v).padStart(2, '0');
}

function format12h(hours, minutes) {
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${pad(h12)}:${minutes} ${ampm}`;
}

function formatByType(date, type) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const h12 = pad(date.getHours() % 12 || 12);
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';

  // 点号分隔（默认）
  if (type === 'dot-date') return `${y}.${m}.${d}`;
  if (type === 'dot-datetime') return `${y}.${m}.${d} ${hh}:${mm}`;
  if (type === 'dot-datetime-sec') return `${y}.${m}.${d} ${hh}:${mm}:${ss}`;
  if (type === 'dot-datetime-12h') return `${y}.${m}.${d} ${h12}:${mm} ${ampm}`;
  
  // ISO 格式
  if (type === 'iso-date') return `${y}-${m}-${d}`;
  if (type === 'iso-datetime') return `${y}-${m}-${d} ${hh}:${mm}`;
  if (type === 'iso-datetime-sec') return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  if (type === 'iso-datetime-12h') return `${y}-${m}-${d} ${h12}:${mm} ${ampm}`;
  
  // 斜杠分隔
  if (type === 'slash-date') return `${y}/${m}/${d}`;
  if (type === 'slash-datetime') return `${y}/${m}/${d} ${hh}:${mm}`;
  if (type === 'slash-datetime-sec') return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  if (type === 'slash-datetime-12h') return `${y}/${m}/${d} ${h12}:${mm} ${ampm}`;
  
  // 美式格式
  if (type === 'us-date') return `${m}/${d}/${y}`;
  if (type === 'us-datetime') return `${m}/${d}/${y} ${hh}:${mm}`;
  if (type === 'us-date-dash') return `${m}-${d}-${y}`;
  if (type === 'us-datetime-dot') return `${m}.${d}.${y} ${hh}:${mm}`;
  if (type === 'us-datetime-12h') return `${m}/${d}/${y} ${h12}:${mm} ${ampm}`;
  
  // 英式/欧式格式
  if (type === 'eu-date') return `${d}/${m}/${y}`;
  if (type === 'eu-datetime') return `${d}/${m}/${y} ${hh}:${mm}`;
  if (type === 'eu-date-dash') return `${d}-${m}-${y}`;
  if (type === 'eu-datetime-dot') return `${d}.${m}.${y} ${hh}:${mm}`;
  if (type === 'eu-datetime-12h') return `${d}/${m}/${y} ${h12}:${mm} ${ampm}`;
  
  // 中文格式
  if (type === 'cn-date') return `${y}年${m}月${d}日`;
  if (type === 'cn-datetime') return `${y}年${m}月${d}日 ${hh}:${mm}`;
  if (type === 'cn-datetime-sec') return `${y}年${m}月${d}日 ${hh}:${mm}:${ss}`;
  if (type === 'cn-datetime-12h') return `${y}年${m}月${d}日 ${h12}:${mm} ${ampm}`;
  
  // 紧凑格式
  if (type === 'compact-date') return `${y}${m}${d}`;
  if (type === 'compact-datetime') return `${y}${m}${d} ${hh}${mm}`;
  if (type === 'compact-datetime-sec') return `${y}${m}${d} ${hh}${mm}${ss}`;
  
  // 自定义格式
  if (type === 'custom' && customFormatInput) {
    return applyCustomFormat(date, customFormatInput.value);
  }
  
  // 默认
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function applyCustomFormat(date, format) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const h12 = pad(date.getHours() % 12 || 12);
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  
  return format
    .replace(/YYYY/g, y)
    .replace(/MM/g, m)
    .replace(/DD/g, d)
    .replace(/HH/g, hh)
    .replace(/hh/g, h12)
    .replace(/mm/g, mm)
    .replace(/ss/g, ss)
    .replace(/AM\/PM/g, ampm);
}

function updateFormatPreview() {
  if (!formatPreview) return;
  const now = new Date();
  const type = formatSelect.value;
  if (type === 'custom' && customFormatInput) {
    formatPreview.textContent = applyCustomFormat(now, customFormatInput.value);
  } else {
    formatPreview.textContent = formatByType(now, type);
  }
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 计算宝宝年龄文本
function formatBabyAge(birthDate, photoDate, format, nickname) {
  const diffTime = photoDate.getTime() - birthDate.getTime();
  if (diffTime < 0) return '照片时间早于出生';
  
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;
  
  const totalMonths = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;
  
  const name = nickname || '宝宝';
  
  switch (format) {
    case 'age-short':
      return years > 0 ? `${years}岁${months}个月` : `${months}个月`;
    case 'age-months':
      return `${totalMonths}个月${remainingDays}天`;
    case 'age-full':
      return years > 0 ? `${years}岁${months}个月${days}天` : `${months}个月${days}天`;
    case 'nickname-age-short':
      return years > 0 ? `${name} ${years}岁${months}个月` : `${name} ${months}个月`;
    case 'nickname-age-months':
      return `${name} ${totalMonths}个月${remainingDays}天`;
    case 'nickname-age-full':
      return years > 0 ? `${name} ${years}岁${months}个月${days}天` : `${name} ${months}个月${days}天`;
    default:
      return `${name} ${years}岁${months}个月`;
  }
}

// 获取边缘距离的像素值
function getMarginPixels() {
  const value = parseFloat(marginValue?.value || 2);
  const unit = marginUnit?.value || 'mm';
  
  if (unit === 'mm') {
    // 假设标准屏幕密度为 96 DPI，1mm ≈ 3.78px
    return Math.round(value * 3.78);
  }
  return Math.round(value);
}

// 更新水印位置
function updateWatermarkPosition() {
  const margin = getMarginPixels();
  const pos = watermarkPos;
  
  watermark.style.transform = 'none';
  watermark.style.left = 'auto';
  watermark.style.right = 'auto';
  watermark.style.top = 'auto';
  watermark.style.bottom = 'auto';
  
  // 解析位置
  const [h, v] = pos.split('');
  
  // 水平位置
  if (h === 'l') {
    watermark.style.left = `${margin}px`;
  } else if (h === 'c') {
    watermark.style.left = '50%';
    watermark.style.transform = 'translateX(-50%)';
  } else if (h === 'r') {
    watermark.style.right = `${margin}px`;
  }
  
  // 垂直位置
  if (v === 't') {
    watermark.style.top = `${margin}px`;
  } else if (v === 'c') {
    if (pos === 'cc') {
      watermark.style.top = '50%';
      watermark.style.transform = 'translate(-50%, -50%)';
    } else {
      watermark.style.top = '50%';
      watermark.style.transform = h === 'c' ? 'translate(-50%, -50%)' : 'translateY(-50%)';
    }
  } else if (v === 'b') {
    watermark.style.bottom = `${margin}px`;
  }
}

// 更新水印文本（合并时间和宝宝水印）
function updateCurrentWatermarkText() {
  // 无照片时显示默认时间
  if (currentIndex < 0 || !photos[currentIndex]) {
    const now = new Date();
    watermark.textContent = formatByType(now, formatSelect?.value || 'dot-datetime');
    updateWatermarkPosition();
    return;
  }
  
  const photo = photos[currentIndex];
  const displayMode = babyDisplayMode ? babyDisplayMode.value : 'time-only';
  
  let timeText = '';
  let babyText = '';
  
  // 时间戳部分
  if (displayMode === 'time-only' || displayMode === 'both') {
    timeText = formatByType(photo.currentDateTime, formatSelect?.value || 'dot-datetime');
  }
  
  // 宝宝成长印记部分
  if ((displayMode === 'baby-only' || displayMode === 'both') && isPro) {
    const birthday = birthdayInput?.value;
    if (birthday) {
      const birthDate = new Date(birthday);
      const nickname = nicknameInput?.value || '';
      const format = babyFormatSelect?.value || 'age-short';
      babyText = formatBabyAge(birthDate, photo.currentDateTime, format, nickname);
    }
  }
  
  // 合并显示（用空格分隔）
  if (timeText && babyText) {
    watermark.textContent = `${timeText} ${babyText}`;
  } else if (timeText) {
    watermark.textContent = timeText;
  } else if (babyText) {
    watermark.textContent = babyText;
  } else {
    watermark.textContent = formatByType(photo.currentDateTime, formatSelect?.value || 'dot-datetime');
  }
}

function renderMeta() {
  uploadMeta.textContent = `已上传 ${photos.length} 张 · 已解析 ${photos.length - exifMissing} 张 · 异常 ${exifMissing} 张`;
}

function renderThumbs() {
  thumbGrid.innerHTML = '';
  photos.forEach((p, i) => {
    const item = document.createElement('button');
    item.className = `thumb${i === currentIndex ? ' active' : ''}`;
    item.type = 'button';
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = p.name;
    const badge = document.createElement('span');
    badge.textContent = p.exifOk ? `${i + 1}. ${p.name.slice(0, 10)}` : `${i + 1}. EXIF缺失`;
    item.append(img, badge);
    item.addEventListener('click', () => {
      currentIndex = i;
      renderThumbs();
      renderPreview();
      setHint(`已选中第 ${i + 1} 张：可拖动水印或修改单张时间后确认应用。`);
    });
    thumbGrid.appendChild(item);
  });
  renderMeta();
}

function renderPreview() {
  if (currentIndex < 0 || !photos[currentIndex]) {
    previewImage.style.display = 'none';
    previewImage.removeAttribute('src');
    previewName.textContent = '请先上传并选择照片';
    previewIndex.textContent = '0 / 0';
    singleDate.value = '';
    singleTime.value = '';
    watermark.style.display = 'none';
    return;
  }
  const photo = photos[currentIndex];
  previewImage.src = photo.url;
  previewImage.style.display = 'block';
  previewName.textContent = `当前预览：${photo.name}${photo.exifOk ? '' : '（EXIF 缺失）'}`;
  previewIndex.textContent = `${currentIndex + 1} / ${photos.length}`;
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= photos.length - 1;
  singleDate.value = toDateInputValue(photo.currentDateTime);
  singleTime.value = toTimeInputValue(photo.currentDateTime);
  watermark.style.display = 'block';
  updateCurrentWatermarkText();
  updateWatermarkPosition();
}

function renderProgress() {
  const total = photos.length;
  progressLabel.textContent = `已处理 ${Math.min(progress, total)}/${total} 张${compressToggle.checked ? ' · 压缩导出已开启' : ''}`;
  progressInner.style.width = total ? `${(Math.min(progress, total) / total) * 100}%` : '0%';
}

function parseSingleDateTime() {
  if (!singleDate.value || !singleTime.value) return null;
  return new Date(`${singleDate.value}T${singleTime.value}:00`);
}

function applySinglePreview() {
  const dt = parseSingleDateTime();
  if (!dt || Number.isNaN(dt.getTime())) return;
  updateCurrentWatermarkText();
}

// 文件上传处理 - 使用change事件，确保每次都能触发
fileInput.addEventListener('change', handleFileUpload);

async function handleFileUpload() {
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) return;
  
  const limit = maxUpload();
  if (files.length + photos.length > limit) {
    setHint(`上传失败：当前版本最多 ${limit} 张。${isPro ? '' : '升级 Pro 可提升到 200 张。'}`);
    if (!isPro) openSubscribe('上传数量超过 Free 上限');
    fileInput.value = '';
    return;
  }

  setHint('正在解析照片 EXIF 信息...');

  try {
    const newPhotos = [];
    
    for (const file of files) {
      const url = URL.createObjectURL(file);
      let exifDate = null;
      let exifOk = false;
      
      try {
        const exifData = await parse(file, { datetime: true });
        if (exifData && exifData.DateTimeOriginal) {
          exifDate = new Date(exifData.DateTimeOriginal);
          exifOk = true;
        } else if (exifData && exifData.CreateDate) {
          exifDate = new Date(exifData.CreateDate);
          exifOk = true;
        } else if (exifData && exifData.ModifyDate) {
          exifDate = new Date(exifData.ModifyDate);
          exifOk = true;
        }
      } catch (e) {
        // EXIF 解析失败
      }
      
      // 如果没有 EXIF 日期，使用文件修改时间
      const finalDate = exifDate || new Date(file.lastModified);
      if (!exifOk) exifMissing += 1;
      
      newPhotos.push({
        name: file.name,
        url: url,
        exifOk: exifOk,
        originalDateTime: new Date(finalDate),
        currentDateTime: new Date(finalDate),
      });
    }

    photos.push(...newPhotos);

    if (currentIndex === -1 && photos.length > 0) {
      currentIndex = 0;
    }
    
    renderThumbs();
    renderPreview();
    renderProgress();
    updateCurrentWatermarkText();
    setHint(`已上传 ${files.length} 张。请选择照片并点击"开始添加时间戳"。`);
  } catch (err) {
    setHint('上传失败：' + err.message);
  }
  
  // 延迟清空input，确保可以重复选择相同文件
  setTimeout(() => {
    fileInput.value = '';
  }, 100);
}

clearBtn.addEventListener('click', () => {
  photos.forEach((p) => URL.revokeObjectURL(p.url));
  photos = [];
  exifMissing = 0;
  currentIndex = -1;
  progress = 0;
  renderThumbs();
  renderPreview();
  renderProgress();
  setHint('已清空全部照片。');
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex -= 1;
    renderThumbs();
    renderPreview();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < photos.length - 1) {
    currentIndex += 1;
    renderThumbs();
    renderPreview();
  }
});

singleDate.addEventListener('input', applySinglePreview);
singleTime.addEventListener('input', applySinglePreview);
// 格式选择变化处理
formatSelect?.addEventListener('change', () => {
  const isCustom = formatSelect.value === 'custom';
  
  // 显示/隐藏自定义格式面板
  if (customFormatPanel) {
    customFormatPanel.classList.toggle('hidden', !isCustom);
  }
  
  // 立即更新水印显示
  updateFormatPreview();
  
  // 如果有照片，立即更新当前照片的水印
  if (currentIndex >= 0 && photos[currentIndex]) {
    updateCurrentWatermarkText();
  } else {
    // 没有照片时也更新默认显示
    const now = new Date();
    watermark.textContent = formatByType(now, formatSelect.value);
  }
  
  setHint(`时间格式已切换为: ${formatSelect.options[formatSelect.selectedIndex].text}`);
});
compressToggle.addEventListener('change', renderProgress);

// 自定义格式输入监听
if (customFormatInput) {
  customFormatInput.addEventListener('input', () => {
    updateFormatPreview();
    updateCurrentWatermarkText();
  });
}

applySingleBtn.addEventListener('click', () => {
  if (currentIndex < 0 || !photos[currentIndex]) return;
  const dt = parseSingleDateTime();
  if (!dt || Number.isNaN(dt.getTime())) {
    alert('请填写有效的日期和时间');
    return;
  }
  photos[currentIndex].currentDateTime = dt;
  updateCurrentWatermarkText();
  setHint(`第 ${currentIndex + 1} 张已确认应用单张时间。`);
});

resetSingleBtn.addEventListener('click', () => {
  if (currentIndex < 0 || !photos[currentIndex]) return;
  photos[currentIndex].currentDateTime = new Date(photos[currentIndex].originalDateTime);
  renderPreview();
  setHint(`第 ${currentIndex + 1} 张已恢复默认时间。`);
});

applyBatchBtn.addEventListener('click', () => {
  if (!photos.length) return;
  const days = Number(batchDays.value || 0);
  const hours = Number(batchHours.value || 0);
  const delta = ((days * 24) + hours) * 60 * 60 * 1000;
  photos = photos.map((p) => ({ ...p, currentDateTime: new Date(p.currentDateTime.getTime() + delta) }));
  renderPreview();
  setHint(`已批量修改 ${photos.length} 张：${days} 天，${hours} 小时。`);
});

resetBatchBtn.addEventListener('click', () => {
  photos = photos.map((p) => ({ ...p, currentDateTime: new Date(p.originalDateTime) }));
  renderPreview();
  setHint('已批量恢复默认时间。');
});

setInterval(() => {
  if (!photos.length || progress >= photos.length) return;
  progress += 1;
  renderProgress();
}, 650);

let dragging = false;
let offsetX = 0;
let offsetY = 0;

watermark.addEventListener('dragstart', (e) => {
  dragging = true;
  const rect = watermark.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

watermark.addEventListener('dragend', () => {
  dragging = false;
});

previewCanvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  if (!dragging) return;
  const rect = previewCanvas.getBoundingClientRect();
  const x = Math.min(Math.max(e.clientX - rect.left - offsetX, 0), rect.width - watermark.offsetWidth);
  const y = Math.min(Math.max(e.clientY - rect.top - offsetY, 0), rect.height - watermark.offsetHeight);
  watermark.style.left = `${x}px`;
  watermark.style.top = `${y}px`;
  watermark.style.right = 'auto';
  watermark.style.bottom = 'auto';
  watermark.style.transform = 'none';
});

// 可视化位置选择器
if (positionVisual) {
  positionVisual.querySelectorAll('.pos-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      positionVisual.querySelectorAll('.pos-cell').forEach((c) => c.classList.remove('active'));
      cell.classList.add('active');
      watermarkPos = cell.dataset.pos;
      updateWatermarkPosition();
      setHint(`水印位置已设置为 ${cell.title}`);
    });
  });
}

// 边缘距离控制 - 使用input和change事件确保实时更新
marginValue?.addEventListener('input', () => {
  const val = parseFloat(marginValue.value);
  if (!isNaN(val) && val >= 0) {
    watermarkMargin.value = val;
    updateWatermarkPosition();
  }
});

marginUnit?.addEventListener('change', () => {
  watermarkMargin.unit = marginUnit.value;
  updateWatermarkPosition();
});

// 确保边缘距离默认值正确
watermarkMargin.value = parseFloat(marginValue?.value || 2);
watermarkMargin.unit = marginUnit?.value || 'mm';

startBtn.addEventListener('click', () => {
  if (!photos.length) {
    setHint('请先上传至少 1 张照片。');
    return;
  }
  progress = 0;
  renderProgress();
  setHint(`开始执行添加时间戳，共 ${photos.length} 张。`);
});

upgradeBtn.addEventListener('click', () => openSubscribe('点击了升级 Pro'));
openSubscribeBtn.addEventListener('click', () => openSubscribe('查看 Pro 订阅'));
closeSubscribeBtn.addEventListener('click', closeSubscribe);
confirmSubscribeBtn.addEventListener('click', () => {
  isPro = true;
  closeSubscribe();
  refreshPlanUI();
  setHint('订阅成功（模拟）：已切换 Pro，可上传最多 200 张并解锁高级功能。');
});

proList.addEventListener('click', (e) => {
  const item = e.target.closest('.pro-item');
  if (!item) return;
  if (!isPro) {
    openSubscribe(`功能"${item.dataset.feature}"仅限 Pro`);
    return;
  }
  
  // Pro用户点击功能项时切换对应面板
  const panelId = item.dataset.panel;
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      const isHidden = panel.classList.contains('hidden');
      // 先隐藏所有面板
      babyPanel.classList.add('hidden');
      batchPanel.classList.add('hidden');
      // 切换当前面板
      if (isHidden) {
        panel.classList.remove('hidden');
        setHint(`已展开：${item.dataset.feature}`);
      }
    }
  }
});

function updateAgePreview() {
  if (!isPro) return;
  const birthday = birthdayInput.value;
  if (!birthday) {
    agePreview.textContent = '年龄预览：请先输入出生日期';
    return;
  }

  const now = new Date();
  const birth = new Date(birthday);
  if (now < birth) {
    agePreview.textContent = '照片时间早于宝宝出生，无法计算年龄';
    return;
  }

  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const days = Math.max(now.getDate() - birth.getDate(), 0);
  const nickname = nicknameInput.value ? `${nicknameInput.value} ` : '宝宝 ';

  agePreview.textContent = months <= 24
    ? `年龄预览：${nickname}${months}个月 ${days}天`
    : `年龄预览：${nickname}${Math.floor(months / 12)}岁 ${months % 12}个月`;
}

birthdayInput.addEventListener('change', () => {
  updateAgePreview();
  updateCurrentWatermarkText();
});
nicknameInput.addEventListener('input', () => {
  updateAgePreview();
  updateCurrentWatermarkText();
});

// 宝宝水印显示模式切换
if (babyDisplayMode) {
  babyDisplayMode.addEventListener('change', updateCurrentWatermarkText);
}

// 宝宝水印格式切换
if (babyFormatSelect) {
  babyFormatSelect.addEventListener('change', updateCurrentWatermarkText);
}

// 初始化
refreshPlanUI();
renderMeta();
renderPreview();
renderProgress();
updateFormatPreview();

// 初始状态：无照片时显示默认格式的时间
const now = new Date();
watermark.textContent = formatByType(now, formatSelect?.value || 'dot-datetime');
updateWatermarkPosition();

setHint('等待指引：上传照片后，点击"开始添加时间戳"。');
