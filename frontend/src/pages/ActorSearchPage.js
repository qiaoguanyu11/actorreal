import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
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
import axios from 'axios';

const { Option } = Select;

const ActorSearchPage = () => {
  // 状态定义
  const { user } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
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
  const updateActorsWithTags = async (actors) => {
    // 检查actors是否为有效数组
    if (!actors || !Array.isArray(actors) || actors.length === 0) {
      console.log('没有演员数据，返回空数组');
      return [];
    }
    
    console.log('更新演员标签，演员数量:', actors.length);
    
    // 如果演员数据中已包含标签，则直接返回
    if (actors[0].tags) {
      console.log('演员数据已包含标签，无需更新');
      return actors;
    }
    
    // 获取所有演员的标签
    try {
      const actorIds = actors.map(actor => actor.id);
      console.log('获取标签的演员ID:', actorIds);
      
      const response = await axios.get('/api/v1/actors/tags', {
        params: { actor_ids: actorIds.join(',') }
      });
      
      console.log('获取到的标签数据:', response.data);
      
      const actorTags = response.data;
      
      // 将标签数据合并到演员数据中
      const result = actors.map(actor => {
        const tags = actorTags[actor.id] || [];
        console.log(`演员 ${actor.id} 的标签:`, tags);
        return {
          ...actor,
          tags: tags
        };
      });
      
      console.log('更新标签后的演员数据:', result);
      return result;
    } catch (err) {
      console.error('获取演员标签失败:', err);
      // 如果获取标签失败，仍然返回演员数据，但标签为空数组
      return actors.map(actor => ({
        ...actor,
        tags: []
      }));
    }
  };

  // 获取演员数据
  const fetchActors = async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const { current, pageSize } = pagination;
      const apiParams = {
        page: params.current || current,
        page_size: params.pageSize || pageSize,
        include_tags: true,
        ...searchParams
      };
      
      console.log('发送API请求参数:', apiParams);
      
      const response = await axios.get('/api/v1/actors/basic/', {
        params: apiParams
      });
      
      // 检查响应数据格式
      if (!response.data) {
        throw new Error('服务器返回数据格式错误');
      }
      
      console.log('API响应数据:', response.data);
      
      const { items = [], total = 0 } = response.data;
      console.log('获取到的演员数据:', items);
      console.log('总数:', total);
      
      if (items.length === 0) {
        message.info('没有找到匹配的演员');
      }
      
      const actorsWithTags = await updateActorsWithTags(items);
      console.log('处理标签后的演员数据:', actorsWithTags);
      
      setActors(actorsWithTags);
      setPagination({
        ...pagination,
        current: params.current || current,
        pageSize: params.pageSize || pageSize,
        total
      });
    } catch (err) {
      console.error('获取演员数据失败:', err);
      setError('获取演员数据失败: ' + (err.response?.data?.message || err.message));
      setActors([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    fetchActors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理搜索表单提交
  const handleSearch = (values) => {
    console.log('搜索表单提交的值:', values);
    
    const params = {};
    
    if (values.name) {
      params.name = values.name.trim();
      console.log('搜索姓名:', params.name);
    }
    
    if (values.gender) {
      params.gender = values.gender;
      console.log('搜索性别:', params.gender);
    }
    
    if (values.age && (values.age[0] > 0 || values.age[1] < 120)) {
      params.min_age = values.age[0];
      params.max_age = values.age[1];
      console.log('搜索年龄范围:', params.min_age, '-', params.max_age);
    }
    
    if (values.height && (values.height[0] > 0 || values.height[1] < 200)) {
      params.min_height = values.height[0];
      params.max_height = values.height[1];
      console.log('搜索身高范围:', params.min_height, '-', params.max_height);
    }
    
    if (values.location) {
      params.location = values.location;
      console.log('搜索地域:', params.location);
    }
    
    if (values.tags && values.tags.length > 0) {
      // 后端API期望的是tag_id参数，而不是tags
      params.tag_id = values.tags.join(',');
      params.tag_search_mode = 'any';
      console.log('搜索标签ID:', params.tag_id, '搜索模式:', params.tag_search_mode);
    }
    
    console.log('最终搜索参数:', params);
    
    setSearchParams(params);
    setPagination({
      ...pagination,
      current: 1
    });
    
    fetchActors({
      current: 1,
      pageSize: pagination.pageSize
    });
  };

  // 重置搜索表单
  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    fetchActors({
      current: 1
    });
  };

  // 处理表格变化（分页、筛选、排序）
  const handleTableChange = (pagination, filters, sorter) => {
    fetchActors({
      current: pagination.current,
      pageSize: pagination.pageSize,
    });
  };

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
          await axios.delete(`/api/actors/${actorId}`);
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
    if (!actorTags || actorTags.length === 0) {
      return <span style={{ color: '#999' }}>无标签</span>;
    }
    
    // 确保actorTags是数组
    const tagArray = Array.isArray(actorTags) ? actorTags : [];
    
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {tagArray.map(tag => (
          <Tag color={tag.color || 'blue'} key={tag.id}>
            {tag.name}
          </Tag>
        ))}
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
    return (
      <List.Item
        key={actor.id}
        actions={[
          <Link to={`/actors/${actor.id}`} key="view">
            <Button 
              type="primary" 
              size="small" 
              icon={<EyeOutlined />}
            >
              查看
            </Button>
          </Link>,
          (user?.role === 'admin' || (user?.role === 'manager' && actor.agent_id === user?.id)) && (
            <Link to={`/actors/${actor.id}/edit`} key="edit">
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
              onClick={() => handleDelete(actor.id, actor.real_name)}
              key="delete"
            >
              删除
            </Button>
          )
        ].filter(Boolean)}
      >
        <List.Item.Meta
          avatar={<Avatar size={64} icon={<UserOutlined />} src={actor.avatar_url} />}
          title={
            <Link to={`/actors/${actor.id}`}>
              <strong>{actor.real_name}</strong>
              {actor.stage_name && <span style={{ color: '#888', marginLeft: 8 }}>艺名: {actor.stage_name}</span>}
            </Link>
          }
          description={
            <Space direction="vertical" size={4}>
              <Space>
                {actor.gender === 'male' ? 
                  <Tag icon={<ManOutlined />} color="blue">男</Tag> : 
                  actor.gender === 'female' ? 
                    <Tag icon={<WomanOutlined />} color="pink">女</Tag> : 
                    <Tag color="default">其他</Tag>
                }
                {actor.age && <span>年龄: {actor.age}</span>}
                {actor.height && <span>身高: {actor.height}cm</span>}
              </Space>
              {actor.location && (
                <div>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {actor.location}
                </div>
              )}
              <div>
                状态: {
                  actor.status === 'active' ? <Tag color="green">可接洽</Tag> :
                  actor.status === 'inactive' ? <Tag color="orange">暂不接单</Tag> :
                  actor.status === 'suspended' ? <Tag color="red">已暂停</Tag> :
                  actor.status === 'retired' ? <Tag color="gray">已退役</Tag> :
                  <Tag color="default">未知</Tag>
                }
              </div>
              <div>
                <span style={{ marginRight: 4 }}>标签:</span>
                {renderActorTags(actor.tags)}
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
            <strong>{text}</strong>
          </Link>
          {record.stage_name && <span style={{ color: '#888' }}>艺名: {record.stage_name}</span>}
        </Space>
      ),
      // Excel风格筛选
      filters: actors.map(actor => ({ text: actor.real_name, value: actor.real_name })),
      onFilter: (value, record) => record.real_name.indexOf(value) === 0,
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
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
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
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
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
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || '-',
      responsive: ['md'],
      // Excel风格筛选
      filters: Array.from(new Set(actors.map(actor => actor.location).filter(Boolean))).map(
        location => ({ text: location, value: location })
      ),
      onFilter: (value, record) => record.location === value,
      filterSearch: true,
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => renderActorTags(tags),
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
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              筛选
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
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
                option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {tags.map(tag => (
                <Option 
                  key={tag.id} 
                  value={tag.id}
                  label={tag.name}
                >
                  <Tag color={tag.color || 'blue'}>{tag.name}</Tag>
                </Option>
              ))}
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
          {error && (
            <div style={{ marginBottom: 16, color: 'red' }}>
              {error}
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
          
          {isMobile ? (
            <List
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
              columns={columns}
              dataSource={actors}
              rowKey="id"
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