// 引入工具函数
const dateUtils = require('../../utils/dateUtils')
const wxCloud = require('../../utils/wxCloud')
const imageUtils = require('../../utils/imageUtils')
const errorHandler = require('../../utils/errorHandler')
const loadingManager = require('../../utils/loadingManager')

// 创建加载管理器
const loading = loadingManager.createThrottledLoadingManager(500)

Page({
  data: {
    loading: true,
    photoId: '', // 照片记录ID
    date: '', // 日期
    photoInfo: {}, // 照片信息
    photos: [], // 照片URL数组
    currentIndex: 0, // 当前显示的照片索引
    
    // 编辑状态
    isEditingDesc: false,
    editDesc: '',
    isEditingTags: false,
    editTags: [],
    newTag: '',
    
    // 预设标签
    presetTags: [
      '第一次', '里程碑', '家庭日', '户外',
      '笑容', '睡觉', '玩耍', '学习',
      '成长', '亲子', '生日', '节日'
    ]
  },

  onLoad(options) {
    // 获取传入的照片ID和日期
    const { id, date } = options
    
    if (!id && !date) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({
      photoId: id || '',
      date: date || ''
    })
    
    // 加载照片数据
    this.loadPhotoData()
  },
  
  /**
   * 加载照片数据
   */
  async loadPhotoData() {
    try {
      this.setData({ loading: true })
      
      let photoData = null
      
      // 根据ID或日期加载照片
      if (this.data.photoId) {
        // 根据ID加载单张照片
        const db = wx.cloud.database()
        const res = await db.collection('baby_photos').doc(this.data.photoId).get()
        photoData = res.data
      } else if (this.data.date) {
        // 根据日期加载照片组
        const photos = await wxCloud.getPhotosByDate(this.data.date)
        
        if (photos && photos.length > 0) {
          // 使用第一张照片的数据作为基础信息
          photoData = photos[0]
          
          // 收集所有照片的URL
          const urls = photos.map(p => p.url)
          this.setData({ photos: urls })
        }
      }
      
      if (!photoData) {
        wx.showToast({
          title: '照片不存在',
          icon: 'none'
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }
      
      // 如果是单张照片，设置photos数组
      if (this.data.photoId && !this.data.photos.length) {
        this.setData({ photos: [photoData.url] })
      }
      
      // 格式化时间
      const formattedTime = photoData.fullDateTime 
        ? dateUtils.formatDateTime(photoData.fullDateTime)
        : dateUtils.formatDateTime(photoData.createdAt)
      
      // 设置照片信息
      this.setData({
        photoInfo: {
          ...photoData,
          formattedTime
        },
        loading: false
      })
    } catch (error) {
      console.error('加载照片数据失败:', error)
      errorHandler.showError(error, {
        showModal: true,
        onConfirm: () => {
          wx.navigateBack()
        }
      })
    }
  },
  
  /**
   * 轮播图变化事件
   */
  onSwiperChange(e) {
    this.setData({
      currentIndex: e.detail.current
    })
  },
  
  /**
   * 预览当前照片
   */
  previewCurrentPhoto() {
    imageUtils.previewImages(this.data.photos, this.data.photos[this.data.currentIndex])
  },
  
  /**
   * 开始编辑描述
   */
  startEditDesc() {
    this.setData({
      isEditingDesc: true,
      editDesc: this.data.photoInfo.desc || ''
    })
  },
  
  /**
   * 描述输入事件
   */
  onDescInput(e) {
    this.setData({
      editDesc: e.detail.value
    })
  },
  
  /**
   * 取消编辑描述
   */
  cancelEditDesc() {
    this.setData({
      isEditingDesc: false,
      editDesc: ''
    })
  },
  
  /**
   * 保存描述
   */
  async saveDesc() {
    try {
      const { photoId, editDesc } = this.data
      
      // 如果是按日期查看的照片组，无法编辑描述
      if (!photoId) {
        wx.showToast({
          title: '无法编辑照片组描述',
          icon: 'none'
        })
        this.cancelEditDesc()
        return
      }
      
      await loading.withLoading(async () => {
        // 更新数据库
        await wxCloud.updatePhoto(photoId, {
          desc: editDesc.trim()
        })
        
        // 更新本地数据
        this.setData({
          'photoInfo.desc': editDesc.trim(),
          isEditingDesc: false
        })
      }, {
        loadingText: '保存中...',
        showSuccess: true,
        successText: '保存成功'
      })
    } catch (error) {
      console.error('保存描述失败:', error)
      errorHandler.showError(error)
    }
  },
  
  /**
   * 开始编辑标签
   */
  startEditTags() {
    this.setData({
      isEditingTags: true,
      editTags: [...(this.data.photoInfo.tags || [])]
    })
  },
  
  /**
   * 标签输入事件
   */
  onTagInput(e) {
    this.setData({
      newTag: e.detail.value
    })
  },
  
  /**
   * 添加标签
   */
  addTag() {
    const { newTag, editTags } = this.data
    
    if (!newTag.trim()) return
    
    // 检查标签是否已存在
    if (editTags.includes(newTag.trim())) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加新标签
    this.setData({
      editTags: [...editTags, newTag.trim()],
      newTag: ''
    })
  },
  
  /**
   * 添加预设标签
   */
  addPresetTag(e) {
    const tag = e.currentTarget.dataset.tag
    const { editTags } = this.data
    
    // 检查标签是否已存在
    if (editTags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加预设标签
    this.setData({
      editTags: [...editTags, tag]
    })
  },
  
  /**
   * 移除标签
   */
  removeTag(e) {
    const index = e.currentTarget.dataset.index
    const editTags = [...this.data.editTags]
    
    // 移除指定索引的标签
    editTags.splice(index, 1)
    
    this.setData({ editTags })
  },
  
  /**
   * 取消编辑标签
   */
  cancelEditTags() {
    this.setData({
      isEditingTags: false,
      editTags: [],
      newTag: ''
    })
  },
  
  /**
   * 保存标签
   */
  async saveTags() {
    try {
      const { photoId, editTags } = this.data
      
      // 如果是按日期查看的照片组，无法编辑标签
      if (!photoId) {
        wx.showToast({
          title: '无法编辑照片组标签',
          icon: 'none'
        })
        this.cancelEditTags()
        return
      }
      
      await loading.withLoading(async () => {
        // 更新数据库
        await wxCloud.updatePhoto(photoId, {
          tags: editTags
        })
        
        // 更新本地数据
        this.setData({
          'photoInfo.tags': editTags,
          isEditingTags: false
        })
      }, {
        loadingText: '保存中...',
        showSuccess: true,
        successText: '保存成功'
      })
    } catch (error) {
      console.error('保存标签失败:', error)
      errorHandler.showError(error)
    }
  },
  
  /**
   * 分享照片
   */
  async sharePhoto() {
    try {
      const currentPhoto = this.data.photos[this.data.currentIndex]
      
      await loading.withLoading(async () => {
        // 生成分享图片
        const shareImagePath = await imageUtils.generateShareImage({
          title: '年年囿钱 - 宝宝相册',
          imageUrl: currentPhoto,
          desc: this.data.photoInfo.desc || '',
          date: this.data.photoInfo.date
        })
        
        // 保存到相册
        await errorHandler.handlePermission('scope.writePhotosAlbum', async () => {
          await wx.saveImageToPhotosAlbum({
            filePath: shareImagePath
          })
        }, {
          rejectMessage: '需要您授权保存图片到相册'
        })
        
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        })
      }, {
        loadingText: '生成分享图片...'
      })
    } catch (error) {
      console.error('分享照片失败:', error)
      errorHandler.showError(error)
    }
  },
  
  /**
   * 保存照片到相册
   */
  async saveToAlbum() {
    try {
      const currentPhoto = this.data.photos[this.data.currentIndex]
      
      await errorHandler.handlePermission('scope.writePhotosAlbum', async () => {
        await loading.withLoading(async () => {
          await imageUtils.saveImageToAlbum(currentPhoto)
        }, {
          loadingText: '保存中...'
        })
      }, {
        rejectMessage: '需要您授权保存图片到相册'
      })
    } catch (error) {
      console.error('保存照片失败:', error)
      errorHandler.showError(error)
    }
  },
  
  /**
   * 删除照片
   */
  deletePhoto() {
    const { photoId, date } = this.data
    
    // 确认删除
    wx.showModal({
      title: '确认删除',
      content: photoId ? '确定要删除这张照片吗？此操作不可恢复。' : `确定要删除 ${date} 的所有照片吗？此操作不可恢复。`,
      confirmText: '删除',
      confirmColor: '#FF5151',
      success: async (res) => {
        if (res.confirm) {
          try {
            await loading.withLoading(async () => {
              if (photoId) {
                // 删除单张照片
                await wxCloud.deletePhoto(photoId)
              } else if (date) {
                // 删除日期下的所有照片
                await wxCloud.deletePhotosByDate(date)
              }
            }, {
              loadingText: '删除中...'
            })
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            
            // 返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500)
          } catch (error) {
            console.error('删除照片失败:', error)
            errorHandler.showError(error)
          }
        }
      }
    })
  },
  
  /**
   * 分享到朋友圈
   */
  onShareAppMessage() {
    return {
      title: '年年囿钱 - 宝宝相册',
      path: '/pages/index/index',
      imageUrl: this.data.photos[this.data.currentIndex]
    }
  }
}) 