import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Alert, Spin, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;

const LoginPage = () => {
  const { login, guestLogin, error, loading } = useContext(AuthContext);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState(null);

  const onFinish = async (values) => {
    setLoginError(null);
    const success = await login(values.username, values.password);
    if (success) {
      navigate('/');
    } else {
      setLoginError('登录失败，请检查用户名和密码');
    }
  };

  const handleGuestLogin = async () => {
    setLoginError(null);
    const success = await guestLogin();
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="login-page">
      <Card style={{ width: 400, padding: '20px' }}>
        <Title level={2} style={{ textAlign: 'center' }}>登录</Title>
        
        {loginError && (
          <Alert
            message={loginError}
            type="error"
            style={{ marginBottom: 24 }}
            showIcon
            closable
            onClose={() => setLoginError(null)}
          />
        )}
        
        <Spin spinning={loading}>
          <Form
            form={form}
            name="login"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-form-button" size="large" loading={loading}>
                登录
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'center' }}>
              还没有账号? <Link to="/register">立即注册</Link>
            </div>
          </Form>
          
          <Divider>或者</Divider>
          
          <Button 
            type="default" 
            block 
            size="large" 
            onClick={handleGuestLogin} 
            loading={loading}
          >
            访客登录
          </Button>
        </Spin>
      </Card>
    </div>
  );
};

export default LoginPage; 