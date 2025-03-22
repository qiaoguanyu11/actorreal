import axios from 'axios';
import { config } from '../config';
import { message } from 'antd';
import { objectToFormData } from '../utils/apiUtils';

// 创建axios实例
const authApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
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
    if (error.response?.status === 401) {
      // 清除本地token
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// 注册新用户
export const register = async (userData) => {
  try {
    const response = await authApi.post('/api/v1/system/register/performer', {
      username: userData.username,
      phone: userData.phone,
      password: userData.password,
      invite_code: userData.invite_code,
      role: 'performer'  // 默认注册为演员角色
    });
    message.success('注册成功！');
    return response.data;
  } catch (error) {
    console.error('Registration API error:', error.response?.data || error.message);
    throw error;
  }
};

// 用户登录
export const login = async (username, password) => {
  try {
    // 使用objectToFormData转换数据
    const formData = objectToFormData({
      username,
      password
    });
    
    const response = await authApi.post('/api/v1/system/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    message.success('登录成功！');
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    console.error('Login API error:', typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await authApi.get('/api/v1/system/auth/users/me');
    return response.data;
  } catch (error) {
    console.error('Get current user API error:', error.response?.data || error.message);
    throw error;
  }
};

// 退出登录
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  message.success('已退出登录');
}; 