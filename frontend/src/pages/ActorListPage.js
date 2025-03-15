import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, Card, Button, Space, 
  Empty, Tag, Avatar, message, Tooltip, Modal, List
} from 'antd';
import { 
  UserOutlined, 
  ReloadOutlined, ManOutlined, WomanOutlined, EyeOutlined,
  DeleteOutlined, EditOutlined, ExclamationCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { getActors, deleteActor } from '../api/actorApi';
import { getActorTags } from '../api/tagApi';
import { AuthContext } from '../context/AuthContext';

const ActorListPage = () => {
  const { user } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [isMobile, setIsMobile] = useState(false);

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

  // 获取演员的标签信息并更新演员数据
  const updateActorsWithTags = async (actorsData) => {
    if (!Array.isArray(actorsData) || actorsData.length === 0) return actorsData;
    
    try {
      console.log('开始更新演员标签信息');
      
      // 获取每个演员的标签
      const actorsWithTags = await Promise.all(
        actorsData.map(async (actor) => {
          try {
            console.log(`获取演员 ${actor.id} 的标签信息`);
            const actorTags = await getActorTags(actor.id);
            console.log(`演员 ${actor.id} 的标签信息:`, actorTags);
            
            // 确保标签数据是数组
            const tagArray = Array.isArray(actorTags) ? actorTags : [];
            if (actorTags && !Array.isArray(actorTags) && actorTags.tags && Array.isArray(actorTags.tags)) {
              return { ...actor, tags: actorTags.tags };
            }
            
            return { ...actor, tags: tagArray };
          } catch (error) {
            console.error(`获取演员 ${actor.id} 的标签失败:`, error);
            return { ...actor, tags: [] };
          }
        })
      );
      
      console.log('所有演员标签信息更新完成:', actorsWithTags);
      return actorsWithTags;
    } catch (error) {
      console.error('更新演员标签信息失败:', error);
      return actorsData;
    }
  };

  const fetchActors = useCallback(async (params = {}, newPagination = null) => {
    setLoading(true);
    try {
      // 如果提供了新的分页信息，使用它；否则使用当前状态中的分页
      const paginationToUse = newPagination || pagination;
      
      // 合并所有查询参数
      const queries = {
        skip: (paginationToUse.current - 1) * paginationToUse.pageSize,
        limit: paginationToUse.pageSize,
        include_tags: true, // 确保包含标签信息
        ...params
      };
      
      console.log('发送请求参数:', queries);
      
      // 先获取当前筛选条件下的总数
      const countQueries = { ...queries, count_only: true };
      delete countQueries.skip;  // 不需要跳过
      delete countQueries.limit; // 不需要限制
      
      console.log('获取总数请求参数:', countQueries);
      const countData = await getActors(countQueries);
      console.log('获取总数响应:', countData);
      
      const total = countData && countData.length > 0 && countData[0].total_count ? countData[0].total_count : 0;
      console.log('计算得到总数:', total);
      
      // 获取当前页的数据
      console.log('获取演员列表请求参数:', queries);
      const data = await getActors(queries);
      console.log('获取演员列表响应:', data);
      
      // 确保演员数据包含标签信息
      const actorsWithTags = await updateActorsWithTags(data);
      
      setActors(Array.isArray(actorsWithTags) ? actorsWithTags : []);
      
      // 更新分页信息，包括总数
      setPagination({
        ...paginationToUse,
        total: total
      });
      
      setLoading(false);
    } catch (error) {
      console.error('获取演员列表失败:', error);
      message.error('获取演员列表失败');
      setLoading(false);
    }
  }, [pagination]); // 只依赖pagination

  // 组件挂载时获取数据，只执行一次
  useEffect(() => {
    console.log('演员列表组件首次加载，获取数据');
    fetchActors();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 强制刷新标签数据
  const forceRefreshTags = async () => {
    console.log('强制刷新数据');
    setLoading(true);
    
    try {
      // 重新获取演员数据
      await fetchActors();
      message.success('数据已刷新');
    } catch (error) {
      console.error('强制刷新数据失败:', error);
      message.error('刷新数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理表格分页、排序、筛选变化
  const handleTableChange = (newPagination, filters, sorter) => {
    console.log('表格分页变更:', newPagination);
    // 使用新的分页信息重新获取数据
    fetchActors({}, newPagination);
  };

  // 处理删除演员
  const handleDelete = (actorId, actorName) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除演员 "${actorName}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteActor(actorId);
          message.success(`已删除演员 "${actorName}"`);
          // 重新获取数据
          fetchActors();
        } catch (error) {
          console.error('删除演员失败:', error);
          message.error('删除演员失败');
        }
      }
    });
  };

  // 渲染演员标签
  const renderActorTags = (actorTags) => {
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
  };

  // 移动端列表项渲染
  const renderListItem = (actor) => {
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
  };

  const columns = [
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
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      render: (age) => age || '-',
      responsive: ['sm'],
    },
    {
      title: '身高',
      dataIndex: 'height',
      key: 'height',
      render: (height) => height ? `${height} cm` : '-',
      responsive: ['md'],
    },
    {
      title: '地域',
      dataIndex: 'location',
      key: 'location',
      render: (location) => location || '-',
      responsive: ['md'],
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
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        let text = '未知';
        
        switch (status) {
          case 'active':
            color = 'green';
            text = '可接洽';
            break;
          case 'inactive':
            color = 'orange';
            text = '暂不接单';
            break;
          case 'suspended':
            color = 'red';
            text = '已暂停';
            break;
          case 'retired':
            color = 'gray';
            text = '已退役';
            break;
          default:
            break;
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
      responsive: ['sm'],
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
  ];

  return (
    <div className="actor-list-page">
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>演员列表</span>
            <Space>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={forceRefreshTags}
                title="刷新数据"
              >
                刷新数据
              </Button>
              <Link to="/actors/search">
                <Button type="primary">
                  高级搜索
                </Button>
              </Link>
            </Space>
          </div>
        } 
        style={{ marginBottom: 16 }}
      >
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
      </Card>
    </div>
  );
};

export default ActorListPage;