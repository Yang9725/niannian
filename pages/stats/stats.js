// 引入工具函数
const dateUtils = require('../../utils/dateUtils')
const wxCloud = require('../../utils/wxCloud')
const errorHandler = require('../../utils/errorHandler')
const loadingManager = require('../../utils/loadingManager')

// 创建加载管理器
const loading = loadingManager.createThrottledLoadingManager(500)

Page({
  data: {
    loading: true,
    stats: {
      total: 0,
      tags: 0,
      days: 0,
      firstPhotoDate: '',
      lastPhotoDate: '',
      durationText: '',
      monthly: [],
      topTags: []
    },
    yAxis: [] // Y轴刻度
  },

  onLoad() {
    this.loadStats()
  },
  
  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      this.setData({ loading: true })
      
      await loading.withLoading(async () => {
        // 获取照片统计信息
        const photoStats = await wxCloud.getPhotoStats()
        
        // 获取标签统计信息
        const allTags = await wxCloud.getAllTags()
        
        // 处理统计数据
        const stats = this.processStats(photoStats, allTags)
        
        // 计算Y轴刻度
        const yAxis = this.calculateYAxis(stats.monthly)
        
        this.setData({
          stats,
          yAxis,
          loading: false
        })
      }, {
        loadingText: '加载统计数据...'
      })
    } catch (error) {
      console.error('加载统计数据失败:', error)
      errorHandler.showError(error)
      this.setData({ loading: false })
    }
  },
  
  /**
   * 处理统计数据
   * @param {Object} photoStats - 照片统计数据
   * @param {Array} allTags - 所有标签数据
   * @returns {Object} 处理后的统计数据
   */
  processStats(photoStats, allTags) {
    // 照片总数
    const total = photoStats.total || 0
    
    // 标签总数
    const tags = allTags.length || 0
    
    // 记录天数
    const days = photoStats.monthly.reduce((sum, item) => sum + item.count, 0) || 0
    
    // 第一张照片日期
    const firstPhotoDate = photoStats.firstDate ? 
      dateUtils.formatDate(photoStats.firstDate) : '暂无'
    
    // 最近一张照片日期
    const lastPhotoDate = photoStats.lastDate ? 
      dateUtils.formatDate(photoStats.lastDate) : '暂无'
    
    // 记录时长
    let durationText = '暂无'
    if (photoStats.firstDate && photoStats.lastDate) {
      const firstDate = new Date(photoStats.firstDate)
      const lastDate = new Date(photoStats.lastDate)
      const diffTime = lastDate - firstDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays < 30) {
        durationText = `${diffDays}天`
      } else if (diffDays < 365) {
        durationText = `${Math.floor(diffDays / 30)}个月`
      } else {
        const years = Math.floor(diffDays / 365)
        const months = Math.floor((diffDays % 365) / 30)
        durationText = `${years}年${months > 0 ? months + '个月' : ''}`
      }
    }
    
    // 月度统计
    const monthly = this.processMonthlyStats(photoStats.monthly)
    
    // 热门标签
    const topTags = allTags
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      total,
      tags,
      days,
      firstPhotoDate,
      lastPhotoDate,
      durationText,
      monthly,
      topTags
    }
  },
  
  /**
   * 处理月度统计数据
   * @param {Array} monthlyData - 月度统计原始数据
   * @returns {Array} 处理后的月度统计数据
   */
  processMonthlyStats(monthlyData) {
    if (!monthlyData || !monthlyData.length) return []
    
    // 找出最大值
    const maxCount = Math.max(...monthlyData.map(item => item.count))
    
    // 处理数据，添加百分比和显示月份
    return monthlyData.map(item => {
      const yearMonth = item._id.split('-')
      const year = yearMonth[0]
      const month = yearMonth[1]
      
      return {
        month: `${month}月`,
        year,
        count: item.count,
        percentage: Math.max(5, Math.round((item.count / maxCount) * 100))
      }
    })
  },
  
  /**
   * 计算Y轴刻度
   * @param {Array} monthlyData - 月度统计数据
   * @returns {Array} Y轴刻度数组
   */
  calculateYAxis(monthlyData) {
    if (!monthlyData || !monthlyData.length) return [0]
    
    // 找出最大值
    const maxCount = Math.max(...monthlyData.map(item => item.count))
    
    // 计算合适的刻度间隔
    const step = this.calculateStep(maxCount)
    
    // 生成刻度数组
    const yAxis = []
    for (let i = 0; i <= maxCount; i += step) {
      yAxis.unshift(i)
    }
    
    return yAxis
  },
  
  /**
   * 计算合适的刻度间隔
   * @param {Number} maxValue - 最大值
   * @returns {Number} 刻度间隔
   */
  calculateStep(maxValue) {
    if (maxValue <= 5) return 1
    if (maxValue <= 20) return 5
    if (maxValue <= 50) return 10
    if (maxValue <= 100) return 20
    if (maxValue <= 500) return 100
    return Math.ceil(maxValue / 5 / 100) * 100
  },
  
  /**
   * 根据标签搜索照片
   * @param {Object} e - 事件对象
   */
  searchByTag(e) {
    const tag = e.currentTarget.dataset.tag
    
    wx.navigateTo({
      url: `/pages/search/search?tag=${tag}`
    })
  },
  
  /**
   * 备份数据
   */
  async backupData() {
    try {
      await loading.withLoading(async () => {
        // 获取所有照片数据
        const db = wx.cloud.database()
        const photos = await db.collection('baby_photos').get()
        
        // 生成备份文件内容
        const backupData = {
          version: '1.0',
          timestamp: Date.now(),
          photos: photos.data
        }
        
        // 将数据转换为JSON字符串
        const backupContent = JSON.stringify(backupData)
        
        // 创建临时文件
        const fs = wx.getFileSystemManager()
        const tempFilePath = `${wx.env.USER_DATA_PATH}/baby_photos_backup_${Date.now()}.json`
        
        // 写入文件
        fs.writeFileSync(tempFilePath, backupContent, 'utf8')
        
        // 保存文件到本地
        await wx.saveFile({
          tempFilePath,
          success: (res) => {
            const savedFilePath = res.savedFilePath
            
            // 提示用户
            wx.showModal({
              title: '备份成功',
              content: `备份文件已保存到本地，共包含${photos.data.length}张照片记录。`,
              showCancel: false
            })
          }
        })
      }, {
        loadingText: '正在备份数据...'
      })
    } catch (error) {
      console.error('备份数据失败:', error)
      errorHandler.showError(error)
    }
  },
  
  /**
   * 导出照片
   */
  async exportPhotos() {
    wx.showModal({
      title: '导出照片',
      content: '照片导出功能需要在真机环境下使用，请在微信开发者工具中点击"预览"，使用手机扫码进入小程序后再尝试此功能。',
      showCancel: false
    })
  },
  
  /**
   * 分享页面
   */
  onShareAppMessage() {
    return {
      title: '年年囿钱 - 宝宝相册',
      path: '/pages/index/index'
    }
  }
}) 