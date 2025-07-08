const db = wx.cloud.database()
const photosCollection = db.collection('baby_photos')

Page({
  data: {
    photos: [],
    refreshing: false
  },

  onLoad () {
    this.loadPhotos()
  },

  onShow () {
    // 每次显示页面时都重新加载数据，确保显示最新的照片
    this.loadPhotos()
  },

  async loadPhotos () {
    try {
      // 显示加载状态
      if (!this.data.photos.length) {
        wx.showLoading({ title: '加载中...' })
      }
      
      const res = await photosCollection.orderBy('createdAt', 'desc').limit(50).get()
      const processedPhotos = this.processPhotosData(res.data)
      this.setData({ photos: processedPhotos })
      
      // 隐藏加载状态
      wx.hideLoading()
    } catch (err) {
      wx.hideLoading()
      console.error('加载照片失败:', err)
      wx.showToast({ title: '加载照片失败', icon: 'none' })
    }
  },

  // 处理照片数据，按日期分组并格式化
  processPhotosData (rawPhotos) {
    const photosByDate = {}
    
    // 按日期分组
    for (let i = 0; i < rawPhotos.length; i++) {
      const photo = rawPhotos[i]
      const date = photo.date
      
      if (!photosByDate[date]) {
        // 使用最新的照片时间作为分组的显示时间
        const displayTime = photo.fullDateTime || photo.createdAt
        photosByDate[date] = {
          _id: `group_${date}`,
          date: date,
          timeStr: this.formatTimeString(photo.createdAt),
          fullDateTime: this.formatFullDateTime(displayTime),
          displayTime: displayTime, // 保存原始时间用于排序
          desc: '',
          photos: [],
          photoIds: [], // 存储照片ID，用于详情页
          tags: new Set()
        }
      } else {
        // 如果有更新的时间，更新显示时间
        const currentTime = photo.fullDateTime || photo.createdAt
        if (new Date(currentTime) > new Date(photosByDate[date].displayTime)) {
          photosByDate[date].fullDateTime = this.formatFullDateTime(currentTime)
          photosByDate[date].displayTime = currentTime
        }
      }
      
      // 添加照片URL和ID
      photosByDate[date].photos.push(photo.url)
      photosByDate[date].photoIds.push(photo._id)
      
      // 合并描述（如果有）
      if (photo.desc && photo.desc.trim()) {
        if (photosByDate[date].desc) {
          photosByDate[date].desc += ' | ' + photo.desc
        } else {
          photosByDate[date].desc = photo.desc
        }
      }
      
      // 合并标签
      if (photo.tags && photo.tags.length > 0) {
        for (let j = 0; j < photo.tags.length; j++) {
          photosByDate[date].tags.add(photo.tags[j])
        }
      }
    }
    
    // 转换为数组并处理标签
    const result = Object.keys(photosByDate).map(key => {
      const group = photosByDate[key]
      return {
        _id: group._id,
        date: group.date,
        timeStr: group.timeStr,
        fullDateTime: group.fullDateTime,
        displayTime: group.displayTime,
        desc: group.desc,
        photos: group.photos,
        photoIds: group.photoIds,
        tags: Array.from(group.tags)
      }
    })
    
    // 按实际时间排序（最新的在前）
    result.sort((a, b) => new Date(b.displayTime) - new Date(a.displayTime))
    
    return result
  },

  // 格式化时间字符串
  formatTimeString (createdAt) {
    const now = new Date()
    const createTime = new Date(createdAt)
    const diffTime = now - createTime
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`
    } else {
      return `${Math.floor(diffDays / 30)}个月前`
    }
  },

  // 格式化完整日期时间（年月日时分秒）
  formatFullDateTime (dateTime) {
    if (!dateTime) {
      return '未知时间'
    }
    
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) {
      return '无效时间'
    }
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  },

  // 处理照片点击事件
  previewPhotos (e) {
    const { momentIndex, photoIndex } = e.currentTarget.dataset
    const moment = this.data.photos[momentIndex]
    
    // 判断是单击还是双击（防止误触）
    if (this.lastTapTime && (new Date().getTime() - this.lastTapTime < 300)) {
      // 双击：直接预览照片
      wx.previewImage({
        current: moment.photos[photoIndex],
        urls: moment.photos
      })
    } else {
      // 单击：跳转到详情页
      if (moment.photoIds && moment.photoIds[photoIndex]) {
        // 如果有照片ID，跳转到单张照片详情
        wx.navigateTo({
          url: `/pages/photo-detail/photo-detail?id=${moment.photoIds[photoIndex]}`
        })
      } else {
        // 否则按日期查看照片组
        wx.navigateTo({
          url: `/pages/photo-detail/photo-detail?date=${moment.date}`
        })
      }
    }
    
    this.lastTapTime = new Date().getTime()
  },

  // 删除动态
  deleteMoment (e) {
    const momentId = e.currentTarget.dataset.id
    const moment = this.data.photos.find(p => p._id === momentId)
    
    if (!moment) return
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${moment.date} 的所有照片吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#FF7BAC',
      success: (res) => {
        if (res.confirm) {
          this.performDelete(moment.date)
        }
      }
    })
  },

  // 执行删除操作
  async performDelete (date) {
    try {
      wx.showLoading({ title: '删除中...' })
      
      // 删除数据库中该日期的所有记录
      await photosCollection.where({ date: date }).remove()
      
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      
      // 重新加载数据
      this.loadPhotos()
    } catch (err) {
      wx.hideLoading()
      console.error('删除失败:', err)
      wx.showToast({ title: '删除失败', icon: 'none' })
    }
  },

  // 下拉刷新
  async onPullRefresh () {
    this.setData({ refreshing: true })
    await this.loadPhotos()
    this.setData({ refreshing: false })
  },

  // 跳转到上传页面
  goUpload () {
    wx.switchTab({ url: '/pages/upload/upload' })
  },
  
  // 跳转到搜索页面
  goSearch () {
    wx.navigateTo({ url: '/pages/search/search' })
  }
}) 