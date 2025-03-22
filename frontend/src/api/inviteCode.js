import axios from 'axios';
import { config } from '../config';
import { message } from 'antd';

// 创建axios实例
const inviteCodeApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// 请求拦截器
inviteCodeApi.interceptors.request.use(
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
inviteCodeApi.interceptors.response.use(
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

// 获取邀请码列表
export const getInviteCodes = async () => {
  try {
    const response = await inviteCodeApi.get('/api/v1/invite-codes/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 创建邀请码
export const createInviteCode = async () => {
  try {
    const response = await inviteCodeApi.post('/api/v1/invite-codes/');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 验证邀请码
export const validateInviteCode = async (code) => {
  try {
    const response = await inviteCodeApi.get(`/api/v1/invite-codes/verify/${code}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 更新邀请码
export const updateInviteCode = async (codeId, data) => {
  try {
    const response = await inviteCodeApi.put(`/api/v1/invite-codes/${codeId}`, data);
    message.success('更新邀请码成功！');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 删除邀请码
export const deleteInviteCode = async (codeId) => {
  try {
    await inviteCodeApi.delete(`/api/v1/invite-codes/${codeId}`);
    message.success('删除邀请码成功！');
  } catch (error) {
    throw error;
  }
}; 