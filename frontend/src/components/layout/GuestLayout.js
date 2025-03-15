import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Layout, Row, Col, Typography } from 'antd';
import { AuthContext } from '../../context/AuthContext';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const GuestLayout = () => {
  const { isAuthenticated } = useContext(AuthContext);
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

  // 如果用户已登录，重定向到首页
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        backgroundColor: '#fff', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        padding: isMobile ? '0 12px' : '0 50px',
        height: isMobile ? '56px' : '64px'
      }}>
        <Row justify="center" align="middle" style={{ height: '100%' }}>
          <Col>
            <Title level={isMobile ? 4 : 3} style={{ margin: isMobile ? '12px 0' : '16px 0' }}>花萌传媒</Title>
          </Col>
        </Row>
      </Header>
      <Content style={{ padding: isMobile ? '12px' : '24px' }}>
        <Outlet />
      </Content>
      <Footer style={{ 
        textAlign: 'center', 
        padding: isMobile ? '12px' : '24px',
        fontSize: isMobile ? '12px' : '14px'
      }}>
        花萌传媒 ©{new Date().getFullYear()} 版权所有
      </Footer>
    </Layout>
  );
};

export default GuestLayout; 