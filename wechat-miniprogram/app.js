App({
  globalData: {
    isPro: false,
    userInfo: null
  },

  onLaunch() {
    // 检查本地存储的 Pro 状态
    const isPro = wx.getStorageSync('isPro') || false;
    this.globalData.isPro = isPro;
    
    console.log('时光印记小程序启动');
  },

  // 设置 Pro 状态
  setProStatus(status) {
    this.globalData.isPro = status;
    wx.setStorageSync('isPro', status);
  }
});
