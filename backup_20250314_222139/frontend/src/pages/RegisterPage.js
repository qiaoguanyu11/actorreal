import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;

const RegisterPage = () => {
  const { register, loading } = useContext(AuthContext);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [registerError, setRegisterError] = useState(null);

  const onFinish = async (values) => {
    setRegisterError(null);
    try {
      const userData = {
        username: values.username,
        email: values.email,
        password: values.password,
        role: 'performer' // 默认注册为演员角色
      };
      
      const success = await register(userData);
      if (success) {
        navigate('/login');
      }
    } catch (error) {
      setRegisterError(error.response?.data?.detail || '注册失败，请稍后再试');
    }
  };

  return (
    <div className="register-page">
      <Card style={{ width: 400, padding: '20px' }}>
        <Title level={2} style={{ textAlign: 'center' }}>注册</Title>
        
        {registerError && (
          <Alert
            message={registerError}
            type="error"
            style={{ marginBottom: 24 }}
            showIcon
            closable
            onClose={() => setRegisterError(null)}
          />
        )}
        
        <Spin spinning={loading}>
          <Form
            form={form}
            name="register"
            className="register-form"
            onFinish={onFinish}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符!' },
                { max: 50, message: '用户名最多50个字符!' }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱!' },
                { type: 'email', message: '请输入有效的邮箱地址!' }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="邮箱" 
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6个字符!' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
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
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-form-button" size="large" loading={loading}>
                注册
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'center' }}>
              已有账号? <Link to="/login">立即登录</Link>
            </div>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default RegisterPage; 