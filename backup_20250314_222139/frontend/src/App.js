import React, { useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { AuthContext } from './context/AuthContext';
import { LoadingOutlined } from '@ant-design/icons';

// 布局组件
import MainLayout from './components/layout/MainLayout';
import GuestLayout from './components/layout/GuestLayout';

// 页面组件
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ActorListPage from './pages/ActorListPage';
import ActorDetailPage from './pages/ActorDetailPage';
import CreateActorPage from './pages/CreateActorPage';
import ActorMediaUploadPage from './pages/ActorMediaUploadPage';
import ActorSelfMediaPage from './pages/ActorSelfMediaPage';
import UnassignedActorsPage from './pages/UnassignedActorsPage';
import CreateManagerPage from './pages/CreateManagerPage';
import NotFoundPage from './pages/NotFoundPage';
import TestLoginPage from './pages/TestLoginPage';
import EditActorPage from './pages/EditActorPage';
import AgentManagementPage from './pages/AgentManagementPage';
import MyProfilePage from './pages/MyProfilePage';

// 权限路由组件
const PrivateRoute = ({ element, requiredRole }) => {
  const { isAuthenticated, user, loading, isGuest } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
          tip="加载中..."
          fullscreen
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // 访客可以访问演员列表和演员详情页
  if (isGuest && requiredRole && 
      requiredRole !== 'guest' && 
      !(requiredRole === 'performer' && location.pathname === '/')) {
    return <Navigate to="/" />;
  }

  if (requiredRole && user?.role !== requiredRole && 
      !(requiredRole === 'performer' && user?.role === 'manager') && 
      !(requiredRole === 'performer' && user?.role === 'admin') && 
      !(requiredRole === 'manager' && user?.role === 'admin') &&
      !(requiredRole === 'performer' && user?.role === 'guest' && location.pathname === '/')) {
    return <Navigate to="/" />;
  }

  return element;
};

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
          tip="加载中..."
          fullscreen
        />
      </div>
    );
  }

  return (
    <Routes>
      {/* 公共路由 */}
      <Route element={<GuestLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/test-login" element={<TestLoginPage />} />
      </Route>

      {/* 需要认证的路由 */}
      <Route element={<MainLayout />}>
        {/* 所有用户可访问 */}
        <Route path="/" element={<ActorListPage />} />
        <Route path="/actors/:actorId" element={<ActorDetailPage />} />
        <Route path="/profile" element={<PrivateRoute element={<ProfilePage />} />} />
        
        {/* 演员专用页面 */}
        <Route path="/my-profile" element={<PrivateRoute element={<MyProfilePage />} requiredRole="performer" />} />
        <Route path="/my-media" element={<PrivateRoute element={<ActorSelfMediaPage />} requiredRole="performer" />} />

        {/* 演员、经纪人、管理员可访问 */}
        <Route path="/actors/create" element={<PrivateRoute element={<CreateActorPage />} requiredRole="performer" />} />
        <Route path="/actors/:actorId/edit" element={<PrivateRoute element={<EditActorPage />} requiredRole="performer" />} />
        <Route path="/actors/:actorId/upload-media" element={<PrivateRoute element={<ActorMediaUploadPage />} requiredRole="performer" />} />
        <Route path="/actors/:actorId/media" element={<PrivateRoute element={<ActorMediaUploadPage />} requiredRole="performer" />} />

        {/* 经纪人、管理员可访问 */}
        <Route path="/unassigned-actors" element={<PrivateRoute element={<UnassignedActorsPage />} requiredRole="manager" />} />
        
        {/* 仅管理员可访问 */}
        <Route path="/create-manager" element={<PrivateRoute element={<CreateManagerPage />} requiredRole="admin" />} />
        <Route path="/agent-management" element={<PrivateRoute element={<AgentManagementPage />} requiredRole="admin" />} />
      </Route>

      {/* 404页面 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App; 