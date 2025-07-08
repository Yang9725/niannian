// app.js
App({
  onLaunch () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-0grpju0y8c5aec46', // 云开发环境ID
        traceUser: true
      })
    }
  }
}) 