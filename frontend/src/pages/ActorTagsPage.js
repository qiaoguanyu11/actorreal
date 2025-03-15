import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Button, message, Typography, 
  Input, Tag, Row, Col
} from 'antd';
import { SearchOutlined, TagsOutlined } from '@ant-design/icons';
import { getActors } from '../api/actorApi';
import { getTags } from '../api/tagApi';
import ActorTagsManager from '../components/ActorTagsManager';

const { Title } = Typography;

const ActorTagsPage = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedActor, setSelectedActor] = useState(null);
  const [tagFilters, setTagFilters] = useState([]);

  // 获取演员列表
  const fetchActors = async () => {
    setLoading(true);
    try {
      const data = await getActors();
      setActors(data);
    } catch (error) {
      message.error('获取演员列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有标签
  const fetchTags = async () => {
    try {
      const data = await getTags();
      
      // 生成标签筛选选项
      const filters = data.map(tag => ({
        text: tag.name,
        value: tag.id
      }));
      setTagFilters(filters);
    } catch (error) {
      console.error('获取标签列表失败:', error);
    }
  };

  useEffect(() => {
    fetchActors();
    fetchTags();
  }, []);

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
      render: (tags) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags && tags.length > 0 ? (
            tags.map(tag => (
              <Tag color="blue" key={tag.id}>
                {tag.name}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>无标签</span>
          )}
        </div>
      ),
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

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={selectedActor ? 12 : 24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={4}>演员标签管理</Title>
              <Input 
                placeholder="搜索演员" 
                prefix={<SearchOutlined />} 
                style={{ width: 200 }}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
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
                  onClick={() => setSelectedActor(null)}
                >
                  关闭
                </Button>
              }
              styles={{ body: { padding: '16px' } }}
            >
              <ActorTagsManager actorId={selectedActor.id} />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ActorTagsPage; 