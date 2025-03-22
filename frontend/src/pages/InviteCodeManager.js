import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  message,
  Popconfirm,
  Card,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  getInviteCodes,
  createInviteCode,
  deleteInviteCode,
} from '../api/inviteCode';

const InviteCodeManager = () => {
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(false);

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
      setLoading(true);
      await createInviteCode();
      message.success('邀请码创建成功');
      fetchInviteCodes();
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('创建邀请码失败');
      }
      console.error('Error creating invite code:', error);
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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
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
        </Space>
      ),
    },
  ];

  return (
    <Card title="邀请码管理" style={{ margin: '24px' }}>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleCreateCode}
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
    </Card>
  );
};

export default InviteCodeManager; 