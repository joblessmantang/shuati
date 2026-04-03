# Interview Platform Backend

后端服务项目，用于刷题平台的 Node.js + Express + MySQL 后端。

## 功能特性

- 用户认证（注册、登录、JWT，含 role 角色区分 admin/user）
- 题目管理（列表、详情、CRUD，支持分类筛选和关键词搜索）
- AI 辅助提示和解释（支持 DeepSeek / OpenAI 兼容接口）
- 论坛功能（帖子、评论）
- 答题记录和统计
- 错题本、收藏、练习历史
- 题目举报

## 快速开始

### 1. 配置环境

修改 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=interview_platform

# JWT配置
JWT_SECRET=your_random_secret_key
JWT_EXPIRES_IN=7d

# AI API配置（DeepSeek）
AI_API_KEY=your_deepseek_api_key
AI_API_URL=https://api.deepseek.com/v1/chat/completions
AI_MODEL=deepseek-chat

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 2. 安装依赖并初始化数据库

```bash
cd houduan
npm install
npm run init-db
```

### 3. 启动服务

```bash
npm run dev  # 开发模式（自动重启）
npm start    # 生产模式
```

服务运行在 http://localhost:3000

## API 接口

### 认证相关

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | /api/auth/register | 注册 | 否 |
| POST | /api/auth/login | 登录 | 否 |
| GET | /api/auth/me | 获取当前用户 | 是 |

### 分类相关

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/categories | 分类列表 | 否 |
| GET | /api/categories/:id | 分类详情 | 否 |
| POST | /api/categories | 新增分类 | 是 |
| PATCH | /api/categories/:id | 更新分类 | 是 |
| DELETE | /api/categories/:id | 删除分类 | 是 |

### 题目相关

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/questions | 题目列表（支持 categoryId、q 筛选） | 否 |
| GET | /api/questions/:id | 题目详情 | 否 |
| POST | /api/questions/:id/check | 提交答案 | 可选 |
| POST | /api/questions | 新增题目 | 是 |
| PATCH | /api/questions/:id | 更新题目 | 是 |
| DELETE | /api/questions/:id | 删除题目 | 是 |

### AI 相关

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | /api/ai/hint | 获取提示 | 是 |
| POST | /api/ai/explain | 获取解释 | 是 |

### 论坛相关

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/posts | 帖子列表 | 否 |
| GET | /api/posts/:id | 帖子详情 | 否 |
| POST | /api/posts | 发布帖子 | 是 |
| DELETE | /api/posts/:id | 删除帖子 | 是 |
| GET | /api/posts/:id/comments | 评论列表 | 否 |
| POST | /api/posts/:id/comments | 发布评论 | 是 |
| DELETE | /api/posts/:id/comments/:cid | 删除评论 | 是 |

### 错题本

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/wrongBook | 错题列表（userId参数） | 否 |
| POST | /api/wrongBook | 加入错题本 | 否 |
| DELETE | /api/wrongBook/:id | 移除错题 | 否 |

### 收藏

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/favorites | 收藏列表（userId参数） | 否 |
| POST | /api/favorites | 添加收藏 | 否 |
| DELETE | /api/favorites/:id | 取消收藏 | 否 |

### 练习历史

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/practiceHistory | 历史列表（userId参数） | 否 |
| POST | /api/practiceHistory | 添加记录 | 否 |

### 举报

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/reports | 举报列表 | 是 |
| POST | /api/reports | 提交举报 | 否 |
| DELETE | /api/reports/:id | 删除举报 | 是 |

## 项目结构

```
houduan/
├── src/
│   ├── config/
│   │   └── database.js         # MySQL连接池配置
│   ├── controllers/
│   │   ├── authController.js    # 用户认证
│   │   ├── categoryController.js # 分类管理
│   │   ├── questionController.js # 题目管理
│   │   ├── aiController.js      # AI辅助
│   │   ├── postController.js    # 论坛帖子
│   │   ├── commentController.js # 评论管理
│   │   ├── wrongBookController.js # 错题本
│   │   ├── favoritesController.js # 收藏
│   │   ├── historyController.js # 练习历史
│   │   └── reportController.js  # 举报
│   ├── routes/
│   │   ├── auth.js
│   │   ├── categories.js
│   │   ├── questions.js
│   │   ├── ai.js
│   │   ├── posts.js
│   │   ├── wrongBook.js
│   │   ├── favorites.js
│   │   ├── history.js
│   │   └── reports.js
│   ├── services/
│   │   └── aiService.js         # AI服务封装
│   ├── middlewares/
│   │   ├── auth.js              # JWT鉴权
│   │   └── errorHandler.js     # 错误处理
│   ├── scripts/
│   │   └── initDb.js            # 数据库初始化脚本
│   └── app.js                   # 入口文件
├── package.json
├── .env
├── .env.example
├── init.sql
└── README.md
```

## 测试用户

初始化后会创建测试账号：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | admin |
| tl | Tony1997630 | user |
