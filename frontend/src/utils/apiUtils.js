/**
 * API工具函数
 */

/**
 * 将JavaScript对象转换为x-www-form-urlencoded格式
 * @param {Object} data - 要转换的数据对象
 * @returns {URLSearchParams} URLSearchParams对象
 */
export const objectToFormData = (data) => {
  const formData = new URLSearchParams();
  Object.keys(data).forEach(key => {
    formData.append(key, data[key]);
  });
  return formData;
}; 