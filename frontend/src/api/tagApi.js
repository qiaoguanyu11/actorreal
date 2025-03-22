import axios from 'axios';
import { config } from '../config';

// 创建axios实例
const tagApi = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
tagApi.interceptors.request.use(
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
tagApi.interceptors.response.use(
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

// 获取所有标签
export const getAllTags = async () => {
  try {
    const response = await tagApi.get('/api/v1/actors/tags');
    return response.data;
  } catch (error) {
    console.error('获取标签列表失败:', error);
    throw error;
  }
};

// 为了向后兼容，提供getTags作为getAllTags的别名
export const getTags = getAllTags;

// 创建新标签
export const createTag = async (tagData) => {
  try {
    const response = await tagApi.post('/api/v1/actors/tags', tagData);
    return response.data;
  } catch (error) {
    console.error('创建标签失败:', error);
    throw error;
  }
};

// 更新标签
export const updateTag = async (tagId, tagData) => {
  try {
    const response = await tagApi.put(`/api/v1/actors/tags/${tagId}`, tagData);
    return response.data;
  } catch (error) {
    console.error('更新标签失败:', error);
    throw error;
  }
};

// 删除标签
export const deleteTag = async (tagId) => {
  try {
    await tagApi.delete(`/api/v1/actors/tags/${tagId}`);
  } catch (error) {
    console.error('删除标签失败:', error);
    throw error;
  }
};

// 获取演员的标签
export const getActorTags = async (actorId) => {
  try {
    console.log(`API: 获取演员 ${actorId} 的标签`);
    const response = await tagApi.get(`/api/v1/actors/tags/${actorId}/tags`);
    console.log(`API: 获取到演员 ${actorId} 的标签数据:`, response.data);
    
    // 确保返回的是数组
    if (response.data && !Array.isArray(response.data)) {
      if (response.data.tags && Array.isArray(response.data.tags)) {
        return response.data.tags;
      }
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error(`获取演员标签失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 更新演员的标签（替换所有标签）
export const updateActorTags = async (actorId, tagIds) => {
  try {
    const response = await tagApi.put(`/api/v1/actors/tags/${actorId}/tags`, { tags: tagIds });
    return response.data;
  } catch (error) {
    console.error(`更新演员标签失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 添加演员标签
export const addActorTags = async (actorId, tagIds) => {
  try {
    const queryString = tagIds.map(id => `tag_ids=${id}`).join('&');
    const response = await tagApi.post(`/api/v1/actors/tags/${actorId}/tags?${queryString}`);
    return response.data;
  } catch (error) {
    console.error(`添加演员标签失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 删除演员标签
export const deleteActorTag = async (actorId, tagId) => {
  try {
    const response = await tagApi.delete(`/api/v1/actors/tags/${actorId}/tags/${tagId}`);
    return response.data;
  } catch (error) {
    console.error(`删除演员标签失败 (Actor ID: ${actorId}, Tag ID: ${tagId}):`, error);
    throw error;
  }
};

// 根据标签搜索演员
export const searchActorsByTags = async (tagIds) => {
  try {
    const queryString = tagIds.map(id => `tag_ids=${id}`).join('&');
    const response = await tagApi.get(`/api/v1/actors/tags/search?${queryString}`);
    return response.data;
  } catch (error) {
    console.error('根据标签搜索演员失败:', error);
    throw error;
  }
};
