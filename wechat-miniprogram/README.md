# 时光印记·微信小程序版

时光印记的微信小程序版本，可以在微信中直接使用，为照片添加时间戳水印。

## 功能特性

### Free 版
- 📤 批量选择照片（最多 20 张）
- 📷 自动读取 EXIF 拍摄时间
- 🎨 多种时间格式选择
- 🎯 九宫格水印位置
- 📏 边缘距离自定义
- 💾 导出到相册

### Pro 版
- 📤 批量选择照片（最多 200 张）
- 👶 宝宝成长水印
- 📝 自定义宝宝昵称
- 💾 批量导出
- 📦 压缩导出选项

## 快速开始

### 1. 注册微信小程序账号
- 访问 [微信公众平台](https://mp.weixin.qq.com/)
- 注册小程序账号（个人或企业）
- 获取 AppID

### 2. 安装开发工具
- 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 使用微信扫码登录

### 3. 导入项目
1. 打开微信开发者工具
2. 点击「导入项目」
3. 选择 `wechat-miniprogram` 文件夹
4. 输入你的 AppID
5. 点击「导入」

### 4. 配置项目

#### 添加收款码图片
将你的支付宝和微信收款码图片放入：
- `wechat-miniprogram/assets/alipay.png`
- `wechat-miniprogram/assets/wechat.png`

#### 修改 app.json（可选）
如需修改小程序名称、导航栏颜色等，编辑 `app.json`。

### 5. 上传代码
1. 在微信开发者工具中点击「上传」
2. 填写版本号和项目备注
3. 上传成功后，在小程序后台提交审核

## 项目结构

```
wechat-miniprogram/
├── app.js              # 小程序入口
├── app.json            # 全局配置
├── app.wxss            # 全局样式
├── pages/
│   └── index/          # 主页
│       ├── index.js    # 页面逻辑
│       ├── index.wxml  # 页面结构
│       ├── index.wxss  # 页面样式
│       └── index.json  # 页面配置
├── utils/
│   └── exif-reader.js  # EXIF 读取工具
└── assets/             # 静态资源
    ├── alipay.png      # 支付宝收款码
    └── wechat.png      # 微信收款码
```

## 技术说明

### 图片处理
- 使用 Canvas 2D API 绘制水印
- 保持原图分辨率导出
- 支持 JPEG 格式

### EXIF 读取
- 自定义轻量级 EXIF 解析器
- 读取拍摄时间、相机信息等
- 支持 JPEG 格式图片

### 存储
- 使用微信本地存储保存 Pro 状态
- 临时文件使用小程序临时目录

## 注意事项

1. **图片格式**：目前仅支持 JPEG 格式，PNG 格式的 EXIF 读取可能不完整

2. **权限申请**：
   - `scope.writePhotosAlbum`：保存图片到相册
   - 首次保存时会自动弹出授权申请

3. **文件大小**：
   - 小程序有 2MB 代码包大小限制
   - 图片处理在本地完成，不占用服务器资源

4. **Pro 功能**：
   - 当前版本使用本地存储模拟 Pro 状态
   - 实际支付功能需要接入微信支付（需要企业资质）
   - 个人开发者可以使用二维码收款方式

## 自定义修改

### 修改价格
在 `pages/index/index.js` 中修改 `showPaymentModal` 方法：

```javascript
// 修改价格显示
price-tag {
  // 修改价格文字
}
```

### 修改功能列表
在 `data` 中修改 `proFeatures` 数组：

```javascript
proFeatures: [
  '自定义功能 1',
  '自定义功能 2',
  // ...
]
```

### 添加新格式
在 `formatOptions` 中添加新的时间格式：

```javascript
{ 
  value: 'custom', 
  label: '自定义格式', 
  format: 'YYYY年MM月DD日' 
}
```

## 发布流程

1. **开发测试**
   - 在微信开发者工具中测试所有功能
   - 真机调试（点击「真机调试」按钮）

2. **上传代码**
   - 点击「上传」按钮
   - 填写版本号（如 1.0.0）

3. **提交审核**
   - 登录小程序后台
   - 进入「版本管理」
   - 提交审核

4. **发布上线**
   - 审核通过后
   - 点击「发布」按钮

## 许可证

MIT License

Copyright (c) 2026 Makerming
