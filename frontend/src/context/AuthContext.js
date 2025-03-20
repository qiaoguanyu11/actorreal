import React, { createContext, useState, useContext, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';
import { config } from '../config';

// 创建认证上下文
export const AuthContext = createContext(null);

// 创建axios实例
const authApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
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
          break;
        case 403:
          // 权限不足
          console.error('权限不足');
          message.error('权限不足');
          break;
        default:
          console.error('请求失败:', error.response.data);
          message.error(error.response?.data?.detail || '请求失败');
      }
    } else {
      console.error('网络错误:', error);
      message.error('网络错误');
    }
    return Promise.reject(error);
  }
);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 检查用户认证状态
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authApi.get('/system/auth/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('获取用户信息失败:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // 登录方法
  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await authApi.post('/system/auth/login/json', {
        username,
        password
      });
      
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      setUser(user);
      setError(null);
      message.success('登录成功');
      return true;
    } catch (error) {
      setError(error.response?.data?.detail || '登录失败，请检查用户名和密码');
      message.error(error.response?.data?.detail || '登录失败，请检查用户名和密码');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 注册方法
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authApi.post('/system/auth/register', userData);
      setError(null);
      message.success('注册成功，请登录');
      return true;
    } catch (error) {
      setError(error.response?.data?.detail || '注册失败，请稍后再试');
      message.error(error.response?.data?.detail || '注册失败，请稍后再试');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    message.success('已退出登录');
  };

  // 更新用户信息
  const updateUserInfo = async (userId, userData) => {
    try {
      setLoading(true);
      const response = await authApi.put(`/system/auth/users/${userId}`, userData);
      setUser(response.data);
      setError(null);
      message.success('更新用户信息成功');
      return response.data;
    } catch (error) {
      setError(error.response?.data?.detail || '更新用户信息失败');
      message.error(error.response?.data?.detail || '更新用户信息失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 判断用户权限
  const hasPermission = (permission) => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        updateUserInfo,
        hasPermission,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'manager' || user?.role === 'admin',
        isPerformer: user?.role === 'performer' || user?.role === 'manager' || user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 自定义Hook用于访问认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 