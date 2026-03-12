// EXIF 解析库 - 带降级方案
let parseExif = null;
let exifLoaded = false;

// 尝试加载 exifr 库
async function loadExifLibrary() {
  try {
    const module = await import('https://esm.sh/exifr@7.1.3/dist/full.esm.js');
    parseExif = module.parse;
    exifLoaded = true;
    console.log('EXIF library loaded successfully');
  } catch (err) {
    console.warn('Failed to load EXIF library:', err);
    exifLoaded = false;
    parseExif = null;
  }
}

// DOM 元素缓存
const els = {};
function $(id) {
  if (!els[id]) {
    els[id] = document.getElementById(id);
  }
  return els[id];
}

// 状态变量
let photos = [];
let exifMissing = 0;
let currentIndex = -1;
let progress = 0;
let isPro = false;
let hintTimeout = null;
let isProcessing = false;

// 水印位置和边距
let watermarkPos = 'rb';
let watermarkMargin = { value: 3, unit: 'mm' };

// 宝宝 logo 选择
let babyLogo = 'none'; // none, neutral, boy, girl

// 批量压缩设置
let maxOutputSize = 5120; // KB, 默认 5MB

// 缩略图尺寸配置
const THUMB_MAX_WIDTH = 600;
const THUMB_MAX_HEIGHT = 400;

// 应用版本
const APP_VERSION = 'v1.9';
const APP_DEVELOPER = '小小铭 Makerming';

// 初始化位置
function initPosition() {
  const activeCell = document.querySelector('.pos-cell.active');
  if (activeCell) {
    watermarkPos = activeCell.dataset.pos || 'rb';
  }
}

function maxUpload() {
  return isPro ? 200 : 20;
}

// 设置提示 - 带自动消失
function setHint(text, duration = 2000) {
  const hintBubble = $('hintBubble');
  if (!hintBubble) return;
  
  hintBubble.textContent = text;
  hintBubble.classList.remove('hidden');
  hintBubble.classList.remove('fade-out');
  
  if (hintTimeout) {
    clearTimeout(hintTimeout);
  }
  
  if (duration > 0) {
    hintTimeout = setTimeout(() => {
      hintBubble.classList.add('fade-out');
      setTimeout(() => {
        hintBubble.classList.add('hidden');
      }, 500);
    }, duration);
  }
}

// 打开付款码弹窗
function openPaymentModal(isSubscribe = false) {
  const modal = $('paymentModal');
  const title = modal?.querySelector('h3');
  const desc = modal?.querySelector('.support-desc');
  
  if (title) {
    title.textContent = isSubscribe ? '❤️ 升级 Pro 会员' : '❤️ 支持时光印记';
  }
  if (desc) {
    desc.textContent = isSubscribe ? '扫码支付，解锁所有高级功能' : '感谢您的支持，让工具变得更好';
  }
  
  if (modal) {
    modal.dataset.isSubscribe = isSubscribe ? 'true' : 'false';
    modal.classList.remove('hidden');
  }
}

function closePaymentModal() {
  const modal = $('paymentModal');
  if (modal) modal.classList.add('hidden');
}

function confirmPayment() {
  const modal = $('paymentModal');
  const isSubscribe = modal?.dataset.isSubscribe === 'true';
  
  if (isSubscribe) {
    isPro = true;
    refreshPlanUI();
    setHint('支付成功！已升级 Pro 会员。');
  } else {
    setHint('感谢您的支持！我们会继续努力。');
  }
  
  closePaymentModal();
}

function cancelPayment() {
  closePaymentModal();
  const modal = $('paymentModal');
  const isSubscribe = modal?.dataset.isSubscribe === 'true';
  
  if (isSubscribe) {
    setHint('您选择了暂不升级，如需解锁可随时点击"升级 Pro"。');
  }
}

// 检查是否可以导出所有
function canExportAll() {
  if (photos.length <= 20) return true;
  return isPro;
}

function refreshPlanUI() {
  const planBadge = $('planBadge');
  const uploadLimitText = $('uploadLimitText');
  const compressToggle = $('compressToggle');
  const compressToggleLabel = document.querySelector('.compress-toggle');
  
  const limit = maxUpload();
  
  if (planBadge) planBadge.textContent = isPro ? 'Pro（最多 200 张）' : 'Free（最多 20 张）';
  if (uploadLimitText) uploadLimitText.textContent = `拖拽或点击上传（最多 ${limit} 张）`;

  // 更新所有 Pro 功能项状态
  document.querySelectorAll('.pro-item-new').forEach((item) => {
    item.classList.toggle('locked', !isPro);
    item.classList.toggle('unlocked', isPro);
  });
  
  // 更新压缩导出 checkbox 状态
  if (compressToggle) {
    compressToggle.disabled = !isPro;
    if (!isPro) {
      compressToggle.checked = false;
    }
  }
  if (compressToggleLabel) {
    compressToggleLabel.classList.toggle('pro-only', !isPro);
    compressToggleLabel.classList.toggle('unlocked', isPro);
  }
}

function pad(v) {
  return String(v).padStart(2, '0');
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
  const customFormatInput = $('customFormatInput');

  if (type === 'dot-date') return `${y}.${m}.${d}`;
  if (type === 'dot-datetime') return `${y}.${m}.${d} ${hh}:${mm}`;
  if (type === 'dot-datetime-sec') return `${y}.${m}.${d} ${hh}:${mm}:${ss}`;
  if (type === 'dot-datetime-12h') return `${y}.${m}.${d} ${h12}:${mm} ${ampm}`;
  
  if (type === 'iso-date') return `${y}-${m}-${d}`;
  if (type === 'iso-datetime') return `${y}-${m}-${d} ${hh}:${mm}`;
  if (type === 'iso-datetime-sec') return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  if (type === 'iso-datetime-12h') return `${y}-${m}-${d} ${h12}:${mm} ${ampm}`;
  
  if (type === 'slash-date') return `${y}/${m}/${d}`;
  if (type === 'slash-datetime') return `${y}/${m}/${d} ${hh}:${mm}`;
  if (type === 'slash-datetime-sec') return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  if (type === 'slash-datetime-12h') return `${y}/${m}/${d} ${h12}:${mm} ${ampm}`;
  
  if (type === 'us-date') return `${m}/${d}/${y}`;
  if (type === 'us-datetime') return `${m}/${d}/${y} ${hh}:${mm}`;
  if (type === 'us-date-dash') return `${m}-${d}-${y}`;
  if (type === 'us-datetime-dot') return `${m}.${d}.${y} ${hh}:${mm}`;
  if (type === 'us-datetime-12h') return `${m}/${d}/${y} ${h12}:${mm} ${ampm}`;
  
  if (type === 'eu-date') return `${d}/${m}/${y}`;
  if (type === 'eu-datetime') return `${d}/${m}/${y} ${hh}:${mm}`;
  if (type === 'eu-date-dash') return `${d}-${m}-${y}`;
  if (type === 'eu-datetime-dot') return `${d}.${m}.${y} ${hh}:${mm}`;
  if (type === 'eu-datetime-12h') return `${d}/${m}/${y} ${h12}:${mm} ${ampm}`;
  
  if (type === 'cn-date') return `${y}年${m}月${d}日`;
  if (type === 'cn-datetime') return `${y}年${m}月${d}日 ${hh}:${mm}`;
  if (type === 'cn-datetime-sec') return `${y}年${m}月${d}日 ${hh}:${mm}:${ss}`;
  if (type === 'cn-datetime-12h') return `${y}年${m}月${d}日 ${h12}:${mm} ${ampm}`;
  
  if (type === 'compact-date') return `${y}${m}${d}`;
  if (type === 'compact-datetime') return `${y}${m}${d} ${hh}${mm}`;
  if (type === 'compact-datetime-sec') return `${y}${m}${d} ${hh}${mm}${ss}`;
  
  if (type === 'custom' && customFormatInput) {
    return applyCustomFormat(date, customFormatInput.value);
  }
  
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
  const formatPreview = $('formatPreview');
  const formatSelect = $('formatSelect');
  const customFormatInput = $('customFormatInput');
  
  if (!formatPreview) return;
  
  const now = new Date();
  const type = formatSelect ? formatSelect.value : 'dot-datetime';
  
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
  
  let result;
  switch (format) {
    case 'age-short':
      result = years > 0 ? `${years}岁${months}个月` : `${months}个月`;
      break;
    case 'age-months':
      result = `${totalMonths}个月${remainingDays}天`;
      break;
    case 'age-days':
      result = `${totalDays}天`;
      break;
    case 'age-full':
      result = years > 0 ? `${years}岁${months}个月${days}天` : `${months}个月${days}天`;
      break;
    case 'nickname-age-short':
      result = years > 0 ? `${name} ${years}岁${months}个月` : `${name} ${months}个月`;
      break;
    case 'nickname-age-months':
      result = `${name} ${totalMonths}个月${remainingDays}天`;
      break;
    case 'nickname-age-days':
      result = `${name} ${totalDays}天`;
      break;
    case 'nickname-age-full':
      result = years > 0 ? `${name} ${years}岁${months}个月${days}天` : `${name} ${months}个月${days}天`;
      break;
    default:
      result = `${name} ${years}岁${months}个月`;
  }
  
  return result;
}

// 获取宝宝 logo SVG
function getBabyLogoSVG() {
  const logos = {
    none: null,
    neutral: 'assets/logo-neutral.svg',
    boy: 'assets/logo-boy.svg',
    girl: 'assets/logo-girl.svg'
  };
  return logos[babyLogo] || null;
}

function getMarginPixels() {
  const marginValue = $('marginValue');
  const marginUnit = $('marginUnit');
  
  const value = parseFloat(marginValue ? marginValue.value : 2);
  const unit = marginUnit ? marginUnit.value : 'mm';
  
  if (unit === 'mm') {
    return Math.round(value * 3.78);
  }
  return Math.round(value);
}

function updateWatermarkPosition() {
  const watermark = $('watermark');
  const previewCanvas = $('previewCanvas');
  const babyDisplayFormat = $('babyDisplayFormat');
  
  if (!watermark || !previewCanvas) return;
  
  // 获取当前照片的原始尺寸
  const currentPhoto = currentIndex >= 0 ? photos[currentIndex] : null;
  const photoWidth = currentPhoto?.originalWidth || 1200;  // 默认假设 1200px
  const photoHeight = currentPhoto?.originalHeight || 800; // 默认假设 800px
  
  // 获取预览框的实际尺寸
  const previewWidth = previewCanvas.clientWidth;
  const previewHeight = previewCanvas.clientHeight;
  
  // 计算预览框相对于原始照片的比例
  // 使用 contain 模式的比例（保持纵横比）
  const photoRatio = photoWidth / photoHeight;
  const previewRatio = previewWidth / previewHeight;
  
  let scaleRatio;
  let offsetX = 0;
  let offsetY = 0;
  
  if (photoRatio > previewRatio) {
    // 照片较宽，以宽度为基准缩放
    scaleRatio = previewWidth / photoWidth;
    const displayedHeight = photoHeight * scaleRatio;
    offsetY = (previewHeight - displayedHeight) / 2;
  } else {
    // 照片较高，以高度为基准缩放
    scaleRatio = previewHeight / photoHeight;
    const displayedWidth = photoWidth * scaleRatio;
    offsetX = (previewWidth - displayedWidth) / 2;
  }
  
  // 计算 2mm 对应的像素值（基于原始照片尺寸）
  const marginMm = watermarkMargin.value;
  const marginPx = Math.round(marginMm * 3.78); // 1mm ≈ 3.78px at 96 DPI
  
  // 将原始照片的边距转换为预览框中的边距
  const previewMargin = marginPx * scaleRatio;
  
  const pos = watermarkPos;
  const displayFormat = babyDisplayFormat ? babyDisplayFormat.value : 'inline';
  
  watermark.style.transform = 'none';
  watermark.style.left = 'auto';
  watermark.style.right = 'auto';
  watermark.style.top = 'auto';
  watermark.style.bottom = 'auto';
  
  watermark.classList.remove('newline-left', 'newline-center', 'newline-right');
  
  const [h, v] = pos.split('');
  
  if (displayFormat === 'newline') {
    if (h === 'l') {
      watermark.classList.add('newline-left');
    } else if (h === 'c') {
      watermark.classList.add('newline-center');
    } else {
      watermark.classList.add('newline-right');
    }
  }
  
  // 计算实际位置（基于照片显示区域）
  const displayedWidth = photoWidth * scaleRatio;
  const displayedHeight = photoHeight * scaleRatio;
  
  if (h === 'l') {
    watermark.style.left = `${offsetX + previewMargin}px`;
  } else if (h === 'c') {
    watermark.style.left = `${offsetX + displayedWidth / 2}px`;
    watermark.style.transform = 'translateX(-50%)';
  } else if (h === 'r') {
    watermark.style.right = `${offsetX + previewMargin}px`;
  }
  
  if (v === 't') {
    watermark.style.top = `${offsetY + previewMargin}px`;
  } else if (v === 'c') {
    if (pos === 'cc') {
      watermark.style.top = `${offsetY + displayedHeight / 2}px`;
      watermark.style.transform = 'translate(-50%, -50%)';
    } else {
      watermark.style.top = `${offsetY + displayedHeight / 2}px`;
      if (h === 'c') {
        watermark.style.transform = 'translate(-50%, -50%)';
      } else {
        watermark.style.transform = 'translateY(-50%)';
      }
    }
  } else if (v === 'b') {
    watermark.style.bottom = `${offsetY + previewMargin}px`;
  }
}

function updateCurrentWatermarkText() {
  const watermark = $('watermark');
  const watermarkLine1 = $('watermarkLine1');
  const watermarkLine2 = $('watermarkLine2');
  const formatSelect = $('formatSelect');
  const babyDisplayMode = $('babyDisplayMode');
  const babyDisplayFormat = $('babyDisplayFormat');
  const birthdayInput = $('birthday');
  const nicknameInput = $('nickname');
  const babyFormatSelect = $('babyFormatSelect');
  
  if (!watermark || !watermarkLine1) return;
  
  if (currentIndex < 0 || !photos[currentIndex]) {
    const now = new Date();
    watermarkLine1.textContent = formatByType(now, formatSelect ? formatSelect.value : 'dot-datetime');
    if (watermarkLine2) watermarkLine2.textContent = '';
    if (watermarkLine2) watermarkLine2.style.display = 'none';
    updateWatermarkPosition();
    return;
  }
  
  const photo = photos[currentIndex];
  const displayMode = babyDisplayMode ? babyDisplayMode.value : 'time-only';
  const displayFormat = babyDisplayFormat ? babyDisplayFormat.value : 'inline';
  
  let timeText = '';
  let babyText = '';
  
  if (displayMode === 'time-only' || displayMode === 'both') {
    timeText = formatByType(photo.currentDateTime, formatSelect ? formatSelect.value : 'dot-datetime');
  }
  
  if ((displayMode === 'baby-only' || displayMode === 'both') && isPro && birthdayInput && birthdayInput.value) {
    const birthDate = new Date(birthdayInput.value);
    const nickname = nicknameInput ? nicknameInput.value : '';
    const format = babyFormatSelect ? babyFormatSelect.value : 'age-short';
    babyText = formatBabyAge(birthDate, photo.currentDateTime, format, nickname);
  }
  
  // 为成长印记添加 logo（仅在选择了头像时显示）
  if (babyText && isPro && babyLogo !== 'none') {
    const logoUrl = getBabyLogoSVG();
    if (logoUrl) {
      babyText = `<img src="${logoUrl}" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;display:inline-block;" />` + babyText;
    }
  }
  
  // 换行显示时，成长印记在第一行，时间戳在第二行
  if (displayFormat === 'newline' && displayMode === 'both' && timeText && babyText) {
    watermarkLine1.innerHTML = babyText;  // 第一行：成长印记（带 logo）
    if (watermarkLine2) {
      watermarkLine2.textContent = timeText;  // 第二行：时间戳
      watermarkLine2.style.display = 'block';
    }
  } else {
    // 一行显示
    if (timeText && babyText) {
      watermarkLine1.innerHTML = `${timeText} ${babyText}`;
    } else if (timeText) {
      watermarkLine1.textContent = timeText;
    } else if (babyText) {
      watermarkLine1.innerHTML = babyText;
    } else {
      watermarkLine1.textContent = formatByType(photo.currentDateTime, formatSelect ? formatSelect.value : 'dot-datetime');
    }
    if (watermarkLine2) {
      watermarkLine2.textContent = '';
      watermarkLine2.style.display = 'none';
    }
  }
}

function renderMeta() {
  const uploadMeta = $('uploadMeta');
  if (uploadMeta) {
    uploadMeta.textContent = `已上传 ${photos.length} 张 · 已解析 ${photos.length - exifMissing} 张 · 异常 ${exifMissing} 张`;
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '未知';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderThumbs() {
  const thumbGrid = $('thumbGrid');
  if (!thumbGrid) return;
  
  thumbGrid.innerHTML = '';
  photos.forEach((p, i) => {
    const item = document.createElement('button');
    item.className = `thumb${i === currentIndex ? ' active' : ''}`;
    item.type = 'button';
    const img = document.createElement('img');
    img.src = p.thumbUrl || p.url;
    img.alt = p.name;
    const badge = document.createElement('span');
    badge.textContent = p.exifOk ? `${i + 1}. ${p.name.slice(0, 10)}` : `${i + 1}. EXIF缺失`;
    item.append(img, badge);
    item.addEventListener('click', () => {
      currentIndex = i;
      renderThumbs();
      renderPreview();
      setHint(`已选中第 ${i + 1} 张：可拖动水印或修改单张时间。`);
    });
    thumbGrid.appendChild(item);
  });
  renderMeta();
}

// 创建缩略图，同时获取原始尺寸
function createThumbnail(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const originalWidth = img.width;
      const originalHeight = img.height;
      
      const canvas = document.createElement('canvas');
      let width = originalWidth;
      let height = originalHeight;
      
      // 计算缩略图尺寸
      if (width > height) {
        if (width > THUMB_MAX_WIDTH) {
          height *= THUMB_MAX_WIDTH / width;
          width = THUMB_MAX_WIDTH;
        }
      } else {
        if (height > THUMB_MAX_HEIGHT) {
          width *= THUMB_MAX_HEIGHT / height;
          height = THUMB_MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        resolve({
          url: URL.createObjectURL(blob),
          originalWidth: originalWidth,
          originalHeight: originalHeight
        });
      }, 'image/jpeg', 0.85);
      
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ url: null, originalWidth: 0, originalHeight: 0 });
    img.src = URL.createObjectURL(file);
  });
}

function renderPreview() {
  const previewImage = $('previewImage');
  const previewName = $('previewName');
  const previewIndex = $('previewIndex');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const exifPanel = $('exifPanel');
  const watermark = $('watermark');
  const editDate = $('editDate');
  const editTime = $('editTime');
  
  if (currentIndex < 0 || !photos[currentIndex]) {
    if (previewImage) previewImage.style.display = 'none';
    if (previewImage) previewImage.removeAttribute('src');
    if (previewName) previewName.textContent = '请先上传并选择照片';
    if (previewIndex) previewIndex.textContent = '0 / 0';
    if (exifPanel) exifPanel.classList.add('hidden');
    if (watermark) watermark.style.display = 'none';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    return;
  }
  
  const photo = photos[currentIndex];
  
  if (previewImage) {
    // 使用缩略图显示预览
    previewImage.src = photo.thumbUrl || photo.url;
    previewImage.style.display = 'block';
  }
  if (previewName) previewName.textContent = `当前预览：${photo.name}${photo.exifOk ? '' : '（EXIF 缺失）'}`;
  if (previewIndex) previewIndex.textContent = `${currentIndex + 1} / ${photos.length}`;
  if (prevBtn) prevBtn.disabled = currentIndex <= 0;
  if (nextBtn) nextBtn.disabled = currentIndex >= photos.length - 1;
  
  if (exifPanel) exifPanel.classList.remove('hidden');
  
  const exifDateTime = $('exifDateTime');
  const exifCamera = $('exifCamera');
  const exifResolution = $('exifResolution');
  const exifFileSize = $('exifFileSize');
  
  if (exifDateTime) exifDateTime.textContent = photo.currentDateTime.toLocaleString('zh-CN');
  if (exifCamera) exifCamera.textContent = (photo.exifData?.Make && photo.exifData?.Model) 
    ? `${photo.exifData.Make} ${photo.exifData.Model}` 
    : '未知';
  if (exifResolution) exifResolution.textContent = (photo.exifData?.ImageWidth && photo.exifData?.ImageHeight)
    ? `${photo.exifData.ImageWidth} × ${photo.exifData.ImageHeight}`
    : '未知';
  if (exifFileSize) exifFileSize.textContent = formatFileSize(photo.fileSize);
  
  if (editDate) editDate.value = toDateInputValue(photo.currentDateTime);
  if (editTime) editTime.value = toTimeInputValue(photo.currentDateTime);
  
  if (watermark) watermark.style.display = 'flex';
  updateCurrentWatermarkText();
  updateWatermarkPosition();
}

function renderProgress() {
  // 进度显示已移除，此函数保留用于兼容性
}

function parseEditDateTime() {
  const editDate = $('editDate');
  const editTime = $('editTime');
  
  if (!editDate || !editTime) return null;
  if (!editDate.value || !editTime.value) return null;
  return new Date(`${editDate.value}T${editTime.value}:00`);
}

// 文件上传处理
async function handleFileUpload() {
  const fileInput = $('fileInput');
  if (!fileInput) return;
  
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) return;
  
  const limit = maxUpload();
  if (files.length + photos.length > limit) {
    setHint(`上传失败：当前版本最多 ${limit} 张。${isPro ? '' : '升级 Pro 可提升到 200 张。'}`);
    if (!isPro) openPaymentModal(true);
    fileInput.value = '';
    return;
  }

  setHint('正在解析照片...', 0);

  try {
    const newPhotos = [];
    
    for (const file of files) {
      const url = URL.createObjectURL(file);
      let exifDate = null;
      let exifOk = false;
      let exifData = null;
      
      // 创建缩略图，获取原始尺寸
      const { url: thumbUrl, originalWidth, originalHeight } = await createThumbnail(file);
      
      if (exifLoaded && parseExif) {
        try {
          exifData = await parseExif(file, { datetime: true, exif: true });
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
      }
      
      const finalDate = exifDate || new Date(file.lastModified);
      if (!exifOk) exifMissing += 1;
      
      newPhotos.push({
        name: file.name,
        url: url,
        thumbUrl: thumbUrl,
        originalWidth: originalWidth || 1200,
        originalHeight: originalHeight || 800,
        file: file,
        fileSize: file.size,
        exifOk: exifOk,
        exifData: exifData,
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
    setHint(`已上传 ${files.length} 张照片`);
  } catch (err) {
    setHint('上传失败：' + err.message);
    console.error('Upload error:', err);
  }
  
  setTimeout(() => {
    if (fileInput) fileInput.value = '';
  }, 100);
}

// 导出功能
async function exportPhotos(options = {}) {
  const { currentOnly = false, packToZip = false } = options;
  
  if (!photos.length) {
    setHint('请先上传照片');
    return;
  }
  
  // 检查是否可以导出所有
  if (!currentOnly && !canExportAll()) {
    setHint('免费用户最多导出 20 张照片，请升级 Pro 后导出所有照片，或逐个导出当前照片。');
    openPaymentModal(true);
    return;
  }
  
  if (isProcessing) {
    setHint('正在处理中，请稍候...');
    return;
  }
  
  isProcessing = true;
  
  const indices = [];
  if (currentOnly) {
    if (currentIndex >= 0) indices.push(currentIndex);
  } else {
    for (let i = 0; i < photos.length; i++) {
      indices.push(i);
    }
  }
  
  if (indices.length === 0) {
    isProcessing = false;
    return;
  }
  
  const actionName = packToZip ? '打包导出' : (currentOnly ? '导出当前' : '导出所有');
  setHint(`开始${actionName}，共 ${indices.length} 张...`, 0);
  progress = 0;
  renderProgress();
  
  let zipModule = null;
  let zipInstance = null;
  
  if (packToZip) {
    try {
      zipModule = await import('https://esm.sh/jszip@3.10.1');
      zipInstance = new zipModule.default();
    } catch (err) {
      console.warn('JSZip load failed, falling back to individual download:', err);
      setHint('ZIP 库加载失败，将逐张下载');
    }
  }
  
  for (let i = 0; i < indices.length; i++) {
    try {
      const photoIndex = indices[i];
      const photo = photos[photoIndex];
      const canvas = await processImage(photo);
      const blob = await canvasToBlob(canvas);
      
      if (packToZip && zipInstance) {
        const fileName = photo.name.replace(/\.[^/.]+$/, '') + '_timestamp.jpg';
        zipInstance.file(fileName, blob);
      } else {
        downloadBlob(blob, photo.name.replace(/\.[^/.]+$/, '') + '_timestamp.jpg');
        await delay(300);
      }
      
      progress = i + 1;
      renderProgress();
    } catch (err) {
      console.error(`Error processing photo ${indices[i]}:`, err);
    }
  }
  
  if (packToZip && zipInstance) {
    try {
      setHint('正在打包 ZIP 文件...', 0);
      const zipBlob = await zipInstance.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `时光印记_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      setHint('ZIP 打包失败');
    }
  }
  
  isProcessing = false;
  setHint(`${actionName}完成！`);
}

// 处理单张图片（添加水印）
async function processImage(photo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const babyDisplayMode = $('babyDisplayMode');
        const babyDisplayFormat = $('babyDisplayFormat');
        const formatSelect = $('formatSelect');
        const birthdayInput = $('birthday');
        const nicknameInput = $('nickname');
        const babyFormatSelect = $('babyFormatSelect');
        
        const displayMode = babyDisplayMode ? babyDisplayMode.value : 'time-only';
        const displayFormat = babyDisplayFormat ? babyDisplayFormat.value : 'inline';
        
        let timeText = '';
        let babyText = '';
        
        if (displayMode === 'time-only' || displayMode === 'both') {
          timeText = formatByType(photo.currentDateTime, formatSelect ? formatSelect.value : 'dot-datetime');
        }
        
        if ((displayMode === 'baby-only' || displayMode === 'both') && isPro && birthdayInput && birthdayInput.value) {
          const birthDate = new Date(birthdayInput.value);
          const nickname = nicknameInput ? nicknameInput.value : '';
          const format = babyFormatSelect ? babyFormatSelect.value : 'age-short';
          babyText = formatBabyAge(birthDate, photo.currentDateTime, format, nickname);
        }
        
        const fontSize = Math.max(16, Math.min(canvas.width, canvas.height) * 0.025);
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        
        const margin = Math.max(20, getMarginPixels() * (canvas.width / 800));
        const pos = watermarkPos;
        const [h, v] = pos.split('');
        
        let x, y;
        
        if (h === 'l') {
          x = margin;
          ctx.textAlign = 'left';
        } else if (h === 'c') {
          x = canvas.width / 2;
          ctx.textAlign = 'center';
        } else {
          x = canvas.width - margin;
          ctx.textAlign = 'right';
        }
        
        const lineHeight = fontSize * 1.4;
        if (v === 't') {
          y = margin + fontSize;
        } else if (v === 'c') {
          y = canvas.height / 2;
        } else {
          y = canvas.height - margin - (displayFormat === 'newline' && babyText ? lineHeight : 0);
        }
        
        // 换行显示时，成长印记在第一行，时间戳在第二行
        if (displayFormat === 'newline' && timeText && babyText) {
          ctx.fillText(babyText, x, y);  // 第一行：成长印记
          ctx.fillText(timeText, x, y + lineHeight);  // 第二行：时间戳
        } else {
          const text = timeText && babyText ? `${timeText} ${babyText}` : (timeText || babyText);
          ctx.fillText(text, x, y);
        }
        
        resolve(canvas);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = photo.url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    const compressToggle = $('compressToggle');
    const quality = compressToggle && compressToggle.checked ? 0.85 : 0.95;
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 添加时间戳（仅更新预览）
function addTimestamp() {
  if (!photos.length) {
    setHint('请先上传至少 1 张照片。');
    return;
  }
  
  updateCurrentWatermarkText();
  setHint('时间戳已添加到预览，点击导出按钮可下载照片。');
}

// 切换 Pro 功能项展开状态
function toggleProItem(item) {
  if (!isPro) {
    openPaymentModal(true);
    return;
  }
  
  const isExpanded = item.classList.contains('expanded');
  const panelId = item.dataset.panel;
  
  // 关闭其他已展开的项（可选，如果想允许多个同时展开，注释掉下面这段）
  // document.querySelectorAll('.pro-item-new.expanded').forEach(otherItem => {
  //   if (otherItem !== item) {
  //     otherItem.classList.remove('expanded');
  //     const otherContent = otherItem.querySelector('.pro-item-content');
  //     if (otherContent) otherContent.classList.add('hidden');
  //   }
  // });
  
  // 切换当前项
  item.classList.toggle('expanded', !isExpanded);
  const content = item.querySelector('.pro-item-content');
  if (content) content.classList.toggle('hidden', isExpanded);
  
  // 如果有面板，同时切换面板显示
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.toggle('hidden', isExpanded);
    }
  }
  
  if (!isExpanded) {
    setHint(`已展开：${item.dataset.feature}`);
  }
}

// 事件绑定
function bindEvents() {
  const fileInput = $('fileInput');
  const clearBtn = $('clearBtn');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const formatSelect = $('formatSelect');
  const compressToggle = $('compressToggle');
  const applyToCurrentBtn = $('applyToCurrentBtn');
  const applyToAllBtn = $('applyToAllBtn');
  const applyBatchBtn = $('applyBatchBtn');
  const resetBatchBtn = $('resetBatchBtn');
  const exportCurrentBtn = $('exportCurrentBtn');
  const exportAllBtn = $('exportAllBtn');
  const packExportBtn = $('packExportBtn');
  const upgradeBtn = $('upgradeBtn');
  const openSubscribeBtn = $('openSubscribeBtn');
  const supportLink = $('supportLink');
  const confirmPaymentBtn = $('confirmPaymentBtn');
  const cancelPaymentBtn = $('cancelPaymentBtn');
  const paymentModal = $('paymentModal');
  const birthdayInput = $('birthday');
  const nicknameInput = $('nickname');
  const babyDisplayMode = $('babyDisplayMode');
  const babyDisplayFormat = $('babyDisplayFormat');
  const babyFormatSelect = $('babyFormatSelect');
  const positionVisual = $('positionVisual');
  const marginValue = $('marginValue');
  const marginUnit = $('marginUnit');
  const watermark = $('watermark');
  const previewCanvas = $('previewCanvas');
  const customFormatInput = $('customFormatInput');
  
  if (fileInput) fileInput.addEventListener('change', handleFileUpload);
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      photos.forEach((p) => {
        URL.revokeObjectURL(p.url);
        if (p.thumbUrl) URL.revokeObjectURL(p.thumbUrl);
      });
      photos = [];
      exifMissing = 0;
      currentIndex = -1;
      progress = 0;
      isProcessing = false;
      renderThumbs();
      renderPreview();
      setHint('已清空全部照片。');
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderThumbs();
        renderPreview();
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentIndex < photos.length - 1) {
        currentIndex += 1;
        renderThumbs();
        renderPreview();
      }
    });
  }
  
  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      const customFormatPanel = $('customFormatPanel');
      const isCustom = formatSelect.value === 'custom';
      if (customFormatPanel) customFormatPanel.classList.toggle('hidden', !isCustom);
      updateFormatPreview();
      if (currentIndex >= 0 && photos[currentIndex]) {
        updateCurrentWatermarkText();
      } else {
        const watermarkLine1 = $('watermarkLine1');
        if (watermarkLine1) {
          const now = new Date();
          watermarkLine1.textContent = formatByType(now, formatSelect.value);
        }
      }
      setHint(`时间格式已切换`);
    });
  }
  
  if (compressToggle) {
    compressToggle.addEventListener('change', () => {
      if (!isPro) {
        compressToggle.checked = false;
        openPaymentModal(true);
        setHint('压缩导出功能需要 Pro 会员');
        return;
      }
      renderProgress();
      setHint(compressToggle.checked ? '已开启批量压缩导出' : '已关闭批量压缩导出');
    });
  }
  
  if (customFormatInput) {
    customFormatInput.addEventListener('input', () => {
      updateFormatPreview();
      updateCurrentWatermarkText();
    });
  }
  
  if (applyToCurrentBtn) {
    applyToCurrentBtn.addEventListener('click', () => {
      if (!isPro) {
        openPaymentModal(true);
        return;
      }
      if (currentIndex < 0 || !photos[currentIndex]) return;
      
      const dt = parseEditDateTime();
      if (!dt || Number.isNaN(dt.getTime())) {
        setHint('请填写有效的日期和时间');
        return;
      }
      
      photos[currentIndex].currentDateTime = dt;
      updateCurrentWatermarkText();
      renderPreview();
      setHint(`第 ${currentIndex + 1} 张时间已修改。`);
    });
  }
  
  if (applyToAllBtn) {
    applyToAllBtn.addEventListener('click', () => {
      if (!isPro) {
        openPaymentModal(true);
        return;
      }
      if (photos.length === 0) return;
      
      const dt = parseEditDateTime();
      if (!dt || Number.isNaN(dt.getTime())) {
        setHint('请填写有效的日期和时间');
        return;
      }
      
      photos.forEach(p => {
        p.currentDateTime = new Date(dt);
      });
      
      updateCurrentWatermarkText();
      renderPreview();
      setHint(`已应用到全部 ${photos.length} 张照片。`);
    });
  }
  
  if (applyBatchBtn) {
    applyBatchBtn.addEventListener('click', () => {
      if (!photos.length) return;
      const batchDays = $('batchDays');
      const batchHours = $('batchHours');
      const days = Number(batchDays ? batchDays.value : 0);
      const hours = Number(batchHours ? batchHours.value : 0);
      const delta = ((days * 24) + hours) * 60 * 60 * 1000;
      photos = photos.map((p) => ({ ...p, currentDateTime: new Date(p.currentDateTime.getTime() + delta) }));
      renderPreview();
      setHint(`已批量修改 ${photos.length} 张：${days} 天，${hours} 小时。`);
    });
  }
  
  if (resetBatchBtn) {
    resetBatchBtn.addEventListener('click', () => {
      photos = photos.map((p) => ({ ...p, currentDateTime: new Date(p.originalDateTime) }));
      renderPreview();
      setHint('已批量恢复默认时间。');
    });
  }
  
  // 导出按钮事件
  if (exportCurrentBtn) {
    exportCurrentBtn.addEventListener('click', () => exportPhotos({ currentOnly: true }));
  }
  
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => exportPhotos({ currentOnly: false }));
  }
  
  if (packExportBtn) {
    packExportBtn.addEventListener('click', () => exportPhotos({ packToZip: true }));
  }
  
  if (upgradeBtn) upgradeBtn.addEventListener('click', () => openPaymentModal(true));
  if (openSubscribeBtn) openSubscribeBtn.addEventListener('click', () => openPaymentModal(true));
  
  if (supportLink) {
    supportLink.addEventListener('click', (e) => {
      e.preventDefault();
      openPaymentModal(false);
    });
  }
  
  if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', confirmPayment);
  if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', cancelPayment);
  
  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) closePaymentModal();
    });
  }
  
  // 新的 Pro 功能列表点击事件
  document.querySelectorAll('.pro-item-new').forEach(item => {
    const header = item.querySelector('.pro-item-header');
    if (header) {
      header.addEventListener('click', () => toggleProItem(item));
    }
  });
  
  if (birthdayInput) {
    birthdayInput.addEventListener('change', () => {
      updateAgePreview();
      updateCurrentWatermarkText();
    });
  }
  
  if (nicknameInput) {
    nicknameInput.addEventListener('input', () => {
      updateAgePreview();
      updateCurrentWatermarkText();
    });
  }
  
  if (babyDisplayMode) {
    babyDisplayMode.addEventListener('change', updateCurrentWatermarkText);
  }
  
  if (babyDisplayFormat) {
    babyDisplayFormat.addEventListener('change', () => {
      updateCurrentWatermarkText();
      updateWatermarkPosition();
    });
  }
  
  if (babyFormatSelect) {
    babyFormatSelect.addEventListener('change', updateCurrentWatermarkText);
  }
  
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
  
  if (marginValue) {
    marginValue.addEventListener('input', () => {
      const val = parseFloat(marginValue.value);
      if (!isNaN(val) && val >= 0) {
        watermarkMargin.value = val;
        updateWatermarkPosition();
      }
    });
  }
  
  if (marginUnit) {
    marginUnit.addEventListener('change', () => {
      watermarkMargin.unit = marginUnit.value;
      updateWatermarkPosition();
    });
  }
  
  // 水印拖拽
  if (watermark && previewCanvas) {
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
  }
  
  // 宝宝 logo 选择事件
  document.querySelectorAll('.logo-option').forEach(option => {
    option.addEventListener('click', () => {
      if (!isPro) {
        openPaymentModal(true);
        return;
      }
      
      document.querySelectorAll('.logo-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      babyLogo = option.dataset.logo;
      updateCurrentWatermarkText();
      setHint(`已选择${option.querySelector('span').textContent}头像`);
    });
  });
  
  // 最大文件大小选择
  const maxFileSize = $('maxFileSize');
  if (maxFileSize) {
    maxFileSize.addEventListener('change', () => {
      if (!isPro) {
        openPaymentModal(true);
        return;
      }
      maxOutputSize = parseInt(maxFileSize.value, 10);
      const sizeText = maxOutputSize === 0 ? '不限制' : maxOutputSize >= 1024 ? `${maxOutputSize/1024}MB` : `${maxOutputSize}KB`;
      setHint(`已设置最大输出大小：${sizeText}`);
    });
  }
  
  // 底部支持一下按钮
  const supportLinkBottom = $('supportLinkBottom');
  if (supportLinkBottom) {
    supportLinkBottom.addEventListener('click', (e) => {
      e.preventDefault();
      openPaymentModal(false);
    });
  }
}

function updateAgePreview() {
  if (!isPro) return;
  const birthdayInput = $('birthday');
  const nicknameInput = $('nickname');
  const agePreview = $('agePreview');
  
  if (!birthdayInput || !agePreview) return;
  
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
  const nickname = nicknameInput && nicknameInput.value ? `${nicknameInput.value} ` : '宝宝 ';

  agePreview.textContent = months <= 24
    ? `年龄预览：${nickname}${months}个月 ${days}天`
    : `年龄预览：${nickname}${Math.floor(months / 12)}岁 ${months % 12}个月`;
}

// 初始化
async function initApp() {
  await loadExifLibrary();
  initPosition();
  bindEvents();
  refreshPlanUI();
  renderMeta();
  renderPreview();
  renderProgress();
  updateFormatPreview();
  
  const now = new Date();
  const watermarkLine1 = $('watermarkLine1');
  const watermarkLine2 = $('watermarkLine2');
  const formatSelect = $('formatSelect');
  
  if (watermarkLine1) {
    watermarkLine1.textContent = formatByType(now, formatSelect ? formatSelect.value : 'dot-datetime');
  }
  if (watermarkLine2) {
    watermarkLine2.style.display = 'none';
  }
  updateWatermarkPosition();
  
  setHint('等待指引：上传照片后，点击"开始添加时间戳"。');
  
  // 设置版本号
  const versionDisplay = $('versionDisplay');
  if (versionDisplay) {
    versionDisplay.textContent = APP_VERSION;
  }
  
  console.log(`时光印记·Timestamp ${APP_VERSION} 已加载完成，开发者：${APP_DEVELOPER}`);
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
