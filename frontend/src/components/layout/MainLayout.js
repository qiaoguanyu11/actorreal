import React, { useState, useContext } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Space } from 'antd';
import {
  HomeOutlined,
  UserOutlined,
  TeamOutlined,
  PlusOutlined,
  UserAddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ContactsOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../../context/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

const MainLayout = () => {
  const { user, logout, isAuthenticated, isAdmin, isManager, isGuest } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人资料</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
      >
        <div className="logo" style={{ height: '64px', margin: '16px', textAlign: 'center' }}>
          {!collapsed && (
            <h1 style={{ color: '#fff', fontSize: '20px', lineHeight: '64px', margin: 0 }}>
              花萌传媒
            </h1>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/',
              icon: <HomeOutlined />,
              label: <Link to="/">演员列表</Link>,
            },
            (isManager || isAdmin) && {
              key: '/actors/create',
              icon: <PlusOutlined />,
              label: <Link to="/actors/create">创建演员</Link>,
            },
            user?.role === 'performer' && {
              key: '/my-profile',
              icon: <UserOutlined />,
              label: <Link to="/my-profile">我的资料</Link>,
            },
            isManager && {
              key: '/unassigned-actors',
              icon: <TeamOutlined />,
              label: <Link to="/unassigned-actors">可签约演员</Link>,
            },
            isAdmin && {
              key: '/create-manager',
              icon: <UserAddOutlined />,
              label: <Link to="/create-manager">创建经纪人</Link>,
            },
            isAdmin && {
              key: '/agent-management',
              icon: <ContactsOutlined />,
              label: <Link to="/agent-management">经纪人管理</Link>,
            },
          ].filter(Boolean)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            
            {isAuthenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <span>{user?.username}</span>
                </Space>
              </Dropdown>
            ) : (
              <Space>
                <Button type="primary" onClick={() => navigate('/login')}>
                  登录
                </Button>
                <Button onClick={() => navigate('/register')}>
                  注册
                </Button>
              </Space>
            )}
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div className="site-layout-content">
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          花萌传媒 ©{new Date().getFullYear()} 版权所有
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 