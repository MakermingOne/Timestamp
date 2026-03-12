// 引入 EXIF 读取工具
const ExifReader = require('../../utils/exif-reader.js');

Page({
  data: {
    // 照片数据
    photos: [],
    currentIndex: 0,
    currentPhoto: null,
    
    // Pro 状态
    isPro: false,
    maxUpload: 20,
    
    // 水印设置
    formatIndex: 1, // 默认 YYYY.MM.DD HH:mm
    formatOptions: [
      { value: 'dot-date', label: 'YYYY.MM.DD', format: 'YYYY.MM.DD' },
      { value: 'dot-datetime', label: 'YYYY.MM.DD HH:mm', format: 'YYYY.MM.DD HH:mm' },
      { value: 'iso-date', label: 'YYYY-MM-DD', format: 'YYYY-MM-DD' },
      { value: 'iso-datetime', label: 'YYYY-MM-DD HH:mm', format: 'YYYY-MM-DD HH:mm' },
      { value: 'cn-date', label: 'YYYY年MM月DD日', format: 'YYYY年MM月DD日' },
      { value: 'cn-datetime', label: 'YYYY年MM月DD日 HH:mm', format: 'YYYY年MM月DD日 HH:mm' }
    ],
    
    // 位置设置
    watermarkPosition: 'rb', // 右下角
    positionOptions: [
      { value: 'lt', label: '左上' },
      { value: 'ct', label: '中上' },
      { value: 'rt', label: '右上' },
      { value: 'lc', label: '左中' },
      { value: 'cc', label: '居中' },
      { value: 'rc', label: '右中' },
      { value: 'lb', label: '左下' },
      { value: 'cb', label: '下中' },
      { value: 'rb', label: '右下' }
    ],
    
    // 边距设置
    margin: 3, // 默认 3mm
    
    // Pro 功能：宝宝水印
    birthday: '',
    nickname: '',
    babyAgeText: '',
    
    // 导出设置
    enableCompress: false,
    sizeIndex: 3, // 默认 2MB
    sizeOptions: ['500KB', '1MB', '2MB', '5MB', '10MB', '不限制'],
    sizeValues: [512000, 1048576, 2097152, 5242880, 10485760, 0],
    
    // 弹窗控制
    showModal: false,
    modalType: 'support', // 'support' 或 'subscribe'
    proFeatures: [
      '上传 200 张照片',
      '宝宝成长水印',
      '时间批量修改',
      '无损压缩导出',
      '批量导出所有'
    ],
    
    // 提示
    showWatermarkHint: true,
    toast: {
      show: false,
      message: ''
    }
  },

  // Canvas 上下文
  canvas: null,
  canvasContext: null,
  watermarkX: 0,
  watermarkY: 0,
  isDragging: false,

  onLoad() {
    // 获取 Pro 状态
    const app = getApp();
    const isPro = app.globalData.isPro;
    
    this.setData({
      isPro,
      maxUpload: isPro ? 200 : 20
    });
    
    // 初始化 Canvas
    this.initCanvas();
  },

  // 初始化 Canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#previewCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          this.canvas = res[0].node;
          this.canvasContext = this.canvas.getContext('2d');
        }
      });
  },

  // 选择照片
  async choosePhotos() {
    const maxCount = this.data.maxUpload - this.data.photos.length;
    
    if (maxCount <= 0) {
      this.showToast(`最多可选择 ${this.data.maxUpload} 张照片`);
      return;
    }

    try {
      const res = await wx.chooseMedia({
        count: maxCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['original']
      });

      const newPhotos = [];
      
      for (const item of res.tempFiles) {
        // 读取图片信息
        const imageInfo = await wx.getImageInfo({
          src: item.tempFilePath
        });

        // 尝试读取 EXIF
        let dateTime = new Date();
        let exifOk = false;
        
        try {
          // 使用 exif-reader 读取
          const exifData = await this.readExif(item.tempFilePath);
          if (exifData && exifData.DateTimeOriginal) {
            dateTime = new Date(exifData.DateTimeOriginal);
            exifOk = true;
          }
        } catch (e) {
          console.log('EXIF 读取失败:', e);
        }

        newPhotos.push({
          tempFilePath: item.tempFilePath,
          name: item.tempFilePath.split('/').pop() || '照片',
          width: imageInfo.width,
          height: imageInfo.height,
          dateTime: dateTime,
          originalDateTime: dateTime,
          exifOk: exifOk,
          fileSize: item.size
        });
      }

      const photos = [...this.data.photos, ...newPhotos];
      this.setData({
        photos,
        currentIndex: this.data.currentIndex === -1 ? 0 : this.data.currentIndex,
        currentPhoto: photos[this.data.currentIndex === -1 ? 0 : this.data.currentIndex]
      });

      // 更新 Canvas 预览
      this.updatePreview();
      
    } catch (e) {
      console.log('选择照片失败:', e);
    }
  },

  // 读取 EXIF 信息
  readExif(filePath) {
    return new Promise((resolve, reject) => {
      // 读取文件为 ArrayBuffer
      const fs = wx.getFileSystemManager();
      fs.readFile({
        filePath: filePath,
        success: (res) => {
          try {
            const exif = ExifReader.read(res.data);
            resolve(exif);
          } catch (e) {
            reject(e);
          }
        },
        fail: reject
      });
    });
  },

  // 选择照片
  selectPhoto(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentIndex: index,
      currentPhoto: this.data.photos[index]
    });
    this.updatePreview();
  },

  // 移除照片
  removePhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.photos];
    photos.splice(index, 1);
    
    let currentIndex = this.data.currentIndex;
    if (currentIndex >= photos.length) {
      currentIndex = photos.length - 1;
    }
    
    this.setData({
      photos,
      currentIndex,
      currentPhoto: currentIndex >= 0 ? photos[currentIndex] : null
    });
    
    if (photos.length > 0) {
      this.updatePreview();
    }
  },

  // 清空照片
  clearPhotos() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            photos: [],
            currentIndex: -1,
            currentPhoto: null
          });
          this.clearCanvas();
        }
      }
    });
  },

  // 更新 Canvas 预览
  async updatePreview() {
    const photo = this.data.currentPhoto;
    if (!photo || !this.canvas) return;

    const ctx = this.canvasContext;
    const canvas = this.canvas;
    
    // 设置 Canvas 尺寸（固定预览尺寸）
    const previewWidth = 600;
    const previewHeight = 400;
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    // 计算图片缩放
    const scale = Math.min(
      previewWidth / photo.width,
      previewHeight / photo.height
    );
    const drawWidth = photo.width * scale;
    const drawHeight = photo.height * scale;
    const offsetX = (previewWidth - drawWidth) / 2;
    const offsetY = (previewHeight - drawHeight) / 2;

    // 清空画布
    ctx.clearRect(0, 0, previewWidth, previewHeight);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, previewWidth, previewHeight);

    // 加载并绘制图片
    const image = canvas.createImage();
    image.src = photo.tempFilePath;
    
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    // 绘制水印
    this.drawWatermark(ctx, photo, previewWidth, previewHeight, drawWidth, drawHeight, offsetX, offsetY);
  },

  // 绘制水印
  drawWatermark(ctx, photo, canvasWidth, canvasHeight, imgWidth, imgHeight, imgOffsetX, imgOffsetY) {
    const format = this.data.formatOptions[this.data.formatIndex];
    const timeText = this.formatDateTime(photo.dateTime, format.format);
    
    // 计算宝宝年龄
    let watermarkText = timeText;
    if (this.data.isPro && this.data.birthday) {
      const babyAge = this.calculateBabyAge(this.data.birthday, photo.dateTime);
      if (babyAge) {
        const nickname = this.data.nickname || '宝宝';
        watermarkText = `${nickname} ${babyAge}\n${timeText}`;
        this.setData({ babyAgeText: `${nickname} ${babyAge}` });
      }
    }

    // 设置字体样式（胶片风格）
    const fontSize = 14;
    ctx.font = `600 ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // 计算边距（转换为像素，假设 96 DPI）
    const marginPx = this.data.margin * 3.78;
    
    // 获取位置
    const pos = this.data.watermarkPosition;
    
    // 测量文本
    const lines = watermarkText.split('\n');
    const lineHeight = fontSize * 1.4;
    const textHeight = lines.length * lineHeight;
    let maxWidth = 0;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    });

    // 计算位置
    let x, y;
    const [h, v] = pos.split('');
    
    // 水平位置
    if (h === 'l') {
      x = imgOffsetX + marginPx;
    } else if (h === 'c') {
      x = canvasWidth / 2 - maxWidth / 2;
    } else { // r
      x = imgOffsetX + imgWidth - maxWidth - marginPx;
    }
    
    // 垂直位置
    if (v === 't') {
      y = imgOffsetY + marginPx + fontSize;
    } else if (v === 'c') {
      y = canvasHeight / 2 + textHeight / 2;
    } else { // b
      y = imgOffsetY + imgHeight - marginPx;
    }

    // 保存计算的水印位置（用于拖拽）
    this.watermarkX = x;
    this.watermarkY = y;

    // 绘制阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    // 绘制文本
    lines.forEach((line, index) => {
      const lineY = v === 't' ? y + index * lineHeight : 
                    v === 'b' ? y - (lines.length - 1 - index) * lineHeight :
                    y + (index - (lines.length - 1) / 2) * lineHeight;
      ctx.fillText(line, x, lineY);
    });

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  },

  // 格式化日期时间
  formatDateTime(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },

  // 格式化日期显示
  formatDate(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  },

  // 计算宝宝年龄
  calculateBabyAge(birthday, photoDate) {
    const birth = new Date(birthday);
    const diff = photoDate.getTime() - birth.getTime();
    
    if (diff < 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const remainingDays = days % 30;

    if (years > 0) {
      return months > 0 ? `${years}岁${months}个月` : `${years}岁`;
    } else if (months > 0) {
      return remainingDays > 0 ? `${months}个月${remainingDays}天` : `${months}个月`;
    } else {
      return `${days}天`;
    }
  },

  // 清空画布
  clearCanvas() {
    if (!this.canvasContext || !this.canvas) return;
    this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },

  // 格式选择
  onFormatChange(e) {
    this.setData({ formatIndex: e.detail.value });
    this.updatePreview();
  },

  // 位置选择
  onPositionChange(e) {
    this.setData({ watermarkPosition: e.currentTarget.dataset.value });
    this.updatePreview();
  },

  // 边距调整
  onMarginChange(e) {
    this.setData({ margin: e.detail.value });
    this.updatePreview();
  },

  // 宝宝生日选择
  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value });
    this.updatePreview();
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
    this.updatePreview();
  },

  // 压缩开关
  toggleCompress() {
    if (!this.data.isPro) {
      this.showToast('压缩导出是 Pro 功能');
      return;
    }
    this.setData({ enableCompress: !this.data.enableCompress });
  },

  // 大小选择
  onSizeChange(e) {
    this.setData({ sizeIndex: e.detail.value });
  },

  // 显示支付弹窗
  showPaymentModal(e) {
    const type = e.currentTarget.dataset.type || 'support';
    this.setData({
      showModal: true,
      modalType: type
    });
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({ showModal: false });
  },

  // 阻止冒泡
  preventBubble() {
    // 什么也不做，阻止事件冒泡
  },

  // 确认支付
  confirmPayment() {
    const app = getApp();
    
    if (this.data.modalType === 'subscribe') {
      // 升级 Pro
      app.setProStatus(true);
      this.setData({
        isPro: true,
        maxUpload: 200
      });
      this.showToast('升级成功！已解锁 Pro 功能');
    } else {
      // 支持一下
      this.showToast('感谢您的支持！');
    }
    
    this.hideModal();
  },

  // 导出当前照片
  async exportCurrent() {
    const photo = this.data.currentPhoto;
    if (!photo) {
      this.showToast('请先选择照片');
      return;
    }

    await this.exportPhoto(photo, 0);
  },

  // 导出所有照片
  async exportAll() {
    if (!this.data.isPro && this.data.photos.length > 1) {
      this.showToast('Free 用户请逐个导出，或升级 Pro');
      this.showPaymentModal({ currentTarget: { dataset: { type: 'subscribe' } } });
      return;
    }

    wx.showLoading({ title: '导出中...' });

    for (let i = 0; i < this.data.photos.length; i++) {
      await this.exportPhoto(this.data.photos[i], i);
    }

    wx.hideLoading();
    this.showToast('导出完成');
  },

  // 导出单张照片
  async exportPhoto(photo, index) {
    return new Promise((resolve) => {
      const ctx = wx.createCanvasContext('exportCanvas');
      
      // 获取导出 canvas
      const query = wx.createSelectorQuery();
      query.select('#exportCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            resolve();
            return;
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 设置 canvas 尺寸为原图尺寸
          canvas.width = photo.width;
          canvas.height = photo.height;

          // 加载图片
          const image = canvas.createImage();
          image.src = photo.tempFilePath;
          
          await new Promise((r) => {
            image.onload = r;
          });

          // 绘制原图
          ctx.drawImage(image, 0, 0);

          // 绘制水印
          this.drawWatermark(ctx, photo, photo.width, photo.height, photo.width, photo.height, 0, 0);

          // 导出为临时文件
          wx.canvasToTempFilePath({
            canvas,
            fileType: 'jpg',
            quality: this.getExportQuality(),
            success: (res) => {
              // 保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  if (index === 0) {
                    this.showToast('已保存到相册');
                  }
                },
                fail: (err) => {
                  console.log('保存失败:', err);
                  this.showToast('保存失败，请检查权限');
                },
                complete: resolve
              });
            },
            fail: (err) => {
              console.log('导出失败:', err);
              resolve();
            }
          });
        });
    });
  },

  // 获取导出质量
  getExportQuality() {
    if (!this.data.enableCompress || !this.data.isPro) {
      return 0.95;
    }
    // 根据大小设置调整质量
    return 0.9;
  },

  // Canvas 触摸事件（拖拽水印）
  onCanvasTouch(e) {
    this.isDragging = true;
    this.hideWatermarkHint();
  },

  onCanvasMove(e) {
    if (!this.isDragging) return;
    // 可以在这里实现拖拽逻辑
  },

  // 隐藏水印提示
  hideWatermarkHint() {
    setTimeout(() => {
      this.setData({ showWatermarkHint: false });
    }, 2000);
  },

  // 显示 Toast
  showToast(message) {
    this.setData({
      toast: { show: true, message }
    });
    setTimeout(() => {
      this.setData({
        toast: { show: false, message: '' }
      });
    }, 2000);
  }
});
