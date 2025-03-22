/**
 * Axios 请求辅助函数
 */

import axios from 'axios';

/**
 * 带认证的请求函数
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise<any>} - 请求响应
 */
export const authenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const config = {
    url,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...options.headers
    },
    withCredentials: true,
    maxRedirects: 5,
    validateStatus: (status) => status >= 200 && status < 500,
    ...options
  };
  
  try {
    console.log(`发送${config.method || 'GET'}请求到 ${url}`, {
      params: config.params,
      data: config.data,
      headers: {
        Authorization: token ? 'Bearer [已设置]' : '[未设置]',
        'Content-Type': config.headers['Content-Type']
      }
    });
    
    // 暂时注释URL处理逻辑
    // if (url.indexOf('?') === -1 && !url.endsWith('/') && !options.noTrailingSlash) {
    //   url = url + '/';
    //   config.url = url;
    // }
    
    const response = await axios(config);
    
    console.log(`请求 ${url} 响应:`, {
      status: response.status,
      statusText: response.statusText,
      data: typeof response.data === 'object' ? '[数据对象]' : response.data
    });
    
    return response.data;
  } catch (error) {
    console.error(`请求 ${url} 失败:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    throw error;
  }
};

/**
 * 带认证的GET请求
 */
export const authGet = (url, params = {}, options = {}) => {
  return authenticatedRequest(url, {
    method: 'GET',
    params,
    ...options
  });
};

/**
 * 带认证的POST请求
 */
export const authPost = (url, data = {}, options = {}) => {
  return authenticatedRequest(url, {
    method: 'POST',
    data,
    ...options
  });
};

/**
 * 带认证的PUT请求
 */
export const authPut = (url, data = {}, options = {}) => {
  return authenticatedRequest(url, {
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * 带认证的DELETE请求
 */
export const authDelete = (url, options = {}) => {
  return authenticatedRequest(url, {
    method: 'DELETE',
    ...options
  });
}; 