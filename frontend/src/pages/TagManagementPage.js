import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Modal, Form, Input, 
  message, Popconfirm, Card, Select, Typography, Tag
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined 
} from '@ant-design/icons';
import { getTags, createTag, updateTag, deleteTag } from '../api/tagApi';

const { Title } = Typography;
const { Option } = Select;

const TagManagementPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [form] = Form.useForm();
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [categories, setCategories] = useState([]);

  // 获取标签列表
  const fetchTags = async () => {
    setLoading(true);
    try {
      const data = await getTags();
      setTags(data);
      
      // 提取所有不重复的分类
      const uniqueCategories = [...new Set(data.map(tag => tag.category))].filter(Boolean);
      setCategories(uniqueCategories);
    } catch (error) {
      message.error('获取标签列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // 打开新增标签模态框
  const showAddModal = () => {
    setEditingTag(null);
    form.resetFields();
    setModalVisible(true);
  };

  // 打开编辑标签模态框
  const showEditModal = (tag) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      category: tag.category || '',
      description: tag.description || '',
    });
    setModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingTag) {
        // 更新标签
        await updateTag(editingTag.id, values);
        message.success('标签更新成功');
      } else {
        // 创建标签
        await createTag(values);
        message.success('标签创建成功');
      }
      
      setModalVisible(false);
      fetchTags();
    } catch (error) {
      console.error('表单提交失败:', error);
    }
  };

  // 处理删除标签
  const handleDelete = async (tagId) => {
    try {
      await deleteTag(tagId);
      message.success('标签删除成功');
      fetchTags();
    } catch (error) {
      message.error('删除标签失败');
      console.error(error);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      filters: categories.map(cat => ({ text: cat, value: cat })),
      onFilter: (value, record) => record.category === value,
      render: (text) => text || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
          />
          <Popconfirm
            title="确定要删除这个标签吗？"
            description="删除后无法恢复，且会影响已关联此标签的演员。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 过滤后的标签数据
  const filteredTags = categoryFilter
    ? tags.filter(tag => tag.category === categoryFilter)
    : tags;

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4}>标签管理</Title>
          <Space>
            <Select
              allowClear
              placeholder="按分类筛选"
              style={{ width: 150 }}
              onChange={(value) => setCategoryFilter(value)}
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showAddModal}
            >
              新增标签
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTags}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个标签`
          }}
        />
      </Card>

      {/* 新增/编辑标签模态框 */}
      <Modal
        title={editingTag ? '编辑标签' : '新增标签'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
          >
            <Select
              placeholder="请选择或输入分类"
              allowClear
              showSearch
            >
              {categories.map(category => (
                <Option key={category} value={category}>{category}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="请输入标签描述" rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagManagementPage; 