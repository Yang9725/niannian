/**
 * 微信云开发工具函数
 * 提供云存储、数据库操作等功能的封装
 */

// 云数据库集合名称
const COLLECTIONS = {
  PHOTOS: 'baby_photos'
}

/**
 * 上传单张图片到云存储
 * @param {String} filePath - 本地文件路径
 * @param {String} [cloudPath] - 云端文件路径，不传则自动生成
 * @returns {Promise<Object>} 上传结果，包含fileID等信息
 */
const uploadFile = async (filePath, cloudPath) => {
  try {
    // 如果没有指定云端路径，则自动生成一个
    if (!cloudPath) {
      const ext = filePath.match(/\.[^.]+?$/)[0] || '.jpg'
      cloudPath = `baby_photos/${Date.now()}_${Math.random().toString(36).substr(2, 6)}${ext}`
    }
    
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    })
    
    return result
  } catch (error) {
    console.error('上传文件失败:', error)
    throw error
  }
}

/**
 * 批量上传图片到云存储
 * @param {Array<String>} filePaths - 本地文件路径数组
 * @returns {Promise<Array>} 上传结果数组
 */
const uploadFiles = async (filePaths) => {
  try {
    const uploadTasks = filePaths.map(filePath => uploadFile(filePath))
    return await Promise.all(uploadTasks)
  } catch (error) {
    console.error('批量上传文件失败:', error)
    throw error
  }
}

/**
 * 从云存储删除文件
 * @param {String|Array<String>} fileIDs - 文件ID或ID数组
 * @returns {Promise<Object>} 删除结果
 */
const deleteFiles = async (fileIDs) => {
  try {
    const ids = Array.isArray(fileIDs) ? fileIDs : [fileIDs]
    if (ids.length === 0) return { fileList: [] }
    
    return await wx.cloud.deleteFile({
      fileList: ids
    })
  } catch (error) {
    console.error('删除文件失败:', error)
    throw error
  }
}

/**
 * 获取临时文件下载链接
 * @param {String} fileID - 文件ID
 * @param {Number} [maxAge=3600] - 链接有效期（秒）
 * @returns {Promise<String>} 临时文件链接
 */
const getTempFileURL = async (fileID, maxAge = 3600) => {
  try {
    const result = await wx.cloud.getTempFileURL({
      fileList: [{ fileID, maxAge }]
    })
    
    if (result.fileList && result.fileList[0]) {
      return result.fileList[0].tempFileURL
    }
    
    throw new Error('获取临时链接失败')
  } catch (error) {
    console.error('获取临时文件链接失败:', error)
    throw error
  }
}

/**
 * 添加照片记录到数据库
 * @param {Object} photoData - 照片数据对象
 * @returns {Promise<Object>} 添加结果
 */
const addPhoto = async (photoData) => {
  try {
    const db = wx.cloud.database()
    return await db.collection(COLLECTIONS.PHOTOS).add({
      data: {
        ...photoData,
        createdAt: db.serverDate()
      }
    })
  } catch (error) {
    console.error('添加照片记录失败:', error)
    throw error
  }
}

/**
 * 批量添加照片记录到数据库
 * @param {Array<Object>} photoDataList - 照片数据对象数组
 * @returns {Promise<Array>} 添加结果数组
 */
const addPhotos = async (photoDataList) => {
  try {
    const addTasks = photoDataList.map(photoData => addPhoto(photoData))
    return await Promise.all(addTasks)
  } catch (error) {
    console.error('批量添加照片记录失败:', error)
    throw error
  }
}

/**
 * 获取照片列表
 * @param {Object} [options] - 查询选项
 * @param {Number} [options.limit=50] - 返回数量限制
 * @param {String} [options.orderBy='createdAt'] - 排序字段
 * @param {String} [options.order='desc'] - 排序方向，'asc'或'desc'
 * @returns {Promise<Array>} 照片数据数组
 */
const getPhotos = async (options = {}) => {
  try {
    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = options
    const db = wx.cloud.database()
    
    const query = db.collection(COLLECTIONS.PHOTOS)
      .orderBy(orderBy, order)
      .limit(limit)
    
    const res = await query.get()
    return res.data
  } catch (error) {
    console.error('获取照片列表失败:', error)
    throw error
  }
}

/**
 * 根据日期获取照片
 * @param {String} date - 日期字符串，格式为YYYY-MM-DD
 * @returns {Promise<Array>} 照片数据数组
 */
const getPhotosByDate = async (date) => {
  try {
    const db = wx.cloud.database()
    const res = await db.collection(COLLECTIONS.PHOTOS)
      .where({ date })
      .orderBy('createdAt', 'desc')
      .get()
    
    return res.data
  } catch (error) {
    console.error(`获取${date}的照片失败:`, error)
    throw error
  }
}

/**
 * 根据标签获取照片
 * @param {String} tag - 标签名称
 * @param {Number} [limit=50] - 返回数量限制
 * @returns {Promise<Array>} 照片数据数组
 */
const getPhotosByTag = async (tag, limit = 50) => {
  try {
    const db = wx.cloud.database()
    const _ = db.command
    
    const res = await db.collection(COLLECTIONS.PHOTOS)
      .where({
        tags: _.all([tag])
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    
    return res.data
  } catch (error) {
    console.error(`获取标签为${tag}的照片失败:`, error)
    throw error
  }
}

/**
 * 根据ID删除照片记录
 * @param {String} id - 照片记录ID
 * @returns {Promise<Object>} 删除结果
 */
const deletePhoto = async (id) => {
  try {
    const db = wx.cloud.database()
    return await db.collection(COLLECTIONS.PHOTOS).doc(id).remove()
  } catch (error) {
    console.error('删除照片记录失败:', error)
    throw error
  }
}

/**
 * 根据日期删除照片记录
 * @param {String} date - 日期字符串，格式为YYYY-MM-DD
 * @returns {Promise<Object>} 删除结果
 */
const deletePhotosByDate = async (date) => {
  try {
    const db = wx.cloud.database()
    
    // 先获取该日期的所有照片记录
    const photos = await getPhotosByDate(date)
    
    // 提取所有文件ID
    const fileIDs = photos.map(photo => photo.url).filter(url => url)
    
    // 删除云存储中的文件
    if (fileIDs.length > 0) {
      await deleteFiles(fileIDs)
    }
    
    // 删除数据库记录
    return await db.collection(COLLECTIONS.PHOTOS).where({ date }).remove()
  } catch (error) {
    console.error(`删除${date}的照片失败:`, error)
    throw error
  }
}

/**
 * 更新照片记录
 * @param {String} id - 照片记录ID
 * @param {Object} data - 更新的数据
 * @returns {Promise<Object>} 更新结果
 */
const updatePhoto = async (id, data) => {
  try {
    const db = wx.cloud.database()
    return await db.collection(COLLECTIONS.PHOTOS).doc(id).update({
      data
    })
  } catch (error) {
    console.error('更新照片记录失败:', error)
    throw error
  }
}

/**
 * 获取所有标签及其使用次数
 * @returns {Promise<Array>} 标签数组，每项包含name和count
 */
const getAllTags = async () => {
  try {
    const db = wx.cloud.database()
    const _ = db.command
    const $ = _.aggregate
    
    const res = await db.collection(COLLECTIONS.PHOTOS)
      .aggregate()
      .unwind('$tags')
      .group({
        _id: '$tags',
        count: $.sum(1)
      })
      .sort({
        count: -1
      })
      .end()
    
    return res.list.map(item => ({
      name: item._id,
      count: item.count
    }))
  } catch (error) {
    console.error('获取所有标签失败:', error)
    throw error
  }
}

/**
 * 获取照片统计信息
 * @returns {Promise<Object>} 统计信息
 */
const getPhotoStats = async () => {
  try {
    const db = wx.cloud.database()
    const $ = db.command.aggregate
    
    // 获取总照片数
    const countResult = await db.collection(COLLECTIONS.PHOTOS).count()
    const total = countResult.total
    
    // 获取最早的照片日期
    const oldestResult = await db.collection(COLLECTIONS.PHOTOS)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
    
    const firstDate = oldestResult.data[0]?.createdAt || new Date()
    
    // 获取按月统计
    const monthlyStats = await db.collection(COLLECTIONS.PHOTOS)
      .aggregate()
      .addFields({
        yearMonth: $.dateToString({
          date: '$createdAt',
          format: '%Y-%m'
        })
      })
      .group({
        _id: '$yearMonth',
        count: $.sum(1)
      })
      .sort({
        _id: 1
      })
      .end()
    
    return {
      total,
      firstDate,
      monthly: monthlyStats.list
    }
  } catch (error) {
    console.error('获取照片统计信息失败:', error)
    throw error
  }
}

module.exports = {
  // 常量
  COLLECTIONS,
  
  // 云存储操作
  uploadFile,
  uploadFiles,
  deleteFiles,
  getTempFileURL,
  
  // 数据库操作
  addPhoto,
  addPhotos,
  getPhotos,
  getPhotosByDate,
  getPhotosByTag,
  deletePhoto,
  deletePhotosByDate,
  updatePhoto,
  
  // 统计和分析
  getAllTags,
  getPhotoStats
} 