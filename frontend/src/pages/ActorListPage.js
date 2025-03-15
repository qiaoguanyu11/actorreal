import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Table, Card, Input, Button, Space, Row, Col, 
  Select, Form, Slider, Empty, Tag, Avatar, message, Tooltip, Modal
} from 'antd';
import { 
  SearchOutlined, UserOutlined, FilterOutlined, 
  ReloadOutlined, ManOutlined, WomanOutlined, EyeOutlined,
  DeleteOutlined, EditOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { getActors, deleteActor } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;

const ActorListPage = () => {
  const { user } = useContext(AuthContext);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [form] = Form.useForm();

  const fetchActors = useCallback(async (params = {}, newPagination = null) => {
    setLoading(true);
    try {
      // 如果提供了新的分页信息，使用它；否则使用当前状态中的分页
      const paginationToUse = newPagination || pagination;
      
      const queries = {
        skip: (paginationToUse.current - 1) * paginationToUse.pageSize,
        limit: paginationToUse.pageSize,
        ...searchParams,
        ...params
      };
      
      console.log('发送请求参数:', queries);
      
      // 先获取当前筛选条件下的总数
      const countQueries = { ...queries, count_only: true };
      delete countQueries.skip;  // 不需要跳过
      delete countQueries.limit; // 不需要限制
      const countData = await getActors(countQueries);
      const total = countData && countData.length > 0 && countData[0].total_count ? countData[0].total_count : 0;
      console.log('获取总数结果:', total);
      
      // 获取当前页的数据
      const data = await getActors(queries);
      console.log('获取演员列表结果:', data);
      
      setActors(Array.isArray(data) ? data : []);
      
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // 只依赖searchParams，移除pagination依赖

  // 组件挂载时获取数据，只执行一次
  useEffect(() => {
    console.log('演员列表组件首次加载，获取数据');
    fetchActors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 当搜索参数变化时重新获取数据
  useEffect(() => {
    console.log('搜索参数变化，重新获取数据');
    fetchActors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // 只依赖searchParams

  // 处理表格分页、排序、筛选变化
  const handleTableChange = (newPagination, filters, sorter) => {
    console.log('表格分页变更:', newPagination);
    // 使用新的分页信息重新获取数据
    fetchActors({}, newPagination);
  };

  const handleSearch = (values) => {
    const params = {};
    
    if (values.name) {
      params.name = values.name;
    }
    
    if (values.gender) {
      params.gender = values.gender;
    }
    
    if (values.age) {
      params.age_min = values.age[0];
      params.age_max = values.age[1];
    }
    
    if (values.height) {
      params.height_min = values.height[0];
      params.height_max = values.height[1];
    }
    
    setSearchParams(params);
    
    // 重置分页到第一页并使用新的筛选条件获取数据
    const newPagination = {
      ...pagination,
      current: 1
    };
    
    fetchActors(params, newPagination);
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    
    // 重置分页到第一页并清除筛选条件
    const newPagination = {
      ...pagination,
      current: 1
    };
    
    fetchActors({}, newPagination);
  };

  // 处理删除演员
  const handleDelete = (actorId, actorName) => {
    Modal.confirm({
      title: '确认删除演员',
      icon: <ExclamationCircleOutlined />,
      content: `您确定要删除演员 "${actorName}" 吗？此操作不可逆。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteActor(actorId);
          message.success('演员删除成功');
          // 重新加载数据
          fetchActors();
        } catch (error) {
          console.error('删除演员失败:', error);
          message.error('删除演员失败，请重试');
        }
      }
    });
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
      render: (age) => age || '-',
    },
    {
      title: '身高',
      dataIndex: 'height',
      key: 'height',
      render: (height) => height ? `${height} cm` : '-',
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
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="查看详情">
            <Link to={`/actors/${record.id}`}>
              <Button icon={<EyeOutlined />} />
            </Link>
          </Tooltip>
          <Tooltip title="编辑">
            <Link to={`/actors/${record.id}/edit`}>
              <Button icon={<EditOutlined />} />
            </Link>
          </Tooltip>
          {user.role === 'admin' && (
            <Tooltip title="删除">
              <Button 
                icon={<DeleteOutlined />} 
                danger
                onClick={() => handleDelete(record.id, record.real_name)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="演员列表" style={{ marginBottom: 20 }}>
        <Form
          form={form}
          name="actor_search"
          layout="vertical"
          onFinish={handleSearch}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="name" label="姓名搜索">
                <Input placeholder="输入姓名或艺名" prefix={<SearchOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="gender" label="性别">
                <Select placeholder="选择性别" allowClear>
                  <Option value="male">男</Option>
                  <Option value="female">女</Option>
                  <Option value="other">其他</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="age" label="年龄范围">
                <Slider range min={16} max={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="height" label="身高范围 (cm)">
                <Slider range min={150} max={200} />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" htmlType="submit" icon={<FilterOutlined />}>
                  筛选
                </Button>
                <Button onClick={handleReset} icon={<ReloadOutlined />}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card>
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
          loading={loading}
          onChange={handleTableChange}
          locale={{
            emptyText: <Empty description="暂无演员数据" />
          }}
        />
      </Card>
    </div>
  );
};

export default ActorListPage;