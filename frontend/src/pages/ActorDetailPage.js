import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Card, Descriptions, Tabs, Button, Tag, Spin, Image, 
  Row, Col, Empty, Typography, Divider, Space, message, Modal 
} from 'antd';
import { 
  UserOutlined, EditOutlined, ClockCircleOutlined, 
  EnvironmentOutlined, MailOutlined, PhoneOutlined,
  UploadOutlined, DeleteOutlined, TeamOutlined,
  LoadingOutlined, EyeOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { getActorDetail, getActorMedia, assignActorToAgent, deleteActorMedia } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';
import NoImage from '../assets/no-image.png';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ActorDetailPage = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isManager, isAdmin, isGuest } = useContext(AuthContext);
  
  const [actor, setActor] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    fetchActorDetail();
  }, [actorId]);

  const fetchActorDetail = async () => {
    setLoading(true);
    try {
      const data = await getActorDetail(actorId);
      console.log('获取到演员详情:', data);
      
      // 确保头像链接有效
      if (data.avatar_url) {
        console.log('演员头像URL:', data.avatar_url);
      } else {
        console.log('演员没有头像');
      }
      
      setActor(data);
      setLoading(false);
      
      // 加载媒体资料
      fetchActorMedia();
    } catch (error) {
      console.error('获取演员详情失败:', error);
      message.error('获取演员详情失败');
      setLoading(false);
    }
  };

  const fetchActorMedia = async () => {
    setMediaLoading(true);
    try {
      console.log('获取演员媒体列表，演员ID:', actorId);
      const mediaResponse = await getActorMedia(actorId);
      console.log('媒体列表响应:', mediaResponse);
      
      // 处理响应数据，确保它是一个数组
      let mediaList = [];
      if (Array.isArray(mediaResponse)) {
        mediaList = mediaResponse;
      } else if (mediaResponse && Array.isArray(mediaResponse.items)) {
        mediaList = mediaResponse.items;
      } else if (mediaResponse) {
        // 可能是单个对象，包装为数组
        mediaList = [mediaResponse];
      }
      
      console.log('处理后的媒体列表:', mediaList);
      setMedia(mediaList);
      setMediaLoading(false);
    } catch (error) {
      console.error('获取演员媒体资料失败:', error);
      setMediaLoading(false);
    }
  };

  const handleAssignToMe = async () => {
    Modal.confirm({
      title: '确认签约',
      content: `确定将演员 "${actor.real_name}" 签约到您的经纪人名下吗？`,
      onOk: async () => {
        try {
          await assignActorToAgent(actorId, user.id);
          message.success('签约成功');
          fetchActorDetail();
        } catch (error) {
          console.error('签约失败:', error);
          message.error('签约失败: ' + (error.response?.data?.detail || '未知错误'));
        }
      }
    });
  };

  const handleDeleteMedia = async (mediaId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个媒体文件吗？此操作不可撤销。',
      onOk: async () => {
        try {
          console.log('删除媒体文件ID:', mediaId);
          await deleteActorMedia(actorId, mediaId);
          message.success('删除成功');
          // 重新加载媒体列表
          fetchActorMedia();
        } catch (error) {
          console.error('删除媒体失败:', error);
          message.error('删除失败: ' + (error.response?.data?.detail || '未知错误'));
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
        />
        <div style={{ marginTop: '10px' }}>加载演员信息...</div>
      </div>
    );
  }

  if (!actor) {
    return (
      <Empty
        description="演员不存在或已被删除"
        style={{ margin: '50px 0' }}
      >
        <Button type="primary" onClick={() => navigate('/')}>返回列表</Button>
      </Empty>
    );
  }

  const hasAgentRights = isManager && 
    (actor.contract_info?.agent_id === user.id || isAdmin);

  return (
    <div>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              {actor.avatar_url ? (
                <Image
                  src={actor.avatar_url}
                  alt={actor.real_name}
                  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                  fallback={NoImage}
                  onError={(e) => {
                    console.error('头像加载失败:', actor.avatar_url);
                    console.log('使用默认头像');
                  }}
                />
              ) : (
                <Image
                  src={NoImage}
                  alt={actor.real_name}
                  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                />
              )}
              <Title level={3} style={{ marginTop: '16px', marginBottom: '4px' }}>
                {actor.real_name}
              </Title>
              {actor.stage_name && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  艺名: {actor.stage_name}
                </Text>
              )}
              <Space wrap>
                <Tag color={actor.gender === 'male' ? 'blue' : 'pink'}>
                  {actor.gender === 'male' ? '男' : actor.gender === 'female' ? '女' : '其他'}
                </Tag>
                <Tag color="purple">{actor.age} 岁</Tag>
                <Tag color="cyan">{actor.height} cm</Tag>
              </Space>
              
              <Divider />
              
              {isAuthenticated && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {actor.user_id === user?.id || hasAgentRights ? (
                    <Link to={`/actors/${actorId}/upload-media`}>
                      <Button type="primary" icon={<UploadOutlined />} block>
                        上传媒体资料
                      </Button>
                    </Link>
                  ) : null}
                  
                  {/* 签约按钮 - 只对经纪人显示，且演员未签约时才显示 */}
                  {isManager && !actor.contract_info?.agent_id && (
                    <Button 
                      type="dashed" 
                      icon={<TeamOutlined />} 
                      onClick={handleAssignToMe}
                      block
                    >
                      签约到我名下
                    </Button>
                  )}
                  
                  {/* 签约状态展示 */}
                  {actor.contract_info?.agent_id ? (
                    // 已签约状态
                    <Button 
                      type="text" 
                      icon={<TeamOutlined />} 
                      block
                      style={{ cursor: 'default', color: '#1890ff', borderColor: '#1890ff', background: '#f0f5ff' }}
                    >
                      归属经纪人：{actor.contract_info?.agent_name || '未知经纪人'}
                    </Button>
                  ) : (
                    // 未签约状态 - 所有用户都能看到
                    <Button 
                      type="text" 
                      icon={<TeamOutlined />} 
                      block
                      style={{ cursor: 'default', color: '#faad14', borderColor: '#faad14', background: '#fffbe6' }}
                    >
                      未签约
                    </Button>
                  )}
                  
                  {(isAdmin || actor.user_id === user?.id) && (
                    <Link to={`/actors/${actorId}/edit`}>
                      <Button 
                        type="default" 
                        icon={<EditOutlined />} 
                        block
                      >
                        编辑信息
                      </Button>
                    </Link>
                  )}
                </Space>
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={16} lg={18}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 基本信息卡片 */}
            <Card title="基本信息">
              <Descriptions 
                bordered 
                column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
              >
                <Descriptions.Item label="真实姓名">{actor.real_name}</Descriptions.Item>
                {actor.stage_name && (
                  <Descriptions.Item label="艺名">{actor.stage_name}</Descriptions.Item>
                )}
                <Descriptions.Item label="性别">
                  {actor.gender === 'male' ? '男' : actor.gender === 'female' ? '女' : '其他'}
                </Descriptions.Item>
                {actor.age && (
                  <Descriptions.Item label="年龄">{actor.age} 岁</Descriptions.Item>
                )}
                {actor.height && (
                  <Descriptions.Item label="身高">{actor.height} cm</Descriptions.Item>
                )}
                {actor.weight && (
                  <Descriptions.Item label="体重">{actor.weight} kg</Descriptions.Item>
                )}
                {actor.bust && (
                  <Descriptions.Item label="胸围">{actor.bust} cm</Descriptions.Item>
                )}
                {actor.waist && (
                  <Descriptions.Item label="腰围">{actor.waist} cm</Descriptions.Item>
                )}
                {actor.hip && (
                  <Descriptions.Item label="臀围">{actor.hip} cm</Descriptions.Item>
                )}
                <Descriptions.Item label="状态">
                  <Tag color={actor.status === 'active' ? 'green' : 'red'}>
                    {actor.status === 'active' ? '活跃' : actor.status === 'inactive' ? '非活跃' : '已删除'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {new Date(actor.created_at).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {new Date(actor.updated_at).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 专业信息卡片 */}
            <Card title="专业信息" style={{ marginBottom: 16 }}>
              {actor.bio || actor.skills || actor.experience || actor.education || actor.awards || actor.languages || actor.current_rank || actor.minimum_fee ? (
                <Descriptions column={1} bordered>
                  {actor.bio && (
                    <Descriptions.Item label="个人简介">{actor.bio}</Descriptions.Item>
                  )}
                  {actor.skills && (
                    <Descriptions.Item label="特长与技能">{actor.skills}</Descriptions.Item>
                  )}
                  {actor.experience && (
                    <Descriptions.Item label="表演经历">{actor.experience}</Descriptions.Item>
                  )}
                  {actor.education && (
                    <Descriptions.Item label="教育背景">{actor.education}</Descriptions.Item>
                  )}
                  {actor.current_rank && (
                    <Descriptions.Item label="当前等级">
                      <Tag color="blue">{actor.current_rank}</Tag>
                    </Descriptions.Item>
                  )}
                  {actor.minimum_fee && (
                    <Descriptions.Item label="最低片酬">
                      {actor.minimum_fee} 元/天
                    </Descriptions.Item>
                  )}
                  {actor.awards && (
                    <Descriptions.Item label="获奖经历">{actor.awards}</Descriptions.Item>
                  )}
                  {actor.languages && (
                    <Descriptions.Item label="语言能力">{actor.languages}</Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Empty description="暂无专业信息" />
              )}
            </Card>

            {/* 联系信息卡片 */}
            <Card title="联系信息">
              {isGuest ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Empty 
                    description={
                      <span>
                        访客无法查看联系信息
                        <br />
                        <Link to="/login">
                          <Button type="link" style={{ padding: 0 }}>
                            登录
                          </Button>
                        </Link>
                        后可查看完整信息
                      </span>
                    } 
                  />
                </div>
              ) : (user.role === 'performer' && actor.user_id !== user.id) ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Empty 
                    description={
                      <span>
                        您只能查看自己的联系信息
                      </span>
                    } 
                  />
                </div>
              ) : (actor.phone || 
                actor.email || 
                actor.address || 
                actor.wechat || 
                actor.social_media || 
                actor.emergency_contact || 
                actor.emergency_phone) ? (
                <Descriptions bordered column={{ xxl: 4, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
                  {actor.phone && (
                    <Descriptions.Item label="联系电话">
                      <Space>
                        <PhoneOutlined />
                        {actor.phone}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {actor.email && (
                    <Descriptions.Item label="电子邮箱">
                      <Space>
                        <MailOutlined />
                        {actor.email}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {actor.address && (
                    <Descriptions.Item label="联系地址" span={2}>
                      <Space>
                        <EnvironmentOutlined />
                        {actor.address}
                      </Space>
                    </Descriptions.Item>
                  )}
                  {actor.wechat && (
                    <Descriptions.Item label="微信号">
                      {actor.wechat}
                    </Descriptions.Item>
                  )}
                  {actor.social_media && (
                    <Descriptions.Item label="社交媒体" span={2}>
                      {actor.social_media}
                    </Descriptions.Item>
                  )}
                  {actor.emergency_contact && (
                    <Descriptions.Item label="紧急联系人">
                      {actor.emergency_contact}
                    </Descriptions.Item>
                  )}
                  {actor.emergency_phone && (
                    <Descriptions.Item label="紧急联系电话">
                      {actor.emergency_phone}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Empty description="暂无联系信息" style={{ margin: '30px 0' }} />
              )}
            </Card>

            {/* 媒体资料卡片 */}
            <Card 
              title={
                <Space>
                  <span>媒体资料</span>
                  {(actor.user_id === user?.id || hasAgentRights) && (
                    <Link to={`/actors/${actorId}/upload-media`}>
                      <Button type="primary" size="small" icon={<UploadOutlined />}>
                        上传媒体
                      </Button>
                    </Link>
                  )}
                </Space>
              }
            >
              {mediaLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
                  <div>加载媒体资料...</div>
                </div>
              ) : media.length > 0 ? (
                <>
                  {/* 照片展示区域 */}
                  <Card
                    type="inner"
                    title="照片"
                    style={{ marginBottom: '16px' }}
                  >
                    {media.filter(item => item.type === 'photo' || (item.mime_type && item.mime_type.startsWith('image') && item.type !== 'avatar')).length > 0 ? (
                      <>
                        <Row gutter={[16, 16]}>
                          {media
                            .filter(item => item.type === 'photo' || (item.mime_type && item.mime_type.startsWith('image') && item.type !== 'avatar'))
                            .slice(0, 6)
                            .map((item) => (
                              <Col xs={12} sm={8} md={8} lg={6} xl={4} key={item.id}>
                                <Card
                                  hoverable
                                  cover={
                                    <Image
                                      src={item.thumbnail_url || item.file_url}
                                      alt={item.title || '照片'}
                                      style={{ height: '120px', objectFit: 'cover' }}
                                      fallback={NoImage}
                                      preview={{
                                        src: item.file_url,
                                        mask: (
                                          <Space direction="vertical" align="center">
                                            <EyeOutlined style={{ fontSize: '16px' }} />
                                            <span>预览</span>
                                          </Space>
                                        )
                                      }}
                                    />
                                  }
                                  bodyStyle={{ padding: '8px' }}
                                >
                                  <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                                    <Text ellipsis title={item.title || item.file_name || '未命名'}>
                                      {item.title || item.file_name || '未命名'}
                                    </Text>
                                  </div>
                                  {hasAgentRights && (
                                    <Button 
                                      type="text" 
                                      danger
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleDeleteMedia(item.id)}
                                      style={{ position: 'absolute', top: 0, right: 0 }}
                                    />
                                  )}
                                </Card>
                              </Col>
                            ))}
                        </Row>
                        {media.filter(item => item.type === 'photo' || (item.mime_type && item.mime_type.startsWith('image') && item.type !== 'avatar')).length > 6 && (
                          <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <Link to={`/actors/${actorId}/upload-media`}>
                              <Button type="link">
                                查看全部 ({media.filter(item => item.type === 'photo' || (item.mime_type && item.mime_type.startsWith('image') && item.type !== 'avatar')).length}张)
                              </Button>
                            </Link>
                          </div>
                        )}
                      </>
                    ) : (
                      <Empty description="暂无照片" />
                    )}
                  </Card>

                  {/* 视频展示区域 */}
                  <Card
                    type="inner"
                    title="视频"
                  >
                    {media.filter(item => item.type === 'video' || (item.mime_type && item.mime_type.startsWith('video'))).length > 0 ? (
                      <>
                        <Row gutter={[16, 16]}>
                          {media
                            .filter(item => item.type === 'video' || (item.mime_type && item.mime_type.startsWith('video')))
                            .slice(0, 2)
                            .map((item) => (
                              <Col xs={24} sm={12} key={item.id}>
                                <Card
                                  hoverable
                                  bodyStyle={{ padding: '12px' }}
                                >
                                  <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                      <video
                                        controls
                                        preload="metadata"
                                        poster={item.thumbnail_url || NoImage}
                                        style={{ width: '100%', height: 'auto', maxHeight: '200px', background: '#f0f2f5' }}
                                        src={item.file_url}
                                      >
                                        您的浏览器不支持视频播放
                                      </video>
                                      <div 
                                        style={{ 
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          right: 0,
                                          bottom: 0,
                                          background: 'rgba(0,0,0,0.3)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: 0,
                                          transition: 'opacity 0.3s',
                                          cursor: 'pointer',
                                          ':hover': {
                                            opacity: 1
                                          }
                                        }}
                                        onClick={(e) => {
                                          const video = e.currentTarget.previousSibling;
                                          if (video.paused) {
                                            video.play();
                                          } else {
                                            video.pause();
                                          }
                                        }}
                                      >
                                        <PlayCircleOutlined style={{ fontSize: '48px', color: '#fff' }} />
                                      </div>
                                    </div>
                                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                                      <Text ellipsis title={item.title || item.file_name || '未命名'}>
                                        {item.title || item.file_name || '未命名'}
                                      </Text>
                                    </div>
                                    {hasAgentRights && (
                                      <Button 
                                        type="text" 
                                        danger
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteMedia(item.id)}
                                        style={{ position: 'absolute', top: 0, right: 0 }}
                                      />
                                    )}
                                  </div>
                                </Card>
                              </Col>
                            ))}
                        </Row>
                        {media.filter(item => item.type === 'video' || (item.mime_type && item.mime_type.startsWith('video'))).length > 2 && (
                          <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <Link to={`/actors/${actorId}/upload-media`}>
                              <Button type="link">
                                查看全部 ({media.filter(item => item.type === 'video' || (item.mime_type && item.mime_type.startsWith('video'))).length}个)
                              </Button>
                            </Link>
                          </div>
                        )}
                      </>
                    ) : (
                      <Empty description="暂无视频" />
                    )}
                  </Card>
                </>
              ) : (
                <Empty description="暂无媒体资料" />
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default ActorDetailPage; 