import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Form, Input, Select, Button, Card, InputNumber, 
  message, Steps, Divider, Space, Spin, Radio, Tabs, DatePicker,
  Switch, Checkbox
} from 'antd';
import { 
  SaveOutlined, UserOutlined, PhoneOutlined, 
  MailOutlined, EnvironmentOutlined, BankOutlined
} from '@ant-design/icons';
import { createActor } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';

const { Step } = Steps;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const CreateActorPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [allTabsVisited, setAllTabsVisited] = useState({
    basic: true,
    professional: false,
    contact: false
  });
  const [formComplete, setFormComplete] = useState(false);

  const handleSubmit = async (values) => {
    // 检查是否访问了所有标签页
    if (!Object.values(allTabsVisited).every(visited => visited)) {
      message.warning('请先完成所有步骤的信息填写');
      return;
    }
    setLoading(true);
    try {
      // 如果当前用户是演员，添加user_id关联
      if (user.role === 'performer') {
        values.user_id = user.id;
      }
      
      // 构建完整的演员数据
      const actorData = {
        // 基本信息
        real_name: values.real_name,
        stage_name: values.stage_name,
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
        emergency_phone: values.emergency_phone
      };
      
      console.log('提交演员完整数据:', actorData);
      const data = await createActor(actorData);
      message.success('演员信息创建成功', 1.5, () => {
        // 所有用户角色都跳转到媒体上传页面
        navigate(`/actors/${data.id}/upload-media`);
      });
    } catch (error) {
      console.error('创建演员失败:', error);
      message.error('创建演员失败: ' + (error.response?.data?.detail || '未知错误'));
      setLoading(false);
    }
  };

  // 定义tabs的items
  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div>
          <Form.Item
            name="real_name"
            label="真实姓名"
            rules={[{ required: true, message: '请输入真实姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>
          
          <Form.Item
            name="stage_name"
            label="艺名"
          >
            <Input placeholder="请输入艺名（如有）" />
          </Form.Item>
          
          <Form.Item
            name="gender"
            label="性别"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <Select placeholder="请选择性别">
              <Option value="male">男</Option>
              <Option value="female">女</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="age"
            label="年龄"
          >
            <InputNumber min={1} max={120} placeholder="年龄" />
          </Form.Item>
          
          <Form.Item
            name="height"
            label="身高(cm)"
          >
            <InputNumber min={50} max={250} placeholder="身高(cm)" />
          </Form.Item>
          
          <Form.Item
            name="weight"
            label="体重(kg)"
          >
            <InputNumber min={20} max={200} placeholder="体重(kg)" />
          </Form.Item>
          
          <Form.Item
            name="bust"
            label="胸围(cm)"
          >
            <InputNumber min={30} max={200} placeholder="胸围(cm)" />
          </Form.Item>
          
          <Form.Item
            name="waist"
            label="腰围(cm)"
          >
            <InputNumber min={30} max={200} placeholder="腰围(cm)" />
          </Form.Item>
          
          <Form.Item
            name="hip"
            label="臀围(cm)"
          >
            <InputNumber min={30} max={200} placeholder="臀围(cm)" />
          </Form.Item>
        </div>
      )
    },
    {
      key: 'professional',
      label: '专业信息',
      children: (
        <div>
          <Form.Item
            name="bio"
            label="个人简介"
          >
            <Input.TextArea rows={4} placeholder="请输入个人简介" />
          </Form.Item>
          
          <Form.Item
            name="skills"
            label="技能特长"
          >
            <Select mode="tags" placeholder="请输入技能特长，回车分隔">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="experience"
            label="表演经历"
          >
            <Select mode="tags" placeholder="请输入表演经历，回车分隔">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="education"
            label="教育背景"
          >
            <Select mode="tags" placeholder="请输入教育背景，回车分隔">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="awards"
            label="获奖经历"
          >
            <Select mode="tags" placeholder="请输入获奖经历，回车分隔">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="languages"
            label="语言能力"
          >
            <Select mode="tags" placeholder="请输入语言能力，回车分隔">
            </Select>
          </Form.Item>
          
          <Form.Item
            name="current_rank"
            label="当前咖位"
          >
            <Select placeholder="请选择当前咖位">
              <Option value="主角">主角</Option>
              <Option value="角色">角色</Option>
              <Option value="特约">特约</Option>
              <Option value="群演">群演</Option>
              <Option value="无经验">无经验</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="minimum_fee"
            label="最低片酬(元/天)"
          >
            <InputNumber min={0} placeholder="最低片酬(元/天)" />
          </Form.Item>
        </div>
      )
    },
    {
      key: 'contact',
      label: '联系方式',
      children: (
        <div>
          <Form.Item
            name="phone"
            label="联系电话"
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="电子邮箱"
          >
            <Input placeholder="请输入电子邮箱" />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="联系地址"
          >
            <Input placeholder="请输入联系地址" />
          </Form.Item>
          
          <Form.Item
            name="wechat"
            label="微信号"
          >
            <Input placeholder="请输入微信号" />
          </Form.Item>
          
          <Form.Item
            name="emergency_contact"
            label="紧急联系人"
          >
            <Input placeholder="请输入紧急联系人" />
          </Form.Item>
          
          <Form.Item
            name="emergency_phone"
            label="紧急联系电话"
          >
            <Input placeholder="请输入紧急联系电话" />
          </Form.Item>
        </div>
      )
    }
  ];

  // 处理标签页切换
  const handleTabChange = (key) => {
    setActiveTab(key);
    setAllTabsVisited(prev => ({
      ...prev,
      [key]: true
    }));
    
    // 每次切换标签页时，检查表单当前标签页的数据是否有效
    form.validateFields().then(() => {
      // 检查是否所有标签页都已访问
      const newAllVisited = {
        ...allTabsVisited,
        [key]: true
      };
      
      setFormComplete(Object.values(newAllVisited).every(visited => visited));
    }).catch(() => {
      // 如果当前表单数据无效，不做特殊处理
    });
  };

  return (
    <Spin spinning={loading}>
      <Card title="创建演员信息">
        <Steps current={['basic', 'professional', 'contact'].indexOf(activeTab)} style={{ marginBottom: 30 }}>
          <Step title="基本信息" description="填写演员基本资料" status={allTabsVisited.basic ? 'finish' : 'wait'} />
          <Step title="专业信息" description="填写专业背景" status={allTabsVisited.professional ? 'finish' : 'wait'} />
          <Step title="联系方式" description="填写联系信息" status={allTabsVisited.contact ? 'finish' : 'wait'} />
        </Steps>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            gender: 'male',
            status: 'active'
          }}
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={handleTabChange}
            items={tabItems}
          />
          
          <Form.Item style={{ marginTop: 20 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                提交
              </Button>
              <Button onClick={() => navigate(-1)}>
                取消
              </Button>
              {activeTab !== 'contact' && (
                <Button type="primary" onClick={() => {
                  const nextTab = activeTab === 'basic' ? 'professional' : 'contact';
                  handleTabChange(nextTab);
                }}>
                  下一步
                </Button>
              )}
              {activeTab !== 'basic' && (
                <Button onClick={() => {
                  const prevTab = activeTab === 'contact' ? 'professional' : 'basic';
                  handleTabChange(prevTab);
                }}>
                  上一步
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Spin>
  );
};

export default CreateActorPage; 