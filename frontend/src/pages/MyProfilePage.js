import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Card, Button, Typography, Steps, Image, Descriptions, Tag, 
  Row, Col, Divider, Spin, Empty, message, Tabs, Space, Modal, Form, Input, Select, InputNumber
} from 'antd';
import { 
  EditOutlined, UploadOutlined, LoadingOutlined, UserAddOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, SaveOutlined
} from '@ant-design/icons';
import { getMyActorProfile, createActor, updateSelfActorInfo } from '../api/actorApi';
import { getSelfMedia } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';
import NoImage from '../assets/no-image.png';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

const MyProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useContext(AuthContext);
  
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [form] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState(false);
  
  // 创建新的演员资料相关状态和函数
  const [activeTab, setActiveTab] = useState('basic');
  const [allTabsVisited, setAllTabsVisited] = useState({
    basic: true,
    professional: false,
    contact: false
  });
  
  // 处理标签页切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    setAllTabsVisited(prev => ({
      ...prev,
      [key]: true
    }));
    
    // 每次切换标签页时，检查表单当前标签页的数据是否有效
    form.validateFields().catch(() => {
      // 如果当前表单数据无效，不做特殊处理
    });
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

  const fetchMyProfile = async () => {
    setLoading(true);
    try {
      // 获取演员基本资料
      const actorData = await getMyActorProfile();
      
      if (actorData) {
        // 获取演员媒体资料
        try {
          const mediaData = await getSelfMedia();
          // 合并媒体数据到演员资料
          setActor({
            ...actorData,
            photos: mediaData?.photos || [],
            videos: mediaData?.videos || [],
            avatar: mediaData?.avatar || null
          });
        } catch (mediaError) {
          console.error('获取媒体资料失败:', mediaError);
          // 即使媒体资料获取失败，仍然显示演员基本资料
          setActor({
            ...actorData,
            photos: [],
            videos: [],
            avatar: null
          });
        }
      } else {
        message.warning('未找到您的演员资料');
      }
    } catch (error) {
      console.error('获取演员资料失败:', error);
      message.error('获取演员资料失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新的演员资料
  const handleCreateProfile = async (values) => {
    setCreating(true);
    try {
      // 构建完整的演员数据
      const actorData = {
        // 基本信息
        real_name: values.real_name,
        stage_name: values.stage_name || '',
        gender: values.gender,
        age: values.age,
        height: values.height,
        weight: values.weight,
        bust: values.bust,
        waist: values.waist,
        hip: values.hip,
        
        // 专业信息
        bio: values.bio,
        skills: values.skills,
        experience: values.experience,
        education: values.education,
        awards: values.awards,
        languages: values.languages,
        current_rank: values.current_rank,
        minimum_fee: values.minimum_fee,
        
        // 联系信息
        phone: values.phone,
        email: values.email,
        address: values.address,
        wechat: values.wechat,
        social_media: values.social_media,
        emergency_contact: values.emergency_contact,
        emergency_phone: values.emergency_phone,
        user_id: user.id
      };

      const result = await createActor(actorData);
      message.success('演员资料创建成功！');
      setCreateModalVisible(false);
      // 创建成功后跳转到上传媒体资料页面
      navigate(`/actors/${result.id}/upload-media`);
    } catch (error) {
      console.error('创建演员资料失败:', error);
      message.error('创建演员资料失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setCreating(false);
    }
  };

  // 打开编辑模态框
  const showEditModal = () => {
    // 设置表单初始值
    if (actor) {
      editForm.setFieldsValue({
        real_name: actor.real_name,
        stage_name: actor.stage_name,
        gender: actor.gender,
        age: actor.age,
        height: actor.height,
        weight: actor.weight,
        bust: actor.bust,
        waist: actor.waist,
        hip: actor.hip,
        bio: actor.bio,
        skills: actor.skills,
        experience: actor.experience,
        education: actor.education,
        awards: actor.awards,
        languages: actor.languages,
        current_rank: actor.current_rank,
        minimum_fee: actor.minimum_fee,
        phone: actor.phone,
        email: actor.email,
        address: actor.address,
        wechat: actor.wechat,
        emergency_contact: actor.emergency_contact,
        emergency_phone: actor.emergency_phone
      });
    }
    setEditModalVisible(true);
  };

  // 处理更新表单提交
  const handleUpdateProfile = async (values) => {
    setSaveLoading(true);
    try {
      // 预处理数据：将逗号分隔的字符串转换为数组
      const processedValues = { ...values };
      
      // 处理可能需要数组的字段
      const arrayFields = ['skills', 'experience', 'education', 'awards', 'languages'];
      arrayFields.forEach(field => {
        if (processedValues[field] && typeof processedValues[field] === 'string') {
          // 将逗号分隔的字符串拆分为数组，并去除空白
          processedValues[field] = processedValues[field]
            .split(',')
            .map(item => item.trim())
            .filter(item => item !== '');
        }
      });

      // 构建要更新的演员数据
      const actorData = {
        ...processedValues,
        user_id: user.id
      };

      const result = await updateSelfActorInfo(actorData);
      message.success('演员资料更新成功！');
      setEditModalVisible(false);
      setActor(result);
    } catch (error) {
      console.error('更新演员资料失败:', error);
      message.error('更新演员资料失败: ' + (error.response?.data?.detail || '未知错误'));
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin 
          size="large" 
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} 
        />
        <div style={{ marginTop: '10px' }}>加载演员资料...</div>
      </div>
    );
  }

  if (!actor) {
    return (
      <Card>
        <Empty
          description="未找到您的演员资料"
          style={{ margin: '50px 0' }}
        >
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p>您目前没有演员资料，可以点击下方按钮创建。</p>
            <Button 
              type="primary" 
              onClick={() => navigate('/create-my-profile')}
              icon={<UserAddOutlined />}
              style={{ marginTop: '10px' }}
            >
              创建我的演员资料
            </Button>
          </div>
        </Empty>
      </Card>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
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
                <Tag color={actor.gender === 'male' ? 'blue' : actor.gender === 'female' ? 'pink' : 'purple'}>
                  {actor.gender === 'male' ? '男' : actor.gender === 'female' ? '女' : '其他'}
                </Tag>
                {actor.age && <Tag color="purple">{actor.age} 岁</Tag>}
                {actor.height && <Tag color="cyan">{actor.height} cm</Tag>}
                {actor.weight && <Tag color="green">{actor.weight} kg</Tag>}
              </Space>
              
              <Divider />
              
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={showEditModal}
                  block
                >
                  编辑资料
                </Button>
                <Button 
                  icon={<UploadOutlined />}
                  onClick={() => navigate('/my-media')}
                  block
                >
                  管理媒体资料
                </Button>
              </Space>
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
                <Descriptions.Item label="姓名" span={2}>{actor.real_name}</Descriptions.Item>
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
                <Descriptions.Item label="创建时间">
                  {actor.created_at && new Date(actor.created_at).toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {actor.updated_at && new Date(actor.updated_at).toLocaleString()}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* 专业信息卡片 */}
            <Card title="专业信息">
              {actor.bio || actor.skills || actor.experience || actor.education || actor.awards || actor.languages || actor.current_rank || actor.minimum_fee ? (
                <Descriptions column={1} bordered>
                  {actor.bio && (
                    <Descriptions.Item label="个人简介">{actor.bio}</Descriptions.Item>
                  )}
                  {actor.skills && (
                    <Descriptions.Item label="特长与技能">{Array.isArray(actor.skills) ? actor.skills.join(', ') : actor.skills}</Descriptions.Item>
                  )}
                  {actor.experience && (
                    <Descriptions.Item label="表演经历">{Array.isArray(actor.experience) ? actor.experience.join(', ') : actor.experience}</Descriptions.Item>
                  )}
                  {actor.education && (
                    <Descriptions.Item label="教育背景">{Array.isArray(actor.education) ? actor.education.join(', ') : actor.education}</Descriptions.Item>
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
                    <Descriptions.Item label="获奖经历">{Array.isArray(actor.awards) ? actor.awards.join(', ') : actor.awards}</Descriptions.Item>
                  )}
                  {actor.languages && (
                    <Descriptions.Item label="语言能力">{Array.isArray(actor.languages) ? actor.languages.join(', ') : actor.languages}</Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Empty description="暂无专业信息" />
              )}
            </Card>

            {/* 联系信息卡片 */}
            <Card title="联系信息">
              {actor.phone || actor.email || actor.address || actor.wechat || actor.social_media || actor.emergency_contact || actor.emergency_phone ? (
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
                    <Descriptions.Item label="微信">
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
                      <Space>
                        <PhoneOutlined />
                        {actor.emergency_phone}
                      </Space>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              ) : (
                <Empty description="暂无联系信息" />
              )}
            </Card>

            {/* 媒体资料卡片 */}
            <Card 
              title="媒体资料" 
              extra={
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<UploadOutlined />}
                  onClick={() => navigate('/my-media')}
                >
                  管理媒体资料
                </Button>
              }
            >
              {/* 照片展示 */}
              <Title level={5} style={{ marginTop: '0' }}>照片</Title>
              {actor.photos && actor.photos.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                  <Row gutter={[16, 16]}>
                    {actor.photos.slice(0, 6).map((photo, index) => (
                      <Col xs={12} sm={8} md={8} lg={6} xl={4} key={index}>
                        <div style={{ position: 'relative' }}>
                          <Image
                            src={photo.file_url}
                            alt={photo.file_name || `照片${index + 1}`}
                            style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                            fallback={NoImage}
                          />
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888', textAlign: 'center' }}>
                            <Text ellipsis title={photo.file_name}>
                              {photo.file_name || `照片${index + 1}`}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  {actor.photos.length > 6 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Button type="link" onClick={() => navigate('/my-media')}>
                        查看全部 ({actor.photos.length}张)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Empty description="暂无照片" style={{ margin: '16px 0' }} />
              )}

              <Divider style={{ margin: '16px 0' }} />

              {/* 视频展示 */}
              <Title level={5} style={{ marginTop: '8px' }}>视频</Title>
              {actor.videos && actor.videos.length > 0 ? (
                <div>
                  <Row gutter={[16, 16]}>
                    {actor.videos.slice(0, 2).map((video, index) => (
                      <Col xs={24} sm={12} key={index}>
                        <div style={{ position: 'relative', background: '#f0f2f5' }}>
                          <video
                            controls
                            preload="metadata"
                            poster={video.thumbnail_url || NoImage}
                            style={{ width: '100%', height: 'auto', maxHeight: '200px' }}
                            src={video.file_url}
                          >
                            您的浏览器不支持视频播放
                          </video>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                            <Text ellipsis title={video.file_name}>
                              {video.file_name || `视频${index + 1}`}
                            </Text>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                  {actor.videos.length > 2 && (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <Button type="link" onClick={() => navigate('/my-media')}>
                        查看全部 ({actor.videos.length}个)
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Empty description="暂无视频" style={{ margin: '16px 0' }} />
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* 编辑演员资料的模态框 */}
      <Modal
        title="编辑演员资料"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        width={800}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{ gender: actor?.gender || 'other' }}
        >
          <Tabs 
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="real_name"
                          label="真实姓名"
                          rules={[{ required: true, message: '请输入真实姓名' }]}
                        >
                          <Input placeholder="请输入真实姓名" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="stage_name"
                          label="艺名（可选）"
                        >
                          <Input placeholder="请输入艺名（如有）" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          name="gender"
                          label="性别"
                          rules={[{ required: true, message: '请选择性别' }]}
                        >
                          <Select placeholder="请选择性别">
                            <Select.Option value="male">男</Select.Option>
                            <Select.Option value="female">女</Select.Option>
                            <Select.Option value="other">其他</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="age" label="年龄">
                          <InputNumber min={1} max={120} placeholder="年龄" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="height" label="身高(cm)">
                          <InputNumber min={50} max={250} placeholder="身高" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="weight" label="体重(kg)">
                          <InputNumber min={20} max={200} placeholder="体重" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="bust" label="胸围(cm)">
                          <InputNumber min={30} max={200} placeholder="胸围" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="waist" label="腰围(cm)">
                          <InputNumber min={30} max={200} placeholder="腰围" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="hip" label="臀围(cm)">
                          <InputNumber min={30} max={200} placeholder="臀围" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )
              },
              {
                key: 'professional',
                label: '专业信息',
                children: (
                  <>
                    <Form.Item name="bio" label="个人简介">
                      <Input.TextArea rows={4} placeholder="请输入个人简介" />
                    </Form.Item>
                    <Form.Item name="skills" label="特长与技能">
                      <Input.TextArea rows={3} placeholder="例如：唱歌、跳舞、表演等，多个技能用逗号分隔" />
                    </Form.Item>
                    <Form.Item name="experience" label="表演经历">
                      <Input.TextArea rows={3} placeholder="请填写您的表演经历，多个经历用逗号分隔" />
                    </Form.Item>
                    <Form.Item name="education" label="教育背景">
                      <Input.TextArea rows={2} placeholder="请填写您的教育背景，多个教育经历用逗号分隔" />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="current_rank" label="当前等级">
                          <Select placeholder="请选择当前等级">
                            <Select.Option value="主角">主角</Select.Option>
                            <Select.Option value="角色">角色</Select.Option>
                            <Select.Option value="特约">特约</Select.Option>
                            <Select.Option value="群演">群演</Select.Option>
                            <Select.Option value="无经验">无经验</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="minimum_fee" label="最低片酬（元/天）">
                          <InputNumber min={0} placeholder="最低接受片酬" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="awards" label="获奖经历">
                      <Input.TextArea rows={2} placeholder="请填写您的获奖经历，多个获奖经历用逗号分隔" />
                    </Form.Item>
                    <Form.Item name="languages" label="语言能力">
                      <Input.TextArea rows={2} placeholder="例如：普通话（精通）、英语（流利）、粤语（基础），多个语言用逗号分隔" />
                    </Form.Item>
                  </>
                )
              },
              {
                key: 'contact',
                label: '联系信息',
                children: (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="phone" label="联系电话">
                          <Input placeholder="请输入联系电话" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="email" label="电子邮箱">
                          <Input placeholder="请输入电子邮箱" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="address" label="联系地址">
                      <Input placeholder="请输入联系地址" />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="wechat" label="微信号">
                          <Input placeholder="请输入微信号" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="emergency_contact" label="紧急联系人">
                          <Input placeholder="请输入紧急联系人" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="emergency_phone" label="紧急联系电话">
                          <Input placeholder="请输入紧急联系电话" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )
              }
            ]}
          />
          
          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saveLoading}>
              保存
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MyProfilePage; 