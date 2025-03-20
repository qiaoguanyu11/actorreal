import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  message,
  Popconfirm,
  Card,
  Form,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getInviteCodes,
  createInviteCode,
  updateInviteCode,
  deleteInviteCode,
} from '../api/inviteCode';

const InviteCodeManager = () => {
  const [inviteCodes, setInviteCodes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchInviteCodes = async () => {
    try {
      setLoading(true);
      const data = await getInviteCodes();
      setInviteCodes(data);
    } catch (error) {
      message.error('获取邀请码列表失败');
      console.error('Error fetching invite codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const handleCreateCode = async () => {
    try {
      const values = await form.validateFields();
      if (values.code.length !== 6 || !/^\d+$/.test(values.code)) {
        message.error('邀请码必须是6位数字');
        return;
      }

      setLoading(true);
      if (editingId) {
        await updateInviteCode(editingId, { code: values.code });
        message.success('邀请码更新成功');
      } else {
        await createInviteCode(values.code);
        message.success('邀请码创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchInviteCodes();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error(editingId ? '更新邀请码失败' : '创建邀请码失败');
      }
      console.error('Error handling invite code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (id) => {
    try {
      setLoading(true);
      await deleteInviteCode(id);
      message.success('邀请码删除成功');
      fetchInviteCodes();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('删除邀请码失败');
      }
      console.error('Error deleting invite code:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '邀请码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          active: '可用',
          used: '已使用',
          inactive: '已禁用',
        };
        return statusMap[status] || status;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record.status !== 'used' && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingId(record.id);
                  form.setFieldsValue({ code: record.code });
                  setIsModalVisible(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个邀请码吗？"
                onConfirm={() => handleDeleteCode(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="邀请码管理" style={{ margin: '24px' }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setEditingId(null);
          form.resetFields();
          setIsModalVisible(true);
        }}
        style={{ marginBottom: 16 }}
      >
        生成新邀请码
      </Button>

      <Table
        columns={columns}
        dataSource={inviteCodes}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title={editingId ? '编辑邀请码' : '生成新邀请码'}
        open={isModalVisible}
        onOk={handleCreateCode}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingId(null);
        }}
        confirmLoading={loading}
      >
        <Form form={form}>
          <Form.Item
            name="code"
            rules={[
              { required: true, message: '请输入邀请码' },
              {
                pattern: /^\d{6}$/,
                message: '邀请码必须是6位数字',
              },
            ]}
          >
            <Input
              placeholder="请输入6位数字邀请码"
              maxLength={6}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InviteCodeManager; 