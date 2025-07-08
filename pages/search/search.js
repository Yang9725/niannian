// 引入工具函数
const dateUtils = require('../../utils/dateUtils')
const wxCloud = require('../../utils/wxCloud')
const errorHandler = require('../../utils/errorHandler')
const loadingManager = require('../../utils/loadingManager')

// 创建加载管理器
const loading = loadingManager.createThrottledLoadingManager(500)

Page({
  data: {
    // 搜索参数
    keyword: '',
    activeFilter: 'all', // 'all', 'tag', 'date'
    showFilterPanel: false,
    
    // 标签筛选
    allTags: [],
    selectedTags: [],
    
    // 日期筛选
    startDate: '',
    endDate: '',
    
    // 搜索结果
    loading: false,
    hasSearched: false,
    searchResults: []
  },

  onLoad() {
    // 加载所有标签
    this.loadAllTags()
  },
  
  /**
   * 加载所有标签及其使用次数
   */
  async loadAllTags() {
    try {
      this.setData({ loading: true })
      
      const tags = await wxCloud.getAllTags()
      
      // 按使用次数排序
      tags.sort((a, b) => b.count - a.count)
      
      this.setData({ 
        allTags: tags,
        loading: false
      })
    } catch (error) {
      console.error('加载标签失败:', error)
      errorHandler.showError(error)
      this.setData({ loading: false })
    }
  },
  
  /**
   * 关键词输入事件
   */
  onKeywordInput(e) {
    this.setData({
      keyword: e.detail.value
    })
  },
  
  /**
   * 切换筛选类型
   */
  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter
    
    this.setData({
      activeFilter: filter,
      showFilterPanel: filter !== 'all'
    })
    
    // 如果切换到"全部"，立即执行搜索
    if (filter === 'all') {
      this.search()
    }
  },
  
  /**
   * 切换标签选择
   */
  toggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const { selectedTags } = this.data
    
    if (selectedTags.includes(tag)) {
      // 移除标签
      this.setData({
        selectedTags: selectedTags.filter(t => t !== tag)
      })
    } else {
      // 添加标签
      this.setData({
        selectedTags: [...selectedTags, tag]
      })
    }
  },
  
  /**
   * 开始日期变更
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },
  
  /**
   * 结束日期变更
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    })
  },
  
  /**
   * 重置筛选条件
   */
  resetFilter() {
    if (this.data.activeFilter === 'tag') {
      this.setData({ selectedTags: [] })
    } else if (this.data.activeFilter === 'date') {
      this.setData({
        startDate: '',
        endDate: ''
      })
    }
  },
  
  /**
   * 应用筛选条件
   */
  applyFilter() {
    this.search()
    
    // 隐藏筛选面板
    this.setData({
      showFilterPanel: false
    })
  },
  
  /**
   * 执行搜索
   */
  async search() {
    try {
      const { keyword, selectedTags, startDate, endDate } = this.data
      
      // 检查是否有搜索条件
      if (!keyword && selectedTags.length === 0 && !startDate && !endDate) {
        // 没有搜索条件，显示空结果
        this.setData({
          searchResults: [],
          hasSearched: true
        })
        return
      }
      
      await loading.withLoading(async () => {
        this.setData({ loading: true })
        
        const db = wx.cloud.database()
        const _ = db.command
        const $ = _.aggregate
        
        // 构建查询条件
        const query = db.collection('baby_photos')
        
        // 关键词搜索（描述或标签）
        if (keyword) {
          // 使用正则表达式进行模糊匹配
          const keywordRegex = db.RegExp({
            regexp: keyword,
            options: 'i' // 不区分大小写
          })
          
          query.where(_.or([
            { desc: keywordRegex },
            { tags: _.all([keywordRegex]) }
          ]))
        }
        
        // 标签筛选
        if (selectedTags.length > 0) {
          query.where({
            tags: _.all(selectedTags)
          })
        }
        
        // 日期范围筛选
        if (startDate || endDate) {
          const dateCondition = {}
          
          if (startDate) {
            dateCondition.gte = startDate
          }
          
          if (endDate) {
            dateCondition.lte = endDate
          }
          
          if (Object.keys(dateCondition).length > 0) {
            query.where({
              date: dateCondition
            })
          }
        }
        
        // 执行查询
        const res = await query.orderBy('createdAt', 'desc').limit(100).get()
        
        // 处理结果
        this.setData({
          searchResults: res.data,
          hasSearched: true,
          loading: false
        })
      }, {
        loadingText: '搜索中...'
      })
    } catch (error) {
      console.error('搜索失败:', error)
      errorHandler.showError(error)
      this.setData({ loading: false })
    }
  },
  
  /**
   * 跳转到照片详情页
   */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    
    wx.navigateTo({
      url: `/pages/photo-detail/photo-detail?id=${id}`
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