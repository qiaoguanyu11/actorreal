import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Table, Card, Input, Button, Space, Row, Col, 
  Select, Form, Avatar, message, Tag, Modal, Spin, Typography 
} from 'antd';
import { 
  SearchOutlined, TeamOutlined, UserSwitchOutlined, 
  CheckOutlined, ManOutlined, WomanOutlined 
} from '@ant-design/icons';
import { getActorsWithoutAgent, assignActorToAgent } from '../api/actorApi';
import { getManagerList } from '../api/userApi';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;
const { Title } = Typography;

const UnassignedActorsPage = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [searchParams, setSearchParams] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [form] = Form.useForm();
  
  // 经纪人分配相关状态
  const [managers, setManagers] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);
  const [selectedManager, setSelectedManager] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchUnassignedActors = async (params = {}, newPagination = null) => {
    setLoading(true);
    try {
      // 如果提供了新的分页信息，使用它；否则使用当前状态中的分页
      const paginationToUse = newPagination || pagination;
      
      const queries = {
        skip: (paginationToUse.current - 1) * paginationToUse.pageSize,
        limit: paginationToUse.pageSize,
        without_agent: true, // 关键参数，获取无经纪人的演员
        ...searchParams,
        ...params
      };
      
      // 获取总数
      try {
        const countQueries = { 
          without_agent: true,
          count_only: true,
          ...searchParams
        };
        const countData = await getActorsWithoutAgent(countQueries);
        if (countData && countData.length > 0 && countData[0].total_count) {
          setPagination(prev => ({
            ...prev,
            total: countData[0].total_count
          }));
        }
      } catch (countErr) {
        console.error('获取总数失败:', countErr);
      }
      
      // 获取当前页的数据
      const data = await getActorsWithoutAgent(queries);
      setActors(Array.isArray(data) ? data : []);
      
      setLoading(false);
    } catch (error) {
      console.error('获取无经纪人演员列表失败:', error);
      message.error('获取无经纪人演员列表失败');
      setLoading(false);
    }
  };

  // 组件挂载和依赖项变化时重新获取数据
  useEffect(() => {
    fetchUnassignedActors();
  }, []);  // 仅在组件挂载时执行一次

  const handleTableChange = (newPagination, filters, sorter) => {
    // 使用新的分页信息重新获取数据
    fetchUnassignedActors({}, newPagination);
  };

  const handleSearch = (values) => {
    const params = {};
    
    if (values.name) {
      params.name = values.name;
    }
    
    if (values.gender) {
      params.gender = values.gender;
    }
    
    setSearchParams(params);
    
    // 重置分页到第一页并使用新的筛选条件获取数据
    const newPagination = {
      ...pagination,
      current: 1
    };
    
    fetchUnassignedActors(params, newPagination);
  };

  // 获取经纪人列表
  const fetchManagers = async () => {
    if (!isAdmin) return;
    
    setLoadingManagers(true);
    try {
      const data = await getManagerList();
      setManagers(data || []);
    } catch (error) {
      console.error('获取经纪人列表失败:', error);
      message.error('获取经纪人列表失败');
    } finally {
      setLoadingManagers(false);
    }
  };
  
  useEffect(() => {
    if (isAdmin) {
      fetchManagers();
    }
  }, [isAdmin]);

  // 处理演员分配给经纪人的操作
  const handleAssignToAgent = async () => {
    if (!selectedActor || !selectedManager) {
      message.warning('请选择演员和经纪人');
      return;
    }
    
    setAssignLoading(true);
    try {
      await assignActorToAgent(selectedActor.id, selectedManager);
      message.success(`成功将演员 ${selectedActor.real_name || selectedActor.stage_name} 分配给经纪人！`);
      setAssignModalVisible(false);
      
      // 刷新演员列表
      fetchUnassignedActors();
    } catch (error) {
      console.error('分配演员给经纪人失败:', error);
      message.error(`分配演员失败: ${error.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      render: (avatar_url) => (
        <Avatar 
          size={64} 
          src={avatar_url} 
          style={{ border: '1px solid #f0f0f0' }}
        />
      ),
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <strong>{text || record.stage_name}</strong>
          {record.stage_name && record.real_name && <span style={{ color: '#888' }}>艺名: {record.stage_name}</span>}
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
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<UserSwitchOutlined />}
          onClick={() => {
            setSelectedActor(record);
            setAssignModalVisible(true);
          }}
        >
          分配经纪人
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card title="可签约演员" style={{ marginBottom: 20 }}>
        <Form
          form={form}
          name="search_form"
          layout="vertical"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="name" label="姓名搜索">
                <Input placeholder="输入姓名或艺名" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="gender" label="性别">
                <Select placeholder="选择性别" allowClear>
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={8} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Form.Item style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} block>
                  搜索
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title={<Title level={4}><TeamOutlined /> 待签约演员列表</Title>}>
        <Table
          columns={columns}
          dataSource={actors}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50']
          }}
          onChange={handleTableChange}
          loading={loading}
          locale={{
            emptyText: '暂无可签约演员'
          }}
        />
      </Card>

      <Modal
        title="分配经纪人"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={assignLoading}
            onClick={handleAssignToAgent}
          >
            确认分配
          </Button>
        ]}
      >
        <Spin spinning={loadingManagers}>
          {selectedActor && (
            <div style={{ marginBottom: 20 }}>
              <p>正在为演员 <strong>{selectedActor.real_name || selectedActor.stage_name}</strong> 分配经纪人</p>
              
              <Form.Item label="选择经纪人" required>
                <Select
                  placeholder="请选择经纪人"
                  style={{ width: '100%' }}
                  onChange={setSelectedManager}
                >
                  {managers.map(manager => (
                    <Option key={manager.id} value={manager.id}>
                      {manager.name || manager.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default UnassignedActorsPage; 