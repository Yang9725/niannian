/**
 * 错误处理工具函数
 * 提供网络错误处理、重试机制、用户友好提示等功能
 */

// 错误类型常量
const ERROR_TYPES = {
  NETWORK: 'network',
  PERMISSION: 'permission',
  VALIDATION: 'validation',
  CLOUD: 'cloud',
  UNKNOWN: 'unknown'
}

// 错误码映射
const ERROR_CODES = {
  '-1': { type: ERROR_TYPES.NETWORK, message: '网络连接失败' },
  '1': { type: ERROR_TYPES.CLOUD, message: '云函数调用失败' },
  '2': { type: ERROR_TYPES.CLOUD, message: '云数据库操作失败' },
  '3': { type: ERROR_TYPES.CLOUD, message: '云存储操作失败' },
  '4': { type: ERROR_TYPES.PERMISSION, message: '权限不足' },
  '5': { type: ERROR_TYPES.VALIDATION, message: '数据验证失败' }
}

/**
 * 分析错误信息，返回错误类型和友好提示
 * @param {Error|Object} error - 错误对象
 * @returns {Object} 包含错误类型和提示信息的对象
 */
const analyzeError = (error) => {
  // 默认错误信息
  const defaultResult = {
    type: ERROR_TYPES.UNKNOWN,
    message: '操作失败，请稍后重试'
  }
  
  if (!error) return defaultResult
  
  // 处理字符串类型的错误
  if (typeof error === 'string') {
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: error || defaultResult.message
    }
  }
  
  // 处理微信API错误
  if (error.errMsg) {
    // 网络相关错误
    if (error.errMsg.includes('request:fail') || error.errMsg.includes('connectSocket:fail')) {
      return {
        type: ERROR_TYPES.NETWORK,
        message: '网络连接失败，请检查网络设置',
        original: error
      }
    }
    
    // 权限相关错误
    if (error.errMsg.includes('auth deny') || error.errMsg.includes('authorize:fail')) {
      return {
        type: ERROR_TYPES.PERMISSION,
        message: '需要您授权才能继续操作',
        original: error
      }
    }
    
    // 云函数相关错误
    if (error.errMsg.includes('cloud.')) {
      return {
        type: ERROR_TYPES.CLOUD,
        message: '云服务操作失败，请稍后重试',
        original: error
      }
    }
    
    // 返回原始错误信息
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: error.errMsg.replace(/^.+?:fail\s*/, '') || defaultResult.message,
      original: error
    }
  }
  
  // 处理自定义错误码
  if (error.code && ERROR_CODES[error.code]) {
    const errorInfo = ERROR_CODES[error.code]
    return {
      type: errorInfo.type,
      message: error.message || errorInfo.message,
      original: error
    }
  }
  
  // 处理标准Error对象
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: error.message || defaultResult.message,
    original: error
  }
}

/**
 * 显示错误提示
 * @param {Error|Object|String} error - 错误对象或错误消息
 * @param {Object} [options] - 配置选项
 * @param {Boolean} [options.showToast=true] - 是否显示Toast提示
 * @param {Boolean} [options.showModal=false] - 是否显示Modal对话框
 * @param {Function} [options.onConfirm] - Modal确认按钮回调
 * @param {Function} [options.onCancel] - Modal取消按钮回调
 */
const showError = (error, options = {}) => {
  const { showToast = true, showModal = false, onConfirm, onCancel } = options
  const errorInfo = typeof error === 'string' ? { message: error } : analyzeError(error)
  
  // 记录错误到控制台
  console.error('应用错误:', errorInfo)
  
  // 显示Toast提示
  if (showToast) {
    wx.showToast({
      title: errorInfo.message,
      icon: 'none',
      duration: 2000
    })
  }
  
  // 显示Modal对话框
  if (showModal) {
    wx.showModal({
      title: '提示',
      content: errorInfo.message,
      showCancel: !!onCancel,
      success: (res) => {
        if (res.confirm && onConfirm) {
          onConfirm(errorInfo)
        } else if (res.cancel && onCancel) {
          onCancel(errorInfo)
        }
      }
    })
  }
  
  return errorInfo
}

/**
 * 带重试机制的异步操作包装器
 * @param {Function} asyncFn - 异步函数
 * @param {Object} [options] - 配置选项
 * @param {Number} [options.maxRetries=3] - 最大重试次数
 * @param {Number} [options.retryDelay=1000] - 重试延迟(毫秒)
 * @param {Function} [options.onRetry] - 重试前回调
 * @param {Boolean} [options.showLoading=false] - 是否显示加载提示
 * @param {String} [options.loadingText='加载中'] - 加载提示文本
 * @returns {Promise} 异步操作结果
 */
const withRetry = async (asyncFn, options = {}) => {
  const { 
    maxRetries = 3, 
    retryDelay = 1000, 
    onRetry,
    showLoading = false,
    loadingText = '加载中'
  } = options
  
  let retries = 0
  
  const execute = async () => {
    try {
      if (showLoading) {
        wx.showLoading({ title: loadingText, mask: true })
      }
      
      const result = await asyncFn()
      
      if (showLoading) {
        wx.hideLoading()
      }
      
      return result
    } catch (error) {
      if (showLoading) {
        wx.hideLoading()
      }
      
      const errorInfo = analyzeError(error)
      
      // 网络错误或云服务错误才进行重试
      const shouldRetry = (
        (errorInfo.type === ERROR_TYPES.NETWORK || errorInfo.type === ERROR_TYPES.CLOUD) && 
        retries < maxRetries
      )
      
      if (shouldRetry) {
        retries++
        
        // 调用重试回调
        if (onRetry) {
          onRetry(retries, maxRetries, errorInfo)
        } else {
          wx.showToast({
            title: `网络错误，正在重试(${retries}/${maxRetries})...`,
            icon: 'none',
            duration: retryDelay - 100
          })
        }
        
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        
        // 递归重试
        return execute()
      }
      
      // 达到最大重试次数，抛出错误
      throw error
    }
  }
  
  return execute()
}

/**
 * 处理网络请求错误
 * @param {Function} requestFn - 请求函数
 * @param {Object} [options] - 配置选项
 * @returns {Promise} 请求结果
 */
const handleRequestError = async (requestFn, options = {}) => {
  try {
    return await withRetry(requestFn, options)
  } catch (error) {
    const errorInfo = showError(error, { 
      showToast: options.showToast !== false 
    })
    throw errorInfo
  }
}

/**
 * 处理云函数调用错误
 * @param {String} name - 云函数名称
 * @param {Object} data - 云函数参数
 * @param {Object} [options] - 配置选项
 * @returns {Promise} 云函数调用结果
 */
const callCloudFunction = async (name, data = {}, options = {}) => {
  return handleRequestError(
    async () => {
      const result = await wx.cloud.callFunction({
        name,
        data
      })
      
      // 检查云函数返回的错误
      if (result.result && result.result.error) {
        throw result.result.error
      }
      
      return result
    },
    {
      ...options,
      loadingText: options.loadingText || '处理中'
    }
  )
}

/**
 * 处理表单提交错误
 * @param {Function} submitFn - 表单提交函数
 * @param {Object} [options] - 配置选项
 * @returns {Promise} 提交结果
 */
const handleFormSubmit = async (submitFn, options = {}) => {
  try {
    if (options.showLoading !== false) {
      wx.showLoading({ 
        title: options.loadingText || '提交中', 
        mask: true 
      })
    }
    
    const result = await submitFn()
    
    if (options.showLoading !== false) {
      wx.hideLoading()
    }
    
    if (options.showSuccess !== false) {
      wx.showToast({
        title: options.successText || '提交成功',
        icon: 'success',
        duration: 2000
      })
    }
    
    return result
  } catch (error) {
    if (options.showLoading !== false) {
      wx.hideLoading()
    }
    
    showError(error, { 
      showToast: options.showToast !== false 
    })
    
    throw error
  }
}

/**
 * 处理权限错误
 * @param {String} scope - 权限域，如'scope.writePhotosAlbum'
 * @param {Function} operation - 需要权限的操作函数
 * @param {Object} [options] - 配置选项
 * @returns {Promise} 操作结果
 */
const handlePermission = async (scope, operation, options = {}) => {
  try {
    // 检查是否已授权
    const settingRes = await wx.getSetting()
    
    if (settingRes.authSetting[scope] === false) {
      // 已拒绝授权，提示用户前往设置页
      return new Promise((resolve, reject) => {
        wx.showModal({
          title: '提示',
          content: options.rejectMessage || '需要您授权才能继续操作',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting({
                success: (settingRes) => {
                  if (settingRes.authSetting[scope]) {
                    // 用户在设置页授权后执行操作
                    resolve(operation())
                  } else {
                    // 用户在设置页仍拒绝授权
                    const error = new Error(options.finalRejectMessage || '您拒绝了授权，无法继续操作')
                    reject(error)
                  }
                }
              })
            } else {
              // 用户取消前往设置页
              const error = new Error(options.cancelMessage || '您取消了授权，无法继续操作')
              reject(error)
            }
          }
        })
      })
    } else if (settingRes.authSetting[scope] === undefined) {
      // 首次授权
      try {
        await wx.authorize({ scope })
        return operation()
      } catch (error) {
        // 用户拒绝首次授权
        throw new Error(options.rejectMessage || '需要您授权才能继续操作')
      }
    } else {
      // 已授权，直接执行操作
      return operation()
    }
  } catch (error) {
    showError(error, { 
      showToast: options.showToast !== false 
    })
    throw error
  }
}

module.exports = {
  ERROR_TYPES,
  ERROR_CODES,
  analyzeError,
  showError,
  withRetry,
  handleRequestError,
  callCloudFunction,
  handleFormSubmit,
  handlePermission
} 