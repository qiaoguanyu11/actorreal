import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Upload, Card, Button, message, Typography, Steps, Image, 
  Row, Col, Divider, Modal, Form, Input, Space, Spin, Empty
} from 'antd';
import { 
  InboxOutlined, PlusOutlined, LeftOutlined, 
  PictureOutlined, VideoCameraOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import { getActorDetail, getActorMedia, deleteActorMedia } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';
import NoImage from '../assets/no-image.png';

// 创建API实例
const api = axios.create({
  baseURL: '/api/v1',
});

// 请求拦截器，添加Token到请求头
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Step } = Steps;

// 模拟Tag组件
const Tag = ({ children, color, icon }) => (
  <span style={{ 
    display: 'inline-block', 
    padding: '4px 8px', 
    backgroundColor: color || '#f5f5f5', 
    color: color ? 'white' : 'rgba(0, 0, 0, 0.65)',
    borderRadius: '4px',
    marginRight: '8px'
  }}>
    {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}
    {children}
  </span>
);

const ActorMediaUploadPage = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [actor, setActor] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 分别管理三种不同类型的媒体上传状态
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  
  // 分别管理三种不同类型的媒体文件列表
  const [avatarFile, setAvatarFile] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  
  // 不同类型的表单
  const [photoForm] = Form.useForm();
  const [videoForm] = Form.useForm();

  useEffect(() => {
    fetchActorDetail();
  }, [actorId]);

  const fetchActorDetail = async () => {
    setLoading(true);
    try {
      const data = await getActorDetail(actorId);
      console.log('获取到的演员数据:', data);
      console.log('演员合同信息:', data.contract_info);
      console.log('当前用户:', user);
      setActor(data);
      
      // 检查当前用户是否有权限
      // 允许：管理员、经纪人以及演员自己(user_id匹配)
      if (user.role !== 'admin' && user.role !== 'manager' && data.user_id !== user.id) {
        message.error('您没有权限上传该演员的媒体资料');
        navigate(`/actors/${actorId}`);
        return;
      }
      
      fetchActorMedia();
    } catch (error) {
      message.error('获取演员信息失败');
      setLoading(false);
    }
  };

  const fetchActorMedia = async () => {
    try {
      console.log('获取演员媒体列表，演员ID:', actorId);
      const mediaUrl = `/actors/media/${actorId}/media`;
      console.log('请求媒体列表URL:', mediaUrl);
      
      const response = await api.get(mediaUrl);
      console.log('媒体列表响应:', response.data);
      
      // 处理响应数据，确保它是一个数组
      let mediaList = [];
      if (response.data && Array.isArray(response.data)) {
        mediaList = response.data;
      } else if (response.data && Array.isArray(response.data.items)) {
        mediaList = response.data.items;
      } else if (response.data) {
        // 可能是单个对象，将其包装为数组
        mediaList = [response.data];
      }
      
      // 确保每个媒体项有正确的URL和类型
      mediaList = mediaList.map(item => {
        // 对缺失的URL字段使用备用字段
        if (!item.url && item.file_url) {
          item.url = item.file_url;
        }
        
        // 处理媒体类型
        if (item.type === 'avatar' || item.type === 'photo' || 
            (item.mime_type && item.mime_type.startsWith('image'))) {
          item.media_type = 'image';
        } else if (item.type === 'video' || 
                  (item.mime_type && item.mime_type.startsWith('video'))) {
          item.media_type = 'video';
        } else if (item.file_name) {
          // 从文件名推断类型
          const fileName = item.file_name.toLowerCase();
          if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
              fileName.endsWith('.png') || fileName.endsWith('.gif')) {
            item.media_type = 'image';
          } else if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || 
                    fileName.endsWith('.mov') || fileName.endsWith('.webm')) {
            item.media_type = 'video';
          }
        }
        
        return item;
      });
      
      console.log('处理后的媒体列表:', mediaList);
      setMedia(mediaList);
    } catch (error) {
      console.error('获取演员媒体资料失败:', error);
      message.error('获取媒体列表失败');
      
      // 尝试备用路径
      try {
        const alternateUrl = `/actors/media/${actorId}`;
        console.log('尝试备用路径获取媒体:', alternateUrl);
        const response = await api.get(alternateUrl);
        
        // 处理响应数据
        let mediaList = [];
        if (response.data && Array.isArray(response.data)) {
          mediaList = response.data;
        } else if (response.data && Array.isArray(response.data.items)) {
          mediaList = response.data.items;
        } else if (response.data) {
          mediaList = [response.data];
        }
        
        // 确保每个媒体项有正确的URL和类型
        mediaList = mediaList.map(item => {
          if (!item.url && item.file_url) {
            item.url = item.file_url;
          }
          
          // 处理媒体类型
          if (item.type === 'avatar' || item.type === 'photo' || 
              (item.mime_type && item.mime_type.startsWith('image'))) {
            item.media_type = 'image';
          } else if (item.type === 'video' || 
                    (item.mime_type && item.mime_type.startsWith('video'))) {
            item.media_type = 'video';
          } else if (item.file_name) {
            // 从文件名推断类型
            const fileName = item.file_name.toLowerCase();
            if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                fileName.endsWith('.png') || fileName.endsWith('.gif')) {
              item.media_type = 'image';
            } else if (fileName.endsWith('.mp4') || fileName.endsWith('.avi') || 
                      fileName.endsWith('.mov') || fileName.endsWith('.webm')) {
              item.media_type = 'video';
            }
          }
          
          return item;
        });
        
        console.log('备用路径处理后的媒体列表:', mediaList);
        setMedia(mediaList);
      } catch (secondError) {
        console.error('备用路径也失败:', secondError);
      }
    }
    setLoading(false);
  };

  // 头像上传处理
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      message.warning('请选择头像文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', avatarFile);
    
    console.log('头像上传，演员ID:', actorId);
    console.log('头像文件类型:', avatarFile.type);
    console.log('头像文件大小:', avatarFile.size);
    
    setAvatarUploading(true);
    
    try {
      // 使用正确的API路径
      const avatarUrl = `/actors/media/${actorId}/media/avatar`;
      console.log('发送头像上传请求到:', avatarUrl);
      
      const response = await api.post(avatarUrl, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('头像上传成功，返回数据:', response.data);
      message.success('头像上传成功');
      setAvatarFile(null);
      
      // 刷新演员和媒体数据
      fetchActorDetail();
      fetchActorMedia();
    } catch (error) {
      console.error('头像上传失败:', error);
      console.error('错误详情:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // 错误处理显示
      if (error.response) {
        if (error.response.status === 403) {
          message.error('权限错误: ' + (error.response.data?.detail || '您没有权限执行此操作'));
        } else if (error.response.status === 404) {
          message.error('演员不存在: ' + (error.response.data?.detail || '未找到演员'));
        } else if (error.response.status === 400) {
          message.error('请求错误: ' + (error.response.data?.detail || '提交的数据有误'));
        } else if (error.response.status === 405) {
          message.error('方法不允许: 您没有权限执行此操作');
        } else {
          message.error('头像上传失败: ' + (error.response.data?.detail || '服务器错误'));
        }
      } else {
        message.error('头像上传失败: ' + (error.message || '网络错误'));
      }
      setAvatarUploading(false);
      return;
    }
  };

  // 照片上传处理
  const handlePhotoUpload = async (values) => {
    if (photoFiles.length === 0) {
      message.warning('请选择要上传的照片');
      return;
    }

    const formData = new FormData();
    photoFiles.forEach(file => {
      formData.append('files', file.originFileObj);
    });
    
    if (values.album) {
      formData.append('album', values.album);
    }
    
    setPhotoUploading(true);
    
    try {
      await api.post(`/actors/media/${actorId}/media/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      message.success('照片上传成功');
      setPhotoFiles([]);
      photoForm.resetFields();
      fetchActorMedia();
    } catch (error) {
      console.error('照片上传失败:', error);
      
      // 错误处理显示
      if (error.response) {
        if (error.response.status === 403) {
          message.error('权限错误: ' + (error.response.data?.detail || '您没有权限执行此操作'));
        } else if (error.response.status === 404) {
          message.error('演员不存在: ' + (error.response.data?.detail || '未找到演员'));
        } else if (error.response.status === 400) {
          message.error('请求错误: ' + (error.response.data?.detail || '提交的数据有误'));
        } else if (error.response.status === 405) {
          message.error('方法不允许: 您没有权限执行此操作');
        } else {
          message.error('照片上传失败: ' + (error.response.data?.detail || '服务器错误'));
        }
      } else {
        message.error('照片上传失败: ' + (error.message || '网络错误'));
      }
    } finally {
      setPhotoUploading(false);
    }
  };

  // 视频上传处理
  const handleVideoUpload = async (values) => {
    if (videoFiles.length === 0) {
      message.warning('请选择要上传的视频');
      return;
    }

    const formData = new FormData();
    videoFiles.forEach(file => {
      formData.append('files', file.originFileObj);
    });
    
    if (values.title) {
      formData.append('title', values.title);
    }
    
    if (values.description) {
      formData.append('description', values.description);
    }
    
    setVideoUploading(true);
    
    try {
      await api.post(`/actors/media/${actorId}/media/videos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      message.success('视频上传成功');
      setVideoFiles([]);
      videoForm.resetFields();
      fetchActorMedia();
    } catch (error) {
      console.error('视频上传失败:', error);
      
      // 错误处理显示
      if (error.response) {
        if (error.response.status === 403) {
          message.error('权限错误: ' + (error.response.data?.detail || '您没有权限执行此操作'));
        } else if (error.response.status === 404) {
          message.error('演员不存在: ' + (error.response.data?.detail || '未找到演员'));
        } else if (error.response.status === 400) {
          message.error('请求错误: ' + (error.response.data?.detail || '提交的数据有误'));
        } else if (error.response.status === 405) {
          message.error('方法不允许: 您没有权限执行此操作');
        } else {
          message.error('视频上传失败: ' + (error.response.data?.detail || '服务器错误'));
        }
      } else {
        message.error('视频上传失败: ' + (error.message || '网络错误'));
      }
    } finally {
      setVideoUploading(false);
    }
  };

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
  };

  const handleAvatarChange = (info) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} 文件上传成功`);
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} 文件上传失败`);
    }
    
    if (info.file.status !== 'uploading') {
      setAvatarFile(info.file.originFileObj);
    }
  };

  const handlePhotoChange = ({ fileList }) => {
    setPhotoFiles(fileList);
  };

  const handleVideoChange = ({ fileList }) => {
    setVideoFiles(fileList);
  };

  // 检查用户是否有权限删除媒体
  const canDeleteMedia = () => {
    console.log('检查删除权限 - 用户角色:', user.role);
    console.log('检查删除权限 - 演员ID:', actor?.id);
    console.log('检查删除权限 - 演员用户ID:', actor?.user_id);
    console.log('检查删除权限 - 当前用户ID:', user?.id);
    console.log('检查删除权限 - 演员合同信息:', actor?.contract_info);
    
    if (!actor) {
      console.log('演员数据不存在，无权限');
      return false;
    }
    
    if (user.role === 'admin') {
      // 管理员可以删除任何演员的媒体
      console.log('用户是管理员，有权限');
      return true;
    } else if (user.role === 'performer') {
      // 演员只能删除自己的媒体
      const hasPermission = actor.user_id === user.id;
      console.log('用户是演员，是否有权限:', hasPermission);
      return hasPermission;
    } else if (user.role === 'manager') {
      // 经纪人只能删除自己旗下演员的媒体
      if (!actor.contract_info) {
        console.log('演员没有合同信息，经纪人无权限');
        return false;
      }
      const hasPermission = actor.contract_info.agent_id === user.id;
      console.log('用户是经纪人，是否有权限:', hasPermission);
      console.log('经纪人ID:', user.id);
      console.log('演员合同中的经纪人ID:', actor.contract_info.agent_id);
      return hasPermission;
    } else {
      // 其他角色无权限
      console.log('其他角色，无权限');
      return false;
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      // 权限检查
      if (!canDeleteMedia()) {
        message.error('您没有权限删除此媒体');
        return;
      }

      await api.delete(`/actors/media/${actorId}/media/${mediaId}`);
      message.success('删除成功');
      fetchActorMedia();
    } catch (error) {
      console.error('删除媒体失败:', error);
      
      // 错误处理显示
      if (error.response) {
        if (error.response.status === 403) {
          message.error('权限错误: ' + (error.response.data?.detail || '您没有权限执行此操作'));
        } else if (error.response.status === 404) {
          message.error('媒体不存在: ' + (error.response.data?.detail || '未找到媒体'));
        } else if (error.response.status === 405) {
          message.error('方法不允许: 您没有权限执行此操作');
        } else {
          message.error('删除媒体失败: ' + (error.response.data?.detail || '服务器错误'));
        }
      } else {
        message.error('删除媒体失败: ' + (error.message || '网络错误'));
      }
    }
  };

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // 在组件中添加这个Upload组件配置
  const uploadProps = {
    name: 'file',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return Upload.LIST_IGNORE;
      }
      setAvatarFile(file);
      return false; // 阻止自动上传
    },
    fileList: avatarFile ? [avatarFile] : [],
    onRemove: () => {
      setAvatarFile(null);
      return true;
    },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link to={`/actors/${actorId}`} style={{ marginRight: 16 }}>
          <Button icon={<LeftOutlined />}>返回演员详情</Button>
        </Link>
        <Title level={2} style={{ margin: '16px 0' }}>
          {actor?.real_name || ''} - 媒体资料
        </Title>
      </div>
      
      <Steps current={1} style={{ marginBottom: 30 }}>
        <Step title="基本信息" description="填写演员基本资料" />
        <Step title="媒体资料" description="上传照片和视频" />
      </Steps>
      
      {/* 头像上传部分 */}
      <Card title="上传头像" style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Upload
              {...uploadProps}
              listType="picture-card"
              className="avatar-uploader"
              accept="image/*"
              showUploadList={!!avatarFile}
            >
              {avatarFile ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>点击上传头像</div>
                </div>
              )}
            </Upload>
            {avatarFile && (
              <div style={{ marginTop: 10 }}>
                <img 
                  src={URL.createObjectURL(avatarFile)} 
                  alt="头像预览" 
                  style={{ maxWidth: '100%', maxHeight: '200px' }} 
                />
              </div>
            )}
          </Col>
          <Col xs={24} md={8}>
            <Button 
              type="primary" 
              onClick={handleAvatarUpload} 
              loading={avatarUploading} 
              disabled={!avatarFile}
              block
            >
              {avatarUploading ? '上传中...' : '上传头像'}
            </Button>
          </Col>
        </Row>
      </Card>
      
      {/* 照片上传部分 */}
      <Card title="上传照片" style={{ marginBottom: 20 }}>
        <Form form={photoForm} onFinish={handlePhotoUpload}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Upload
                listType="picture-card"
                fileList={photoFiles}
                onPreview={handlePreview}
                onChange={handlePhotoChange}
                multiple
                beforeUpload={() => false}
              >
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传照片</div>
                </div>
              </Upload>
              <Modal
                open={previewOpen}
                title={previewTitle}
                footer={null}
                onCancel={() => setPreviewOpen(false)}
              >
                <img alt="预览" style={{ width: '100%' }} src={previewImage} />
              </Modal>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="album" label="相册">
                <Input placeholder="为照片添加相册分类（可选）" />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={photoUploading} 
                  disabled={photoFiles.length === 0}
                  block
                >
                  {photoUploading ? '上传中...' : '上传照片'}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
      
      {/* 视频上传部分 */}
      <Card title="上传视频" style={{ marginBottom: 20 }}>
        <Form form={videoForm} onFinish={handleVideoUpload}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <Upload
                listType="picture"
                fileList={videoFiles}
                onChange={handleVideoChange}
                multiple
                beforeUpload={() => false}
                accept="video/*"
              >
                <Button icon={<PlusOutlined />}>上传视频</Button>
              </Upload>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="title" label="标题">
                <Input placeholder="为视频添加标题（可选）" />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea placeholder="添加描述信息（可选）" rows={4} />
              </Form.Item>
              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={videoUploading} 
                  disabled={videoFiles.length === 0}
                  block
                >
                  {videoUploading ? '上传中...' : '上传视频'}
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
      
      <Divider orientation="left">已上传的媒体资料</Divider>
      
      {media.length > 0 ? (
        <Row gutter={[16, 16]}>
          {media.map((item) => (
            <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
              <Card
                hoverable
                cover={
                  item.media_type === 'image' || 
                  item.type === 'avatar' || 
                  item.type === 'photo' || 
                  (item.mime_type && item.mime_type.startsWith('image')) ? (
                    <Image
                      src={item.url || item.file_url}
                      alt={item.title || item.type || '照片'}
                      style={{ height: 200, objectFit: 'cover' }}
                      fallback={NoImage}
                    />
                  ) : item.media_type === 'video' || 
                      item.type === 'video' || 
                      (item.mime_type && item.mime_type.startsWith('video')) ? (
                    <video
                      src={item.url || item.file_url}
                      controls
                      style={{ height: 200, width: '100%' }}
                      poster={NoImage}
                    />
                  ) : (
                    <div style={{ height: 200, background: '#f0f0f0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Text type="secondary">{item.type || item.media_type || '未知类型'}</Text>
                    </div>
                  )
                }
                actions={[
                  <Button key="view" type="link" href={item.url || item.file_url} target="_blank">查看</Button>,
                  canDeleteMedia() ? <Button key="delete" type="link" danger onClick={() => handleDeleteMedia(item.id)}>删除</Button> : null
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={item.title || item.file_name || '未命名'}
                  description={item.uploaded_at 
                    ? new Date(item.uploaded_at).toLocaleDateString() 
                    : (item.created_at 
                      ? new Date(item.created_at).toLocaleDateString() 
                      : '无日期')
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="暂无媒体资料" />
      )}
      
      <Divider />
      
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Space>
          <Link to={`/actors/${actorId}`}>
            <Button type="primary" icon={<CheckCircleOutlined />} size="large">
              完成
            </Button>
          </Link>
        </Space>
      </div>
    </div>
  );
};

export default ActorMediaUploadPage; 