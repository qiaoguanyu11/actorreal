import axios from 'axios';

// 创建一个axios实例，用于API请求
const api = axios.create({
  baseURL: '/api/v1/system',
});

// 请求拦截器，添加Token到请求头
api.interceptors.request.use(
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

// 用户注册
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 用户登录
export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login/json', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取当前用户信息
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/users/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 创建经纪人账号（管理员）
export const createManager = async (userData) => {
  try {
    const response = await api.post('/auth/admin/create-manager', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 创建管理员账号（管理员）
export const createAdmin = async (userData) => {
  try {
    const response = await api.post('/auth/admin/create-admin', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取用户列表（管理员）
export const getUsers = async (params = {}) => {
  try {
    const response = await api.get('/auth/users', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取用户详情（管理员）
export const getUserDetail = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 更新用户信息（管理员）
export const updateUser = async (userId, userData) => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 删除用户（管理员）
export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 禁用用户（管理员）
export const banUser = async (userId) => {
  try {
    const response = await api.post(`/users/${userId}/ban`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 激活用户（管理员）
export const activateUser = async (userId) => {
  try {
    const response = await api.post(`/users/${userId}/activate`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取经纪人列表
export const getManagerList = async (params = {}) => {
  try {
    const response = await api.get('/auth/users', { 
      params: { 
        role: 'manager',
        ...params
      } 
    });
    return response.data;
  } catch (error) {
    console.error('获取经纪人列表失败:', error);
    throw error;
  }
}; 