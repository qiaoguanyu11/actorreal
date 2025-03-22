// 环境配置
const env = process.env.NODE_ENV || 'development';

// 基础配置
const config = {
  // API基础URL
  apiBaseUrl: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8002',  // 在开发时使用绝对URL，避免proxy问题
  systemApiBaseUrl: '/api/v1/system',
  
  // 媒体文件配置
  maxUploadSize: 50 * 1024 * 1024, // 50MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/quicktime'],
  
  // 分页配置
  defaultPageSize: 10,
  
  // 上传文件路径
  uploadPath: '/media/uploads',
  
  // 开发环境特定配置
  development: {
    apiBaseUrl: 'http://localhost:8002',  // 使用绝对路径
    systemApiBaseUrl: '/api/v1/system',
  },
  
  // 生产环境特定配置
  production: {
    apiBaseUrl: '',  // 使用相对路径
    systemApiBaseUrl: '/api/v1/system',
  }
};

// 根据环境合并配置
const envConfig = config[env] || {};
const finalConfig = { ...config, ...envConfig };

export { finalConfig as config }; 