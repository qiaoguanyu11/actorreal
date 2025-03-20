import axios from 'axios';
import { config } from '../config';
import { message } from 'antd';

// 创建axios实例
const authApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true  // 允许跨域请求携带凭证
});

// 请求拦截器
authApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token');
          window.location.href = '/login';
          message.error('未授权，请重新登录');
          break;
        case 403:
          // 权限不足
          console.error('权限不足');
          message.error('权限不足');
          break;
        case 422:
          // 数据验证错误
          console.error('数据验证错误:', error.response.data);
          message.error(error.response.data.detail || '输入数据有误');
          break;
        default:
          console.error('请求失败:', error.response.data);
          message.error(error.response.data?.detail || '请求失败');
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('服务器无响应');
      message.error('服务器无响应，请检查网络连接');
    } else {
      // 请求配置出错
      console.error('请求配置错误:', error.message);
      message.error('请求配置错误');
    }
    return Promise.reject(error);
  }
);

// 注册新用户
export const register = async (userData) => {
  try {
    const response = await authApi.post('/system/auth/register', {
      username: userData.username,
      email: userData.email,
      password: userData.password,
      invite_code: userData.invite_code,
      role: 'performer'  // 默认注册为演员角色
    });
    message.success('注册成功！');
    return response.data;
  } catch (error) {
    // 错误已经在响应拦截器中处理
    throw error;
  }
};

// 用户登录
export const login = async (username, password) => {
  try {
    const response = await authApi.post('/system/auth/login/json', {
      username,
      password
    });
    
    // 保存token到localStorage
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      message.success('登录成功！');
    }
    
    return response.data;
  } catch (error) {
    // 错误已经在响应拦截器中处理
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录');
    }

    const response = await authApi.get('/system/auth/users/me');
    return response.data;
  } catch (error) {
    // 错误已经在响应拦截器中处理
    throw error;
  }
};

// 退出登录
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  message.success('已退出登录');
}; 