// 环境配置
const isDevelopment = process.env.NODE_ENV === 'development';

// API配置
const config = {
  // 无论是开发环境还是生产环境，都使用本地后端API
  apiBaseUrl: '/api/v1',
  systemApiBaseUrl: '/api/v1/system',
  
  // 其他配置
  uploadMaxSize: 50 * 1024 * 1024, // 50MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
};

export default config; 