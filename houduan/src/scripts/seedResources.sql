-- 学习资料书籍演示数据
-- 执行方式：Get-Content src/scripts/seedResources.sql -Encoding UTF8 | mysql -u root -p -D interview_platform --default-character-set=utf8mb4

USE interview_platform;

-- ========== 前端学习书籍数据 ==========
-- 这些书籍覆盖 JavaScript、CSS、Vue、HTTP、TypeScript 等核心方向

INSERT INTO resources (title, author, description, category_id, cover_url, file_url, file_type, file_size, is_recommended, uploader_id, view_count, download_count) VALUES
-- JavaScript
('JavaScript 高级程序设计（第4版）', 'Nicholas C. Zakas', '前端工程师必读的 JavaScript 经典著作，全面覆盖 ES6+ 新特性、DOM、BOM、事件、Ajax、性能优化等核心知识。适合想系统提升 JS 功力的同学。', 1, '', '', 'pdf', 15728640, 1, 1, 234, 89),
('你不知道的 JavaScript（上卷）', 'Kyle Simpson', '深入 JavaScript 语言核心：作用域、闭包、this、对象原型。帮你彻底理解 JS 的深层机制，告别半懂不懂。', 1, '', '', 'pdf', 8388608, 1, 1, 189, 67),
('你不知道的 JavaScript（中卷）', 'Kyle Simpson', '继续深入 ES6 及之后的核心主题：Promise、异步、生成器、代理与反射，帮你构建完整的 JS 知识体系。', 1, '', '', 'pdf', 7340032, 1, 1, 145, 52),
-- CSS
('CSS 权威指南（第4版）', 'Eric A. Meyer', 'CSS 领域的经典参考书，深入讲解选择器、盒模型、布局（Flexbox/Grid）、动画、变量等，适合想精通 CSS 的同学。', 2, '', '', 'pdf', 12582912, 1, 1, 156, 45),
-- HTML
('HTML5 权威指南', 'Chuck Musciano / Bill Kennedy', '详尽介绍 HTML5 所有元素、属性与 API，涵盖语义化标签、表单、多媒体、Web Storage 等，是案头必备工具书。', 3, '', '', 'pdf', 10485760, 0, 1, 45, 12),
-- Vue
('Vue.js 设计与实现', '霍春阳', '从框架设计角度深入解析 Vue 3 核心实现：响应式系统、虚拟 DOM、编译优化、组件化设计，值得进阶阅读。', 4, '', '', 'pdf', 18874368, 1, 1, 312, 102),
-- HTTP
('HTTP 权威指南', 'David Gourley / Brian Totty', '全面介绍 HTTP 协议、Web 技术与架构，是理解 Web 底层必备参考。涵盖缓存、认证、会话、安全等核心主题。', 5, '', '', 'pdf', 20971520, 0, 1, 98, 23),
-- TypeScript
('TypeScript 入门与实战', '梁宵', '从 TypeScript 基础类型系统入手，逐步深入接口、泛型、装饰器、工程化配置，配合 Vue/React 实战案例。', 1, '', '', 'pdf', 9437184, 1, 1, 178, 61),
-- Node.js
('深入浅出 Node.js', '朴灵', '全面讲解 Node.js 核心模块（Buffer、EventLoop、Stream、网络编程）、模块系统以及主流框架应用。', 1, '', '', 'pdf', 14680064, 0, 1, 87, 28);

-- 关联资料与知识点（resource_topics）
INSERT INTO resource_topics (resource_id, category_id) VALUES
-- JavaScript 高级程序设计 -> JavaScript
(1, 1),
-- 你不知道的JS上卷 -> JavaScript
(2, 1),
-- 你不知道的JS中卷 -> JavaScript
(3, 1),
-- CSS权威指南 -> CSS
(4, 2),
-- HTML5权威指南 -> HTML
(5, 3),
-- Vue设计与实现 -> Vue/前端框架
(6, 4),
-- HTTP权威指南 -> HTTP/网络
(7, 5),
-- TypeScript入门与实战 -> JavaScript（TS是JS超集，关联到JS分类）
(8, 1),
-- 深入浅出Node.js -> JavaScript
(9, 1);
