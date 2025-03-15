import React, { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Layout, Row, Col, Typography } from 'antd';
import { AuthContext } from '../../context/AuthContext';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const GuestLayout = () => {
  const { isAuthenticated } = useContext(AuthContext);

  // 如果用户已登录，重定向到首页
  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}>
        <Row justify="center">
          <Col>
            <Title level={3} style={{ margin: '16px 0' }}>花萌传媒</Title>
          </Col>
        </Row>
      </Header>
      <Content>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        花萌传媒 ©{new Date().getFullYear()} 版权所有
      </Footer>
    </Layout>
  );
};

export default GuestLayout; 