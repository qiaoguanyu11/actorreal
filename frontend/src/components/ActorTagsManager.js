import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tag, Button, Select, message, Space, Tooltip, Spin
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getTags, getActorTags, addActorTags, deleteActorTag } from '../api/tagApi';

const { Option } = Select;

const ActorTagsManager = ({ actorId, readOnly = false }) => {
  const [tags, setTags] = useState([]);
  const [actorTags, setActorTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // 获取所有标签
  const fetchAllTags = async () => {
    try {
      const data = await getTags();
      setAllTags(data || []);
    } catch (error) {
      console.error('获取所有标签失败:', error);
    }
  };

  // 获取演员标签
  const fetchActorTags = useCallback(async () => {
    if (!actorId) return;
    
    setLoading(true);
    try {
      const data = await getActorTags(actorId);
      console.log('获取到演员标签数据:', data);
      
      // 确保数据格式正确
      let actorTagsData = [];
      if (data && data.tags) {
        actorTagsData = data.tags;
      } else if (Array.isArray(data)) {
        actorTagsData = data;
      }
      
      setActorTags(actorTagsData);
      setTags(actorTagsData);
    } catch (error) {
      console.error('获取演员标签失败:', error);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    fetchAllTags();
    fetchActorTags();
  }, [actorId, fetchActorTags]);

  // 添加标签
  const handleAddTags = async () => {
    if (!selectedTags.length) return;
    
    setLoading(true);
    try {
      await addActorTags(actorId, selectedTags);
      message.success('标签添加成功');
      fetchActorTags();
      setAddingTag(false);
      setSelectedTags([]);
    } catch (error) {
      message.error('添加标签失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId) => {
    setLoading(true);
    try {
      await deleteActorTag(actorId, tagId);
      message.success('标签删除成功');
      fetchActorTags();
    } catch (error) {
      message.error('删除标签失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤已添加的标签
  const filteredTags = allTags.filter(
    tag => !actorTags.some(actorTag => actorTag.id === tag.id)
  );

  return (
    <div>
      {addingTag ? (
        <div style={{ marginBottom: 16 }}>
          <Select
            mode="multiple"
            style={{ width: '100%', marginBottom: 8 }}
            placeholder="请选择要添加的标签"
            value={selectedTags}
            onChange={setSelectedTags}
            optionFilterProp="children"
          >
            {filteredTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                {tag.category ? `[${tag.category}] ${tag.name}` : tag.name}
              </Option>
            ))}
          </Select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Space>
              <Button onClick={() => {
                setAddingTag(false);
                setSelectedTags([]);
              }}>
                取消
              </Button>
              <Button 
                type="primary" 
                onClick={handleAddTags}
                disabled={!selectedTags.length}
              >
                确定
              </Button>
            </Space>
          </div>
        </div>
      ) : (
        <div>
          {!readOnly && (
            <Button 
              type="primary" 
              size="small" 
              icon={<PlusOutlined />}
              onClick={() => setAddingTag(true)}
              disabled={addingTag}
              style={{ marginBottom: 16 }}
            >
              添加标签
            </Button>
          )}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="small" />
              <div style={{ marginTop: 8 }}>加载中...</div>
            </div>
          ) : tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(tag => (
                <Tooltip 
                  key={tag.id} 
                  title={tag.description || '无描述'}
                >
                  <Tag 
                    color="blue"
                    closable={!readOnly}
                    onClose={() => handleDeleteTag(tag.id)}
                  >
                    {tag.category ? `${tag.category}: ${tag.name}` : tag.name}
                  </Tag>
                </Tooltip>
              ))}
            </div>
          ) : (
            <div style={{ color: '#999', textAlign: 'center' }}>
              暂无标签
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActorTagsManager; 