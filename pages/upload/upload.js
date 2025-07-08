const db = wx.cloud.database()

Page({
  data: {
    form: {
      desc: '',
      date: ''
    },
    files: [],
    availableTags: [
      { name: '第一次', selected: false },
      { name: '里程碑', selected: false },
      { name: '家庭日', selected: false },
      { name: '户外', selected: false },
      { name: '笑容', selected: false },
      { name: '睡觉', selected: false }
    ],
    customTag: '',
    loading: false
  },

  chooseImage () {
    wx.chooseImage({
      count: 9 - this.data.files.length,
      sizeType: ['compressed'],
      success: res => {
        // 仅在日期未设置时，设置默认日期为今天
        if (res.tempFiles.length > 0 && !this.data.form.date) {
          const today = new Date()
          const dateStr = this.formatDate(today)
          this.setData({ 'form.date': dateStr })
          
          // 提示用户可以修改日期
          wx.showToast({
            title: '请确认拍摄日期',
            icon: 'none',
            duration: 2000
          })
        }
        
        this.setData({
          files: [...this.data.files, ...res.tempFiles.map(file => ({ url: file.path }))]
        })
      }
    })
  },

  // 格式化日期为 YYYY-MM-DD 格式
  formatDate (date) {
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0')
  },

  // 重置表单数据
  resetForm () {
    this.setData({
      form: {
        desc: '',
        date: ''
      },
      files: [],
      availableTags: [
        { name: '第一次', selected: false },
        { name: '里程碑', selected: false },
        { name: '家庭日', selected: false },
        { name: '户外', selected: false },
        { name: '笑容', selected: false },
        { name: '睡觉', selected: false }
      ],
      customTag: ''
    })
  },

  removeFile (e) {
    const index = e.currentTarget.dataset.index
    const newFiles = this.data.files.filter((_, i) => i !== index)
    
    // 如果删除后没有照片了，清空日期和标签选择
    if (newFiles.length === 0) {
      // 清空日期
      this.setData({ 
        files: newFiles,
        'form.date': ''
      })
      
      // 清空所有标签选择
      const resetTags = this.data.availableTags.map(tag => ({
        ...tag,
        selected: false
      }))
      
      this.setData({ 
        availableTags: resetTags
      })
      
      wx.showToast({
        title: '已清空日期和标签',
        icon: 'none',
        duration: 1500
      })
    } else {
      this.setData({ files: newFiles })
    }
  },

  previewFile (e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.files.map(f => f.url)
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  onDescInput (e) {
    this.setData({ 'form.desc': e.detail.value })
  },

  onDateChange (e) {
    this.setData({ 'form.date': e.detail.value })
  },

  toggleTag (e) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.availableTags]
    tags[index].selected = !tags[index].selected
    this.setData({ availableTags: tags })
  },

  onCustomTagInput (e) {
    let val = e.detail.value
    let maxLen = 20 // 10汉字或20英文
    let realLen = 0
    let result = ''
    for (let i = 0; i < val.length; i++) {
      let char = val[i]
      if (char.charCodeAt(0) <= 127) {
        if (realLen + 1 > maxLen) break
        realLen += 1
      } else {
        if (realLen + 2 > maxLen) break
        realLen += 2
      }
      result += char
    }
    this.setData({ customTag: result })
  },

  addCustomTag (e) {
    const tagName = e.detail.value.trim()
    if (!tagName) return
    if (this.data.availableTags.some(tag => tag.name === tagName)) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    this.setData({
      availableTags: [...this.data.availableTags, { name: tagName, selected: true }],
      customTag: ''
    })
  },

  async submit () {
    if (this.data.files.length === 0) {
      wx.showToast({ title: '请选择至少一张照片', icon: 'none' })
      return
    }
    
    // 显示加载状态
    this.setData({ loading: true })
    wx.showLoading({ title: '保存中...' })
    
    try {
      // 上传照片到云存储
      const uploadTasks = this.data.files.map(file =>
        wx.cloud.uploadFile({
          cloudPath: `baby_photos/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`,
          filePath: file.url
        })
      )
      const results = await Promise.all(uploadTasks)
      const selectedTags = this.data.availableTags.filter(tag => tag.selected).map(tag => tag.name)
      
      // 创建完整的时间戳，包含时分秒
      const now = new Date()
      const selectedDate = this.data.form.date || this.formatDate(now)
      
      // 将选择的日期与当前时间合并，得到完整的时间戳
      const [year, month, day] = selectedDate.split('-')
      const fullDateTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds())
      
      // 逐个添加照片记录到数据库
      const addTasks = results.map(res => 
        db.collection('baby_photos').add({
          data: {
            url: res.fileID,
            desc: this.data.form.desc,
            date: selectedDate, // 保留原有的日期格式用于分组
            fullDateTime: fullDateTime, // 新增完整时间戳
            tags: selectedTags,
            createdAt: new Date()
          }
        })
      )
      
      await Promise.all(addTasks)
      
      // 隐藏加载提示
      wx.hideLoading()
      
      // 立即重置表单数据
      this.resetForm()
      
      // 显示成功提示
      wx.showToast({ 
        title: '上传成功！',
        icon: 'success',
        duration: 1500
      })
      
      // 立即跳转到首页并触发刷新
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index',
          success: () => {
            // 通过事件总线通知首页刷新数据
            const pages = getCurrentPages()
            const indexPage = pages.find(page => page.route === 'pages/index/index')
            if (indexPage && indexPage.loadPhotos) {
              indexPage.loadPhotos()
            }
          }
        })
      }, 800)
    } catch (error) {
      wx.hideLoading()
      console.error('上传失败:', error)
      wx.showToast({ title: '上传失败，请重试', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  }
}) 