/**
 * 数据验证工具函数
 * 提供表单验证、字符串处理等功能
 */

/**
 * 检查字符串是否为空
 * @param {String} str - 要检查的字符串
 * @returns {Boolean} 是否为空
 */
const isEmpty = (str) => {
  return !str || str.trim() === ''
}

/**
 * 限制字符串长度，超出部分用省略号替代
 * @param {String} str - 原始字符串
 * @param {Number} maxLength - 最大长度
 * @returns {String} 处理后的字符串
 */
const truncateString = (str, maxLength) => {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
}

/**
 * 计算字符串的实际长度（中文字符计2，其他字符计1）
 * @param {String} str - 要计算的字符串
 * @returns {Number} 字符串长度
 */
const getStringLength = (str) => {
  if (!str) return 0
  let len = 0
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 127) {
      len += 2
    } else {
      len += 1
    }
  }
  return len
}

/**
 * 限制字符串长度（按中文2字符，英文1字符计算）
 * @param {String} str - 原始字符串
 * @param {Number} maxLen - 最大长度
 * @returns {String} 处理后的字符串
 */
const limitStringLength = (str, maxLen) => {
  if (!str) return ''
  let len = 0
  let result = ''
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const charLen = char.charCodeAt(0) > 127 ? 2 : 1
    if (len + charLen <= maxLen) {
      result += char
      len += charLen
    } else {
      break
    }
  }
  return result
}

/**
 * 验证日期格式是否为YYYY-MM-DD
 * @param {String} dateStr - 日期字符串
 * @returns {Boolean} 是否有效
 */
const isValidDate = (dateStr) => {
  if (!dateStr) return false
  
  // 检查格式
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr)) return false
  
  // 检查日期是否有效
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false
  
  // 检查月份和日期是否匹配
  const [year, month, day] = dateStr.split('-').map(Number)
  const reconstructedDate = new Date(year, month - 1, day)
  
  return reconstructedDate.getFullYear() === year &&
         reconstructedDate.getMonth() === month - 1 &&
         reconstructedDate.getDate() === day
}

/**
 * 验证表单数据
 * @param {Object} formData - 表单数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果 {valid: Boolean, errors: Array}
 */
const validateForm = (formData, rules) => {
  const errors = []
  
  for (const field in rules) {
    const value = formData[field]
    const fieldRules = rules[field]
    
    // 必填验证
    if (fieldRules.required && isEmpty(value)) {
      errors.push({
        field,
        message: fieldRules.message || `${field}不能为空`
      })
      continue
    }
    
    // 如果值为空且非必填，跳过后续验证
    if (isEmpty(value) && !fieldRules.required) {
      continue
    }
    
    // 最小长度验证
    if (fieldRules.minLength && value.length < fieldRules.minLength) {
      errors.push({
        field,
        message: fieldRules.minLengthMessage || `${field}长度不能小于${fieldRules.minLength}`
      })
    }
    
    // 最大长度验证
    if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
      errors.push({
        field,
        message: fieldRules.maxLengthMessage || `${field}长度不能超过${fieldRules.maxLength}`
      })
    }
    
    // 正则表达式验证
    if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors.push({
        field,
        message: fieldRules.patternMessage || `${field}格式不正确`
      })
    }
    
    // 自定义验证函数
    if (fieldRules.validator && typeof fieldRules.validator === 'function') {
      const validatorResult = fieldRules.validator(value, formData)
      if (validatorResult !== true) {
        errors.push({
          field,
          message: validatorResult || `${field}验证失败`
        })
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 显示表单错误提示
 * @param {Array} errors - 错误信息数组
 */
const showFormErrors = (errors) => {
  if (!errors || errors.length === 0) return
  
  // 只显示第一个错误
  wx.showToast({
    title: errors[0].message,
    icon: 'none',
    duration: 2000
  })
}

/**
 * 检查是否包含敏感词
 * @param {String} text - 要检查的文本
 * @param {Array} sensitiveWords - 敏感词数组
 * @returns {Boolean} 是否包含敏感词
 */
const containsSensitiveWords = (text, sensitiveWords) => {
  if (!text || !sensitiveWords || !sensitiveWords.length) return false
  
  const lowerText = text.toLowerCase()
  return sensitiveWords.some(word => lowerText.includes(word.toLowerCase()))
}

/**
 * 过滤敏感词
 * @param {String} text - 要过滤的文本
 * @param {Array} sensitiveWords - 敏感词数组
 * @param {String} [replacement='*'] - 替换字符
 * @returns {String} 过滤后的文本
 */
const filterSensitiveWords = (text, sensitiveWords, replacement = '*') => {
  if (!text || !sensitiveWords || !sensitiveWords.length) return text
  
  let filteredText = text
  sensitiveWords.forEach(word => {
    if (!word) return
    
    const regex = new RegExp(word, 'gi')
    filteredText = filteredText.replace(regex, match => {
      return replacement.repeat(match.length)
    })
  })
  
  return filteredText
}

/**
 * 检查标签是否有效
 * @param {String} tag - 标签文本
 * @param {Array} existingTags - 已存在的标签数组
 * @param {Number} [maxLength=20] - 最大长度
 * @returns {Object} 验证结果 {valid: Boolean, message: String}
 */
const validateTag = (tag, existingTags = [], maxLength = 20) => {
  if (isEmpty(tag)) {
    return { valid: false, message: '标签不能为空' }
  }
  
  if (getStringLength(tag) > maxLength) {
    return { valid: false, message: `标签长度不能超过${maxLength}个字符` }
  }
  
  if (existingTags.includes(tag)) {
    return { valid: false, message: '标签已存在' }
  }
  
  return { valid: true }
}

module.exports = {
  isEmpty,
  truncateString,
  getStringLength,
  limitStringLength,
  isValidDate,
  validateForm,
  showFormErrors,
  containsSensitiveWords,
  filterSensitiveWords,
  validateTag
} 