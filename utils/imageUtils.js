/**
 * 图片处理工具函数
 * 提供图片压缩、预览、保存等功能
 */

/**
 * 预览图片
 * @param {String|Array} urls - 图片URL或URL数组
 * @param {String} [current] - 当前显示图片的URL
 */
const previewImages = (urls, current) => {
  const imageUrls = Array.isArray(urls) ? urls : [urls]
  const currentUrl = current || imageUrls[0]
  
  wx.previewImage({
    current: currentUrl,
    urls: imageUrls
  })
}

/**
 * 保存图片到相册
 * @param {String} url - 图片URL
 * @returns {Promise<Boolean>} 是否保存成功
 */
const saveImageToAlbum = async (url) => {
  try {
    // 检查保存到相册的权限
    const settingRes = await wx.getSetting()
    if (!settingRes.authSetting['scope.writePhotosAlbum']) {
      await wx.authorize({ scope: 'scope.writePhotosAlbum' })
    }
    
    // 下载图片
    const downloadRes = await wx.downloadFile({
      url: url.startsWith('cloud://') ? 
        (await wx.cloud.getTempFileURL({ fileList: [url] })).fileList[0].tempFileURL : 
        url
    })
    
    // 保存到相册
    await wx.saveImageToPhotosAlbum({
      filePath: downloadRes.tempFilePath
    })
    
    wx.showToast({ title: '保存成功', icon: 'success' })
    return true
  } catch (error) {
    console.error('保存图片失败:', error)
    
    // 处理用户拒绝授权的情况
    if (error.errMsg && error.errMsg.includes('auth deny')) {
      wx.showModal({
        title: '提示',
        content: '需要您授权保存图片到相册',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting()
          }
        }
      })
    } else {
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
    
    return false
  }
}

/**
 * 压缩图片
 * @param {String} src - 图片路径
 * @param {Number} [quality=80] - 压缩质量，0-100
 * @param {Number} [maxWidth=1280] - 最大宽度
 * @param {Number} [maxHeight=1280] - 最大高度
 * @returns {Promise<String>} 压缩后的图片路径
 */
const compressImage = async (src, quality = 80, maxWidth = 1280, maxHeight = 1280) => {
  try {
    // 获取图片信息
    const imageInfo = await wx.getImageInfo({
      src
    })
    
    // 计算压缩后的尺寸
    let width = imageInfo.width
    let height = imageInfo.height
    
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
    }
    
    // 创建画布并绘制图片
    const canvas = wx.createOffscreenCanvas({
      width,
      height
    })
    const ctx = canvas.getContext('2d')
    
    // 加载图片
    const image = canvas.createImage()
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = src
    })
    
    // 绘制图片
    ctx.drawImage(image, 0, 0, width, height)
    
    // 导出图片
    const result = await canvas.toDataURL({
      format: 'jpg',
      quality: quality / 100
    })
    
    return result
  } catch (error) {
    console.error('压缩图片失败:', error)
    throw error
  }
}

/**
 * 生成分享图片
 * @param {Object} options - 配置选项
 * @param {String} options.imageUrl - 照片URL
 * @param {String} options.title - 标题
 * @param {String} [options.desc] - 描述
 * @param {String} [options.date] - 日期
 * @returns {Promise<String>} 生成的图片路径
 */
const generateShareImage = async (options) => {
  try {
    const { imageUrl, title, desc, date } = options
    
    // 下载原图
    const imageRes = await wx.downloadFile({
      url: imageUrl.startsWith('cloud://') ? 
        (await wx.cloud.getTempFileURL({ fileList: [imageUrl] })).fileList[0].tempFileURL : 
        imageUrl
    })
    
    // 获取图片信息
    const imageInfo = await wx.getImageInfo({
      src: imageRes.tempFilePath
    })
    
    // 创建画布
    const canvasId = 'shareCanvas'
    const canvas = wx.createCanvasContext(canvasId)
    
    // 画布尺寸
    const canvasWidth = 750
    const canvasHeight = 1000
    
    // 绘制背景
    canvas.setFillStyle('#FFFFFF')
    canvas.fillRect(0, 0, canvasWidth, canvasHeight)
    
    // 绘制顶部渐变条
    const grd = canvas.createLinearGradient(0, 0, canvasWidth, 0)
    grd.addColorStop(0, '#FF7BAC')
    grd.addColorStop(1, '#8BD3E6')
    canvas.setFillStyle(grd)
    canvas.fillRect(0, 0, canvasWidth, 10)
    
    // 绘制标题
    canvas.setFillStyle('#333333')
    canvas.setFontSize(36)
    canvas.setTextAlign('center')
    canvas.fillText(title, canvasWidth / 2, 70)
    
    // 绘制日期
    if (date) {
      canvas.setFillStyle('#666666')
      canvas.setFontSize(28)
      canvas.setTextAlign('center')
      canvas.fillText(date, canvasWidth / 2, 120)
    }
    
    // 计算图片绘制尺寸
    let drawWidth, drawHeight, drawX, drawY
    const maxImageWidth = canvasWidth - 80
    const maxImageHeight = 600
    
    const imageRatio = imageInfo.width / imageInfo.height
    
    if (imageRatio > maxImageWidth / maxImageHeight) {
      // 宽度优先
      drawWidth = maxImageWidth
      drawHeight = drawWidth / imageRatio
    } else {
      // 高度优先
      drawHeight = maxImageHeight
      drawWidth = drawHeight * imageRatio
    }
    
    drawX = (canvasWidth - drawWidth) / 2
    drawY = 160
    
    // 绘制图片
    canvas.drawImage(imageRes.tempFilePath, drawX, drawY, drawWidth, drawHeight)
    
    // 绘制描述
    if (desc) {
      canvas.setFillStyle('#333333')
      canvas.setFontSize(28)
      canvas.setTextAlign('left')
      
      // 文本换行处理
      const maxTextWidth = canvasWidth - 100
      const textY = drawY + drawHeight + 80
      const textLines = splitTextIntoLines(desc, maxTextWidth, canvas)
      
      textLines.forEach((line, index) => {
        canvas.fillText(line, 50, textY + index * 40)
      })
    }
    
    // 绘制底部水印
    canvas.setFillStyle('#999999')
    canvas.setFontSize(24)
    canvas.setTextAlign('center')
    canvas.fillText('年年囿钱 - 宝宝相册', canvasWidth / 2, canvasHeight - 40)
    
    // 渲染画布并生成临时文件
    return new Promise((resolve, reject) => {
      canvas.draw(false, () => {
        wx.canvasToTempFilePath({
          canvasId,
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          destWidth: canvasWidth * 2, // 2倍分辨率
          destHeight: canvasHeight * 2,
          fileType: 'jpg',
          quality: 0.8,
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: (err) => {
            console.error('生成分享图片失败:', err)
            reject(err)
          }
        })
      })
    })
  } catch (error) {
    console.error('生成分享图片失败:', error)
    throw error
  }
}

/**
 * 将文本分割成多行
 * @param {String} text - 要分割的文本
 * @param {Number} maxWidth - 最大宽度
 * @param {Object} canvas - 画布上下文
 * @returns {Array<String>} 分割后的文本行
 */
const splitTextIntoLines = (text, maxWidth, canvas) => {
  const lines = []
  let line = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const testLine = line + char
    const metrics = canvas.measureText(testLine)
    const testWidth = metrics.width
    
    if (testWidth > maxWidth && i > 0) {
      lines.push(line)
      line = char
    } else {
      line = testLine
    }
  }
  
  if (line) {
    lines.push(line)
  }
  
  return lines
}

/**
 * 获取图片信息
 * @param {String} src - 图片路径
 * @returns {Promise<Object>} 图片信息
 */
const getImageInfo = async (src) => {
  try {
    // 如果是云存储路径，先获取临时URL
    const url = src.startsWith('cloud://') ? 
      (await wx.cloud.getTempFileURL({ fileList: [src] })).fileList[0].tempFileURL : 
      src
    
    return await wx.getImageInfo({ src: url })
  } catch (error) {
    console.error('获取图片信息失败:', error)
    throw error
  }
}

module.exports = {
  previewImages,
  saveImageToAlbum,
  compressImage,
  generateShareImage
} 