# 项目需求：将 Vue 刷题网站升级为真实后端 + AI 辅助 + 论坛功能（MySQL 版）

## 项目现状

- 前端：Vue 3 + Vite（或 Vue CLI），现有刷题核心页面：题目列表、答题页、结果页。
- 当前数据来源：`json-server` 模拟 REST API，提供 `/questions`、`/users` 等简单数据。
- 需要改造成真正的后端服务（Node.js + Express + MySQL），并新增两个模块：AI 智能提示、论坛交流。

## 技术栈要求

- 后端：Node.js + Express，数据库使用 **MySQL 5.7 或 8.0**。
- 前端：沿用现有 Vue 项目，但需要修改 API 调用方式（从 mock 地址改为真实后端地址），并新增 AI 组件和论坛页面。
- AI 集成：调用 OpenAI API（或国内大模型 API，如通义千问、文心一言），设计安全的后端代理，避免前端暴露 API Key。
- 用户认证：简化的 JWT 认证（用户注册/登录，存储用户 ID）。

## 功能需求详解

### 1. 后端服务搭建

#### 数据库设计（MySQL）

- 数据库名：`interview_platform`（可自定义）
- 字符集：`utf8mb4`（支持 emoji 和中文）

**表结构**

```sql
-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- bcrypt 加密
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 题目表
CREATE TABLE questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title TEXT NOT NULL,
    options JSON NOT NULL, -- 存储选项数组，如 ["选项A","选项B","选项C","选项D"]
    answer TINYINT NOT NULL, -- 正确选项索引（0-3）
    explanation TEXT,
    difficulty TINYINT DEFAULT 1, -- 可选：1简单 2中等 3困难
    tags VARCHAR(255) -- 可选：标签，用逗号分隔
);

-- 用户答题记录表
CREATE TABLE user_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_index TINYINT,
    is_correct BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 论坛帖子表
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 评论表
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
后端 API 设计（与之前一致，仅数据库不同）
用户相关

POST /api/auth/register：注册（username, password）

POST /api/auth/login：登录，返回 JWT token

GET /api/auth/me：获取当前用户信息（需鉴权）

题目相关

GET /api/questions：获取所有题目（不含答案）

GET /api/questions/:id：获取单题详情（不含答案）

POST /api/questions/:id/check：提交答案，验证正确性（请求体：{ selectedIndex }，返回 { correct, explanation }）

AI 辅助

POST /api/ai/hint：请求提示（请求体：{ questionId, userInput? }），返回 AI 生成的提示（非答案）

POST /api/ai/explain：交卷后，用户结合具体题目提问（请求体：{ questionId, userQuestion }），返回 AI 解释

注意：AI 提示应遵循“不直接给答案”原则，仅提供思路引导或相关知识点。

论坛相关

GET /api/posts?questionId=xxx：获取某题的所有帖子

POST /api/posts：发布新帖子（需鉴权，请求体：{ questionId, title, content }）

GET /api/posts/:postId/comments：获取帖子的评论

POST /api/posts/:postId/comments：发布评论（需鉴权，请求体：{ content }）

统计与记录（可选）

GET /api/user/answers：获取当前用户的答题记录（用于历史页面）

2. AI 集成要点（不变）
在后端封装一个 AI 服务模块，使用 axios 调用外部 API。

构建提示词工程：

对于 hint：提供题目内容、选项，要求 AI 给出引导性思路，不输出答案。

对于 explain：结合用户的问题和题目内容，给出详细解释或拓展知识。

考虑 API 限流、错误处理和缓存（避免重复请求相同题目提示）。

3. 前端改造（不变）
通用改造
将原有 axios 请求地址从 json-server 地址改为后端地址，并在请求头添加 JWT token（存储于 localStorage）。

添加路由守卫，未登录用户重定向到登录页。

新增 AI 组件（不变）
在答题页面（Practice.vue）添加一个浮动按钮或侧边栏，点击后弹出一个聊天窗口。

聊天窗口中可以：

点击“请求提示”，发送当前题目 ID，后端返回 AI 提示，显示在窗口中。

交卷后，在结果页或错题本中，允许用户对每道题提问“问 AI”，将用户输入的问题和题目 ID 发送到 /api/ai/explain，展示 AI 回复。

使用 WebSocket 或普通 HTTP 均可，简单使用 HTTP 即可。

新增论坛模块（不变）
新建页面 Forum.vue，显示当前题目的所有帖子列表。

在题目详情页或答题页，增加“讨论”按钮，跳转到该题目的论坛页面。

论坛页面包含：

帖子列表（标题、作者、发布时间、评论数）。

点击帖子进入详情页，显示帖子内容及评论列表。

用户可发表新帖子（需要登录）和回复评论。

样式简洁，符合刷题网站风格。

4. 数据迁移
从 json-server 的 db.json 中提取题目数据，导入到新数据库的 questions 表。

确保答案字段不暴露在前端 API 中，仅在后台验证时使用。

5. 部署与运行说明（更新）
环境准备
安装 MySQL 5.7+，创建数据库 interview_platform（或自定义名称）。

配置 .env 文件，包含数据库连接信息：

text
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=interview_platform
JWT_SECRET=your_jwt_secret
AI_API_KEY=your_ai_api_key
后端使用 mysql2 或 Sequelize 连接数据库，推荐 mysql2/promise 提供 async/await 支持。

后端启动
安装依赖：npm install express mysql2 jsonwebtoken bcrypt axios cors dotenv

编写数据库初始化脚本（创建表、插入初始题目）。

运行后端：npm run dev，默认端口 3000。

前端启动
Vite 开发服务器代理 /api 到后端 http://localhost:3000。

前端依赖：axios、vue-router、pinia。

生产环境
前端 build 后由后端静态托管或 Nginx 反向代理。

代码结构建议（与之前一致）
text
backend/
├── src/
│   ├── config/         # 配置（数据库、AI API Key）
│   ├── controllers/    # 路由控制器
│   ├── models/         # 数据库模型（使用 mysql2 原生查询或 Sequelize）
│   ├── routes/         # 路由定义
│   ├── services/       # AI 服务、业务逻辑
│   ├── middlewares/    # 鉴权、错误处理
│   └── app.js
├── package.json
├── .env
└── init.sql            # 数据库初始化脚本

frontend/
├── src/
│   ├── views/          # 页面组件（Login, Practice, Forum, PostDetail 等）
│   ├── components/     # 可复用组件（AIChat, PostList 等）
│   ├── api/            # 封装 axios 请求
│   ├── store/          # Pinia 状态管理（用户信息）
│   ├── router/         # Vue Router 配置
│   └── App.vue
├── package.json
└── vite.config.js      # 配置 proxy
开发步骤（供 AI 参考）
初始化后端项目，安装依赖。

配置 .env 文件，创建数据库连接池（使用 mysql2/promise）。

编写数据库初始化脚本（init.sql），并执行创建表、插入初始题目（从原 db.json 转换）。

实现用户认证中间件和 API。

实现题目相关 API（列表、单题、验证答案）。

实现 AI 服务封装，创建 hint 和 explain 接口。

实现论坛 API（帖子增删改查，评论增删查）。

前端改造：修改现有 API 调用，添加 token 管理。

前端新增 AI 聊天组件，集成到答题页和结果页。

前端新增论坛页面，实现帖子列表和详情，关联题目 ID。

测试全部功能，确保无报错，数据一致。

注意事项
确保 AI 提示词中明确禁止直接输出答案，可以输出解题思路、相关知识点、思考方向。

JWT 有效期建议 7 天，前端拦截 401 跳转登录。

论坛内容需做基本的 XSS 过滤（使用 DOMPurify 或后端转义）。

考虑性能：题目列表分页（可选），论坛列表分页。

数据库连接池配置合理，避免连接泄漏。

密码使用 bcrypt 哈希存储。

使用 mysql2 的 execute 方法防止 SQL 注入。

请根据以上要求，生成完整的后端代码、前端修改代码、数据库初始化脚本，并附带必要的注释和说明，确保可以直接运行。

text
```
