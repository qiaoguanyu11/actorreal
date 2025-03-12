import React, { useState, useEffect, useContext } from 'react';
import { 
  Table, Card, Button, message, Space, Select, 
  Input, Form, Modal, Tabs, Spin, Typography, Tag, Divider
} from 'antd';
import { UserOutlined, TeamOutlined, SwapOutlined } from '@ant-design/icons';
import { getActors } from '../api/actorApi';
import { getManagerList, getUsers } from '../api/userApi';
import { assignActorToAgent, removeActorAgent } from '../api/actorApi';
import { AuthContext } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const AgentManagementPage = () => {
  const { isAdmin } = useContext(AuthContext);
  const [agents, setAgents] = useState([]);
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedActor, setSelectedActor] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  
  // 初始化加载数据
  useEffect(() => {
    loadData();
  }, []);
  
  // 加载经纪人和演员数据
  const loadData = async () => {
    setLoading(true);
    try {
      // 加载经纪人列表
      const agentsData = await getManagerList();
      setAgents(agentsData);
      
      // 加载所有演员
      const actorsData = await getActors();
      setActors(actorsData);
      
      setLoading(false);
    } catch (error) {
      message.error('加载数据失败: ' + error.message);
      setLoading(false);
    }
  };
  
  // 打开修改经纪人归属的模态框
  const showChangeAgentModal = (actor) => {
    setSelectedActor(actor);
    setSelectedAgent(actor.contract_info?.agent_id || null);
    setModalVisible(true);
  };
  
  // 提交更改经纪人归属
  const handleChangeAgent = async () => {
    if (!selectedActor) return;
    
    setLoading(true);
    try {
      if (selectedAgent === null) {
        // 如果选择了"无经纪人"，则解除演员与经纪人的关联
        await removeActorAgent(selectedActor.id);
        message.success('已解除演员的经纪人归属');
      } else {
        // 如果选择了经纪人，则分配演员给经纪人
        await assignActorToAgent(selectedActor.id, selectedAgent);
        message.success('演员已分配给新的经纪人');
      }
      setModalVisible(false);
      // 重新加载数据
      loadData();
    } catch (error) {
      message.error('修改经纪人归属失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 经纪人列表列定义
  const agentColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (text) => text || '未设置',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        isActive ? <Tag color="green">活跃</Tag> : <Tag color="red">已禁用</Tag>
      ),
    },
    {
      title: '旗下演员数',
      key: 'actor_count',
      render: (_, record) => {
        const count = actors.filter(
          actor => actor.contract_info?.agent_id === record.id
        ).length;
        return count;
      },
    }
  ];
  
  // 演员列表列定义
  const actorColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '艺名',
      dataIndex: 'stage_name',
      key: 'stage_name',
      render: (text) => text || '无',
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: '归属经纪人',
      key: 'agent',
      render: (_, record) => {
        const agentId = record.contract_info?.agent_id;
        const agent = agents.find(a => a.id === agentId);
        return agentId ? (
          <Tag color="blue">{agent?.username || '未知经纪人'}</Tag>
        ) : (
          <Tag color="orange">未签约</Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary"
          icon={<SwapOutlined />}
          onClick={() => showChangeAgentModal(record)}
        >
          修改归属
        </Button>
      ),
    },
  ];
  
  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>
        <TeamOutlined /> 经纪人管理
      </Title>
      <Divider />
      
      <Spin spinning={loading}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Button 
              type="primary" 
              onClick={() => loadData()}
            >
              刷新数据
            </Button>
          }
          items={[
            {
              key: '1',
              label: '经纪人列表',
              children: (
                <Card title="经纪人列表" variant="bordered">
                  <Table 
                    dataSource={agents} 
                    columns={agentColumns} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              )
            },
            {
              key: '2',
              label: '演员分配',
              children: (
                <Card title="演员列表" variant="bordered">
                  <Table 
                    dataSource={actors} 
                    columns={actorColumns} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              )
            }
          ]}
        />
      </Spin>
      
      {/* 修改经纪人归属的模态框 */}
      <Modal
        title="修改演员经纪人归属"
        open={modalVisible}
        onOk={handleChangeAgent}
        onCancel={() => setModalVisible(false)}
        confirmLoading={loading}
      >
        {selectedActor && (
          <Form layout="vertical">
            <Form.Item label="演员">
              <Input 
                value={`${selectedActor.name} (${selectedActor.id})`} 
                disabled 
              />
            </Form.Item>
            
            <Form.Item label="经纪人">
              <Select
                style={{ width: '100%' }}
                placeholder="选择经纪人"
                value={selectedAgent}
                onChange={value => setSelectedAgent(value)}
                allowClear
              >
                <Option value={null}>无经纪人</Option>
                {agents.map(agent => (
                  <Option key={agent.id} value={agent.id}>
                    {agent.username}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AgentManagementPage; 