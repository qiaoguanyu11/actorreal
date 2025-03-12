// 解除演员与经纪人的关联
export const removeActorAgent = async (actorId) => {
  try {
    const response = await api.delete(`/actors/agent/actor/${actorId}/agent`);
    return response.data;
  } catch (error) {
    throw error;
  }
}; 