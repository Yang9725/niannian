/**
 * 加载状态管理工具函数
 * 提供统一的加载状态管理和优化用户体验
 */

// 全局加载状态追踪
const loadingState = {
  count: 0,
  tasks: new Map()
}

/**
 * 显示全局加载提示
 * @param {String} [title='加载中'] - 提示文本
 * @param {Boolean} [mask=true] - 是否显示遮罩
 * @returns {String} 任务ID
 */
const showLoading = (title = '加载中', mask = true) => {
  const taskId = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // 如果当前没有加载中的任务，显示加载提示
  if (loadingState.count === 0) {
    wx.showLoading({
      title,
      mask
    })
  }
  
  // 记录任务信息
  loadingState.tasks.set(taskId, { title, mask })
  loadingState.count++
  
  return taskId
}

/**
 * 隐藏全局加载提示
 * @param {String} [taskId] - 任务ID，不传则隐藏所有
 */
const hideLoading = (taskId) => {
  if (taskId) {
    // 移除指定任务
    if (loadingState.tasks.has(taskId)) {
      loadingState.tasks.delete(taskId)
      loadingState.count--
    }
  } else {
    // 清空所有任务
    loadingState.tasks.clear()
    loadingState.count = 0
  }
  
  // 如果没有加载中的任务，隐藏加载提示
  if (loadingState.count === 0) {
    wx.hideLoading()
  }
}

/**
 * 带加载状态的异步操作包装器
 * @param {Function} asyncFn - 异步函数
 * @param {Object} [options] - 配置选项
 * @param {String} [options.loadingText='加载中'] - 加载提示文本
 * @param {Boolean} [options.mask=true] - 是否显示遮罩
 * @param {Boolean} [options.showSuccess=false] - 是否显示成功提示
 * @param {String} [options.successText='操作成功'] - 成功提示文本
 * @returns {Promise} 异步操作结果
 */
const withLoading = async (asyncFn, options = {}) => {
  const { 
    loadingText = '加载中', 
    mask = true,
    showSuccess = false,
    successText = '操作成功'
  } = options
  
  const taskId = showLoading(loadingText, mask)
  
  try {
    const result = await asyncFn()
    
    hideLoading(taskId)
    
    if (showSuccess) {
      wx.showToast({
        title: successText,
        icon: 'success',
        duration: 2000
      })
    }
    
    return result
  } catch (error) {
    hideLoading(taskId)
    throw error
  }
}

/**
 * 创建自定义加载状态组件的状态管理器
 * @param {Object} component - 组件实例
 * @param {String} [stateField='loading'] - 加载状态字段名
 * @returns {Object} 状态管理器
 */
const createComponentLoadingManager = (component, stateField = 'loading') => {
  return {
    /**
     * 显示组件加载状态
     */
    show() {
      const data = {}
      data[stateField] = true
      component.setData(data)
    },
    
    /**
     * 隐藏组件加载状态
     */
    hide() {
      const data = {}
      data[stateField] = false
      component.setData(data)
    },
    
    /**
     * 带加载状态的异步操作包装器
     * @param {Function} asyncFn - 异步函数
     * @returns {Promise} 异步操作结果
     */
    async withLoading(asyncFn) {
      this.show()
      
      try {
        const result = await asyncFn()
        this.hide()
        return result
      } catch (error) {
        this.hide()
        throw error
      }
    }
  }
}

/**
 * 创建带节流的加载状态管理器
 * @param {Number} [minDuration=500] - 最小显示时长(毫秒)
 * @returns {Object} 状态管理器
 */
const createThrottledLoadingManager = (minDuration = 500) => {
  let startTime = 0
  let taskId = null
  
  return {
    /**
     * 显示加载状态
     * @param {String} [title='加载中'] - 提示文本
     * @param {Boolean} [mask=true] - 是否显示遮罩
     */
    show(title = '加载中', mask = true) {
      startTime = Date.now()
      taskId = showLoading(title, mask)
    },
    
    /**
     * 隐藏加载状态，确保最小显示时长
     */
    hide() {
      if (!taskId) return
      
      const elapsedTime = Date.now() - startTime
      
      if (elapsedTime >= minDuration) {
        // 已经显示足够长的时间，直接隐藏
        hideLoading(taskId)
        taskId = null
      } else {
        // 未达到最小显示时长，延迟隐藏
        setTimeout(() => {
          hideLoading(taskId)
          taskId = null
        }, minDuration - elapsedTime)
      }
    },
    
    /**
     * 带节流的加载状态异步操作包装器
     * @param {Function} asyncFn - 异步函数
     * @param {Object} [options] - 配置选项
     * @returns {Promise} 异步操作结果
     */
    async withLoading(asyncFn, options = {}) {
      this.show(options.loadingText, options.mask)
      
      try {
        const result = await asyncFn()
        this.hide()
        
        if (options.showSuccess) {
          wx.showToast({
            title: options.successText || '操作成功',
            icon: 'success',
            duration: 2000
          })
        }
        
        return result
      } catch (error) {
        this.hide()
        throw error
      }
    }
  }
}

/**
 * 创建带延迟的加载状态管理器（避免闪烁）
 * @param {Number} [delay=300] - 延迟显示时间(毫秒)
 * @returns {Object} 状态管理器
 */
const createDelayedLoadingManager = (delay = 300) => {
  let loadingTimer = null
  let taskId = null
  
  return {
    /**
     * 显示加载状态（延迟显示）
     * @param {String} [title='加载中'] - 提示文本
     * @param {Boolean} [mask=true] - 是否显示遮罩
     */
    show(title = '加载中', mask = true) {
      // 清除可能存在的定时器
      if (loadingTimer) {
        clearTimeout(loadingTimer)
      }
      
      // 设置延迟显示定时器
      loadingTimer = setTimeout(() => {
        taskId = showLoading(title, mask)
        loadingTimer = null
      }, delay)
    },
    
    /**
     * 隐藏加载状态
     */
    hide() {
      // 如果定时器还在，取消显示
      if (loadingTimer) {
        clearTimeout(loadingTimer)
        loadingTimer = null
      }
      
      // 如果已经显示，则隐藏
      if (taskId) {
        hideLoading(taskId)
        taskId = null
      }
    },
    
    /**
     * 带延迟的加载状态异步操作包装器
     * @param {Function} asyncFn - 异步函数
     * @param {Object} [options] - 配置选项
     * @returns {Promise} 异步操作结果
     */
    async withLoading(asyncFn, options = {}) {
      this.show(options.loadingText, options.mask)
      
      try {
        const result = await asyncFn()
        this.hide()
        
        if (options.showSuccess) {
          wx.showToast({
            title: options.successText || '操作成功',
            icon: 'success',
            duration: 2000
          })
        }
        
        return result
      } catch (error) {
        this.hide()
        throw error
      }
    }
  }
}

module.exports = {
  showLoading,
  hideLoading,
  withLoading,
  createComponentLoadingManager,
  createThrottledLoadingManager,
  createDelayedLoadingManager
} 