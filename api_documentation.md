# 演员管理系统 API 文档

## API 状态说明
- ❌ 未实现
- ⚠️ 部分实现/需要优化
- ✅ 已实现

## 实际实现状态说明
_更新于：2024-03-10_

### 项目实际状态与文档差异
演员管理系统API尚未开始实现，现状如下：

#### 待实现的模块
- `basic.py`: 演员基本信息管理（列表、详情、创建、更新）✅
- `professional.py`: 演员专业信息更新 ✅
- `contact.py`: 演员联系信息更新 ✅
- `deletion.py`: 演员删除功能 ✅
- `utils.py`: 共享工具函数（权限检查等）❌
- `media.py`: 媒体管理（头像上传、照片上传、视频上传、媒体列表获取、媒体删除）✅
- `tags.py`: 演员标签管理 ✅

#### 未完成的功能
- 所有基础API模块
- 批量操作模块
- 版本控制模块
- 审核流程模块
- 数据验证模块

### 后续开发优先级
后续开发将按以下优先级实现模块：
1. 基础API模块
2. 批量操作功能
3. 数据验证功能
4. 版本控制功能
5. 审核流程功能

### 2024-03-10新增功能
- 演员自行上传个人信息API接口：允许演员用户（performer角色）自行创建或更新个人信息，与经纪人/管理员上传演员信息的API分开，避免数据冲突

## 代码模块结构

演员管理API采用了模块化设计，各功能分布在不同的Python模块中：

| API功能 | Python模块 | 文件路径 |
|--------|------------|---------|
| 演员基本信息管理(列表、详情、创建) | basic.py | `/backend/app/api/v1/endpoints/actors/basic.py` |
| 演员专业信息更新 | professional.py | `/backend/app/api/v1/endpoints/actors/professional.py` |
| 演员联系信息更新 | contact.py | `/backend/app/api/v1/endpoints/actors/contact.py` |
| 演员删除 | deletion.py | `/backend/app/api/v1/endpoints/actors/deletion.py` |
| 演员媒体管理 | media.py | `/backend/app/api/v1/endpoints/actors/media.py` |
| 共享工具函数 | utils.py | `/backend/app/api/v1/endpoints/actors/utils.py` |
| 演员标签管理 | tags.py | `/backend/app/api/v1/endpoints/actors/tags.py` |

### 共享工具模块

`utils.py` 模块提供了所有演员API共享的工具函数，包括：

- **权限检查**: `check_actor_permission()` 函数提供统一的权限验证
- **日志记录**: 统一的日志记录格式和级别
- **错误处理**: 标准化的错误响应和异常处理

这种模块化设计带来以下好处：
1. 提高代码复用性，减少重复代码
2. 便于团队协作，不同开发者可同时修改不同模块
3. 降低代码维护难度，单一功能的改动不会影响其他功能
4. 提高代码质量，每个模块可以单独测试

## 基础信息

### 系统信息
| 方法 | 路径 | 描述 | 状态 |
|------|------|------|------|
| GET | `/` | 获取系统基本信息 | ✅ |
| GET | `/api/v1/health-check` | 系统健康检查 | ✅ |

## 演员管理

### 基本信息管理
| 方法 | 路径 | 描述 | 状态 | 所需权限 | 实现模块 |
|------|------|------|------|----------|----------|
| POST | `/api/v1/actors` | 创建演员基本信息 | ✅ | 演员/经纪人/管理员 | `basic.py` |
| GET | `/api/v1/actors/{id}` | 获取演员详情 | ✅ | 访客 | `basic.py` |
| GET | `/api/v1/actors` | 获取演员列表 | ✅ | 访客 | `basic.py` |
| PUT | `/api/v1/actors/{id}/basic-info` | 更新基本信息 | ✅ | 演员/经纪人/管理员 | `basic.py` |
| POST | `/api/v1/actors/basic/self-update` | 演员自行创建/更新信息 | ✅ | 仅演员 | `basic.py` |
| PUT | `/api/v1/actors/{id}/professional-info` | 更新专业信息 | ✅ | 演员/经纪人/管理员 | `professional.py` |
| PUT | `/api/v1/actors/{id}/contact-info` | 更新联系信息 | ✅ | 演员/经纪人/管理员 | `contact.py` |
| DELETE | `/api/v1/actors/{id}` | 删除演员 | ✅ | 管理员 | `deletion.py` |

### 标签管理
| 方法 | 路径 | 描述 | 状态 | 所需权限 | 实现模块 |
|------|------|------|------|----------|----------|
| GET | `/api/v1/tags` | 获取所有标签 | ✅ | 访客 | `tags.py` |
| GET | `/api/v1/actors/{id}/tags` | 获取演员标签 | ✅ | 访客 | `tags.py` |
| POST | `/api/v1/actors/{id}/tags` | 添加演员标签 | ✅ | 经纪人/管理员 | `tags.py` |
| DELETE | `/api/v1/actors/{id}/tags/{tag_id}` | 删除演员标签 | ✅ | 经纪人/管理员 | `tags.py` |
| PUT | `/api/v1/actors/{id}/tags` | 更新演员标签 | ✅ | 经纪人/管理员 | `tags.py` |

### 媒体资料管理
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| POST | `/api/v1/actors/{id}/media/avatar` | 上传头像 | ✅  | `media.py` |
| POST | `/api/v1/actors/{id}/media/photos` | 上传照片 | ✅  | `media.py` |
| POST | `/api/v1/actors/{id}/media/videos` | 上传视频 | ✅  | `media.py` |
| GET | `/api/v1/actors/{id}/media` | 获取媒体列表 | ✅  | `media.py` |
| DELETE | `/api/v1/actors/{id}/media/{media_id}` | 删除媒体文件 | ✅  | `media.py` |

### 批量操作
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| POST | `/api/v1/actors/batch` | 批量创建 | ❌ | 未实现 |
| PUT | `/api/v1/actors/batch` | 批量更新 | ❌ | 未实现 |
| DELETE | `/api/v1/actors/batch` | 批量删除 | ❌ | 未实现 |

### 版本控制
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| GET | `/api/v1/actors/{id}/versions` | 获取历史版本 | ❌ | 未实现 |
| POST | `/api/v1/actors/{id}/versions/restore` | 恢复到指定版本 | ❌ | 未实现 |

### 审核流程
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| POST | `/api/v1/actors/{id}/review/submit` | 提交审核 | ❌ | 未实现 |
| GET | `/api/v1/actors/{id}/review/status` | 获取审核状态 | ❌ | 未实现 |
| PUT | `/api/v1/actors/{id}/review/approve` | 审核通过/拒绝 | ❌ | 未实现 |

### 数据验证
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| POST | `/api/v1/actors/validate` | 验证数据格式 | ❌ | 未实现 |

### 演员自行更新个人信息API

```
POST /api/v1/actors/basic/self-update
```

**实现模块**: `basic.py`

允许演员用户（performer角色）自行创建或更新个人信息，与经纪人/管理员上传演员信息的API分开，避免数据冲突。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| real_name | string | 真实姓名 | 是 |
| stage_name | string | 艺名 | 否 |
| gender | string | 性别 ('男', '女', '其他' 或 'male', 'female', 'other') | 是 |
| age | integer | 年龄 | 否 |
| height | integer | 身高(cm) | 否 |
| weight | integer | 体重(kg) | 否 |
| bust | integer | 胸围(cm) | 否 |
| waist | integer | 腰围(cm) | 否 |
| hip | integer | 臀围(cm) | 否 |
| bio | string | 个人简介 | 否 |
| skills | array | 技能列表 | 否 |
| experience | array | 经验列表 | 否 |
| education | array | 教育背景列表 | 否 |
| awards | array | 获奖情况列表 | 否 |
| languages | array | 语言能力列表 | 否 |
| current_rank | string | 演员等级 ('主角', '角色', '特约', '群演', '无经验') | 否 |
| minimum_fee | float | 接受最低片酬（元/天） | 否 |
| phone | string | 电话号码 | 否 |
| wechat | string | 微信号 | 否 |
| address | string | 地址 | 否 |
| emergency_contact | string | 紧急联系人 | 否 |
| emergency_phone | string | 紧急联系电话 | 否 |
| social_media | object | 社交媒体账号 | 否 |
| email | string | 电子邮箱 | 否 |

#### 请求示例

```json
{
  "real_name": "张三",
  "stage_name": "三儿",
  "gender": "男",
  "age": 25,
  "height": 175,
  "weight": 65,
  "bio": "我是一名有志向的演员",
  "skills": ["唱歌", "跳舞", "表演"],
  "current_rank": "特约",
  "phone": "13800138000",
  "wechat": "zhangsan123"
}
```

#### 响应

```json
{
  "id": "AC202403101a2b3c4d",
  "real_name": "张三",
  "stage_name": "三儿",
  "gender": "male",
  "age": 25,
  "height": 175,
  "weight": 65,
  "bio": "我是一名有志向的演员",
  "skills": ["唱歌", "跳舞", "表演"],
  "current_rank": "特约",
  "phone": "13800138000",
  "wechat": "zhangsan123",
  ...
}
```

#### 访问权限

- 只有演员用户（performer角色）可以使用此API
- 演员只能创建/更新自己的信息
- 此API不会修改演员与经纪人的合同关系

#### 特别说明

1. 如果该演员已有信息，则更新现有信息
2. 如果该演员没有信息，则创建新的演员记录
3. 创建新记录时，会自动生成演员ID
4. 此API与经纪人/管理员上传演员信息的API分开，避免数据冲突
5. 此API不会修改演员与经纪人的合同关系，合同信息仍由经纪人或管理员管理

## API详细说明

### 演员列表API

```
GET /api/v1/actors
```

**实现模块**: `basic.py`

#### 查询参数

| 参数名 | 类型 | 描述 | 默认值 | 示例 |
|------|------|------|------|------|
| skip | integer | 分页起始位置 | 0 | ?skip=10 |
| limit | integer | 每页数量 | 100 | ?limit=20 |
| sort_by | string | 排序字段 | - | ?sort_by=age |
| sort_desc | boolean | 是否降序排序 | false | ?sort_desc=true |
| agent_id | integer | 经纪人ID | - | ?agent_id=10 |
| gender | string | 性别筛选 | - | ?gender=female |
| age_min | integer | 最小年龄 | - | ?age_min=18 |
| age_max | integer | 最大年龄 | - | ?age_max=35 |
| height_min | integer | 最小身高(cm) | - | ?height_min=160 |
| height_max | integer | 最大身高(cm) | - | ?height_max=175 |
| tags | array | 标签筛选 | - | ?tags=电影,电视剧 |
| specialties | array | 特长筛选 | - | ?specialties=唱歌,跳舞 |
| created_after | datetime | 创建时间不早于 | - | ?created_after=2023-01-01T00:00:00Z |
| created_before | datetime | 创建时间不晚于 | - | ?created_before=2023-12-31T23:59:59Z |
| search | string | 搜索关键词 | - | ?search=张三 |
| include_stats | boolean | 是否包含统计信息 | false | ?include_stats=true |

#### 返回格式

```json
{
  "items": [
    {
      "id": "A10001",
      "real_name": "张三",
      "stage_name": "艺名",
      "gender": "male",
      "age": 25,
      "height": 180,
      "weight": 70,
      "tags": ["电影", "电视剧"],
      "specialties": ["唱歌", "跳舞"],
      "avatar_url": "http://example.com/avatar.jpg"
      // 其他公开字段
    }
    // 更多演员
  ],
  "total": 1000,
  "filtered_count": 20,
  "stats": {
    "gender": {
      "male": 500,
      "female": 480,
      "other": 20
    },
    "age": {
      "0-18": 100,
      "19-25": 350,
      "26-35": 400,
      "36-50": 120,
      "51+": 30
    }
  }
}
```

注意：统计信息只有在请求参数 `include_stats=true` 时才会返回。

#### 访问权限

不同角色能看到的信息内容有所不同：
- 管理员可以看到所有演员的完整信息
- 经纪人可以看到自己旗下演员的完整信息，其他演员的基本信息
- 演员和访客只能看到演员的基本公开信息

### 更新演员基本信息API

```
PUT /api/v1/actors/{id}/basic-info
```

**实现模块**: `basic.py`

用于更新演员的基本个人信息。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| name | string | 姓名 | 否 |
| gender | string | 性别 | 否 |
| age | integer | 年龄 | 否 |
| height | integer | 身高(cm) | 否 |
| weight | integer | 体重(kg) | 否 |
| bust | integer | 胸围(cm) | 否 |
| waist | integer | 腰围(cm) | 否 |
| hip | integer | 臀围(cm) | 否 |

#### 请求示例

```json
{
  "name": "李四",
  "gender": "male",
  "age": 28,
  "height": 180,
  "weight": 70
}
```

#### 访问权限

- 管理员可更新任何演员的基本信息
- 经纪人可更新自己旗下演员的基本信息
- 演员只能更新自己的基本信息

### 更新演员专业信息API

```
PUT /api/v1/actors/{id}/professional-info
```

**实现模块**: `professional.py`

用于更新演员的专业相关信息。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| specialties | string | 特长，逗号分隔 | 否 |
| languages | string | 语言能力，逗号分隔 | 否 |
| education | string | 教育背景 | 否 |
| performance_experience | object | 表演经历 | 否 |
| preferred_types | object | 擅长的作品类型 | 否 |

#### 请求示例

```json
{
  "specialties": "唱歌,跳舞,表演",
  "languages": "中文,英语,粤语",
  "education": "中央戏剧学院表演系",
  "performance_experience": {
    "film": ["电影A", "电影B"],
    "tv": ["电视剧C", "电视剧D"],
    "stage": ["舞台剧E"]
  },
  "preferred_types": {
    "film": true,
    "tv": true,
    "commercial": false
  }
}
```

#### 访问权限

- 管理员可更新任何演员的专业信息
- 经纪人可更新自己旗下演员的专业信息
- 演员只能更新自己的专业信息

### 更新演员联系信息API

```
PUT /api/v1/actors/{id}/contact-info
```

**实现模块**: `contact.py`

用于更新演员的联系方式信息。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| phone | string | 电话号码 | 否 |
| wechat | string | 微信号 | 否 |
| address | string | 地址 | 否 |
| emergency_contact | string | 紧急联系人 | 否 |
| email | string | 电子邮箱 | 否 |

#### 请求示例

```json
{
  "phone": "13800138000",
  "wechat": "actor123",
  "address": "北京市朝阳区",
  "emergency_contact": "亲属: 13900139000",
  "email": "actor@example.com"
}
```

#### 访问权限

- 管理员可更新任何演员的联系信息
- 经纪人可更新自己旗下演员的联系信息
- 演员只能更新自己的联系信息

### 更新演员合同信息API

```
PUT /api/v1/actors/{id}/contract-info
```

**实现模块**: `contract.py`

用于更新演员的合同和商务信息。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| agent_id | integer | 经纪人ID | 否 |
| fee_standard | string | 片酬标准 | 否 |
| contract_start_date | date | 合同开始日期 | 否 |
| contract_end_date | date | 合同结束日期 | 否 |
| contract_terms | object | 合同条款 | 否 |
| commission_rate | number | 佣金比例 | 否 |

#### 请求示例

```json
{
  "fee_standard": "电影主角: 100万/部, 电视剧: 5万/集",
  "contract_start_date": "2023-01-01",
  "contract_end_date": "2025-12-31",
  "contract_terms": {
    "exclusivity": true,
    "territory": ["中国大陆", "香港", "台湾"],
    "special_clauses": ["不接受洗发水广告"]
  },
  "commission_rate": 0.20
}
```

#### 访问权限

- 管理员可更新任何演员的合同信息
- 经纪人只能更新自己旗下演员的合同信息
- 演员无权更新合同信息

#### 特殊说明

经纪人不能将演员转移给其他经纪人（即使用此API修改agent_id）。

### 更新演员状态API

```
PUT /api/v1/actors/{id}/status
```

**实现模块**: `status.py`

用于更新演员的工作状态。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| status | string | 演员状态 | 是 |
| reason | string | 状态变更原因 | 否 |

**status 有效值**：
- active：在职
- inactive：非活跃
- suspended：暂停
- retired：退休
- blacklisted：黑名单

#### 请求示例

```json
{
  "status": "inactive",
  "reason": "演员临时停工，进修表演课程"
}
```

#### 访问权限

- 管理员可更新任何演员的状态
- 经纪人只能更新自己旗下演员的状态
- 演员无权更新状态

#### 特殊说明

系统会自动记录状态变更历史，包括变更前状态、变更后状态、原因、操作人和操作时间。

### 删除演员API

```
DELETE /api/v1/actors/{id}
```

**实现模块**: `deletion.py`

用于删除演员账户，支持软删除和永久删除。

#### 查询参数

| 参数名 | 类型 | 描述 | 默认值 | 是否必需 |
|------|------|------|------|---------|
| permanent | boolean | 是否永久删除 | false | 否 |
| delete_media | boolean | 是否同时删除关联的媒体文件 | false | 否 |
| reason | string | 删除原因 | - | 否 |

#### 响应示例

```json
{
  "id": "A10001",
  "name": "张三",
  "status": "deleted",
  "deleted_at": "2023-06-01T10:00:00Z",
  "deleted_by": 1,
  "deletion_reason": "应演员要求注销账户"
}
```

#### 访问权限

- 管理员可执行软删除和永久删除
- 经纪人只能执行自己旗下演员的软删除
- 演员无权删除账户

#### 特殊说明

1. **软删除**：默认情况下执行软删除，仅将演员状态标记为"deleted"，保留所有数据。
2. **永久删除**：设置`permanent=true`时执行永久删除，将从数据库中移除记录，但会在删除历史表中保存基本信息。
3. **媒体文件**：设置`delete_media=true`时会同时删除关联的媒体文件。
4. **权限限制**：经纪人无法执行永久删除，只有管理员拥有此权限。
5. **操作记录**：所有删除操作都会记录操作人、操作时间和原因。

## 标准响应格式

### 成功响应
```json
{
    "code": 200,
    "message": "success",
    "data": {
        // 响应数据
    },
    "timestamp": "2024-03-10T10:00:00Z",
    "request_id": "xxx"
}
```

### 错误响应
```json
{
    "code": 400,
    "message": "错误描述",
    "errors": [
        {
            "field": "name",
            "message": "姓名不能为空"
        }
    ],
    "timestamp": "2024-03-10T10:00:00Z",
    "request_id": "xxx"
}
```

## 状态码说明

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

## 待优化项目

1. 演员列表 API
   - ✅ 添加高级筛选功能
   - ✅ 优化排序功能
   - ✅ 添加聚合统计功能

2. 媒体文件管理
   - ✅ 完成基础上传功能实现
   - ✅ 完成媒体列表API实现
   - ✅ 完成照片和视频上传功能
   - ✅ 完成媒体文件删除功能
   - ⚠️ 优化上传流程
   - ⚠️ 添加文件处理功能（裁剪、压缩等）
   - ⚠️ 添加文件分类管理

3. 核心功能完成
   - ✅ 完成联系信息更新API实现
   - ✅ 完成状态更新API实现
   - ✅ 完成合同信息更新API实现

4. 数据验证
   - 添加字段级别的验证
   - 添加业务规则验证
   - 添加数据一致性检查

5. 审核流程
   - 设计完整的审核流程
   - 添加审核日志
   - 添加审核通知

6. 权限管理
   - 细化权限控制
   - 添加角色管理
   - 添加操作日志

## 角色权限说明

### 访客（guest）权限
- 无需登录
- 基础权限：
  - 浏览演员列表（有限字段）
  - 查看演员公开信息
  - 查看公开媒体文件
  - 搜索演员
- 限制：
  - 只能查看公开信息
  - 无法查看联系方式
  - 无法查看合同信息
  - 无法进行任何修改操作

### 演员（performer）权限
- ID前缀：P
- 基础权限：
  - 查看公开演员列表
  - 查看公开演员信息
  - 查看公开媒体文件
- 个人权限：
  - 更新个人基本信息
  - 更新个人专业信息
  - 更新个人联系信息
  - 上传个人媒体文件
  - 查看个人合同信息
  - 创建演员基本信息

### 经纪人（manager）权限
- ID前缀：M
- 包含演员所有权限
- 额外权限：
  - 创建名下演员（ID前缀：M+经纪人编号）
  - 更新名下演员所有信息
  - 管理名下演员媒体文件
  - 管理名下演员合同信息
  - 查看名下演员统计数据

### 管理员（admin）权限
- ID前缀：A
- 包含所有权限：
  - 管理所有用户
  - 管理所有演员（ID前缀：A）
  - 管理角色和权限
  - 查看系统日志
  - 管理系统配置

## API 访问权限说明

### 公开 API（访客可访问）
| 方法 | 路径 | 描述 | 可见字段 |
|------|------|------|----------|
| GET | `/api/v1/actors` | 获取演员列表 | id, name, gender, age, height, avatar_url, tags |
| GET | `/api/v1/actors/{id}` | 获取演员公开信息 | id, name, gender, age, height, avatar_url, tags, specialties |
| GET | `/api/v1/actors/{id}/media/public` | 获取公开媒体文件 | avatar_url, public_photos |
| GET | `/api/v1/search/actors` | 搜索演员 | id, name, gender, age, height, avatar_url, tags |

## 数据库表结构

### users 表
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('performer', 'manager', 'admin') NOT NULL DEFAULT 'performer',
    status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### user_permissions 表
```sql
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### id_counters 表
```sql
CREATE TABLE id_counters (
    counter_key VARCHAR(50) PRIMARY KEY,
    current_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### public_actor_view 视图
```sql
CREATE VIEW public_actor_view AS
SELECT 
    id,
    name,
    gender,
    age,
    height,
    avatar_url,
    tags,
    specialties
FROM actors
WHERE status = 'active';
```

## 模块扩展计划

随着系统功能的扩展，计划为以下功能添加专门的模块：

1. **批量操作模块** - `batch.py`
   - 实现批量创建、更新和删除功能
   - 使用异步任务处理大批量数据操作

2. **版本控制模块** - `versions.py`
   - 实现演员信息历史版本记录与回滚功能
   - 保存详细的版本对比和变更记录

3. **审核工作流模块** - `review.py`
   - 实现审核提交、状态查询和审批流程
   - 支持多级审核和审核通知

4. **数据验证模块** - `validation.py`
   - 提供数据格式和业务规则验证
   - 支持不同类型数据的自定义验证规则

5. **统计分析模块** - `stats.py`
   - 提供演员数据的统计和分析功能
   - 生成数据报表和可视化图表

这种模块化设计方便未来功能扩展，各团队可以并行开发不同模块，并能独立测试和发布。

### 更新演员标签API

```
PUT /api/v1/actors/{id}/tags
```

**实现模块**: `tags.py`

用于更新演员的标签信息。

#### 请求参数

| 参数名 | 类型 | 描述 | 是否必需 |
|------|------|------|---------|
| tags | array | 标签数组 | 是 |

#### 请求示例

```json
{
  "tags": ["电影", "电视剧", "广告", "时尚"]
}
```

#### 访问权限

- 管理员可更新任何演员的标签
- 经纪人只能更新自己旗下演员的标签
- 演员无权更新标签

### 获取演员标签API

```
GET /api/v1/actors/{id}/tags
```

**实现模块**: `tags.py`

用于获取演员的所有标签。

#### 响应示例

```json
{
  "actor_id": "A10001",
  "actor_name": "张三",
  "tags": [
    {
      "id": 1,
      "name": "电影",
      "category": "作品类型",
      "created_at": "2023-06-01T10:00:00Z"
    },
    {
      "id": 5,
      "name": "电视剧",
      "category": "作品类型",
      "created_at": "2023-06-01T10:00:00Z"
    }
  ]
}
```

### 获取所有标签API

```
GET /api/v1/tags
```

**实现模块**: `tags.py`

获取系统中所有可用的标签。

#### 查询参数

| 参数名 | 类型 | 描述 | 默认值 | 示例 |
|------|------|------|------|------|
| category | string | 标签分类 | - | ?category=作品类型 |
| sort_by | string | 排序字段 | name | ?sort_by=created_at |
| sort_desc | boolean | 是否降序排序 | false | ?sort_desc=true |

#### 响应示例

```json
{
  "tags": [
    {
      "id": 1,
      "name": "电影",
      "category": "作品类型",
      "usage_count": 120
    },
    {
      "id": 2,
      "name": "电视剧",
      "category": "作品类型",
      "usage_count": 98
    },
    {
      "id": 3,
      "name": "广告",
      "category": "作品类型",
      "usage_count": 67
    }
  ],
  "categories": [
    "作品类型",
    "表演风格",
    "特长"
  ],
  "total": 45
}
```

## 演员与经纪人归属关系

### 归属关系管理
| 方法 | 路径 | 描述 | 状态 | 实现模块 |
|------|------|------|------|----------|
| POST | `/api/v1/actors/{id}/assign-manager` | 分配经纪人 | ❌ | 未实现 |
| GET | `/api/v1/actors/{id}/manager` | 获取经纪人信息 | ❌ | 未实现 |

### 说明
- **分配经纪人**: 允许管理员或经纪人将演员分配给特定经纪人。
- **获取经纪人信息**: 允许查询演员当前的经纪人信息。

这些功能目前尚未实现，需要在后续开发中完成。

## 需要修改的API

为了实现演员与经纪人归属关系，需要对以下API进行修改：

1. **演员基本信息管理API**
   - `POST /api/v1/actors`
   - `PUT /api/v1/actors/{id}/basic-info`

2. **演员合同信息管理API**
   - `PUT /api/v1/actors/{id}/contract-info`

3. **演员状态管理API**
   - `PUT /api/v1/actors/{id}/status`

这些API需要增加或修改逻辑，以支持演员与经纪人之间的归属关系管理。