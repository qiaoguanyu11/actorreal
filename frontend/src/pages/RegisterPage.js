import React, { useState } from 'react';
import { Form, Input, Button, message, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, KeyOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { register } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css';

const RegisterPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await register(values);
      message.success('注册成功！请登录');
      navigate('/login');
    } catch (error) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('注册失败，请稍后重试');
      }
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h1>演员注册</h1>
        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          scrollToFirstError
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名！' },
              { min: 3, message: '用户名至少3个字符！' },
              { max: 20, message: '用户名最多20个字符！' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[
              { required: true, message: '请输入手机号！' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号！' }
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="手机号"
              size="large"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码！' },
              { min: 6, message: '密码至少6个字符！' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="invite_code"
            rules={[
              { required: true, message: '请输入邀请码！' },
              { len: 6, message: '邀请码必须是6位！' }
            ]}
            extra={
              <div className="invite-code-tip">
                <Tooltip title="请联系经纪人获取邀请码">
                  <QuestionCircleOutlined /> 没有邀请码？
                </Tooltip>
              </div>
            }
          >
            <Input
              prefix={<KeyOutlined />}
              placeholder="经纪人邀请码"
              size="large"
              maxLength={6}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              size="large"
            >
              注册
            </Button>
            <div className="form-footer">
              已有账号？<a href="/login">立即登录</a>
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default RegisterPage; 