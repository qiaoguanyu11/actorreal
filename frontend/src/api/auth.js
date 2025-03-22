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
    console.error('Registration API error:', error.response?.data || error.message);
    throw error;
  }
};

// 用户登录
export const login = async (username, password) => {
  try {
    const response = await authApi.post('/api/v1/system/auth/login/json', {
      username,
      password
    });
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    message.success('登录成功！');
    return response.data;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await authApi.get('/system/auth/users/me');
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