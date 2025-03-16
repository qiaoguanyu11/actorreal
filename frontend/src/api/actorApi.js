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
    console.log('getActors调用，原始参数:', JSON.stringify(params));
    
    // 处理标签ID数组参数
    let queryParams = { ...params };
    
    // 特殊处理name参数，确保模糊搜索
    if (queryParams.name) {
      // 确保search_mode参数存在
      queryParams.search_mode = 'contains';
      console.log(`使用模糊搜索模式查询名称: "${queryParams.name}"`);
    }
    
    // 强制设置include_tags参数为true
    queryParams.include_tags = true;
    console.log('强制设置include_tags=true以确保返回标签信息');
    
    // 特殊处理tag_id参数
    if (queryParams.tag_id) {
      console.log(`处理标签ID参数: ${queryParams.tag_id}, 类型: ${typeof queryParams.tag_id}, 原始值:`, JSON.stringify(queryParams.tag_id));
      
      // 确保tag_id是字符串或数字
      if (typeof queryParams.tag_id !== 'string' && typeof queryParams.tag_id !== 'number') {
        if (Array.isArray(queryParams.tag_id)) {
          // 如果是数组，转换为tag_ids参数
          queryParams.tag_ids = queryParams.tag_id;
          delete queryParams.tag_id;
          console.log(`将tag_id数组转换为tag_ids参数:`, queryParams.tag_ids);
        } else {
          // 其他情况转为字符串
          queryParams.tag_id = String(queryParams.tag_id);
          console.log(`将tag_id转换为字符串: ${queryParams.tag_id}`);
        }
      }
    }
    
    // 特殊处理tag_ids参数
    if (queryParams.tag_ids) {
      console.log(`处理标签IDs参数:`, queryParams.tag_ids);
      
      // 确保tag_ids是数组
      if (!Array.isArray(queryParams.tag_ids)) {
        // 如果不是数组，尝试转换
        if (typeof queryParams.tag_ids === 'string') {
          queryParams.tag_ids = queryParams.tag_ids.split(',').map(id => id.trim());
        } else {
          queryParams.tag_ids = [queryParams.tag_ids];
        }
        console.log(`转换后的tag_ids:`, queryParams.tag_ids);
      }
    }
    
    // 确保tag_search_mode存在
    if ((queryParams.tag_id || queryParams.tag_ids) && !queryParams.tag_search_mode) {
      queryParams.tag_search_mode = 'any';
      console.log('设置默认标签搜索模式: any');
    }
    
    // 检查并格式化分页参数
    if (queryParams.page) {
      console.log(`分页参数: page=${queryParams.page}, page_size=${queryParams.page_size}`);
      // 确保分页参数是数字
      queryParams.page = Number(queryParams.page);
      queryParams.page_size = Number(queryParams.page_size || 10);
    }
    
    console.log('API请求参数（最终）:', JSON.stringify(queryParams));
    
    // 发送API请求
    const response = await api.get('/actors/basic/', { params: queryParams });
    console.log('API响应状态:', response.status);
    console.log('API响应数据类型:', typeof response.data);
    
    // 处理返回的数据
    let actors = [];
    let totalCount = 0;
    let isPaginated = false;
    
    if (Array.isArray(response.data)) {
      actors = response.data;
      totalCount = response.data.length;
      console.log(`API返回数组数据，长度: ${actors.length}`);
    } else if (response.data && response.data.items && Array.isArray(response.data.items)) {
      actors = response.data.items;
      totalCount = response.data.total || actors.length;
      isPaginated = true;
      console.log(`API返回分页数据，长度: ${actors.length}, 总数: ${totalCount}`);
    } else if (typeof response.data === 'object') {
      // 尝试从对象中查找演员数组
      for (const key in response.data) {
        if (Array.isArray(response.data[key])) {
          const candidate = response.data[key];
          if (candidate.length > 0 && (candidate[0].id || candidate[0].real_name)) {
            actors = candidate;
            totalCount = actors.length;
            console.log(`从响应对象的 ${key} 属性中找到演员数组，长度: ${actors.length}`);
            break;
          }
        }
      }
    }
    
    // 检查演员数据是否已包含标签
    const hasExistingTags = actors.length > 0 && actors[0].tags && Array.isArray(actors[0].tags) && actors[0].tags.length > 0;
    console.log('数据是否已包含标签?', hasExistingTags);
    
    if (actors.length > 0) {
      // 无论是否已包含标签，都尝试获取标签数据
      try {
        // 提取演员ID列表
        const actorIds = actors.map(actor => actor.id);
        console.log('获取标签的演员ID列表:', actorIds);
        
        if (actorIds.length > 0) {
          // 请求标签数据
          const tagsResponse = await api.get('/actors/tags', {
            params: { actor_ids: actorIds.join(',') }
          });
          
          console.log('标签API响应:', tagsResponse.status);
          console.log('标签数据:', JSON.stringify(tagsResponse.data).substring(0, 200) + '...');
          
          // 检查标签数据
          if (tagsResponse.data && typeof tagsResponse.data === 'object') {
            // 将标签数据合并到演员数据中
            actors = actors.map(actor => {
              const actorTags = tagsResponse.data[actor.id] || [];
              console.log(`为演员 ${actor.id} (${actor.real_name}) 添加 ${actorTags.length} 个标签`);
              
              return {
                ...actor,
                tags: actorTags
              };
            });
            
            console.log('成功合并标签数据到演员数据');
          } else {
            console.warn('标签API返回了无效数据:', tagsResponse.data);
          }
        }
      } catch (tagError) {
        console.error('获取标签信息失败:', tagError);
        // 获取标签失败，但不影响主流程
      }
      
      // 如果仍然没有标签数据，尝试单独获取每个演员的标签
      const actorsWithoutTags = actors.filter(actor => !actor.tags || !Array.isArray(actor.tags) || actor.tags.length === 0);
      if (actorsWithoutTags.length > 0) {
        console.log(`有 ${actorsWithoutTags.length} 个演员没有标签数据，尝试单独获取`);
        
        // 并行获取所有演员的标签
        const tagPromises = actorsWithoutTags.map(async (actor) => {
          try {
            const tagResponse = await api.get(`/actors/tags/${actor.id}/tags`);
            if (tagResponse.data && tagResponse.data.tags && Array.isArray(tagResponse.data.tags)) {
              console.log(`获取到演员 ${actor.id} 的标签:`, tagResponse.data.tags.length);
              return { actorId: actor.id, tags: tagResponse.data.tags };
            }
            return { actorId: actor.id, tags: [] };
          } catch (err) {
            console.error(`获取演员 ${actor.id} 的标签失败:`, err);
            return { actorId: actor.id, tags: [] };
          }
        });
        
        // 等待所有标签请求完成
        const tagResults = await Promise.all(tagPromises);
        
        // 将标签数据合并到演员数据中
        actors = actors.map(actor => {
          // 如果演员已有标签，保留原有标签
          if (actor.tags && Array.isArray(actor.tags) && actor.tags.length > 0) {
            return actor;
          }
          
          // 查找该演员的标签结果
          const tagResult = tagResults.find(result => result.actorId === actor.id);
          if (tagResult) {
            console.log(`为演员 ${actor.id} 添加单独获取的 ${tagResult.tags.length} 个标签`);
            return {
              ...actor,
              tags: tagResult.tags
            };
          }
          
          // 如果没有找到标签结果，返回空标签数组
          return {
            ...actor,
            tags: []
          };
        });
      }
    }
    
    // 示例输出第一个演员的标签
    if (actors.length > 0) {
      const firstActor = actors[0];
      console.log(`第一个演员 ${firstActor.id} (${firstActor.real_name}) 的标签:`, 
                  firstActor.tags ? JSON.stringify(firstActor.tags) : '无标签');
    }
    
    // 根据响应数据结构构建返回
    if (isPaginated) {
      // 保持分页结构，但更新items为带有标签的数据
      return {
        ...response.data,
        items: actors,
        total: totalCount
      };
    } else {
      // 直接返回带有标签的演员数组
      return actors;
    }
  } catch (error) {
    console.error('获取演员列表失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// 获取演员详情
export const getActor = async (actorId) => {
  try {
    const response = await api.get(`/actors/basic/${actorId}`);
    return response.data;
  } catch (error) {
    console.error(`获取演员详情失败 (ID: ${actorId}):`, error);
    throw error;
  }
};

// 为了兼容性，提供getActorDetail作为getActor的别名
export const getActorDetail = getActor;

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
    // 使用正确的API路径
    const response = await api.delete(`/actors/basic/actors/${actorId}`);
    return response.data;
  } catch (error) {
    console.error(`删除演员失败 (ID: ${actorId}):`, error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    throw error;
  }
};

// 删除演员（高级选项）
export const deleteActorAdvanced = async (actorId, options = {}) => {
  try {
    const { permanent = false, deleteMedia = false, reason = '' } = options;
    
    // 构建查询参数
    const params = new URLSearchParams();
    params.append('permanent', permanent);
    params.append('delete_media', deleteMedia);
    if (reason) {
      params.append('reason', reason);
    }
    
    // 使用正确的API路径
    const response = await api.delete(`/actors/deletion/${actorId}?${params.toString()}`);
    
    console.log(`演员删除成功 (ID: ${actorId}, 永久删除: ${permanent}, 删除媒体: ${deleteMedia})`);
    return response.data;
  } catch (error) {
    console.error(`删除演员失败 (ID: ${actorId}):`, error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
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