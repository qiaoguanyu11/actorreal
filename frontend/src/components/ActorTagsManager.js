import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tag, Button, Select, message, Space, Tooltip, Spin
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { getTags, getActorTags, addActorTags, deleteActorTag } from '../api/tagApi';

const { Option } = Select;

const ActorTagsManager = ({ actorId, readOnly = false, onTagsChanged }) => {
  const [tags, setTags] = useState([]);
  const [actorTags, setActorTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  // 获取所有标签
  const fetchAllTags = useCallback(async () => {
    try {
      console.log('ActorTagsManager: 获取所有标签');
      const data = await getTags();
      console.log('ActorTagsManager: 所有标签数据:', data);
      setAllTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('ActorTagsManager: 获取所有标签失败:', error);
    }
  }, []);

  // 获取演员标签
  const fetchActorTags = useCallback(async () => {
    if (!actorId) return;
    
    setLoading(true);
    try {
      console.log(`ActorTagsManager: 获取演员 ${actorId} 的标签`);
      const data = await getActorTags(actorId);
      console.log(`ActorTagsManager: 获取到演员 ${actorId} 的标签数据:`, data);
      
      // 确保数据格式正确
      let actorTagsData = [];
      if (data && data.tags) {
        actorTagsData = data.tags;
      } else if (Array.isArray(data)) {
        actorTagsData = data;
      }
      
      console.log(`ActorTagsManager: 处理后的演员 ${actorId} 标签数据:`, actorTagsData);
      setActorTags(actorTagsData);
      setTags(actorTagsData);
    } catch (error) {
      console.error(`ActorTagsManager: 获取演员 ${actorId} 标签失败:`, error);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  // 强制刷新数据
  const forceRefresh = useCallback(async () => {
    console.log('ActorTagsManager: 强制刷新数据');
    setLoading(true);
    try {
      await fetchAllTags();
      await fetchActorTags();
      message.success('标签数据已刷新');
      
      // 如果提供了回调函数，则调用它
      if (onTagsChanged) {
        onTagsChanged();
      }
    } catch (error) {
      console.error('ActorTagsManager: 刷新数据失败:', error);
      message.error('刷新标签数据失败');
    } finally {
      setLoading(false);
    }
  }, [fetchAllTags, fetchActorTags, onTagsChanged]);

  useEffect(() => {
    fetchAllTags();
    fetchActorTags();
  }, [actorId, fetchAllTags, fetchActorTags]);

  // 添加标签
  const handleAddTags = async () => {
    if (!selectedTags.length) return;
    
    setLoading(true);
    try {
      console.log(`ActorTagsManager: 添加标签到演员 ${actorId}:`, selectedTags);
      await addActorTags(actorId, selectedTags);
      message.success('标签添加成功');
      await fetchActorTags();
      setAddingTag(false);
      setSelectedTags([]);
      
      // 如果提供了回调函数，则调用它
      if (onTagsChanged) {
        onTagsChanged();
      }
    } catch (error) {
      message.error('添加标签失败');
      console.error('ActorTagsManager: 添加标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId) => {
    setLoading(true);
    try {
      console.log(`ActorTagsManager: 从演员 ${actorId} 删除标签 ${tagId}`);
      await deleteActorTag(actorId, tagId);
      message.success('标签删除成功');
      await fetchActorTags();
      
      // 如果提供了回调函数，则调用它
      if (onTagsChanged) {
        onTagsChanged();
      }
    } catch (error) {
      message.error('删除标签失败');
      console.error('ActorTagsManager: 删除标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤已添加的标签
  const filteredTags = allTags.filter(
    tag => !actorTags.some(actorTag => actorTag.id === tag.id)
  );

  // 确保标签数据是数组
  const tagsToRender = Array.isArray(tags) ? tags : [];

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
            showSearch
          >
            {filteredTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                <Tag color={tag.color || "blue"}>
                  {tag.category ? `[${tag.category}] ${tag.name}` : tag.name}
                </Tag>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            {!readOnly && (
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => setAddingTag(true)}
                disabled={addingTag}
              >
                添加标签
              </Button>
            )}
            <Button 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={forceRefresh}
              disabled={loading}
            >
              刷新
            </Button>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="small" />
              <div style={{ marginTop: 8 }}>加载中...</div>
            </div>
          ) : tagsToRender.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tagsToRender.map(tag => (
                <Tooltip 
                  key={tag.id} 
                  title={tag.description || '无描述'}
                >
                  <Tag 
                    color={tag.color || "blue"}
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