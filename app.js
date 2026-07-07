App({
  onLaunch() {
    if (!wx.cloud) {
      wx.showToast({
        title: '请使用新版微信开发者工具',
        icon: 'none'
      })
      return
    }

    wx.cloud.init({
      env: 'cloud1-d6g6dlg4c51298653',
      traceUser: true
    })
  },
  globalData: {
    cloudReady: true
  }
})
