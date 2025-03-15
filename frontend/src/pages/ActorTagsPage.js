import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Table, Button, message, Typography, 
  Input, Tag, Row, Col, Space
} from 'antd';
import { SearchOutlined, TagsOutlined, ReloadOutlined } from '@ant-design/icons';
import { getActors } from '../api/actorApi';
import { getTags, getActorTags } from '../api/tagApi';
import ActorTagsManager from '../components/ActorTagsManager';

const { Title } = Typography;

const ActorTagsPage = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedActor, setSelectedActor] = useState(null);
  const [tagFilters, setTagFilters] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取演员列表和标签
  const fetchActorsWithTags = useCallback(async () => {
    setLoading(true);
    try {
      console.log('获取演员列表和标签数据');
      const actorsData = await getActors();
      
      // 获取每个演员的标签
      const actorsWithTags = await Promise.all(
        actorsData.map(async (actor) => {
          try {
            console.log(`获取演员 ${actor.id} 的标签`);
            const actorTags = await getActorTags(actor.id);
            console.log(`演员 ${actor.id} 的标签:`, actorTags);
            return { ...actor, tags: actorTags };
          } catch (error) {
            console.error(`获取演员 ${actor.id} 的标签失败:`, error);
            return { ...actor, tags: [] };
          }
        })
      );
      
      console.log('所有演员数据和标签:', actorsWithTags);
      setActors(actorsWithTags);
    } catch (error) {
      message.error('获取演员列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取所有标签
  const fetchTags = useCallback(async () => {
    try {
      console.log('获取所有标签');
      const data = await getTags();
      console.log('获取到的所有标签:', data);
      
      // 生成标签筛选选项
      const filters = data.map(tag => ({
        text: tag.name,
        value: tag.id
      }));
      setTagFilters(filters);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    }
  }, []);

  // 强制刷新数据
  const forceRefresh = useCallback(async () => {
    console.log('强制刷新数据');
    setLoading(true);
    try {
      await fetchTags();
      await fetchActorsWithTags();
      message.success('数据已刷新');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('刷新数据失败:', error);
      message.error('刷新数据失败');
    } finally {
      setLoading(false);
    }
  }, [fetchTags, fetchActorsWithTags]);

  useEffect(() => {
    fetchActorsWithTags();
    fetchTags();
  }, [fetchActorsWithTags, fetchTags, refreshKey]);

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      render: (text, record) => (
        <span>
          {text}
          {record.stage_name && ` (${record.stage_name})`}
        </span>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 80,
      render: (text) => text === 'male' ? '男' : text === 'female' ? '女' : '其他',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags, record) => {
        console.log(`渲染演员 ${record.id} 的标签:`, tags);
        // 确保标签数据是数组
        const tagArray = Array.isArray(tags) ? tags : [];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tagArray.length > 0 ? (
              tagArray.map(tag => (
                <Tag color={tag.color || "blue"} key={tag.id}>
                  {tag.name}
                </Tag>
              ))
            ) : (
              <span style={{ color: '#999' }}>无标签</span>
            )}
          </div>
        );
      },
      filters: tagFilters,
      onFilter: (value, record) => {
        return record.tags && record.tags.some(tag => tag.id === value);
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => setSelectedActor(record)}
        >
          管理标签
        </Button>
      ),
    },
  ];

  // 搜索过滤
  const filteredActors = actors.filter(actor => {
    const searchLower = searchText.toLowerCase();
    return (
      actor.real_name.toLowerCase().includes(searchLower) ||
      (actor.stage_name && actor.stage_name.toLowerCase().includes(searchLower))
    );
  });

  // 当标签管理器关闭时刷新数据
  const handleTagManagerClose = () => {
    setSelectedActor(null);
    forceRefresh();
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={selectedActor ? 12 : 24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={4}>演员标签管理</Title>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={forceRefresh}
                  loading={loading}
                >
                  刷新
                </Button>
                <Input 
                  placeholder="搜索演员" 
                  prefix={<SearchOutlined />} 
                  style={{ width: 200 }}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                />
              </Space>
            </div>

            <Table
              columns={columns}
              dataSource={filteredActors}
              rowKey="id"
              loading={loading}
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 个演员`
              }}
            />
          </Card>
        </Col>

        {selectedActor && (
          <Col span={12}>
            <Card 
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TagsOutlined style={{ marginRight: 8 }} />
                  <span>
                    {selectedActor.real_name}
                    {selectedActor.stage_name && ` (${selectedActor.stage_name})`}
                    的标签
                  </span>
                </div>
              }
              extra={
                <Button 
                  size="small" 
                  onClick={handleTagManagerClose}
                >
                  关闭
                </Button>
              }
              styles={{ body: { padding: '16px' } }}
            >
              <ActorTagsManager 
                actorId={selectedActor.id} 
                key={`${selectedActor.id}-${refreshKey}`}
                onTagsChanged={forceRefresh}
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ActorTagsPage; 