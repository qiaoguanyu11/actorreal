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

const MainLayout = () => {
  const { user, logout, isAuthenticated, isAdmin, isManager } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        <Link to="/profile">个人资料</Link>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
      >
        <div className="logo" style={{ height: '64px', margin: '16px', color: '#fff', textAlign: 'center' }}>
          {!collapsed && <h1 style={{ color: '#fff' }}>演员管理系统</h1>}
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
            isAuthenticated && {
              key: '/actors/create',
              icon: <PlusOutlined />,
              label: <Link to="/actors/create">创建演员</Link>,
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
      
      // ... rest of the existing code ...
    </Layout>
  );
};

export default MainLayout; 