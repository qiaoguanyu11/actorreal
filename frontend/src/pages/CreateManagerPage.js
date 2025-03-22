import React, { useState, useContext } from 'react';
import { Card, Form, Input, Button, message, Spin, Alert } from 'antd';
import { UserOutlined, PhoneOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons';
import { createManager } from '../api/userApi';
import { AuthContext } from '../context/AuthContext';

const CreateManagerPage = () => {
  const { isAdmin } = useContext(AuthContext);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const userData = {
        username: values.username,
        phone: values.phone,
        password: values.password
      };
      
      await createManager(userData);
      setSuccess(true);
      message.success('经纪人账号创建成功');
      form.resetFields();
    } catch (error) {
      console.error('创建经纪人账号失败:', error);
      setError(error.response?.data?.detail || '创建经纪人账号失败，请稍后再试');
      message.error('创建经纪人账号失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          <span>创建经纪人账号</span>
        </div>
      }
      style={{ maxWidth: 600, margin: '0 auto' }}
    >
      {!isAdmin && (
        <Alert
          message="权限不足"
          description="只有管理员可以创建经纪人账号"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {success && (
        <Alert
          message="创建成功"
          description="经纪人账号已成功创建"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setSuccess(false)}
        />
      )}
      
      {error && (
        <Alert
          message="创建失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}
      
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={!isAdmin}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名!' },
              { min: 3, message: '用户名至少3个字符!' },
              { max: 50, message: '用户名最多50个字符!' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号!' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号!' }
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码至少6个字符!' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不匹配!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请确认密码" />
          </Form.Item>
          
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<TeamOutlined />}
              loading={loading}
              block
            >
              创建经纪人账号
            </Button>
          </Form.Item>
        </Form>
      </Spin>
      
      <div style={{ marginTop: 16 }}>
        <p style={{ color: '#888', textAlign: 'center' }}>
          经纪人可以管理旗下演员的信息，签约演员，查看演员详情。
        </p>
      </div>
    </Card>
  );
};

export default CreateManagerPage; 