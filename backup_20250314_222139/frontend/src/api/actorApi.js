import axios from 'axios';

// 创建一个axios实例，用于API请求
const api = axios.create({
  baseURL: '/api/v1',
});

// 请求拦截器，添加Token到请求头
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 确保对self-media的请求始终带有认证信息
    if (config.url && (
        config.url.includes('/self-media') || 
        config.url.includes('/self-update') ||
        config.url.includes('/actors/self') ||
        config.url.includes('/actor/self')
      )) {
      console.log('发送认证请求到:', config.url);
      if (!config.headers.Authorization && token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 确保后续重定向请求也带有认证信息
      config.maxRedirects = 5;
      config.withCredentials = true;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理401/403错误
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 只有特定的API调用出现401错误时才重定向，避免过度处理
    if (error.response && 
        error.response.status === 401 && 
        error.config.url === '/system/auth/users/me') {
      console.log('用户认证已失效，重定向到登录页面');
      // 清除令牌
      localStorage.removeItem('token');
      // 重定向到登录页
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 获取演员列表
export const getActors = async (params = {}) => {
  try {
    const response = await api.get('/actors/basic/', { params });
    return response.data;
  } catch (error) {
    console.error('获取演员列表失败:', error);
    throw error;
  }
};

// 获取演员详情
export const getActorDetail = async (actorId) => {
  try {
    const response = await api.get(`/actors/basic/${actorId}/`);
    return response.data;
  } catch (error) {
    console.error(`获取演员详情失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 创建演员
export const createActor = async (actorData) => {
  try {
    console.log('创建演员，提交数据:', actorData);
    const response = await api.post('/actors/basic/', actorData);
    console.log('创建演员成功，返回数据:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建演员失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// 更新演员基本信息
export const updateActorBasicInfo = async (actorId, actorData) => {
  try {
    const response = await api.put(`/actors/basic/${actorId}/basic-info`, actorData);
    return response.data;
  } catch (error) {
    console.error(`更新演员基本信息失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 更新演员专业信息
export const updateActorProfessionalInfo = async (actorId, data) => {
  try {
    const response = await api.put(`/actors/basic/${actorId}/professional`, data);
    return response.data;
  } catch (error) {
    console.error(`更新演员专业信息失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 更新演员联系信息
export const updateActorContactInfo = async (actorId, data) => {
  try {
    const response = await api.put(`/actors/basic/${actorId}/contact`, data);
    return response.data;
  } catch (error) {
    console.error(`更新演员联系信息失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 获取演员媒体列表
export const getActorMedia = async (actorId) => {
  try {
    const response = await api.get(`/actors/media/${actorId}/media`);
    return response.data;
  } catch (error) {
    console.error(`获取演员媒体失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 删除演员媒体
export const deleteActorMedia = async (actorId, mediaId) => {
  try {
    const response = await api.delete(`/actors/media/${actorId}/media/${mediaId}`);
    return response.data;
  } catch (error) {
    console.error(`删除媒体失败 (ID: ${mediaId}):`, error);
    throw error;
  }
};

// 获取无经纪人的演员列表
export const getActorsWithoutAgent = async (params = {}) => {
  try {
    const response = await api.get('/actors/basic/without-agent/', { params });
    return response.data;
  } catch (error) {
    console.error('获取无经纪人演员列表失败:', error);
    throw error;
  }
};

// 将演员归属于经纪人
export const assignActorToAgent = async (actorId, agentId) => {
  try {
    const response = await api.post('/actors/agent/assign-agent', {
      actor_id: actorId,
      agent_id: agentId
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 获取经纪人旗下的演员
export const getAgentActors = async (agentId) => {
  try {
    const response = await api.get(`/actors/agent/${agentId}/actors`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// 解除演员与经纪人的关联
export const removeActorAgent = async (actorId) => {
  try {
    const response = await api.delete(`/actors/agent/actor/${actorId}/agent`);
    return response.data;
  } catch (error) {
    console.error(`解除演员经纪人关联失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 删除演员
export const deleteActor = async (actorId) => {
  try {
    await api.delete(`/actors/basic/${actorId}/`);
  } catch (error) {
    console.error(`删除演员失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 获取当前登录用户的演员资料
export const getMyActorProfile = async () => {
  try {
    // 先获取当前用户信息
    const userResponse = await api.get('/system/auth/users/me');
    const userId = userResponse.data.id;
    
    // 使用用户ID查询关联的演员信息
    const actorsResponse = await api.get('/actors/basic/', {
      params: { user_id: userId }
    });
    
    // 如果找到演员数据
    if (actorsResponse.data && actorsResponse.data.length > 0) {
      return actorsResponse.data[0]; // 返回第一个匹配的演员信息
    }
    
    return null; // 如果没有找到演员数据
  } catch (error) {
    console.error('获取当前用户演员资料失败:', error);
    throw error;
  }
};

// 演员自行更新个人信息
export const updateSelfActorInfo = async (actorData) => {
  try {
    const response = await api.post('/actors/basic/self-update', actorData);
    return response.data;
  } catch (error) {
    console.error(`演员自行更新信息失败:`, error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// 演员自行上传头像
export const uploadSelfAvatar = async (formData) => {
  try {
    // 根据后端路径调整
    const response = await api.post('/actors/self-media/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传头像失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

// 演员自行上传照片
export const uploadSelfPhotos = async (formData) => {
  try {
    // 根据后端路径调整
    const response = await api.post('/actors/self-media/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传照片失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

// 演员自行上传视频
export const uploadSelfVideos = async (formData) => {
  try {
    // 根据后端路径调整
    const response = await api.post('/actors/self-media/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传视频失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
};

// 获取演员自己的媒体列表
export const getSelfMedia = async (params = {}) => {
  try {
    console.log('正在获取个人媒体列表，参数:', params);
    // 确保URL以/结尾，防止重定向问题
    const token = localStorage.getItem('token');
    const response = await api.get('/actors/self-media/', { 
      params,
      headers: { 
        Authorization: `Bearer ${token}` 
      },
      // 允许重定向
      maxRedirects: 5,
      withCredentials: true
    });
    console.log('获取个人媒体列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取个人媒体列表失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    
    // 如果是401错误，提示用户重新登录
    if (error.response?.status === 401) {
      console.error('认证失败，可能需要重新登录');
    }
    
    throw error;
  }
};

// 删除演员自己的媒体
export const deleteSelfMedia = async (mediaId) => {
  try {
    // 修改API路径，移除多余的media部分
    const response = await api.delete(`/actors/self-media/${mediaId}`);
    return response.data;
  } catch (error) {
    console.error(`删除媒体失败 (ID: ${mediaId}):`, error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url
    });
    throw error;
  }
}; 