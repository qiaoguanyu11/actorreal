import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Table, Card, Button, Space, Tag, Avatar, message, 
  Tooltip, Spin, Input, Row, Col, Form, Select, Modal, Typography
} from 'antd';
import { 
  UserOutlined, SearchOutlined, TeamOutlined, 
  EyeOutlined, CheckOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import { getActorsWithoutAgent, assignActorToAgent } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';
import { getManagerList } from '../api/userApi';
import { authGet } from '../api/axiosHelper';

const { Option } = Select;

const UnassignedActorsPage = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm();

  // 添加新的状态
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState(null);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [loadingManagers, setLoadingManagers] = useState(false);

  // 提取fetchData函数到useEffect外部
  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      console.log('获取未签约演员数据，参数:', { 
        without_agent: true,
        skip: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize,
        ...params
      });
      
      // 获取演员总数
      try {
        const countResponse = await getActorsWithoutAgent({ 
          without_agent: true, 
          count_only: true,
          ...params
        });
        console.log('获取到的未签约演员计数结果:', countResponse);
        
        let total = 0;
        if (Array.isArray(countResponse) && countResponse.length > 0) {
          total = countResponse[0].total_count || 0;
        } else if (countResponse && countResponse.total) {
          total = countResponse.total;
        }
        
        console.log('未签约演员总数:', total);
        setPagination(prev => ({
          ...prev,
          total
        }));
      } catch (countError) {
        console.error('获取演员总数失败:', countError);
      }
      
      // 获取演员列表
      const token = localStorage.getItem('token');
      console.log('当前使用的token:', token);
      
      const response = await getActorsWithoutAgent({
        without_agent: true,
        skip: (pagination.current - 1) * pagination.pageSize,
        limit: pagination.pageSize,
        ...params
      });
      
      console.log('获取到的未签约演员数据:', response);
      
      // 处理响应数据
      let actorsData = [];
      if (Array.isArray(response)) {
        actorsData = response;
      } else if (response && response.items) {
        actorsData = response.items;
      }
      
      setActors(actorsData);
      
      // 获取可用的经纪人列表
      const managersData = await getManagerList();
      console.log('获取到的经纪人数据:', managersData);
      setManagers(Array.isArray(managersData) ? managersData : []);
    } catch (error) {
      console.error('获取未签约演员失败:', error);
      console.error('错误详情:', error.response?.data);
      message.error('获取未签约演员失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.current, pagination.pageSize]);

  const handleTableChange = (newPagination, filters, sorter) => {
    console.log('表格分页变更:', newPagination);
    // 使用新的分页信息重新获取数据
    setPagination(newPagination);
    fetchData();
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
    setPagination({
      ...pagination,
      current: 1
    });
    
    fetchData(params);
  };

  // 获取经纪人列表
  const fetchManagers = async () => {
    if (!isAdmin) return;
    
    setLoadingManagers(true);
    try {
      console.log('获取经纪人列表...');
      const data = await getManagerList();
      console.log('获取经纪人列表成功:', data);
      setManagers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('获取经纪人列表失败:', error);
      message.error('获取经纪人列表失败，请稍后重试');
      setManagers([]); // 设置为空数组
    } finally {
      setLoadingManagers(false);
    }
  };
  
  useEffect(() => {
    if (isAdmin) {
      fetchManagers();
    }
  }, [isAdmin]);

  const handleAssignToMe = async (actorId) => {
    // 如果是管理员，显示选择经纪人的对话框
    if (isAdmin) {
      setSelectedActorId(actorId);
      setAssignModalVisible(true);
      return;
    }
    
    // 如果是经纪人，直接签约到自己名下
    setAssigning(true);
    try {
      await assignActorToAgent(actorId, user.id);
      message.success('演员签约成功');
      
      // 刷新列表
      fetchData();
    } catch (error) {
      console.error('签约演员失败:', error);
      message.error('签约演员失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setAssigning(false);
    }
  };
  
  // 添加分配演员给选定经纪人的函数
  const handleAssignToManager = async () => {
    if (!selectedActorId || !selectedManager) {
      message.error('请选择要分配的经纪人');
      return;
    }
    
    setAssigning(true);
    try {
      await assignActorToAgent(selectedActorId, selectedManager);
      message.success('演员签约成功');
      setAssignModalVisible(false);
      setSelectedActorId(null);
      setSelectedManager(null);
      
      // 刷新列表
      fetchData();
    } catch (error) {
      console.error('签约演员失败:', error);
      message.error('签约演员失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setAssigning(false);
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
          icon={<UserOutlined />} 
          src={avatar_url} 
        />
      ),
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
        <Tag color={gender === 'male' ? 'blue' : gender === 'female' ? 'pink' : 'default'}>
          {gender === 'male' ? '男' : gender === 'female' ? '女' : '其他'}
        </Tag>
      ),
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      render: (age) => age || '-',
    },
    {
      title: '身高',
      dataIndex: 'height',
      key: 'height',
      render: (height) => height ? `${height} cm` : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Link to={`/actors/${record.id}`}>
              <Button type="primary" icon={<EyeOutlined />} size="small">
                详情
              </Button>
            </Link>
          </Tooltip>
          
          <Tooltip title={isAdmin ? "分配给经纪人" : "签约到我的名下"}>
            <Button 
              type="default" 
              icon={<TeamOutlined />} 
              size="small"
              onClick={() => handleAssignToMe(record.id)}
              loading={assigning}
            >
              {isAdmin ? "分配经纪人" : "签约"}
            </Button>
          </Tooltip>
        </Space>
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

      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            <span>无经纪人演员列表</span>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={actors}
            rowKey="id"
            pagination={pagination}
            onChange={handleTableChange}
            locale={{
              emptyText: '暂无可签约演员'
            }}
          />
        </Spin>
        
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ color: '#888' }}>
            提示：点击"签约"按钮可将演员签约到您的名下管理
          </span>
        </div>
      </Card>
      
      {/* 添加选择经纪人的对话框 */}
      <Modal
        title="选择经纪人"
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedActorId(null);
          setSelectedManager(null);
        }}
        onOk={handleAssignToManager}
        confirmLoading={assigning}
      >
        <Form layout="vertical">
          <Form.Item 
            label="选择经纪人" 
            required
            help="请选择要将演员分配给哪位经纪人"
          >
            <Select
              placeholder="请选择经纪人"
              loading={loadingManagers}
              value={selectedManager}
              onChange={setSelectedManager}
              style={{ width: '100%' }}
            >
              {managers.map(manager => (
                <Select.Option key={manager.id} value={manager.id}>
                  {manager.username} {manager.nickname ? `(${manager.nickname})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnassignedActorsPage; 