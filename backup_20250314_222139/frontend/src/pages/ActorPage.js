import React, { useState, useEffect } from 'react';
import { Layout, Button, Table, Space, message, Modal, Form, Input, DatePicker, Popconfirm, Row, Col, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getActors, createActor, updateActorBasicInfo, deleteActor } from '../api/actorApi';
import moment from 'moment';
import { Link } from 'react-router-dom';

const { Content } = Layout;

const ActorPage = () => {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActor, setEditingActor] = useState(null);
  const [form] = Form.useForm();
  
  // 添加显示token的状态
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  
  // 获取并显示token的函数
  const checkToken = () => {
    const currentToken = localStorage.getItem('token');
    setToken(currentToken || '未找到token');
    setShowToken(true);
  };

  useEffect(() => {
    fetchActors();
  }, []);

  const fetchActors = async () => {
    setLoading(true);
    try {
      const data = await getActors();
      setActors(data);
    } catch (error) {
      message.error('获取演员列表失败');
    }
    setLoading(false);
  };

  const handleCreateOrUpdate = async (values) => {
    try {
      if (editingActor) {
        await updateActorBasicInfo(editingActor.id, values);
        message.success('更新演员信息成功');
      } else {
        await createActor(values);
        message.success('创建演员成功');
      }
      setModalVisible(false);
      form.resetFields();
      fetchActors();
    } catch (error) {
      console.error('API错误详情:', error);
      
      // 显示详细错误信息
      let errorMsg = '操作失败';
      if (error.response) {
        errorMsg = `${editingActor ? '更新' : '创建'}演员失败: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data && error.response.data.detail) {
          errorMsg += `, 详情: ${error.response.data.detail}`;
        }
      } else if (error.request) {
        errorMsg = '服务器未响应，请检查网络连接';
      } else {
        errorMsg = `请求错误: ${error.message}`;
      }
      
      message.error(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteActor(id);
      message.success('删除演员成功');
      fetchActors();
    } catch (error) {
      message.error('删除演员失败');
    }
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/actors/${record.id}`}>{text}</Link>,
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      render: (text) => (text === 'male' ? '男' : text === 'female' ? '女' : '其他'),
    },
    {
      title: '生日',
      dataIndex: 'birth_date',
      key: 'birth_date',
      render: (text) => (text ? moment(text).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            onClick={() => {
              setEditingActor(record);
              form.setFieldsValue({
                ...record,
                birth_date: record.birth_date ? moment(record.birth_date) : null,
              });
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个演员吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Content style={{ padding: '0 50px', marginTop: 64 }}>
      <div style={{ background: '#fff', padding: 24, minHeight: 380 }}>
        <Row justify="space-between" style={{ marginBottom: 16 }}>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingActor(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              添加演员
            </Button>
          </Col>
          <Col>
            <Button onClick={checkToken} type="default">
              检查Token状态
            </Button>
          </Col>
        </Row>
        
        {/* 显示token的Modal */}
        <Modal
          title="Token状态"
          open={showToken}
          onCancel={() => setShowToken(false)}
          footer={[
            <Button key="close" onClick={() => setShowToken(false)}>
              关闭
            </Button>
          ]}
        >
          <p>Token存在状态: {token ? '已存在' : '不存在'}</p>
          {token && (
            <>
              <p>Token值(前20字符): {token.substring(0, 20)}...</p>
              <p>Token完整长度: {token.length}字符</p>
            </>
          )}
        </Modal>

        <Table
          columns={columns}
          dataSource={actors}
          rowKey="id"
          loading={loading}
        />

        <Modal
          title={editingActor ? '编辑演员信息' : '添加演员'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOrUpdate}
            initialValues={editingActor || {}}
          >
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="age"
              label="年龄"
              rules={[{ required: true, message: '请输入年龄' }]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item
              name="gender"
              label="性别"
              rules={[{ required: true, message: '请选择性别' }]}
            >
              <Input.Group compact>
                <Input
                  style={{ width: '33%' }}
                  value="male"
                  readOnly
                  onClick={() => form.setFieldsValue({ gender: 'male' })}
                  className={form.getFieldValue('gender') === 'male' ? 'ant-input-selected' : ''}
                >
                  男
                </Input>
                <Input
                  style={{ width: '33%' }}
                  value="female"
                  readOnly
                  onClick={() => form.setFieldsValue({ gender: 'female' })}
                  className={form.getFieldValue('gender') === 'female' ? 'ant-input-selected' : ''}
                >
                  女
                </Input>
                <Input
                  style={{ width: '34%' }}
                  value="other"
                  readOnly
                  onClick={() => form.setFieldsValue({ gender: 'other' })}
                  className={form.getFieldValue('gender') === 'other' ? 'ant-input-selected' : ''}
                >
                  其他
                </Input>
              </Input.Group>
            </Form.Item>
            <Form.Item
              name="birth_date"
              label="生日"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ marginRight: 8 }}>
                {editingActor ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Content>
  );
};

export default ActorPage; 