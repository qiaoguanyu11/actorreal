import React, { useState, useContext, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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
      <Card 
        style={{ 
          width: isMobile ? '90%' : 400, 
          padding: isMobile ? '12px' : '20px',
          borderRadius: isMobile ? '8px' : '2px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        <Title level={isMobile ? 3 : 2} style={{ textAlign: 'center', marginBottom: isMobile ? '16px' : '24px' }}>登录</Title>
        
        {loginError && (
          <Alert
            message={loginError}
            type="error"
            style={{ marginBottom: isMobile ? 16 : 24 }}
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
            size={isMobile ? "middle" : "large"}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名!' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>
            
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="login-form-button" 
                size={isMobile ? "middle" : "large"} 
                loading={loading}
              >
                登录
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'center', fontSize: isMobile ? '14px' : '16px' }}>
              还没有账号? <Link to="/register">立即注册</Link>
            </div>
          </Form>
          
          <Divider style={{ margin: isMobile ? '12px 0' : '24px 0' }}>或者</Divider>
          
          <Button 
            type="default" 
            block 
            size={isMobile ? "middle" : "large"} 
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