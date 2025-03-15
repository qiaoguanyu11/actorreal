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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 获取所有标签
export const getTags = async (params = {}) => {
  try {
    const response = await api.get('/actors/tags', { params });
    return response.data;
  } catch (error) {
    console.error('获取标签列表失败:', error);
    throw error;
  }
};

// 创建标签
export const createTag = async (tagData) => {
  try {
    const response = await api.post('/actors/tags', tagData);
    return response.data;
  } catch (error) {
    console.error('创建标签失败:', error);
    throw error;
  }
};

// 更新标签
export const updateTag = async (tagId, tagData) => {
  try {
    const response = await api.put(`/actors/tags/${tagId}`, tagData);
    return response.data;
  } catch (error) {
    console.error(`更新标签失败 (ID: ${tagId}):`, error);
    throw error;
  }
};

// 删除标签
export const deleteTag = async (tagId) => {
  try {
    const response = await api.delete(`/actors/tags/${tagId}`);
    return response.data;
  } catch (error) {
    console.error(`删除标签失败 (ID: ${tagId}):`, error);
    throw error;
  }
};

// 获取演员的标签
export const getActorTags = async (actorId) => {
  try {
    const response = await api.get(`/actors/tags/${actorId}/tags`);
    return response.data;
  } catch (error) {
    console.error(`获取演员标签失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 更新演员的标签（替换所有标签）
export const updateActorTags = async (actorId, tagIds) => {
  try {
    const response = await api.put(`/actors/tags/${actorId}/tags`, { tags: tagIds });
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
    const response = await api.post(`/actors/tags/${actorId}/tags?${queryString}`);
    return response.data;
  } catch (error) {
    console.error(`添加演员标签失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 删除演员标签
export const deleteActorTag = async (actorId, tagId) => {
  try {
    const response = await api.delete(`/actors/tags/${actorId}/tags/${tagId}`);
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
    const response = await api.get(`/actors/tags/search?${queryString}`);
    return response.data;
  } catch (error) {
    console.error('根据标签搜索演员失败:', error);
    throw error;
  }
}; 