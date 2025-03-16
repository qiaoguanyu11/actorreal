import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, Card, Input, Button, Space, 
  Select, Form, Slider, Empty, Tag, Avatar, message, Tooltip, Modal, List, Spin
} from 'antd';
import { 
  SearchOutlined, UserOutlined, FilterOutlined,
  ReloadOutlined, ManOutlined, WomanOutlined, EyeOutlined,
  DeleteOutlined, EditOutlined, ExclamationCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { getActors, deleteActor } from '../api/actorApi';
import axios from 'axios';

const { Option } = Select;

const ActorSearchPage = () => {
  // 状态定义
  const { user } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const isLoadingRef = useRef(false); // 使用ref跟踪加载状态
  const [searchParams, setSearchParams] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50'],
  });
  const [form] = Form.useForm();
  const [isMobile, setIsMobile] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [error, setError] = useState(null);
  // 防止重复请求的标记
  const [lastRequestKey, setLastRequestKey] = useState(null);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 获取标签列表
  useEffect(() => {
    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const response = await axios.get('/api/v1/actors/tags');
        setTags(response.data);
      } catch (err) {
        console.error('获取标签失败:', err);
        message.error('获取标签失败');
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, []);

  // 获取演员数据并更新标签
  const updateActorsWithTags = useCallback(async (actors) => {
    // 检查actors是否为有效数组
    if (!actors || !Array.isArray(actors) || actors.length === 0) {
      console.log('没有演员数据，返回空数组');
      return [];
    }
    
    console.log('更新演员标签，演员数量:', actors.length);
    
    // 如果演员数据中已包含标签，则直接返回
    if (actors[0].tags && Array.isArray(actors[0].tags) && actors[0].tags.length > 0) {
      console.log('演员数据已包含有效标签，无需更新', actors[0].tags);
      return actors;
    }
    
    // 获取所有演员的标签
    try {
      const actorIds = actors.map(actor => actor.id);
      console.log('获取标签的演员ID:', actorIds);
      
      // 如果没有演员ID，则直接返回原数据
      if (actorIds.length === 0) {
        return actors;
      }
      
      const response = await axios.get('/api/v1/actors/tags', {
        params: { actor_ids: actorIds.join(',') }
      });
      
      console.log('获取到的标签数据(详细):', JSON.stringify(response.data));
      
      // 检查response.data是否为有效对象
      const actorTags = response.data && typeof response.data === 'object' ? response.data : {};
      
      // 将标签数据合并到演员数据中
      const result = actors.map(actor => {
        const tags = actorTags[actor.id] || [];
        console.log(`演员 ${actor.id} 的标签详情:`, JSON.stringify(tags));
        return {
          ...actor,
          tags: tags
        };
      });
      
      console.log('更新标签后的演员数据示例:', result.length > 0 ? JSON.stringify(result[0]) : '无数据');
      return result;
    } catch (err) {
      console.error('获取演员标签失败:', err);
      // 如果获取标签失败，仍然返回演员数据，但标签为空数组
      return actors.map(actor => ({
        ...actor,
        tags: []
      }));
    }
  }, []);

  // 获取演员数据
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchActors = useCallback(async (params = {}) => {
    // 已经在加载中，跳过重复请求
    if (isLoadingRef.current) {
      console.log('已经在加载中，跳过请求');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // 使用最新的状态
      const paginationRef = pagination;
      const apiParams = {
        page: params.current || paginationRef.current,
        page_size: params.pageSize || paginationRef.pageSize,
        include_tags: true,
        ...searchParams
      };
      
      // 确保include_tags参数始终存在
      apiParams.include_tags = true;
      
      console.log('发送API请求参数:', JSON.stringify(apiParams));
      
      // 阻止重复请求
      const requestKey = JSON.stringify(apiParams);
      console.log('请求标识:', requestKey);
      
      // 比较当前请求与上一次请求是否相同
      if (requestKey === lastRequestKey) {
        console.log('跳过重复请求');
        isLoadingRef.current = false;
        setLoading(false);
        return;
      }
      
      // 更新请求标识
      setLastRequestKey(requestKey);
      
      // 控制台输出请求情况
      console.log('发送搜索请求，URL: /api/v1/actors/basic/, 参数:', JSON.stringify(apiParams));
      
      const response = await getActors(apiParams);
      
      // 检查响应数据格式
      if (!response) {
        throw new Error('服务器返回数据格式错误');
      }
      
      console.log('API响应数据(完整结构):', JSON.stringify(response, null, 2));
      console.log('API响应数据类型:', typeof response);
      if (Array.isArray(response)) {
        console.log('响应是数组类型，长度:', response.length);
      } else if (typeof response === 'object') {
        console.log('响应是对象类型，属性列表:', Object.keys(response));
      }
      
      // 处理响应数据格式
      let items = [];
      let total = 0;
      
      // 检查响应结构
      if (Array.isArray(response)) {
        // 如果响应是数组，直接使用
        console.log('响应是数组，直接使用');
        items = response;
        total = response.length;
      } else if (response.items && Array.isArray(response.items)) {
        // 标准分页格式
        console.log('响应是标准分页格式');
        items = response.items;
        total = response.total || items.length;
      } else if (typeof response === 'object') {
        // 可能是其他格式的对象
        console.log('响应是对象格式，尝试提取数据');
        
        // 检查是否存在类似[{id: "xxx", real_name: "xxx"}]这样的数组
        const foundArrays = [];
        
        // 递归函数用于在对象中查找数组
        const findArraysInObject = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const newPath = path ? `${path}.${key}` : key;
            
            if (Array.isArray(value)) {
              // 检查数组的第一个元素是否有id或real_name属性，如果有可能是演员数组
              if (value.length > 0 && (value[0].id || value[0].real_name)) {
                foundArrays.push({
                  path: newPath,
                  array: value,
                  score: (value[0].id ? 1 : 0) + (value[0].real_name ? 1 : 0)
                });
              }
            } else if (typeof value === 'object' && value !== null) {
              findArraysInObject(value, newPath);
            }
          });
        };
        
        findArraysInObject(response);
        console.log('在对象中找到的可能是演员数组的属性:', foundArrays);
        
        // 按照评分排序，选择最可能是演员数组的
        if (foundArrays.length > 0) {
          foundArrays.sort((a, b) => b.score - a.score);
          const bestMatch = foundArrays[0];
          console.log(`使用路径 ${bestMatch.path} 的数组作为演员数据`);
          items = bestMatch.array;
          total = items.length;
        } else {
          // 如果前面的方法都失败了，尝试直接遍历对象中的所有数组属性
          for (const key in response) {
            if (Array.isArray(response[key]) && response[key].length > 0) {
              items = response[key];
              total = items.length;
              console.log(`从响应的${key}属性中提取到${items.length}条数据`);
              break;
            }
          }
        }
      }
      
      console.log('获取到的演员数据:', items.length, '条');
      if (items.length > 0) {
        console.log('第一条数据示例:', JSON.stringify(items[0]));
        console.log('是否包含tags属性:', items[0].hasOwnProperty('tags'));
        if (items[0].tags) {
          console.log('第一条数据的tags:', JSON.stringify(items[0].tags));
        }
      }
      console.log('总数:', total);
      
      if (items.length === 0) {
        message.info('没有找到匹配的演员');
        setActors([]);
        setPagination(prevPagination => ({
          ...prevPagination,
          current: params.current || paginationRef.current,
          pageSize: params.pageSize || paginationRef.pageSize,
          total: 0
        }));
        return; // 提前返回，避免后面的处理
      }
      
      let actorsWithTags = items;
      // 只有当items非空且没有tags属性时才调用updateActorsWithTags
      if (items.length > 0 && (!items[0].hasOwnProperty('tags') || !items[0].tags)) {
        console.log('数据中没有tags属性，调用updateActorsWithTags');
        actorsWithTags = await updateActorsWithTags(items);
        console.log('处理标签后的演员数据:', actorsWithTags.length, '条');
      } else {
        console.log('数据已包含tags属性，无需额外处理');
      }
      
      // 确保每个演员有唯一ID
      const processedActors = actorsWithTags.map((actor, index) => {
        // 创建一个规范化的演员对象
        const normalizedActor = { ...actor };
        
        // 确保ID存在
        if (!normalizedActor.id) {
          console.log(`演员 ${index} 没有ID，使用索引作为临时ID`);
          normalizedActor.id = `temp_${index}`;
        }
        
        // 确保real_name存在
        if (!normalizedActor.real_name) {
          console.log(`演员 ${normalizedActor.id} 没有real_name，使用"未命名演员"替代`);
          normalizedActor.real_name = `未命名演员 ${index + 1}`;
        }
        
        // 确保其他关键字段至少有默认值
        normalizedActor.gender = normalizedActor.gender || 'unknown';
        normalizedActor.stage_name = normalizedActor.stage_name || '';
        normalizedActor.age = normalizedActor.age || null;
        normalizedActor.height = normalizedActor.height || null;
        normalizedActor.location = normalizedActor.location || '';
        normalizedActor.status = normalizedActor.status || 'unknown';
        normalizedActor.tags = Array.isArray(normalizedActor.tags) ? normalizedActor.tags : [];
        
        // 调试：打印标签信息
        console.log(`演员 ${normalizedActor.id} (${normalizedActor.real_name}) 的标签:`, 
                    Array.isArray(normalizedActor.tags) ? 
                    normalizedActor.tags.map(t => t.name || t.tag_name || 'unnamed').join(', ') : 
                    'no tags');
        
        console.log(`规范化演员数据 ${index}:`, {
          id: normalizedActor.id,
          real_name: normalizedActor.real_name,
          gender: normalizedActor.gender,
          tagsCount: normalizedActor.tags.length
        });
        
        return normalizedActor;
      });
      
      console.log('最终处理后的演员数据:', processedActors.length, '条记录');
      
      // 更新状态
      setActors(processedActors);
      setPagination(prevPagination => ({
        ...prevPagination,
        current: params.current || paginationRef.current,
        pageSize: params.pageSize || paginationRef.pageSize,
        total
      }));
    } catch (err) {
      console.error('获取演员数据失败:', err);
      console.error('错误详情:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
      setActors([]);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
    }
  }, [searchParams, updateActorsWithTags, lastRequestKey]);

  // 初始加载数据
  useEffect(() => {
    console.log('初始加载演员数据...');
    
    // 防止重复加载
    if (isLoadingRef.current) {
      console.log('已经在加载中，跳过初始化加载');
      return;
    }
    
    // 重置请求状态和搜索条件
    setLastRequestKey(null); 
    
    // 直接调用API获取数据
    const apiParams = {
      page: 1,
      page_size: 10,
      include_tags: true
    };
    
    console.log('初始加载，直接发送请求:', JSON.stringify(apiParams));
    
    // 使用getActors直接获取数据
    setLoading(true);
    isLoadingRef.current = true;
    
    getActors(apiParams)
      .then(response => {
        console.log('初始加载结果返回:', response);
        // 处理响应数据
        let items = [];
        let total = 0;
        
        if (Array.isArray(response)) {
          items = response;
          total = response.length;
        } else if (response.items && Array.isArray(response.items)) {
          items = response.items;
          total = response.total || items.length;
        }
        
        // 处理演员数据
        const processedActors = items.map((actor, index) => {
          const normalizedActor = { ...actor };
          normalizedActor.id = normalizedActor.id || `temp_${index}`;
          normalizedActor.real_name = normalizedActor.real_name || `未命名演员 ${index + 1}`;
          normalizedActor.gender = normalizedActor.gender || 'unknown';
          normalizedActor.stage_name = normalizedActor.stage_name || '';
          normalizedActor.age = normalizedActor.age || null;
          normalizedActor.height = normalizedActor.height || null;
          normalizedActor.location = normalizedActor.location || '';
          normalizedActor.status = normalizedActor.status || 'unknown';
          normalizedActor.tags = Array.isArray(normalizedActor.tags) ? normalizedActor.tags : [];
          return normalizedActor;
        });
        
        setActors(processedActors);
        setPagination(prev => ({
          ...prev,
          current: 1,
          total
        }));
      })
      .catch(err => {
        console.error('初始加载失败:', err);
        setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
        setActors([]);
      })
      .finally(() => {
        setLoading(false);
        isLoadingRef.current = false;
      });
  }, []); // 仅在组件挂载时运行一次

  // 处理搜索表单提交
  const handleSearch = useCallback((values) => {
    console.log('搜索表单提交的值:', values);
    
    // 清空现有搜索结果和重置请求标识
    setActors([]);
    setLastRequestKey(null);
    
    const params = {};
    let hasSearchParams = false;
    
    if (values.name) {
      params.name = values.name.trim();
      console.log('搜索姓名:', params.name);
      hasSearchParams = true;
    }
    
    if (values.gender) {
      params.gender = values.gender;
      console.log('搜索性别:', params.gender);
      hasSearchParams = true;
    }
    
    if (values.age && (values.age[0] > 0 || values.age[1] < 120)) {
      params.min_age = values.age[0];
      params.max_age = values.age[1];
      console.log('搜索年龄范围:', params.min_age, '-', params.max_age);
      hasSearchParams = true;
    }
    
    if (values.height && (values.height[0] > 0 || values.height[1] < 200)) {
      params.min_height = values.height[0];
      params.max_height = values.height[1];
      console.log('搜索身高范围:', params.min_height, '-', params.max_height);
      hasSearchParams = true;
    }
    
    if (values.location) {
      // 地域搜索使用address字段
      params.address = values.location;
      console.log('搜索地域(address):', params.address);
      hasSearchParams = true;
    }
    
    if (values.tags && values.tags.length > 0) {
      // 根据后端API的要求，使用tag_ids参数传递多个标签ID
      if (values.tags.length === 1) {
        // 单个标签使用tag_id参数
        params.tag_id = values.tags[0];
        console.log('搜索单个标签ID:', params.tag_id, '类型:', typeof params.tag_id);
      } else {
        // 多个标签使用tag_ids参数
        params.tag_ids = values.tags;
        console.log('搜索多个标签ID:', params.tag_ids, '类型:', Array.isArray(params.tag_ids) ? 'Array' : typeof params.tag_ids);
      }
      
      // 设置标签搜索模式
      params.tag_search_mode = 'any';
      console.log('标签搜索模式:', params.tag_search_mode);
      
      hasSearchParams = true;
    }
    
    // 确保强制包含标签
    params.include_tags = true;
    
    console.log('最终搜索参数:', JSON.stringify(params));
    
    // 调试信息 - 显示表单提交前后的表单值
    console.log('搜索表单提交的值（处理前）:', values);
    console.log('搜索表单提交的值（处理后）:', params);
    
    // 先更新搜索参数状态
    setSearchParams(params);
    
    // 更新分页状态
    setPagination(prev => ({
      ...prev,
      current: 1
    }));
    
    // 使用新的搜索参数直接调用fetchActors，而不是依赖于状态更新后的searchParams
    const apiParams = {
      page: 1,
      page_size: 10,
      include_tags: true,
      ...params  // 直接使用新构建的params，而不是依赖于状态中的searchParams
    };
    
    // 直接调用API获取数据
    console.log('直接使用新参数发送搜索请求:', JSON.stringify(apiParams));
    
    // 使用getActors直接获取数据
    setLoading(true);
    isLoadingRef.current = true;
    
    getActors(apiParams)
      .then(response => {
        console.log('搜索结果返回:', response);
        // 处理响应数据
        let items = [];
        let total = 0;
        
        if (Array.isArray(response)) {
          items = response;
          total = response.length;
        } else if (response.items && Array.isArray(response.items)) {
          items = response.items;
          total = response.total || items.length;
        }
        
        if (items.length === 0) {
          message.info('没有找到匹配的演员');
          setActors([]);
          setPagination(prev => ({
            ...prev,
            total: 0
          }));
        } else {
          // 处理演员数据
          const processedActors = items.map((actor, index) => {
            const normalizedActor = { ...actor };
            normalizedActor.id = normalizedActor.id || `temp_${index}`;
            normalizedActor.real_name = normalizedActor.real_name || `未命名演员 ${index + 1}`;
            normalizedActor.gender = normalizedActor.gender || 'unknown';
            normalizedActor.stage_name = normalizedActor.stage_name || '';
            normalizedActor.age = normalizedActor.age || null;
            normalizedActor.height = normalizedActor.height || null;
            normalizedActor.location = normalizedActor.location || '';
            normalizedActor.status = normalizedActor.status || 'unknown';
            normalizedActor.tags = Array.isArray(normalizedActor.tags) ? normalizedActor.tags : [];
            return normalizedActor;
          });
          
          setActors(processedActors);
          setPagination(prev => ({
            ...prev,
            total
          }));
        }
      })
      .catch(err => {
        console.error('搜索失败:', err);
        setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
        setActors([]);
      })
      .finally(() => {
        setLoading(false);
        isLoadingRef.current = false;
      });
    
    if (!hasSearchParams) {
      console.log('没有搜索参数，将显示所有演员');
    }
  }, []);  // 移除fetchActors依赖，因为我们现在直接使用getActors

  // 重置搜索表单
  const handleReset = useCallback(() => {
    // 清空表单和搜索参数
    form.resetFields();
    setSearchParams({});
    
    // 清空现有搜索结果和重置请求标识
    setActors([]);
    setLastRequestKey(null);
    
    // 直接调用API获取数据
    const apiParams = {
      page: 1,
      page_size: 10,
      include_tags: true
    };
    
    console.log('重置搜索，直接发送请求:', JSON.stringify(apiParams));
    
    // 使用getActors直接获取数据
    setLoading(true);
    isLoadingRef.current = true;
    
    getActors(apiParams)
      .then(response => {
        console.log('重置搜索结果返回:', response);
        // 处理响应数据
        let items = [];
        let total = 0;
        
        if (Array.isArray(response)) {
          items = response;
          total = response.length;
        } else if (response.items && Array.isArray(response.items)) {
          items = response.items;
          total = response.total || items.length;
        }
        
        // 处理演员数据
        const processedActors = items.map((actor, index) => {
          const normalizedActor = { ...actor };
          normalizedActor.id = normalizedActor.id || `temp_${index}`;
          normalizedActor.real_name = normalizedActor.real_name || `未命名演员 ${index + 1}`;
          normalizedActor.gender = normalizedActor.gender || 'unknown';
          normalizedActor.stage_name = normalizedActor.stage_name || '';
          normalizedActor.age = normalizedActor.age || null;
          normalizedActor.height = normalizedActor.height || null;
          normalizedActor.location = normalizedActor.location || '';
          normalizedActor.status = normalizedActor.status || 'unknown';
          normalizedActor.tags = Array.isArray(normalizedActor.tags) ? normalizedActor.tags : [];
          return normalizedActor;
        });
        
        setActors(processedActors);
        setPagination(prev => ({
          ...prev,
          current: 1,
          total
        }));
      })
      .catch(err => {
        console.error('重置搜索失败:', err);
        setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
        setActors([]);
      })
      .finally(() => {
        setLoading(false);
        isLoadingRef.current = false;
      });
  }, [form]);  // 移除fetchActors依赖，因为我们现在直接使用getActors

  // 处理表格变化（分页、筛选、排序）
  const handleTableChange = useCallback((pagination, filters, sorter) => {
    console.log('表格变化:', pagination, filters, sorter);
    
    // 更新分页状态
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize
    }));
    
    // 直接调用API获取数据
    const apiParams = {
      page: pagination.current,
      page_size: pagination.pageSize,
      include_tags: true,
      ...searchParams
    };
    
    console.log('表格变化，直接发送请求:', JSON.stringify(apiParams));
    
    // 使用getActors直接获取数据
    setLoading(true);
    isLoadingRef.current = true;
    
    getActors(apiParams)
      .then(response => {
        console.log('分页结果返回:', response);
        // 处理响应数据
        let items = [];
        let total = 0;
        
        if (Array.isArray(response)) {
          items = response;
          total = response.length;
        } else if (response.items && Array.isArray(response.items)) {
          items = response.items;
          total = response.total || items.length;
        }
        
        // 处理演员数据
        const processedActors = items.map((actor, index) => {
          const normalizedActor = { ...actor };
          normalizedActor.id = normalizedActor.id || `temp_${index}`;
          normalizedActor.real_name = normalizedActor.real_name || `未命名演员 ${index + 1}`;
          normalizedActor.gender = normalizedActor.gender || 'unknown';
          normalizedActor.stage_name = normalizedActor.stage_name || '';
          normalizedActor.age = normalizedActor.age || null;
          normalizedActor.height = normalizedActor.height || null;
          normalizedActor.location = normalizedActor.location || '';
          normalizedActor.status = normalizedActor.status || 'unknown';
          normalizedActor.tags = Array.isArray(normalizedActor.tags) ? normalizedActor.tags : [];
          return normalizedActor;
        });
        
        setActors(processedActors);
        setPagination(prev => ({
          ...prev,
          total
        }));
      })
      .catch(err => {
        console.error('分页请求失败:', err);
        setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
      })
      .finally(() => {
        setLoading(false);
        isLoadingRef.current = false;
      });
  }, [searchParams]);  // 只依赖searchParams

  // 处理删除演员
  const handleDelete = useCallback((actorId, actorName) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除演员 "${actorName}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteActor(actorId);
          message.success(`演员 "${actorName}" 已成功删除`);
          fetchActors(); // 重新加载数据
        } catch (error) {
          console.error('删除演员失败:', error);
          message.error('删除演员失败: ' + (error.response?.data?.message || error.message));
        }
      }
    });
  }, [fetchActors]);

  // 渲染演员标签
  const renderActorTags = useCallback((actorTags) => {
    // 记录原始的标签数据
    console.log('renderActorTags接收到的原始数据:', typeof actorTags, actorTags);
    
    if (!actorTags) {
      console.log('标签数据为空(undefined/null)');
      return <span style={{ color: '#999' }}>无标签</span>;
    }
    
    // 确保actorTags是数组
    let tagArray = [];
    
    // 处理不同格式的标签数据
    if (Array.isArray(actorTags)) {
      tagArray = actorTags;
      console.log('标签数据是数组格式，长度:', tagArray.length);
    } else if (typeof actorTags === 'object') {
      // 可能是对象，尝试查找数组属性
      if (actorTags.tags && Array.isArray(actorTags.tags)) {
        tagArray = actorTags.tags;
        console.log('从对象的tags属性中获取到标签数组，长度:', tagArray.length);
      } else {
        for (const key in actorTags) {
          if (Array.isArray(actorTags[key])) {
            tagArray = actorTags[key];
            console.log(`从对象的${key}属性中获取到标签数组，长度:`, tagArray.length);
            break;
          }
        }
      }
      
      // 如果没有找到数组，尝试将对象自身转换为单个标签的数组
      if (tagArray.length === 0 && actorTags.id) {
        tagArray = [actorTags];
        console.log('将单个标签对象转换为数组');
      }
    } else if (typeof actorTags === 'string') {
      // 可能是JSON字符串
      try {
        const parsed = JSON.parse(actorTags);
        if (Array.isArray(parsed)) {
          tagArray = parsed;
          console.log('将JSON字符串解析为标签数组，长度:', tagArray.length);
        } else if (parsed && parsed.tags && Array.isArray(parsed.tags)) {
          tagArray = parsed.tags;
          console.log('从解析的JSON对象的tags属性中获取标签数组，长度:', tagArray.length);
        }
      } catch (e) {
        console.log('标签数据是字符串但不是有效的JSON:', actorTags);
      }
    }
    
    // 处理空数组的情况
    if (tagArray.length === 0) {
      console.log('标签数组为空');
      return <span style={{ color: '#999' }}>无标签</span>;
    }
    
    console.log('处理后的标签数组:', JSON.stringify(tagArray));
    
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {tagArray.map((tag, index) => {
          // 处理不同格式的标签数据
          if (!tag || typeof tag !== 'object') {
            console.log(`标签${index}格式不正确:`, tag);
            return <Tag color="gray" key={`unknown-${index}`}>未知标签</Tag>;
          }
          
          // 标签可能是{id,name,color}格式，也可能是其他格式
          const tagId = tag.id || tag.tag_id || `tag-${index}`;
          const tagName = tag.name || tag.tag_name || '未命名标签';
          const tagColor = tag.color || 'blue';
          
          console.log(`渲染标签 ${index}:`, {id: tagId, name: tagName, color: tagColor});
          
          return (
            <Tag color={tagColor} key={tagId}>
              {tagName}
            </Tag>
          );
        })}
      </div>
    );
  }, []);

  // 常用地域选项
  const locationOptions = useMemo(() => [
    { value: '北京', label: '北京' },
    { value: '上海', label: '上海' },
    { value: '广州', label: '广州' },
    { value: '深圳', label: '深圳' },
    { value: '杭州', label: '杭州' },
    { value: '成都', label: '成都' },
    { value: '重庆', label: '重庆' },
    { value: '武汉', label: '武汉' },
    { value: '南京', label: '南京' },
    { value: '西安', label: '西安' },
    { value: '长沙', label: '长沙' },
    { value: '青岛', label: '青岛' },
    { value: '厦门', label: '厦门' },
    { value: '苏州', label: '苏州' },
    { value: '天津', label: '天津' },
  ], []);

  // 移动端列表项渲染
  const renderListItem = useCallback((actor) => {
    // 防止空数据导致渲染错误
    if (!actor || typeof actor !== 'object') {
      console.error('尝试渲染无效的演员数据:', actor);
      return (
        <List.Item>
          <Empty description="无效的演员数据" />
        </List.Item>
      );
    }
    
    const { 
      id, 
      real_name, 
      stage_name, 
      gender, 
      age, 
      height, 
      contact_info, 
      status, 
      tags, 
      avatar_url, 
      agent_id 
    } = actor;
    
    // 从contact_info中获取地址作为地域
    const location = contact_info?.address || '';
    
    console.log(`渲染列表项，演员ID: ${id}, 姓名: ${real_name}, 地域: ${location}`);
    
    return (
      <List.Item
        key={id}
        actions={[
          <Link to={`/actors/${id}`} key="view">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
            >
              查看
            </Button>
          </Link>,
          (user?.role === 'admin' || (user?.role === 'manager' && agent_id === user?.id)) && (
            <Link to={`/actors/${id}/edit`} key="edit">
              <Button 
                size="small" 
                icon={<EditOutlined />}
              >
                编辑
              </Button>
            </Link>
          ),
          user?.role === 'admin' && (
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(id, real_name)}
              key="delete"
            >
              删除
            </Button>
          )
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={<Avatar size={64} icon={<UserOutlined />} src={avatar_url} />}
          title={
            <Link to={`/actors/${id}`}>
              <strong>{real_name || '未命名演员'}</strong>
              {stage_name && <span style={{ color: '#888', marginLeft: 8 }}>艺名: {stage_name}</span>}
            </Link>
          }
          description={
            <Space direction="vertical" size={4}>
              <Space>
                {gender === 'male' ? 
                  <Tag icon={<ManOutlined />} color="blue">男</Tag> : 
                  gender === 'female' ? 
                    <Tag icon={<WomanOutlined />} color="pink">女</Tag> : 
                    <Tag color="default">其他</Tag>
                }
                {age && <span>年龄: {age}</span>}
                {height && <span>身高: {height}cm</span>}
              </Space>
              {location && (
                <div>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {location}
                </div>
              )}
              <div>
                状态: {
                  status === 'active' ? <Tag color="green">可接洽</Tag> :
                  status === 'inactive' ? <Tag color="orange">暂不接单</Tag> :
                  status === 'suspended' ? <Tag color="red">已暂停</Tag> :
                  status === 'retired' ? <Tag color="gray">已退役</Tag> :
                  <Tag color="default">未知</Tag>
                }
              </div>
              <div>
                <span style={{ marginRight: 4 }}>标签:</span>
                {renderActorTags(tags)}
              </div>
            </Space>
          }
        />
      </List.Item>
    );
  }, [user, handleDelete, renderActorTags]);

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      render: (avatar_url) => (
        <Avatar 
          size={64} 
          icon={<UserOutlined />} 
          src={avatar_url} 
        />
      ),
      responsive: ['md'],
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Link to={`/actors/${record.id}`}>
            <strong>{text || '未命名演员'}</strong>
          </Link>
          {record.stage_name && <span style={{ color: '#888' }}>艺名: {record.stage_name}</span>}
        </Space>
      ),
      // Excel风格筛选
      filters: actors.length > 0 ? actors.map(actor => ({ 
        text: actor.real_name || '未命名演员', 
        value: actor.real_name || 'unnamed'
      })) : [],
      onFilter: (value, record) => {
        if (!record.real_name) return value === 'unnamed';
        return record.real_name.indexOf(value) === 0;
      },
      filterSearch: true,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (gender) => (
        gender === 'male' ? 
          <Tag icon={<ManOutlined />} color="blue">男</Tag> : 
          gender === 'female' ? 
            <Tag icon={<WomanOutlined />} color="pink">女</Tag> : 
            <Tag color="default">其他</Tag>
      ),
      responsive: ['sm'],
      // Excel风格筛选
      filters: [
        { text: '男', value: 'male' },
        { text: '女', value: 'female' },
      ],
      onFilter: (value, record) => record.gender === value,
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      render: (age) => age || '-',
      responsive: ['sm'],
      // Excel风格筛选 - 自定义筛选组件
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Slider
            range
            min={0}
            max={120}
            value={selectedKeys[0] || [0, 120]}
            onChange={value => setSelectedKeys([value])}
            style={{ width: 200, margin: '8px 0' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                confirm();
                console.log('年龄筛选确认:', selectedKeys);
              }}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => {
              clearFilters();
              console.log('年龄筛选重置');
            }} size="small" style={{ width: 90 }}>
              重置
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) => {
        if (!record.age) return false;
        return record.age >= value[0] && record.age <= value[1];
      },
      filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: '身高',
      dataIndex: 'height',
      key: 'height',
      render: (height) => height ? `${height} cm` : '-',
      responsive: ['md'],
      // 类似年龄的自定义筛选组件
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Slider
            range
            min={0}
            max={200}
            value={selectedKeys[0] || [0, 200]}
            onChange={value => setSelectedKeys([value])}
            style={{ width: 200, margin: '8px 0' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                confirm();
                console.log('身高筛选确认:', selectedKeys);
              }}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => {
              clearFilters();
              console.log('身高筛选重置');
            }} size="small" style={{ width: 90 }}>
              重置
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) => {
        if (!record.height) return false;
        return record.height >= value[0] && record.height <= value[1];
      },
      filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: '地域',
      dataIndex: 'contact_info',
      key: 'location',
      render: (contact_info) => (contact_info?.address || '-'),
      responsive: ['md'],
      // Excel风格筛选
      filters: Array.from(new Set(actors.map(actor => actor.contact_info?.address).filter(Boolean))).map(
        address => ({ text: address, value: address })
      ),
      onFilter: (value, record) => {
        // 确保精确匹配地域，而不是包含匹配
        return record.contact_info?.address === value;
      },
      filterSearch: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags, record) => {
        console.log(`渲染演员 ${record.id} 的标签列:`, tags);
        // 确保标签数据是数组
        const tagArray = Array.isArray(tags) ? tags : [];
        if (tags && !Array.isArray(tags) && tags.tags && Array.isArray(tags.tags)) {
          return renderActorTags(tags.tags);
        }
        return renderActorTags(tagArray);
      },
      responsive: ['md'],
      width: 200,
      // 标签的自定义筛选组件
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Select
            mode="multiple"
            placeholder="选择标签"
            value={selectedKeys}
            onChange={setSelectedKeys}
            style={{ width: 200, marginBottom: 8 }}
            options={tags.map(tag => ({
              label: <Tag color={tag.color || 'blue'}>{tag.name}</Tag>,
              value: tag.id,
            }))}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => {
                confirm();
                console.log('标签筛选确认:', selectedKeys);
              }}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => {
              clearFilters();
              console.log('标签筛选重置');
            }} size="small" style={{ width: 90 }}>
              重置
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value, record) => {
        const actorTags = record.tags || [];
        return actorTags.some(tag => tag.id === value);
      },
      filterIcon: filtered => <FilterOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Link to={`/actors/${record.id}`}>
              <Button type="primary" size="small" icon={<EyeOutlined />}>
                {!isMobile && '查看'}
              </Button>
            </Link>
          </Tooltip>
          
          {(user?.role === 'admin' || (user?.role === 'manager' && record.agent_id === user?.id)) && (
            <Tooltip title="编辑演员">
              <Link to={`/actors/${record.id}/edit`}>
                <Button size="small" icon={<EditOutlined />}>
                  {!isMobile && '编辑'}
                </Button>
              </Link>
            </Tooltip>
          )}
          
          {user?.role === 'admin' && (
            <Tooltip title="删除演员">
              <Button 
                danger 
                size="small" 
                icon={<DeleteOutlined />} 
                onClick={() => handleDelete(record.id, record.real_name)}
              >
                {!isMobile && '删除'}
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ], [actors, tags, handleDelete, isMobile, renderActorTags, user?.role, user?.id]);

  // 组件主体内容
  return (
    <div className="actor-search-page">
      <Card title="演员高级搜索" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          name="actor_search"
          onFinish={handleSearch}
          layout={isMobile ? "vertical" : "inline"}
          style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '8px' }}
          initialValues={{
            age: [0, 120],
            height: [0, 200]
          }}
        >
          <Form.Item name="name" label="姓名" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Input placeholder="输入姓名或艺名" prefix={<UserOutlined />} allowClear />
          </Form.Item>
          
          <Form.Item name="gender" label="性别" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Select placeholder="选择性别" allowClear style={{ width: isMobile ? '100%' : 120 }}>
              <Option value="male">男</Option>
              <Option value="female">女</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="age" label="年龄" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Slider 
              range 
              min={0} 
              max={120} 
              style={{ width: isMobile ? '100%' : 200 }} 
            />
          </Form.Item>
          
          <Form.Item name="height" label="身高(cm)" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Slider 
              range 
              min={0} 
              max={200} 
              style={{ width: isMobile ? '100%' : 200 }} 
            />
          </Form.Item>
          
          <Form.Item name="location" label="地域" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Select
              placeholder="选择地域"
              allowClear
              showSearch
              style={{ width: isMobile ? '100%' : 150 }}
              options={locationOptions}
            />
          </Form.Item>
          
          <Form.Item name="tags" label="标签" style={{ marginBottom: isMobile ? 12 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Select
              placeholder="选择标签"
              allowClear
              mode="multiple"
              loading={tagsLoading}
              style={{ width: isMobile ? '100%' : 200 }}
              optionFilterProp="label"
              showSearch
              optionLabelProp="label"
              filterOption={(input, option) => 
                option.label && option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {tags.map(tag => {
                console.log('渲染标签选项:', tag.id, tag.name);
                return (
                  <Option 
                    key={tag.id} 
                    value={tag.id}
                    label={tag.name}
                  >
                    <Tag color={tag.color || 'blue'}>{tag.name}</Tag>
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
          
          <Form.Item style={{ marginBottom: isMobile ? 0 : 0, flex: isMobile ? '1' : '0 0 auto' }}>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="搜索结果">
        <Spin spinning={loading} tip="加载中...">
          {/* 添加调试信息 */}
          <div style={{ marginBottom: 10, fontSize: '12px' }}>
            <div style={{ color: 'blue' }}>
              当前加载状态: {loading ? '加载中' : '加载完成'} | 
              演员数量: {actors.length} | 
              总数: {pagination.total} |
              请求状态: {isLoadingRef.current ? '进行中' : '闲置中'}
            </div>
            {actors.length > 0 && (
              <div style={{ color: 'green', marginTop: 5 }}>
                数据示例（第一条记录）: {actors[0].id}, 姓名: {actors[0].real_name || '未命名'}, 
                性别: {actors[0].gender || '未知'}, 标签数: {(actors[0].tags || []).length}
              </div>
            )}
            {error && (
              <div style={{ color: 'red', marginTop: 5 }}>
                错误信息: {error}
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => {
                    setError(null);
                    fetchActors();
                  }}
                >
                  重试
                </Button>
              </div>
            )}
          </div>
          
          {/* 渲染主要内容 */}
          {actors.length === 0 ? (
            <Empty description={
              loading ? "正在加载数据..." : "没有找到匹配的演员"
            } />
          ) : isMobile ? (
            <List
              key={`mobile-list-${JSON.stringify(searchParams)}-${actors.length}-${new Date().getTime()}`}
              itemLayout="vertical"
              dataSource={actors}
              renderItem={renderListItem}
              pagination={{
                ...pagination,
                onChange: (page, pageSize) => {
                  handleTableChange({ current: page, pageSize });
                },
                showSizeChanger: false
              }}
              loading={loading}
              locale={{ emptyText: <Empty description="暂无演员数据" /> }}
            />
          ) : (
            <Table
              key={`desktop-table-${JSON.stringify(searchParams)}-${actors.length}-${new Date().getTime()}`}
              columns={columns}
              dataSource={actors}
              rowKey={record => record.id || `tmp_${Math.random()}`}
              pagination={pagination}
              loading={loading}
              onChange={handleTableChange}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty description="暂无演员数据" /> }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default ActorSearchPage; 