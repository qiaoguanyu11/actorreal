/**
 * 全局Axios配置
 */
import axios from 'axios';

// 配置Axios全局默认值
axios.defaults.withCredentials = true; // 跨域请求携带cookie
axios.defaults.headers.common['Content-Type'] = 'application/json';

// 添加请求拦截器到Axios实例
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器到Axios实例
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response) {
      // 处理401错误
      if (error.response.status === 401) {
        console.error('收到401响应:', error.response.data);
        
        // 只有在非登录页面时才跳转
        if (!window.location.pathname.includes('/login')) {
          console.log('认证失败，跳转到登录页');
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axios; 