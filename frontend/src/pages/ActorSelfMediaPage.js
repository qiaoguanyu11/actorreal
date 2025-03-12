import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Upload, Card, Button, message, Typography, Tabs, Image, 
  Row, Col, Divider, Modal, Form, Input, Space, Spin, Empty, List
} from 'antd';
import { 
  PlusOutlined, LeftOutlined, DeleteOutlined, 
  LoadingOutlined, EyeOutlined, UploadOutlined,
  PictureOutlined, VideoCameraOutlined 
} from '@ant-design/icons';
import { 
  getSelfMedia, uploadSelfAvatar, 
  uploadSelfPhotos, uploadSelfVideos, 
  deleteSelfMedia 
} from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';
import NoImage from '../assets/no-image.png';

const { Dragger } = Upload;
const { Title, Text } = Typography;

const ActorSelfMediaPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [mediaData, setMediaData] = useState(null);
  const [activeTab, setActiveTab] = useState('photos');
  
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFiles, setVideoFiles] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);

  const [photoAlbum, setPhotoAlbum] = useState('默认相册');
  const [videoCategory, setVideoCategory] = useState('默认视频');
  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // 加载媒体数据
  useEffect(() => {
    fetchMediaData();
  }, []);

  // 获取媒体数据
  const fetchMediaData = async () => {
    setLoading(true);
    try {
      // 检查是否有token
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('未登录或登录已过期，请重新登录');
        navigate('/login');
        return;
      }
      
      console.log('正在获取媒体数据，当前token:', token ? '已设置' : '未设置');
      const data = await getSelfMedia();
      console.log('获取媒体数据成功:', data);
      setMediaData(data);
    } catch (error) {
      console.error('获取媒体数据失败:', error);
      
      // 检查错误类型，如果是401，则提示重新登录
      if (error.response && error.response.status === 401) {
        message.error('认证已过期，请重新登录');
        // 清除token并重定向到登录页
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        message.error('获取媒体数据失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 头像上传
  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      message.warning('请先选择头像文件');
      return;
    }

    setUploadingAvatar(true);
    
    const formData = new FormData();
    formData.append('file', avatarFile);
    
    try {
      const result = await uploadSelfAvatar(formData);
      message.success('头像上传成功');
      setAvatarFile(null);
      fetchMediaData(); // 刷新数据
    } catch (error) {
      console.error('头像上传失败:', error);
      message.error('头像上传失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 照片上传
  const handlePhotoUpload = async () => {
    if (photoFiles.length === 0) {
      message.warning('请先选择照片文件');
      return;
    }

    setUploadingPhotos(true);
    
    const formData = new FormData();
    photoFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('album', photoAlbum);
    
    try {
      const results = await uploadSelfPhotos(formData);
      // 检查结果
      const successCount = results.filter(item => item.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0 && failCount === 0) {
        message.success(`成功上传${successCount}张照片`);
      } else if (successCount > 0 && failCount > 0) {
        message.warning(`成功上传${successCount}张照片，${failCount}张上传失败`);
      } else {
        message.error('所有照片上传失败');
      }
      
      setPhotoFiles([]);
      fetchMediaData(); // 刷新数据
    } catch (error) {
      console.error('照片上传失败:', error);
      message.error('照片上传失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setUploadingPhotos(false);
    }
  };

  // 视频上传
  const handleVideoUpload = async () => {
    if (videoFiles.length === 0) {
      message.warning('请先选择视频文件');
      return;
    }

    setUploadingVideos(true);
    
    const formData = new FormData();
    videoFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('category', videoCategory);
    
    try {
      const results = await uploadSelfVideos(formData);
      // 检查结果
      const successCount = results.filter(item => item.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0 && failCount === 0) {
        message.success(`成功上传${successCount}个视频`);
      } else if (successCount > 0 && failCount > 0) {
        message.warning(`成功上传${successCount}个视频，${failCount}个上传失败`);
      } else {
        message.error('所有视频上传失败');
      }
      
      setVideoFiles([]);
      fetchMediaData(); // 刷新数据
    } catch (error) {
      console.error('视频上传失败:', error);
      message.error('视频上传失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setUploadingVideos(false);
    }
  };

  // 预览图片
  const handlePreview = (file) => {
    if (!file.url && !file.preview) {
      file.preview = URL.createObjectURL(file.originFileObj || file);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewTitle(file.name || file.url.substring(file.url.lastIndexOf('/') + 1));
    setPreviewVisible(true);
  };

  // 删除媒体
  const handleDeleteMedia = async (mediaId) => {
    try {
      Modal.confirm({
        title: '确认删除',
        content: '删除后将无法恢复，确定要删除此媒体文件吗？',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          await deleteSelfMedia(mediaId);
          message.success('删除成功');
          fetchMediaData(); // 刷新数据
        }
      });
    } catch (error) {
      console.error(`删除媒体失败 (ID: ${mediaId}):`, error);
      message.error('删除媒体失败: ' + (error.response?.data?.detail || '未知错误'));
    }
  };

  // Base64转换工具，用于图片预览
  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // 头像上传按钮组件
  const avatarUploadButton = (
    <div>
      {uploadingAvatar ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传头像</div>
    </div>
  );

  // 渲染页面
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
        />
        <div style={{ marginTop: '10px' }}>加载媒体数据...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => navigate('/my-profile')}>返回</Button>
            <Title level={3} style={{ margin: 0 }}>我的媒体资料</Title>
          </Space>
        }
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'photos',
              label: '照片管理',
              children: (
                <>
                  <Card
                    title="上传新照片"
                    style={{ marginBottom: 16 }}
                  >
                    <Form layout="vertical">
                      <Form.Item label="相册名称">
                        <Input 
                          placeholder="请输入相册名称" 
                          value={photoAlbum}
                          onChange={e => setPhotoAlbum(e.target.value)}
                        />
                      </Form.Item>
                      
                      <Form.Item label="照片文件">
                        <Upload
                          listType="picture-card"
                          fileList={photoFiles.map((file, index) => ({
                            uid: `-${index}`,
                            name: file.name,
                            status: 'done',
                            url: file.preview || URL.createObjectURL(file)
                          }))}
                          onPreview={(file) => handlePreview(file)}
                          beforeUpload={(file) => {
                            // 检查文件类型
                            const isImage = file.type.startsWith('image/');
                            if (!isImage) {
                              message.error('只能上传图片文件!');
                              return Upload.LIST_IGNORE;
                            }
                            
                            // 检查文件大小
                            const isLt5M = file.size / 1024 / 1024 < 5;
                            if (!isLt5M) {
                              message.error('图片必须小于5MB!');
                              return Upload.LIST_IGNORE;
                            }
                            
                            // 创建预览URL
                            file.preview = URL.createObjectURL(file);
                            
                            // 添加到上传文件列表
                            setPhotoFiles(prev => [...prev, file]);
                            return false;  // 阻止自动上传
                          }}
                          onRemove={file => {
                            // 找到要删除的文件索引
                            const index = photoFiles.findIndex(f => f.name === file.name);
                            if (index !== -1) {
                              const newFileList = [...photoFiles];
                              // 释放预览URL
                              if (newFileList[index].preview) {
                                URL.revokeObjectURL(newFileList[index].preview);
                              }
                              newFileList.splice(index, 1);
                              setPhotoFiles(newFileList);
                            }
                          }}
                        >
                          {photoFiles.length >= 8 ? null : (
                            <div>
                              <PlusOutlined />
                              <div style={{ marginTop: 8 }}>选择照片</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          onClick={handlePhotoUpload} 
                          loading={uploadingPhotos}
                          disabled={photoFiles.length === 0}
                          icon={<UploadOutlined />}
                        >
                          上传照片
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                
                  <Divider orientation="left">我的照片</Divider>
                  
                  {mediaData && mediaData.photos && mediaData.photos.length > 0 ? (
                    <List
                      grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }}
                      dataSource={mediaData.photos}
                      renderItem={item => (
                        <List.Item>
                          <Card
                            hoverable
                            cover={
                              <Image 
                                src={item.thumbnail_url || item.file_url} 
                                alt={item.file_name}
                                fallback={NoImage}
                                style={{ height: 200, objectFit: 'cover' }}
                                preview={{
                                  src: item.file_url,
                                }}
                              />
                            }
                            actions={[
                              <EyeOutlined key="view" onClick={() => {
                                setPreviewImage(item.file_url);
                                setPreviewTitle(item.file_name);
                                setPreviewVisible(true);
                              }} />,
                              <DeleteOutlined key="delete" onClick={() => handleDeleteMedia(item.id)} />
                            ]}
                          >
                            <Card.Meta
                              title={item.album || '默认相册'}
                              description={
                                <Text ellipsis title={item.file_name}>
                                  {item.file_name}
                                </Text>
                              }
                            />
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="暂无照片" />
                  )}
                </>
              )
            },
            {
              key: 'videos',
              label: '视频管理',
              children: (
                <>
                  <Card
                    title="上传新视频"
                    style={{ marginBottom: 16 }}
                  >
                    <Form layout="vertical">
                      <Form.Item label="视频分类">
                        <Input 
                          placeholder="请输入视频分类" 
                          value={videoCategory}
                          onChange={e => setVideoCategory(e.target.value)}
                        />
                      </Form.Item>
                      
                      <Form.Item label="视频文件">
                        <Upload
                          listType="picture-card"
                          fileList={videoFiles.map((file, index) => ({
                            uid: `-${index}`,
                            name: file.name,
                            status: 'done',
                            url: file.thumbnail || NoImage, // 使用生成的缩略图或默认图片
                            type: 'video',
                            originFileObj: file
                          }))}
                          onPreview={(file) => {
                            // 不弹出模态框预览，改为在新窗口打开
                            if (file.originFileObj) {
                              const videoUrl = URL.createObjectURL(file.originFileObj);
                              window.open(videoUrl);
                              
                              // 延迟释放URL，给用户足够时间查看
                              setTimeout(() => {
                                URL.revokeObjectURL(videoUrl);
                              }, 60000); // 1分钟后释放
                            }
                          }}
                          beforeUpload={(file) => {
                            // 检查文件类型
                            const isVideo = file.type.startsWith('video/');
                            if (!isVideo) {
                              message.error('只能上传视频文件!');
                              return Upload.LIST_IGNORE;
                            }
                            
                            // 检查文件大小
                            const isLt100M = file.size / 1024 / 1024 < 100;
                            if (!isLt100M) {
                              message.error('视频必须小于100MB!');
                              return Upload.LIST_IGNORE;
                            }

                            // 生成视频缩略图
                            const video = document.createElement('video');
                            video.preload = 'metadata';
                            video.src = URL.createObjectURL(file);
                            video.currentTime = 1; // 设置到第1秒位置
                            
                            // 等待视频加载足够的数据来捕获缩略图
                            video.onloadeddata = () => {
                              const canvas = document.createElement('canvas');
                              canvas.width = video.videoWidth;
                              canvas.height = video.videoHeight;
                              
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                              
                              // 获取缩略图数据URL
                              try {
                                file.thumbnail = canvas.toDataURL('image/jpeg');
                                
                                // 更新文件列表以显示缩略图
                                setVideoFiles(prev => [...prev]);
                              } catch (e) {
                                console.error('无法生成缩略图:', e);
                              }
                              
                              // 释放资源
                              URL.revokeObjectURL(video.src);
                            };
                            
                            // 处理无法加载的情况
                            video.onerror = () => {
                              URL.revokeObjectURL(video.src);
                              console.error('视频加载失败，无法生成缩略图');
                            };
                            
                            // 添加到上传文件列表
                            setVideoFiles(prev => [...prev, file]);
                            return false;  // 阻止自动上传
                          }}
                          onRemove={file => {
                            // 找到要删除的文件索引
                            const index = videoFiles.findIndex(f => f.name === file.name);
                            if (index !== -1) {
                              const newFileList = [...videoFiles];
                              // 释放预览URL
                              if (newFileList[index].preview) {
                                URL.revokeObjectURL(newFileList[index].preview);
                              }
                              newFileList.splice(index, 1);
                              setVideoFiles(newFileList);
                            }
                          }}
                        >
                          {videoFiles.length >= 5 ? null : (
                            <div>
                              <PlusOutlined />
                              <div style={{ marginTop: 8 }}>选择视频</div>
                            </div>
                          )}
                        </Upload>
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          onClick={handleVideoUpload} 
                          loading={uploadingVideos}
                          disabled={videoFiles.length === 0}
                          icon={<UploadOutlined />}
                        >
                          上传视频
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                
                  <Divider orientation="left">我的视频</Divider>
                  
                  {mediaData && mediaData.videos && mediaData.videos.length > 0 ? (
                    <List
                      grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
                      dataSource={mediaData.videos}
                      renderItem={item => (
                        <List.Item>
                          <Card
                            hoverable
                            cover={
                              <div style={{ position: 'relative', background: '#f0f2f5' }}>
                                {/* 直接嵌入视频播放器 */}
                                <video
                                  controls
                                  preload="metadata"
                                  poster={item.thumbnail_url || NoImage}
                                  style={{ width: '100%', height: 'auto', maxHeight: '200px' }}
                                  src={item.file_url}
                                >
                                  您的浏览器不支持视频播放
                                </video>
                              </div>
                            }
                            actions={[
                              <EyeOutlined key="preview" onClick={() => window.open(item.file_url, '_blank')} />,
                              <DeleteOutlined key="delete" onClick={() => handleDeleteMedia(item.id)} />
                            ]}
                          >
                            <Card.Meta
                              title={item.category || '默认视频'}
                              description={
                                <Text ellipsis title={item.file_name}>
                                  {item.file_name}
                                </Text>
                              }
                            />
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="暂无视频" />
                  )}
                </>
              )
            },
            {
              key: 'avatar',
              label: '头像管理',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="当前头像">
                      {mediaData && mediaData.avatar_url ? (
                        <div style={{ textAlign: 'center' }}>
                          <Image 
                            src={mediaData.avatar_url}
                            alt="当前头像"
                            fallback={NoImage}
                            style={{ maxWidth: '100%', maxHeight: '300px' }}
                          />
                        </div>
                      ) : (
                        <Empty description="暂无头像" />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="上传新头像">
                      <Form layout="vertical">
                        <Form.Item>
                          <Upload
                            name="avatar"
                            listType="picture-card"
                            className="avatar-uploader"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              // 检查文件类型
                              const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
                              if (!isJpgOrPng) {
                                message.error('只能上传JPG/PNG格式的图片!');
                                return Upload.LIST_IGNORE;
                              }
                              
                              // 检查文件大小
                              const isLt5M = file.size / 1024 / 1024 < 5;
                              if (!isLt5M) {
                                message.error('头像必须小于5MB!');
                                return Upload.LIST_IGNORE;
                              }
                              
                              // 设置头像文件
                              setAvatarFile(file);
                              return false;  // 阻止自动上传
                            }}
                          >
                            {avatarFile ? (
                              <img 
                                src={URL.createObjectURL(avatarFile)} 
                                alt="头像预览" 
                                style={{ width: '100%' }} 
                              />
                            ) : avatarUploadButton}
                          </Upload>
                        </Form.Item>
                        
                        <Form.Item>
                          <Button 
                            type="primary" 
                            onClick={handleAvatarUpload} 
                            loading={uploadingAvatar}
                            disabled={!avatarFile}
                          >
                            上传头像
                          </Button>
                        </Form.Item>
                      </Form>
                    </Card>
                  </Col>
                </Row>
              )
            }
          ]}
        />
      </Card>
      
      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
      >
        <img alt="预览图片" style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};

export default ActorSelfMediaPage; 