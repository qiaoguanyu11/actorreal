import React, { useState, useContext } from 'react';
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;

const TestLoginPage = () => {
  const { login, user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const success = await login(values.username, values.password);
      if (success) {
        // 尝试获取token
        const storedToken = localStorage.getItem('token');
        setToken(storedToken || '无token');
        message.success('登录成功');
      }
    } catch (error) {
      message.error('登录失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const checkToken = () => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken || '无token');
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    setToken('');
    message.success('Token已清除');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '0 20px' }}>
      <Title level={2}>登录测试</Title>
      
      <Card style={{ marginBottom: '20px' }}>
        <Form
          name="login_form"
          initialValues={{ username: 'admin', password: 'admin123' }}
          onFinish={handleLogin}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="密码" 
              size="large"
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="Token 信息" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>当前用户: </Text>
            <Text>{user ? user.username : '未登录'}</Text>
          </div>
          
          <div>
            <Text strong>角色: </Text>
            <Text>{user ? user.role : '无'}</Text>
          </div>
          
          <div>
            <Text strong>Token状态: </Text>
            <Text>{token ? '已存在' : '不存在'}</Text>
          </div>
          
          {token && (
            <div>
              <Text strong>Token值: </Text>
              <div style={{ 
                maxWidth: '100%', 
                overflowX: 'auto', 
                whiteSpace: 'nowrap',
                padding: '5px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                {token}
              </div>
            </div>
          )}
          
          <Space>
            <Button onClick={checkToken}>检查Token</Button>
            <Button danger onClick={clearToken}>清除Token</Button>
          </Space>
        </Space>
      </Card>
      
      <Card title="API测试">
        <Text>登录成功后，您可以前往以下页面测试API：</Text>
        <ul>
          <li><a href="/actors">演员管理页面</a></li>
          <li><a href="/agents">经纪人管理页面</a></li>
        </ul>
      </Card>
    </div>
  );
};

export default TestLoginPage; 