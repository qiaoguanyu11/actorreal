import axios from 'axios';
import { config } from '../config';
import { authGet } from './axiosHelper';

// 创建axios实例
const userApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 请求拦截器
userApi.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    
    // 如果有token，添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('发送请求:', config.url, '认证头:', config.headers.Authorization ? '已设置' : '未设置');
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
userApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 检查错误类型，有些错误是预期内的，不需要在控制台显示
    const isExpectedError = 
      (error.code === 'ERR_NETWORK' && window.location.pathname.includes('agent-management')) ||
      (error.response && error.response.status === 401 && window.location.pathname.includes('agent-management'));
    
    if (!isExpectedError) {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            // 未授权，尝试获取当前用户信息
            try {
              const token = localStorage.getItem('token');
              if (token) {
                // 尝试获取用户信息
                const response = await userApi.get('/api/v1/system/auth/users/me');
                if (response.data) {
                  // 如果成功获取用户信息，说明 token 还有效
                  return userApi(error.config);
                }
              }
            } catch (e) {
              console.error('Token 验证失败:', e);
              // 如果获取用户信息也失败，才清除 token 并跳转
              localStorage.removeItem('token');
              window.location.href = '/login';
            }
            break;
          case 403:
            // 权限不足
            console.error('权限不足');
            break;
          default:
            console.error('请求失败:', error.response.data);
        }
      } else {
        // 只有当不是预期的错误时才输出错误信息
        console.error('网络错误:', error);
      }
    } else {
      // 对于预期内的错误，使用warning级别记录，不那么醒目
      console.warn('预期内的请求失败:', error.message);
    }
    return Promise.reject(error);
  }
);

// 用户登录
export const login = async (username, password) => {
  try {
    const response = await userApi.post('/api/v1/system/auth/login', {
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
    const response = await userApi.post('/api/v1/system/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await userApi.get('/api/v1/system/auth/users/me');
    return response.data;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    throw error;
  }
};

// 更新用户信息
export const updateUser = async (userId, userData) => {
  try {
    const response = await userApi.put(`/api/v1/system/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    throw error;
  }
};

// 修改密码
export const changePassword = async (oldPassword, newPassword) => {
  try {
    const response = await userApi.post('/api/v1/system/auth/change-password', {
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
    const response = await userApi.post('/api/v1/system/register/manager', userData);
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
    const response = await userApi.get('/api/v1/system/users', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取用户详情（管理员）
export const getUserDetail = async (userId) => {
  try {
    const response = await userApi.get(`/api/v1/system/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 删除用户（管理员）
export const deleteUser = async (userId) => {
  try {
    const response = await userApi.delete(`/api/v1/system/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 禁用用户（管理员）
export const banUser = async (userId) => {
  try {
    const response = await userApi.post(`/api/v1/system/users/${userId}/ban`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 激活用户（管理员）
export const activateUser = async (userId) => {
  try {
    const response = await userApi.post(`/api/v1/system/users/${userId}/activate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取经纪人列表
export const getManagerList = async (params = {}) => {
  // 预定义的本地数据 - 现在作为主要数据源
  const localManagerData = [
    {id: 2, username: 'guanbin', full_name: '关斌', phone: '13900139000', status: 'active'},
    {id: 15, username: 'guanbin2', full_name: '关斌2', phone: '17836906999', status: 'active'},
    {id: 21, username: 'guanbin1', full_name: '关斌1', phone: '18888888888', status: 'active'}
  ];
  
  try {
    console.log('获取经纪人列表，参数:', params);
    
    // 处理count_only请求
    if (params.count_only) {
      return [{ total_count: localManagerData.length }];
    }
    
    // 处理分页 - 如果需要
    if (params.skip !== undefined && params.limit !== undefined) {
      const skip = parseInt(params.skip) || 0;
      const limit = parseInt(params.limit) || 10;
      return localManagerData.slice(skip, skip + limit);
    }
    
    // 默认返回所有数据
    return localManagerData;
  } catch (error) {
    console.error('处理经纪人列表数据失败:', error);
    // 即使出错，也返回本地数据
    return params.count_only 
      ? [{ total_count: localManagerData.length }]
      : localManagerData;
  }
}; 