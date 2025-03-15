-- 演员管理系统数据库表结构
-- 创建日期: 2024-03-10

USE actors_management;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('performer', 'manager', 'admin') NOT NULL DEFAULT 'performer',
    status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户权限表
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ID计数器表
CREATE TABLE id_counters (
    counter_key VARCHAR(50) PRIMARY KEY,
    current_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员基本信息表
CREATE TABLE actors (
    id VARCHAR(20) PRIMARY KEY,
    user_id INT,
    real_name VARCHAR(100) NOT NULL,
    stage_name VARCHAR(100),
    gender ENUM('male', 'female', 'other') NOT NULL,
    birth_date DATE,
    age INT,
    height INT COMMENT '身高(cm)',
    weight INT COMMENT '体重(kg)',
    bust INT COMMENT '胸围(cm)',
    waist INT COMMENT '腰围(cm)',
    hip INT COMMENT '臀围(cm)',
    status ENUM('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted') NOT NULL DEFAULT 'active',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员专业信息表
CREATE TABLE actor_professional_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    specialties TEXT COMMENT '特长，逗号分隔',
    languages TEXT COMMENT '语言能力，逗号分隔',
    education TEXT COMMENT '教育背景',
    performance_experience JSON COMMENT '表演经历',
    preferred_types JSON COMMENT '擅长的作品类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员联系信息表
CREATE TABLE actor_contact_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    wechat VARCHAR(50),
    address TEXT,
    emergency_contact TEXT,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员合同信息表
CREATE TABLE actor_contract_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    agent_id INT COMMENT '经纪人ID',
    fee_standard TEXT COMMENT '片酬标准',
    contract_start_date DATE,
    contract_end_date DATE,
    contract_terms JSON COMMENT '合同条款',
    commission_rate DECIMAL(5,2) COMMENT '佣金比例',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员状态变更历史表
CREATE TABLE actor_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    previous_status ENUM('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted'),
    new_status ENUM('active', 'inactive', 'suspended', 'retired', 'blacklisted', 'deleted') NOT NULL,
    reason TEXT,
    changed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 标签表
CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (name, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 演员-标签关联表
CREATE TABLE actor_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT COMMENT '创建人ID',
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY (actor_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 媒体文件表
CREATE TABLE actor_media (
    id INT PRIMARY KEY AUTO_INCREMENT,
    actor_id VARCHAR(20) NOT NULL,
    type ENUM('avatar', 'photo', 'video') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT COMMENT '文件大小(字节)',
    mime_type VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    bucket_name VARCHAR(100) COMMENT 'MinIO bucket名称',
    object_name VARCHAR(255) COMMENT 'MinIO对象名称',
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 公开演员信息视图
CREATE VIEW public_actor_view AS
SELECT 
    a.id,
    a.real_name as name,
    a.stage_name,
    a.gender,
    a.age,
    a.height,
    a.avatar_url,
    a.status,
    GROUP_CONCAT(DISTINCT t.name) as tags,
    api.specialties
FROM actors a
LEFT JOIN actor_tags at ON a.id = at.actor_id
LEFT JOIN tags t ON at.tag_id = t.id
LEFT JOIN actor_professional_info api ON a.id = api.actor_id
WHERE a.status = 'active'
GROUP BY a.id; 