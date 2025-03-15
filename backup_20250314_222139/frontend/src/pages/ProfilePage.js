import React, { useContext, useState } from 'react';
import { Card, Descriptions, Button, Form, Input, Modal, message, Tabs, List, Space, Tag, Spin } from 'antd';
import { EditOutlined, UserOutlined, MailOutlined, LockOutlined, KeyOutlined, LoadingOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';
import { updateUser } from '../api/userApi';

const { TabPane } = Tabs;

const ProfilePage = () => {
  const { user, fetchUserProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleEditProfile = async (values) => {
    setLoading(true);
    try {
      await updateUser(user.id, {
        username: values.username,
        email: values.email
      });
      message.success('个人资料更新成功');
      fetchUserProfile();
      setEditModalVisible(false);
    } catch (error) {
      console.error('更新个人资料失败:', error);
      message.error('更新个人资料失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await updateUser(user.id, {
        password: values.newPassword
      });
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error('密码修改失败:', error);
      message.error('密码修改失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
        />
        <div style={{ marginTop: '10px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <Card
        title="个人资料"
        extra={
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({
                username: user.username,
                email: user.email
              });
              setEditModalVisible(true);
            }}
          >
            编辑资料
          </Button>
        }
      >
        <Tabs defaultActiveKey="basic">
          <TabPane tab="基本信息" key="basic">
            <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
              <Descriptions.Item label="角色">
                {user.role === 'admin' ? (
                  <Tag color="red">管理员</Tag>
                ) : user.role === 'manager' ? (
                  <Tag color="blue">经纪人</Tag>
                ) : (
                  <Tag color="green">演员</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {user.status === 'active' ? (
                  <Tag color="green">正常</Tag>
                ) : user.status === 'inactive' ? (
                  <Tag color="orange">未激活</Tag>
                ) : (
                  <Tag color="red">已禁用</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(user.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {new Date(user.updated_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <Button 
                type="default" 
                icon={<KeyOutlined />}
                onClick={() => setPasswordModalVisible(true)}
              >
                修改密码
              </Button>
            </div>
          </TabPane>

          <TabPane tab="权限信息" key="permissions">
            {user.permissions && user.permissions.length > 0 ? (
              <List
                bordered
                dataSource={user.permissions}
                renderItem={item => (
                  <List.Item>
                    <Tag color="blue">{item.permission}</Tag>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Space direction="vertical">
                  <p>暂无特殊权限</p>
                </Space>
              </div>
            )}
          </TabPane>
        </Tabs>
      </Card>

      {/* 编辑个人资料模态框 */}
      <Modal
        title="编辑个人资料"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleEditProfile}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符' }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            
            <Form.Item
              name="email"
              label="电子邮箱"
              rules={[
                { required: true, message: '请输入电子邮箱!' },
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="电子邮箱" />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setEditModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
      >
        <Spin spinning={loading}>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码!' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: '请确认密码!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不匹配!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setPasswordModalVisible(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  修改密码
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
};

export default ProfilePage; 