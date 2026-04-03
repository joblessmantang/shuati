# 智能刷题平台 - 项目模块介绍

## 一、项目概述

本项目是一个面向前端面试备考的智能刷题平台，采用前后端分离架构。前端基于 Vue 3 构建，提供题目练习、AI 智能提示、论坛讨论等核心功能；后端基于 Node.js + Express + MySQL，提供稳定的数据存储与业务逻辑处理能力。

---

## 二、技术架构

### 前端技术栈
- **核心框架**: Vue 3 (Composition API + `<script setup>`)
- **构建工具**: Vite
- **路由管理**: Vue Router
- **状态管理**: Pinia
- **HTTP 客户端**: Axios
- **UI 交互**: SweetAlert2
- **样式方案**: CSS Variables + Scoped CSS

### 后端技术栈
- **运行环境**: Node.js
- **Web 框架**: Express
- **数据库**: MySQL (mysql2/promise)
- **认证方案**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **AI 集成**: Axios 调用外部大模型 API
- **环境配置**: dotenv

---

## 三、后端模块结构

后端位于 `houduan/` 目录，采用 MVC 分层架构。

### 3.1 用户认证模块 (`routes/auth`, `controllers/authController`)
- **功能**: 用户注册、登录、获取当前用户信息
- **安全机制**: bcryptjs 密码哈希 + JWT Token 签发
- **接口**: `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`

### 3.2 题目管理模块 (`routes/questions`, `controllers/questionController`)
- **功能**: 题目的 CRUD 操作，支持分类筛选和关键词搜索
- **安全设计**: 答案字段仅在后端验证时使用，不暴露给前端
- **接口**: `GET /api/questions`、`GET /api/questions/:id`、`PATCH /api/questions/:id`

### 3.3 AI 智能助手模块 (`routes/ai`, `controllers/aiController`, `services/aiService`)
- **功能**:
  - `getHint`: 答题中根据题目和用户已选答案，返回引导性提示（不直接给答案）
  - `getExplanation`: 交卷后提供题目详细解释，支持用户自由追问（结合用户输入的 `userQuestion` 参数做针对性解答）
- **提示词工程**: 设计了严格的 prompt，要求 AI 只给出思路方向，禁止直接输出答案
- **追问机制**: 交卷后"查看详解"按钮旁提供文本输入框，用户可输入具体问题（如"为什么选C？"），AI 将用户问题注入 prompt 生成个性化解答
- **接口**: `POST /api/ai/hint`、`POST /api/ai/explain`

### 3.4 论坛交流模块 (`routes/posts`, `controllers/postController`, `routes/comments`, `controllers/commentController`)
- **功能**: 帖子发布、评论互动、关联题目讨论
- **安全机制**: HTML 特殊字符转义（防 XSS）
- **设计要点**:
  - 帖子 `questionId` 为可选字段，不关联题目时存 `NULL`
  - 帖子详情 SQL 使用 `LEFT JOIN questions`，兼容无关联题目的帖子
  - 帖子列表和详情接口统一返回嵌套数据 `{ posts/pagination }` 和 `{ post/comments }`
  - 分页采用 `pool.query` 配合 LIMIT/OFFSET 字面量拼接，规避 mysql2 execute 预编译兼容问题
  - 浏览量在访问详情时自动 +1（UPDATE → SELECT 顺序执行）
  - 关键词搜索支持帖子标题、内容及关联题目标题三字段模糊匹配
  - 帖子列表 SQL JOIN questions 返回 `question_title`，前端可直接展示关联题目标签
- **接口**: 帖子 CRUD、评论增删查、帖子搜索（`?q=keyword`）

### 3.5 错题本模块 (`routes/wrongBook`, `controllers/wrongBookController`)
- **功能**: 自动记录用户答错的题目，支持按用户筛选
- **唯一约束**: 同一用户同一题目只记录一次

### 3.6 收藏模块 (`routes/favorites`, `controllers/favoritesController`)
- **功能**: 用户收藏题目，便于后续复习
- **唯一约束**: 同一用户同一题目只收藏一次

### 3.7 练习历史模块 (`routes/history`, `controllers/historyController`)
- **功能**: 记录每次练习的成绩、用时、时间戳
- **统计指标**: 正确率、用时、历史趋势

### 3.8 分类管理模块 (`routes/categories`, `controllers/categoryController`)
- **功能**: 题目分类管理（JavaScript、CSS、HTML、Vue/前端框架、HTTP/网络）
- **初始数据**: 5 大分类，100 道精选题目

### 3.9 举报管理模块 (`routes/reports`, `controllers/reportController`)
- **功能**: 用户举报题目问题（题目错误、选项错误等）
- **后台管理**: 管理员可查看和处理举报

### 3.10 中间件 (`middlewares/`)
- `auth.js`: JWT Token 验证中间件，保护需认证的路由
- `errorHandler.js`: 统一错误处理，格式化错误响应

### 3.11 数据库配置 (`config/database.js`)
- 使用 mysql2/promise 连接池
- 支持连接测试与自动重连机制

---

## 四、前端模块结构

前端位于 `shuati/` 目录。

### 4.1 核心页面

| 页面 | 路径 | 功能描述 |
|------|------|----------|
| 首页 (Home) | `/home` | 展示分类列表、快速入口 |
| 登录 (Login) | `/login` | 用户登录，Token 存储 |
| 注册 (Register) | `/register` | 新用户注册 |
| 答题页 (Quiz) | `/quiz` | 核心刷题界面 |
| 历史记录 (History) | `/history` | 查看练习历史统计 |
| 错题本 (WrongBook) | `/wrong-book` | 查看错题列表 |
| 收藏 (Favorites) | `/favorites` | 查看收藏题目 |
| 讨论区 (Forum) | `/forum` | 帖子浏览与发布 |
| 数据分析 (Analytics) | `/analytics` | 练习数据可视化 |
| 管理后台 | `/admin/*` | 题目管理、分类管理、举报处理 |

### 4.2 核心组件

| 组件 | 位置 | 功能描述 |
|------|------|----------|
| `StartScreen` | `components/` | 答题前的题目数量选择、模式选择（全部/错题/混合） |
| `QuizHeader` | `components/` | 顶部导航，含退出、暂停、交卷按钮及计时器；交卷后自动禁用暂停和交卷按钮 |
| `QuestionCard` | `components/` | 单题卡片，含题目、选项、代码展示、收藏按钮 |
| `AnswerSheet` | `components/` | 答题卡，点击跳转至指定题目 |
| `ResultStats` | `components/` | 交卷后成绩统计：正确/错误/未答/正确率 |
| `AiHint` | `components/` | AI 提示浮窗，答题中提供引导性提示；交卷后支持"查看详解"和自由追问 AI |
| `PauseOverlay` | `components/` | 暂停遮罩层 |
| `NavBar` | `components/` | 底部导航栏 |

### 4.3 API 封装 (`api/index.js`)
- 统一 Axios 实例，自动注入 JWT Token
- 响应拦截器统一解包 `{ success, data }` 结构
- 401 响应自动跳转登录页

### 4.4 路由与导航
- 路由守卫检查 Token，未登录重定向至登录页
- 底部 TabBar 导航主要页面

---

## 五、数据库设计

数据库名: `interview_platform`，字符集 `utf8mb4`。

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户账户 | username, password(bcrypt), role |
| `categories` | 题目分类 | name |
| `questions` | 题目内容 | title, code, options(JSON), correctAnswer, categoryId |
| `wrong_book` | 错题记录 | userId, questionId (唯一约束) |
| `favorites` | 收藏记录 | userId, questionId (唯一约束) |
| `practice_history` | 练习历史 | userId, score, total, timeSpent, createdAt |
| `reports` | 题目举报 | questionId, reason |
| `posts` | 论坛帖子 | user_id, question_id, title, content, view_count |
| `comments` | 帖子评论 | post_id, user_id, content |
| `user_answers` | 用户答题流水 | user_id, question_id, selected_index, is_correct |

---

## 六、核心业务流程

### 6.1 刷题流程
1. 用户进入答题页 → 选择题目数量和模式（全部/错题/混合）
2. 开始计时 → 逐题作答（可选收藏）→ 点击答题卡跳转
3. 交卷 → 自动记录错题、练习历史 → 展示成绩统计
4. 交卷后交卷和暂停按钮自动禁用；可点击"查看详解"或向 AI 自由追问获取详细解答

### 6.2 AI 辅助流程
1. 答题中点击 "AI 提示" → 后端结合题目和用户已选答案 → 返回引导性提示
2. 交卷后点击 "查看详解" → 后端返回详细解释
3. 提示词严格禁止直接给答案，遵循"授人以渔"原则

### 6.3 论坛讨论流程
1. 进入讨论区 → 浏览帖子列表 → 按关键词搜索
2. 点击帖子 → 查看内容、评论 → 发表评论

---

## 七、项目亮点

1. **前后端分离架构**: 前端 Vue 3 + 后端 Node.js，通过 RESTful API 通信，职责清晰
2. **AI 智能提示与追问**: 答题中 AI 提供引导性提示；交卷后支持"查看详解"和自由追问，实现个性化学习辅导
3. **JWT 无状态认证**: 支持分布式部署，Token 有效期内自动维持登录状态
4. **错题本自动记录**: 交卷后自动将答错题目写入错题本，无需手动操作
5. **多种练习模式**: 支持全部题目、仅错题、混合三种模式
6. **实时计时与暂停**: 模拟考试场景，支持暂停计时，交卷后自动禁用相关按钮防止二次提交
7. **数据可视化**: 提供练习历史统计与分析
8. **论坛交流**: 用户可针对具体题目展开讨论，形成学习社区
9. **安全性设计**: 密码 bcrypt 加密、答案不暴露前端、XSS 转义防护、SQL 注入防护（Prepared Statements）
