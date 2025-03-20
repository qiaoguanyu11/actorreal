import axios from 'axios';
import { config } from '../config';

// 创建axios实例
const userApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
userApi.interceptors.request.use(
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
userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token并跳转到登录页
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          // 权限不足
          console.error('权限不足');
          break;
        default:
          console.error('请求失败:', error.response.data);
      }
    } else {
      console.error('网络错误:', error);
    }
    return Promise.reject(error);
  }
);

// 用户登录
export const login = async (username, password) => {
  try {
    const response = await userApi.post('/auth/login', {
      username,
      password
    });
    return response.data;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

// 用户注册
export const register = async (userData) => {
  try {
    const response = await userApi.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await userApi.get('/auth/users/me');
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};

// 更新用户信息
export const updateUser = async (userId, userData) => {
  try {
    const response = await userApi.put(`/auth/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    throw error;
  }
};

// 修改密码
export const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await userApi.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error) {
    console.error('修改密码失败:', error);
    throw error;
  }
};

// 创建经纪人账号（管理员）
export const createManager = async (userData) => {
  try {
    const response = await userApi.post('/auth/admin/create-manager', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 创建管理员账号（管理员）
export const createAdmin = async (userData) => {
  try {
    const response = await userApi.post('/auth/admin/create-admin', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取用户列表（管理员）
export const getUsers = async (params = {}) => {
  try {
    const response = await userApi.get('/auth/users', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取用户详情（管理员）
export const getUserDetail = async (userId) => {
  try {
    const response = await userApi.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 删除用户（管理员）
export const deleteUser = async (userId) => {
  try {
    const response = await userApi.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 禁用用户（管理员）
export const banUser = async (userId) => {
  try {
    const response = await userApi.post(`/users/${userId}/ban`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 激活用户（管理员）
export const activateUser = async (userId) => {
  try {
    const response = await userApi.post(`/users/${userId}/activate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取经纪人列表
export const getManagerList = async (params = {}) => {
  try {
    console.log('获取经纪人列表，参数:', params);
    
    // 如果是count_only请求，使用不同的接口
    if (params.count_only) {
      // 使用普通请求，手动计算总数
      const allParams = { ...params };
      delete allParams.count_only; // 移除count_only参数
      
      const response = await userApi.get('/auth/users', { 
        params: { 
          role: 'manager',
          ...allParams
        } 
      });
      
      // 手动构造总数响应
      const total = response.data ? response.data.length : 0;
      console.log('经纪人总数:', total);
      return [{ total_count: total }];
    }
    
    // 正常请求
    const response = await userApi.get('/auth/users', { 
      params: { 
        role: 'manager',
        ...params
      } 
    });
    console.log('获取经纪人列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取经纪人列表失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // 返回空数组而不是抛出错误，避免UI崩溃
    return [];
  }
}; 