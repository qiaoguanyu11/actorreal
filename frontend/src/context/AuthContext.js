import React, { createContext, useState, useEffect } from 'react';
import { message } from 'antd';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 检查本地存储中是否有令牌
    const token = localStorage.getItem('token');
    if (token) {
      // 使用令牌获取用户信息
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // 使用api实例而不是直接使用axios，确保一致的baseURL
      const response = await axios.get('/api/v1/system/auth/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

  const login = async (username, password) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/v1/system/auth/login/json', {
        username,
        password
      });

      const { access_token, user } = response.data;
      
      // 保存令牌
      localStorage.setItem('token', access_token);
      
      // 设置用户信息
      setUser(user);
      setError(null);
      setLoading(false);
      
      message.success('登录成功');
      return true;
    } catch (error) {
      setError(error.response?.data?.detail || '登录失败，请检查用户名和密码');
      setLoading(false);
      message.error(error.response?.data?.detail || '登录失败，请检查用户名和密码');
      return false;
    }
  };

  // 访客登录功能
  const guestLogin = async () => {
    try {
      setLoading(true);
      
      // 创建一个访客用户对象
      const guestUser = {
        id: 'guest',
        username: '访客',
        role: 'guest',
        status: 'active',
        permissions: []
      };
      
      // 设置用户信息为访客
      setUser(guestUser);
      setError(null);
      setLoading(false);
      
      message.success('您已以访客身份登录');
      return true;
    } catch (error) {
      setError('访客登录失败');
      setLoading(false);
      message.error('访客登录失败');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      await axios.post('/api/v1/system/auth/register', userData);
      setError(null);
      setLoading(false);
      message.success('注册成功，请登录');
      return true;
    } catch (error) {
      setError(error.response?.data?.detail || '注册失败，请稍后再试');
      setLoading(false);
      message.error(error.response?.data?.detail || '注册失败，请稍后再试');
      return false;
    }
  };

  const logout = () => {
    // 清除令牌
    localStorage.removeItem('token');
    // 清除用户信息
    setUser(null);
    message.success('已退出登录');
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.some(p => p.permission === permission);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error,
      login,
      register,
      logout,
      guestLogin,
      hasPermission,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'manager' || user?.role === 'admin',
      isPerformer: user?.role === 'performer' || user?.role === 'manager' || user?.role === 'admin',
      isGuest: user?.role === 'guest',
      fetchUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 