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
const agePreview = document.getElementById('agePreview');
const birthdayInput = document.getElementById('birthday');
const nicknameInput = document.getElementById('nickname');

let photos = [];
let exifMissing = 0;
let currentIndex = -1;
let progress = 0;
let isPro = false;

function maxUpload() {
  return isPro ? 200 : 50;
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
  planBadge.textContent = isPro ? 'Pro（最多 200 张）' : 'Free（最多 50 张）';
  uploadLimitText.textContent = `拖拽或点击上传（最多 ${limit} 张）`;

  proList.querySelectorAll('.pro-item').forEach((item) => {
    item.classList.toggle('locked', !isPro);
    item.classList.toggle('unlocked', isPro);
  });

  if (isPro) {
    babyPanel.classList.remove('hidden');
    agePreview.textContent = '年龄预览：请先输入出生日期';
  } else {
    babyPanel.classList.add('hidden');
    agePreview.textContent = '开通 Pro 后可启用宝宝成长水印。';
    if (photos.length > 50) {
      setHint('当前照片超过 Free 上限 50 张，请升级 Pro 或清空后重传。');
    }
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

  if (type === 'date-dot') return `${y}.${m}.${d}`;
  if (type === 'datetime-dot') return `${y}.${m}.${d} ${hh}:${mm}`;
  if (type === 'datetime-dash') return `${y}-${m}-${d} ${hh}:${mm}`;
  if (type === 'cn-date') return `${y}年${m}月${d}日`;
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function updateCurrentWatermarkText() {
  if (currentIndex < 0 || !photos[currentIndex]) {
    watermark.textContent = '2026.03.08 18:30';
    return;
  }
  watermark.textContent = formatByType(photos[currentIndex].currentDateTime, formatSelect.value);
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
    updateCurrentWatermarkText();
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
  updateCurrentWatermarkText();
}

function renderProgress() {
  const total = photos.length;
  progressLabel.textContent = `已处理 ${Math.min(progress, total)}/${total} 张${compressToggle.checked ? ' · 压缩导出已开启' : ''}`;
  progressInner.style.width = total ? `${(Math.min(progress, total) / total) * 100}%` : '0%';
}

async function getExifDateTime(file) {
  if (typeof ExifReader === 'undefined') return null;
  try {
    const tags = await ExifReader.load(file);
    const cand =
      tags.DateTimeOriginal ||
      tags.CreateDate ||
      tags.DateTimeDigitized ||
      tags.DateTime;

    if (!cand) return null;

    let raw = cand.value || cand.description || cand;
    if (Array.isArray(raw)) raw = raw[0];
    const text = String(raw || '').trim();
    if (!text) return null;

    const m = text.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}`;
      const dt = new Date(iso);
      if (!Number.isNaN(dt.getTime())) return dt;
    }

    const dt = new Date(text.replace(/:/g, '-').replace(' ', 'T'));
    if (!Number.isNaN(dt.getTime())) return dt;
  } catch (e) {
    console.warn('EXIF 解析失败', e);
  }
  return null;
}

function parseSingleDateTime() {
  if (!singleDate.value || !singleTime.value) return null;
  return new Date(`${singleDate.value}T${singleTime.value}:00`);
}

function applySinglePreview() {
  const dt = parseSingleDateTime();
  if (!dt || Number.isNaN(dt.getTime())) return;
  watermark.textContent = formatByType(dt, formatSelect.value);
}

fileInput.addEventListener('change', async () => {
  const files = Array.from(fileInput.files || []);
  const limit = maxUpload();
  if (files.length + photos.length > limit) {
    setHint(`上传失败：当前版本最多 ${limit} 张。${isPro ? '' : '升级 Pro 可提升到 200 张。'}`);
    if (!isPro) openSubscribe('上传数量超过 Free 上限');
    fileInput.value = '';
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      const exifDate = await getExifDateTime(file);
      const baseTime = exifDate || new Date(file.lastModified || Date.now());
      const exifOk = Boolean(exifDate);

      photos.push({
        name: file.name,
        url: URL.createObjectURL(file),
        exifOk,
        originalDateTime: new Date(baseTime),
        currentDateTime: new Date(baseTime),
      });
    }),
  );

  exifMissing = photos.filter((p) => !p.exifOk).length;

  if (currentIndex === -1 && photos.length > 0) currentIndex = 0;
  renderThumbs();
  renderPreview();
  renderProgress();
  setHint(`已上传 ${files.length} 张。请选择照片并点击“开始添加时间戳”。`);
  fileInput.value = '';
});

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
formatSelect.addEventListener('change', updateCurrentWatermarkText);
compressToggle.addEventListener('change', renderProgress);

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
});

document.querySelectorAll('.chip').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const pos = btn.dataset.pos;

    watermark.style.transform = 'none';
    watermark.style.left = 'auto';
    watermark.style.right = '12px';
    watermark.style.top = 'auto';
    watermark.style.bottom = '12px';

    if (pos === 'lb') {
      watermark.style.left = '12px';
      watermark.style.right = 'auto';
    } else if (pos === 'cc') {
      watermark.style.left = '50%';
      watermark.style.top = '50%';
      watermark.style.right = 'auto';
      watermark.style.bottom = 'auto';
      watermark.style.transform = 'translate(-50%, -50%)';
    } else if (pos === 'rt') {
      watermark.style.top = '12px';
      watermark.style.bottom = 'auto';
    } else if (pos === 'lt') {
      watermark.style.left = '12px';
      watermark.style.right = 'auto';
      watermark.style.top = '12px';
      watermark.style.bottom = 'auto';
    }
    setHint(`水印位置已切换为 ${btn.textContent}。`);
  });
});

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
    openSubscribe(`功能“${item.dataset.feature}”仅限 Pro`);
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

birthdayInput.addEventListener('change', updateAgePreview);
nicknameInput.addEventListener('input', updateAgePreview);

refreshPlanUI();
renderMeta();
renderPreview();
renderProgress();
setHint('等待指引：上传照片后，点击“开始添加时间戳”。');
