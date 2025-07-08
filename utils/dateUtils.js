/**
 * 日期工具函数
 * 提供日期格式化、比较、相对时间等功能
 */

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date|String|Number} date - 日期对象、时间戳或日期字符串
 * @returns {String} 格式化后的日期字符串
 */
const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '无效日期'
  
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0')
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:MM:SS 格式
 * @param {Date|String|Number} dateTime - 日期对象、时间戳或日期字符串
 * @returns {String} 格式化后的日期时间字符串
 */
const formatDateTime = (dateTime) => {
  if (!dateTime) return '未知时间'
  
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime)
  if (isNaN(date.getTime())) return '无效时间'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化为相对时间（如：今天、昨天、3天前等）
 * @param {Date|String|Number} dateTime - 日期对象、时间戳或日期字符串
 * @returns {String} 相对时间字符串
 */
const formatRelativeTime = (dateTime) => {
  const now = new Date()
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime)
  if (isNaN(date.getTime())) return '无效时间'
  
  const diffTime = now - date
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    // 今天，显示小时和分钟
    const hours = date.getHours()
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `今天 ${hours}:${minutes}`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}个月前`
  } else {
    return `${Math.floor(diffDays / 365)}年前`
  }
}

/**
 * 创建合并日期时间
 * 将日期部分和当前时间的时分秒部分合并
 * @param {String} dateStr - 日期字符串，格式为 YYYY-MM-DD
 * @returns {Date} 合并后的日期时间对象
 */
const createMergedDateTime = (dateStr) => {
  const now = new Date()
  const [year, month, day] = dateStr.split('-')
  
  return new Date(
    parseInt(year), 
    parseInt(month) - 1, 
    parseInt(day), 
    now.getHours(), 
    now.getMinutes(), 
    now.getSeconds()
  )
}

/**
 * 获取当前日期的字符串，格式为 YYYY-MM-DD
 * @returns {String} 当前日期字符串
 */
const getTodayString = () => {
  return formatDate(new Date())
}

/**
 * 比较两个日期是否为同一天
 * @param {Date|String|Number} date1 - 第一个日期
 * @param {Date|String|Number} date2 - 第二个日期
 * @returns {Boolean} 是否为同一天
 */
const isSameDay = (date1, date2) => {
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

/**
 * 获取指定日期所在月份的第一天
 * @param {Date|String|Number} date - 日期对象、时间戳或日期字符串
 * @returns {Date} 月份第一天的日期对象
 */
const getFirstDayOfMonth = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * 获取指定日期所在月份的最后一天
 * @param {Date|String|Number} date - 日期对象、时间戳或日期字符串
 * @returns {Date} 月份最后一天的日期对象
 */
const getLastDayOfMonth = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/**
 * 计算两个日期之间相差的天数
 * @param {Date|String|Number} date1 - 第一个日期
 * @param {Date|String|Number} date2 - 第二个日期
 * @returns {Number} 相差的天数
 */
const getDaysDiff = (date1, date2) => {
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  
  // 转换为UTC时间戳并计算差值（毫秒）
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate())
  
  // 计算天数差（毫秒转天）
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24))
}

/**
 * 获取指定日期的年龄（岁月天）
 * @param {Date|String|Number} birthDate - 出生日期
 * @param {Date|String|Number} [currentDate=new Date()] - 当前日期，默认为今天
 * @returns {Object} 包含年、月、日的对象
 */
const getAge = (birthDate, currentDate = new Date()) => {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate)
  const current = currentDate instanceof Date ? currentDate : new Date(currentDate)
  
  let years = current.getFullYear() - birth.getFullYear()
  let months = current.getMonth() - birth.getMonth()
  let days = current.getDate() - birth.getDate()
  
  // 调整月份和天数
  if (days < 0) {
    months--
    // 获取上个月的天数
    const lastMonth = new Date(current.getFullYear(), current.getMonth(), 0)
    days += lastMonth.getDate()
  }
  
  if (months < 0) {
    years--
    months += 12
  }
  
  return { years, months, days }
}

/**
 * 格式化年龄为友好字符串
 * @param {Object} age - 包含年、月、日的对象
 * @returns {String} 格式化后的年龄字符串
 */
const formatAge = (age) => {
  const { years, months, days } = age
  
  if (years > 0) {
    return `${years}岁${months > 0 ? months + '个月' : ''}`
  } else if (months > 0) {
    return `${months}个月${days > 0 ? days + '天' : ''}`
  } else {
    return `${days}天`
  }
}

module.exports = {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  createMergedDateTime,
  getTodayString,
  isSameDay,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getDaysDiff,
  getAge,
  formatAge
} 