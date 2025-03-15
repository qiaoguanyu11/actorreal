import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Form, Button, Checkbox, Input, Alert, Space, 
  Typography, Divider, Modal, Spin, message 
} from 'antd';
import { 
  ExclamationCircleOutlined, 
  DeleteOutlined, 
  RollbackOutlined
} from '@ant-design/icons';
import { getActorDetail, deleteActorAdvanced } from '../api/actorApi';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DeleteActorPage = () => {
  const { actorId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [actor, setActor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 获取演员详情
  useEffect(() => {
    const fetchActorDetail = async () => {
      try {
        setLoading(true);
        const data = await getActorDetail(actorId);
        setActor(data);
        setError(null);
      } catch (err) {
        setError('获取演员信息失败，请重试');
        console.error('获取演员详情失败:', err);
      } finally {
        setLoading(false);
      }
    };

    if (actorId) {
      fetchActorDetail();
    }
  }, [actorId]);

  // 处理表单提交
  const handleSubmit = async (values) => {
    // 二次确认
    Modal.confirm({
      title: '确认删除演员',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <Paragraph>
            <Text strong>您即将删除演员: {actor?.real_name}</Text>
          </Paragraph>
          <Paragraph>
            此操作将永久删除演员记录，无法恢复。
          </Paragraph>
          {values.deleteMedia && (
            <Paragraph>
              <Text type="danger">同时将删除所有关联的媒体文件！</Text>
            </Paragraph>
          )}
          <Paragraph>删除原因: {values.reason || '未提供'}</Paragraph>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setSubmitting(true);
          console.log(`开始删除演员 (ID: ${actorId})`);
          
          // 使用高级删除函数
          await deleteActorAdvanced(actorId, {
            permanent: true,
            deleteMedia: values.deleteMedia,
            reason: values.reason
          });
          
          console.log(`演员删除成功 (ID: ${actorId})`);
          message.success('演员已成功删除');
          navigate('/'); // 删除成功后返回首页
        } catch (err) {
          console.error('删除演员失败:', err);
          console.error('错误详情:', {
            message: err.message,
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data
          });
          
          const errorMsg = err.response?.data?.detail || '删除演员失败，请重试';
          setError(errorMsg);
          message.error(errorMsg);
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={
        <Title level={4}>
          <DeleteOutlined style={{ color: '#ff4d4f' }} /> 删除演员
        </Title>
      }>
        <Spin spinning={loading}>
          {error && (
            <Alert
              message="错误"
              description={error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {actor && (
            <>
              <Alert
                message="警告"
                description="删除演员是一项敏感操作，请确保您了解此操作的后果。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <div style={{ marginBottom: 24 }}>
                <Title level={5}>演员信息</Title>
                <Paragraph>姓名: {actor.real_name}</Paragraph>
                {actor.stage_name && <Paragraph>艺名: {actor.stage_name}</Paragraph>}
                <Paragraph>性别: {actor.gender === 'male' ? '男' : actor.gender === 'female' ? '女' : '其他'}</Paragraph>
                {actor.age && <Paragraph>年龄: {actor.age}岁</Paragraph>}
              </div>

              <Divider />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                  reason: '',
                  deleteMedia: true,
                  permanent: true
                }}
              >
                <Form.Item
                  name="deleteMedia"
                  valuePropName="checked"
                >
                  <Checkbox>同时删除所有关联的媒体文件</Checkbox>
                </Form.Item>
                
                <Form.Item
                  name="reason"
                  label="删除原因"
                  rules={[
                    { required: true, message: '请输入删除原因' }
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入删除此演员的原因"
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      htmlType="submit"
                      loading={submitting}
                    >
                      确认删除
                    </Button>
                    <Button
                      icon={<RollbackOutlined />}
                      onClick={() => navigate(-1)}
                    >
                      返回
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default DeleteActorPage; 