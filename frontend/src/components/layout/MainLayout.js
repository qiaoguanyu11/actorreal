import React, { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Drawer } from 'antd';
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
  TagsOutlined,
  MenuOutlined,
  SearchOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { AuthContext } from '../../context/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

const MainLayout = () => {
  const { user, logout, isAuthenticated, isAdmin, isManager } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 检测屏幕尺寸变化
  useEffect(() => {
    const checkMobile = () => {
      setMobileView(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

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

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">演员列表</Link>,
    },
    {
      key: '/search',
      icon: <SearchOutlined />,
      label: <Link to="/search">高级搜索</Link>,
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
    (isManager || isAdmin) && {
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
    (isAdmin || isManager) && {
      key: '/tag-management',
      icon: <TagsOutlined />,
      label: <Link to="/tag-management">标签管理</Link>,
    },
    (isAdmin || isManager) && {
      key: '/actor-tags',
      icon: <TeamOutlined />,
      label: <Link to="/actor-tags">演员标签</Link>,
    },
    (isAdmin || isManager) && {
      key: '/invite-codes',
      icon: <KeyOutlined />,
      label: <Link to="/invite-codes">邀请码管理</Link>,
    },
  ].filter(Boolean);

  // 移动端抽屉菜单
  const renderMobileMenu = () => (
    <Drawer
      title="花萌传媒"
      placement="left"
      onClose={() => setDrawerVisible(false)}
      open={drawerVisible}
      styles={{ body: { padding: 0 } }}
    >
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={() => setDrawerVisible(false)}
      />
    </Drawer>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!mobileView && (
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={(value) => setCollapsed(value)}
          breakpoint="lg"
          style={{ zIndex: 999 }}
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
            items={menuItems}
          />
        </Sider>
      )}
      <Layout>
        <Header style={{ padding: 0, background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingLeft: '16px', paddingRight: '16px' }}>
            {mobileView ? (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
                style={{ fontSize: '16px', width: 64, height: 64 }}
              />
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px', width: 64, height: 64 }}
              />
            )}
            
            {mobileView && (
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '18px' }}>花萌传媒</h1>
              </div>
            )}
            
            {isAuthenticated ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  {!mobileView && <span>{user?.username}</span>}
                </Space>
              </Dropdown>
            ) : (
              <Space>
                <Button type="primary" onClick={() => navigate('/login')}>
                  登录
                </Button>
                {!mobileView && (
                  <Button onClick={() => navigate('/register')}>
                    注册
                  </Button>
                )}
              </Space>
            )}
          </div>
        </Header>
        <Content style={{ margin: mobileView ? '8px 8px 0' : '24px 16px 0' }}>
          <div className="site-layout-content" style={{ padding: mobileView ? '12px' : '24px' }}>
            {renderMobileMenu()}
            <Outlet />
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', padding: mobileView ? '12px' : '24px' }}>
          花萌传媒 ©{new Date().getFullYear()} 版权所有
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout; 