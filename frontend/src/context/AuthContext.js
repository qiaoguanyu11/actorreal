import React, { createContext, useState, useContext, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';
import { config } from '../config';
import { objectToFormData } from '../utils/apiUtils';

// 创建认证上下文
export const AuthContext = createContext(null);

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
  async (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，尝试获取当前用户信息
          try {
            const token = localStorage.getItem('token');
            if (token) {
              // 尝试获取用户信息
              const response = await authApi.get('/api/v1/system/auth/users/me');
              if (response.data) {
                // 如果成功获取用户信息，说明 token 还有效
                return authApi(error.config);
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
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await authApi.get('/api/v1/system/auth/users/me');
        setUser(response.data);
        setLoading(false);
      } catch (error) {
        console.error('获取用户资料失败:', error);
        
        // 判断错误类型
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // 认证失败，清除token并退出登录
          console.log('认证失败，执行登出流程');
          logout();
        } else if (error.response && error.response.status === 500) {
          // 服务器错误，尝试再次获取用户信息
          console.log('服务器错误，尝试重新获取用户信息');
          setTimeout(() => {
            fetchUserProfile();
          }, 2000); // 2秒后重试
          return;
        }
        
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // 登录方法
  const login = async (username, password) => {
    try {
      setLoading(true);
      
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
      setUser(user);
      setError(null);
      message.success('登录成功');
      return true;
    } catch (error) {
      const errorMsg = error.response?.data?.detail || '登录失败，请检查用户名和密码';
      setError(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      message.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 注册方法
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authApi.post('/api/v1/system/auth/register', userData);
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
      const response = await authApi.put(`/api/v1/system/auth/users/${userId}`, userData);
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