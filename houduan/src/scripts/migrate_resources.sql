-- 学习资料 / 书籍资料库
-- 依赖已有的 users, categories 表

-- 资料表
CREATE TABLE IF NOT EXISTS resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '资料标题',
    author VARCHAR(100) DEFAULT '' COMMENT '作者',
    description TEXT COMMENT '简介',
    category_id INT DEFAULT NULL COMMENT '关联分类ID',
    cover_url VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
    file_url VARCHAR(500) DEFAULT '' COMMENT '文件下载地址',
    file_type VARCHAR(20) DEFAULT 'pdf' COMMENT '文件格式',
    file_size INT DEFAULT 0 COMMENT '文件大小（字节）',
    is_recommended TINYINT(1) DEFAULT 0 COMMENT '是否推荐',
    uploader_id INT COMMENT '上传者ID',
    view_count INT DEFAULT 0 COMMENT '浏览次数',
    download_count INT DEFAULT 0 COMMENT '下载次数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 资料与知识点关联表（多对多）
CREATE TABLE IF NOT EXISTS resource_topics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    resource_id INT NOT NULL,
    category_id INT NOT NULL COMMENT '关联的分类/知识点',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_resource_category (resource_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 示例数据
INSERT IGNORE INTO resources (id, title, author, description, category_id, cover_url, file_url, file_type, file_size, is_recommended, uploader_id, view_count, download_count) VALUES
(1, 'JavaScript 高级程序设计（第4版）', 'Nicholas C. Zakas', '前端工程师必读的 JavaScript 经典，全面覆盖 ES6+ 新特性、DOM、BOM、事件、Ajax、性能优化等核心知识。适合想系统提升 JS 功力的同学。', 1, '/uploads/covers/js高级程序设计.jpg', '/uploads/files/js高级程序设计.pdf', 'pdf', 15728640, 1, 1, 234, 89),
(2, 'CSS 权威指南（第4版）', 'Eric A. Meyer', 'CSS 领域的经典参考书，深入讲解选择器、盒模型、布局（Flexbox/Grid）、动画、变量等，适合想精通 CSS 的同学。', 2, '/uploads/covers/css权威指南.jpg', '/uploads/files/css权威指南.pdf', 'pdf', 12582912, 1, 1, 156, 45),
(3, 'Vue.js 设计与实现', '霍春阳', '从框架设计角度深入解析 Vue 3 核心实现：响应式系统、虚拟 DOM、编译优化、组件化设计，值得进阶阅读。', 4, '/uploads/covers/vue设计与实现.jpg', '/uploads/files/vue设计与实现.pdf', 'pdf', 18874368, 1, 1, 312, 102),
(4, 'HTTP 权威指南', 'David Gourley / Brian Totty', '全面介绍 HTTP 协议、Web 技术与架构，是理解 Web 底层必备参考。涵盖缓存、认证、会话、安全等核心主题。', 5, '/uploads/covers/http权威指南.jpg', '/uploads/files/http权威指南.pdf', 'pdf', 20971520, 0, 1, 98, 23),
(5, '你不知道的 JavaScript（上卷）', 'Kyle Simpson', '深入 JavaScript 语言核心：作用域、闭包、this、对象原型。帮你彻底理解 JS 的深层机制，告别半懂不懂。', 1, '/uploads/covers/你不知道的js上卷.jpg', '/uploads/files/你不知道的js上卷.pdf', 'pdf', 8388608, 1, 1, 189, 67),
(6, 'HTML5 权威指南', 'Chuck Musciano / Bill Kennedy', '详尽介绍 HTML5 所有元素、属性与 API，适合作为案头工具书查阅。', 3, '/uploads/covers/html5权威指南.jpg', '/uploads/files/html5权威指南.pdf', 'pdf', 10485760, 0, 1, 45, 12);

INSERT IGNORE INTO resource_topics (resource_id, category_id) VALUES
(1, 1),  -- JS红宝书 -> JavaScript
(2, 2),  -- CSS权威指南 -> CSS
(3, 4),  -- Vue设计与实现 -> Vue
(4, 5),  -- HTTP权威指南 -> HTTP
(5, 1),  -- 你不知道的JS -> JavaScript
(6, 3);  -- HTML5权威指南 -> HTML
