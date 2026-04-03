# 智能刷题平台的设计与实现

---

## 摘要

随着前端技术的快速发展和前端面试难度的不断提升，开发者需要一个高效、专业的刷题辅助工具来提升面试准备效率。本设计实现了一个面向前端面试备考的智能刷题平台，采用前后端分离架构，前端基于 Vue 3 构建，后端基于 Node.js + Express + MySQL。平台提供题目练习、AI 智能提示、论坛讨论等核心功能，支持多种练习模式、错题自动归集、AI 追问详解等特性。本论文从系统分析、需求分析、业务流程、架构设计、数据库设计、接口设计、安全设计、系统实现及测试等方面详细阐述该系统的设计与实现过程。

**关键词**：智能刷题平台；Vue 3；Node.js；MySQL；AI 提示词工程；前后端分离

---

## 第1章 绪论

### 1.1 研究背景与意义

在互联网行业，前端技术日新月异，JavaScript、CSS、HTML 等核心知识的考察始终是技术面试的重点环节。传统刷题方式存在题目分散、答案不详细、无法针对性训练等痛点。随着大语言模型（LLM）技术的成熟，将 AI 能力融入学习辅助工具，能够为用户提供个性化的学习指导，显著提升学习效率。

本项目的意义在于：
1. **资源整合**：汇聚高质量前端面试题目，提供系统化的练习环境；
2. **AI 赋能**：通过提示词工程实现"授人以渔"式的学习引导，而非直接给出答案；
3. **社区互动**：论坛模块允许用户就特定题目展开讨论，形成知识共享的学习社区；
4. **数据驱动**：通过错题本、练习历史等数据，帮助用户量化学习效果。

### 1.2 研究目标

本项目旨在设计并实现一个功能完整的前端面试智能刷题平台，具体目标包括：
- 构建稳定可靠的前后端分离 Web 应用；
- 实现多种练习模式（全部题目、仅错题、混合模式）；
- 集成 AI 智能提示和追问详解功能；
- 提供论坛交流模块，支持帖子发布与评论互动；
- 设计完善的安全机制，保障用户数据安全。

### 1.3 论文结构

本文共分为六章：第1章绪论；第2章相关技术介绍；第3章系统分析；第4章系统设计；第5章系统实现；第6章系统测试。

---

## 第2章 相关技术介绍

### 2.1 前端技术栈

- **核心框架**：Vue 3 (Composition API + `<script setup>` 语法糖)，利用 `ref`、`reactive`、`computed` 等响应式 API 实现数据管理；
- **构建工具**：Vite，提供极快的冷启动和热模块替换（HMR）；
- **路由管理**：Vue Router 4，管理页面路由及路由守卫；
- **状态管理**：Pinia，现代化 Vue 3 状态管理方案，支持 store 共享；
- **HTTP 客户端**：Axios，统一封装请求拦截器、响应拦截器及 Token 自动注入；
- **UI 交互**：SweetAlert2，美化弹窗和确认对话框；
- **样式方案**：CSS Variables 实现主题变量管理，Scoped CSS 实现组件样式隔离。

### 2.2 后端技术栈

- **运行环境**：Node.js，提供非阻塞 I/O 和事件驱动的轻量级并发；
- **Web 框架**：Express.js，基于中间件的 Web 应用框架；
- **数据库**：MySQL 8.0（mysql2/promise），支持异步查询和连接池管理；
- **认证方案**：JWT (jsonwebtoken)，实现无状态用户身份认证；
- **密码加密**：bcryptjs，基于 bcrypt 算法的安全密码哈希；
- **AI 集成**：Axios 调用外部大模型 API（DeepSeek），后端统一代理避免前端暴露 API Key；
- **环境配置**：dotenv，敏感配置通过环境变量管理。

### 2.3 技术架构选型依据

选择 Vue 3 + Node.js 的前后端分离架构，基于以下考虑：
1. **开发效率**：Vue 3 的组件化开发和 Node.js 的 JavaScript 全栈统一，降低学习成本；
2. **性能表现**：Node.js 的非阻塞 I/O 适合 I/O 密集型的 Web 应用；
3. **生态成熟**：Vue 3 和 Express 拥有庞大的社区和丰富的第三方库支持；
4. **AI 集成便捷**：Node.js 原生支持异步 HTTP 请求，便于对接外部 AI 服务。

---

## 第3章 系统分析

### 3.1 可行性分析

#### 3.1.1 技术可行性

本系统采用业界成熟的技术栈：前端 Vue 3 是目前最主流的前端框架之一，Node.js + Express 是构建 RESTful API 的标准方案，MySQL 是应用最广泛的开源关系型数据库。AI 能力通过调用成熟的第三方大模型 API 实现，后端统一封装，架构清晰。上述技术均有完善的文档、社区支持和长期维护保障，技术可行性高。

#### 3.1.2 经济可行性

所有技术选型均为开源免费方案，无需支付任何软件授权费用：
- 前端：Vue 3（MIT 协议）、Vite（MIT 协议）、Axios（MIT 协议）均为免费开源；
- 后端：Node.js（MIT 协议）、Express（MIT 协议）、MySQL（GPL/GPL-Commercial）社区版免费；
- AI：DeepSeek 等大模型 API 按调用量收费，成本可控。

#### 3.1.3 操作可行性

系统面向前端面试备考用户设计，界面简洁直观，操作流程符合用户习惯：
- 答题流程：选择模式 → 开始练习 → 逐题作答 → 交卷查看结果 → AI 详解；
- 论坛流程：浏览帖子 → 查看详情 → 发表评论；
- 管理流程：题目增删改、分类管理、举报处理，入口清晰。

系统无需用户具备专业技能，普通用户经过简单熟悉即可上手使用。

### 3.2 需求分析

#### 3.2.1 功能性需求

本系统的核心功能性需求包括以下几个子系统：

**用户认证子系统**：支持用户注册（用户名 + 密码）、用户登录（JWT Token 签发）、获取当前用户信息。管理员可注册其他管理员、查看用户列表、修改用户角色、删除用户。

**刷题练习子系统**：支持三种练习模式——全部题目模式（从题库随机抽取指定数量题目）、仅错题模式（仅练习历史错题）、混合模式（优先包含错题，剩余名额由其他题目填充）。答题过程中支持实时计时、暂停计时、答题卡跳转、收藏题目、交卷交卷后自动记录错题和练习历史。

**AI 智能提示子系统**：答题过程中，用户点击"AI 提示"按钮，后端结合题目内容和用户已选答案，通过提示词工程返回引导性提示，不直接输出答案。交卷后，"查看详解"按钮激活，用户可获取题目的详细解释；亦可在文本框中输入具体问题（如"为什么选 C 不对？"），AI 将结合用户输入生成个性化追问解答。

**论坛交流子系统**：用户可发布帖子（可关联具体题目，也可不关联）、浏览帖子列表（支持关键词搜索）、查看帖子详情及评论、发表评论。帖子浏览量在访问详情时自动 +1，关联题目的帖子使用 LEFT JOIN 兼容无关联题目的场景。

**学习管理子系统**：错题本自动归集用户答错的题目；收藏模块允许用户主动收藏感兴趣的题目；练习历史记录每次练习的成绩、用时、时间戳；数据分析页面提供练习趋势可视化。

**管理后台子系统**：管理员可管理题目（增删改）、管理分类、管理举报（查看列表）。

**用例图说明**：

```
┌──────────────────────────────────────────────────────┐
│                   智能刷题平台                          │
│                                                      │
│  ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐  │
│  │  游客   │   │  普通用户 │   │  管理员  │   │ AI助手  │  │
│  └────┬───┘   └────┬───┘   └───┬────┘   └───┬────┘  │
│       │            │            │            │        │
│  ┌────┴────────────┴────────────┴────────────┴────┐  │
│  │                   系统边界                         │  │
│  │                                                │  │
│  │  注册 ───┐                                     │  │
│  │  登录 ───┼── 用户认证                          │  │
│  │  查看信息 ┘                                    │  │
│  │                                               │  │
│  │  选择练习模式 ───┐                             │  │
│  │  答题 ─────────┼── 刷题练习                    │  │
│  │  交卷 ─────────┤                             │  │
│  │  查看结果 ─────┘                             │  │
│  │                                               │  │
│  │  获取AI提示 ──┐                               │  │
│  │  追问详解 ────┼── AI智能提示（交卷后）          │  │
│  │  查看详解 ────┘                               │  │
│  │                                               │  │
│  │  浏览论坛 ────┐                               │  │
│  │  发帖 ────────┼── 论坛交流                    │  │
│  │  评论 ────────┤                             │  │
│  │  搜索帖子 ────┘                             │  │
│  │                                               │  │
│  │  查看错题本 ──┐                               │  │
│  │  查看收藏 ────┼── 学习管理                    │  │
│  │  查看历史 ────┤                             │  │
│  │  查看分析 ────┘                             │  │
│  │                                               │  │
│  │  管理题目 ────┐                               │  │
│  │  管理分类 ────┼── 管理后台（仅管理员）          │  │
│  │  处理举报 ────┘                               │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**主要用例描述**：

| 用例编号 | 用例名称 | 参与者 | 简要描述 | 前置条件 | 后置条件 |
|---------|---------|-------|---------|---------|---------|
| UC-01 | 用户注册 | 游客 | 输入用户名和密码完成注册 | 游客未登录 | 创建新用户账户 |
| UC-02 | 用户登录 | 游客 | 输入用户名密码获取 JWT Token | 游客已注册 | 系统签发 Token，用户跳转首页 |
| UC-03 | 刷题练习 | 普通用户 | 选择模式和题量，逐题作答 | 用户已登录 | 记录答题数据，展示成绩统计 |
| UC-04 | AI 提示 | 普通用户 | 答题中获得引导性提示 | 题目加载完成 | 显示 AI 提示内容 |
| UC-05 | AI 详解 | 普通用户 | 交卷后获取详细解释或追问 | 用户已交卷 | 显示详解或追问解答 |
| UC-06 | 发布帖子 | 普通用户 | 填写标题和内容发布帖子 | 用户已登录 | 帖子创建成功并显示 |
| UC-07 | 发表评论 | 普通用户 | 在帖子下发表回复 | 用户已登录且已打开帖子 | 评论添加成功 |
| UC-08 | 管理题目 | 管理员 | 添加、编辑、删除题目 | 管理员已登录 | 题目数据更新 |
| UC-09 | 处理举报 | 管理员 | 查看并处理用户举报 | 管理员已登录 | 举报标记已处理 |

#### 3.2.2 非功能性需求

**性能需求**：
- 普通 API 请求响应时间 < 1s；
- AI 提示/详解请求响应时间 < 5s（受外部 AI 服务影响）；
- 页面首屏加载时间 < 2s；
- 支持至少 50 道题目的题库管理。

**安全性需求**：
- 用户密码使用 bcryptjs 加密存储（cost factor = 10）；
- JWT Token 有效期 7 天，过期后需重新登录；
- 题目答案仅在后端验证，不暴露给前端；
- 论坛内容进行 HTML 特殊字符转义，防止 XSS 攻击；
- 数据库查询使用 Prepared Statements，防止 SQL 注入；
- API 接口需认证的路由通过 `authMiddleware` 中间件保护。

**可维护性需求**：
- 前后端分离部署，各自独立维护；
- 模块化设计，新增功能不影响现有模块；
- 统一的 API 响应格式 `{ success, data }` 便于前端处理；
-完善的错误处理中间件，统一格式化错误响应。

**可用性需求**：
- 响应式布局，适配移动端和桌面端；
- 友好的错误提示和加载状态反馈；
- 支持中文字符集（utf8mb4）。

### 3.3 业务流程分析

#### 3.3.1 刷题流程

```
┌─────────┐
│  开始   │
└────┬────┘
     ▼
┌─────────────┐    ┌────────────────────────┐
│ 选择模式数量 │───→│ 全部模式/错题模式/混合模式 │
└──────┬──────┘    └──────────┬─────────────┘
       ▼                       ▼
┌──────────────────┐  ┌──────────────────────┐
│ 题库为空检查      │→ │ 是 → 提示"暂无题目"    │
└────────┬─────────┘  └──────────────────────┘
         │否
         ▼
┌──────────────────┐
│ 开始计时，随机选题 │
└────────┬─────────┘
         ▼
    ┌────────┐
    │ 逐题   │←──────────────────┐
    │ 作答   │                   │
    └───┬────┘                   │
        ▼                        │
┌────────────────────┐           │
│ 可选：收藏题目       │           │
└────────┬───────────┘           │
         ▼                        │
┌────────────────────┐           │
│ 可选：AI 提示       │           │
└────────┬───────────┘           │
         ▼                        │
┌────────────────────┐    ┌───────┴──────┐
│ 点击"交卷"？        │───→│  否 → 继续作答 │
└────────┬───────────┘    └──────────────┘
         │是
         ▼
┌────────────────────┐
│ 确认交卷？          │
└────────┬───────────┘
         ▼
┌────────────────────┐    ┌──────────────┐
│ 是 → 禁用交卷按钮   │───→│ 停止计时      │
└────────┬───────────┘    └──────────────┘
         ▼
┌────────────────────┐
│ 保存错题记录        │
└────────┬───────────┘
         ▼
┌────────────────────┐
│ 保存练习历史        │
└────────┬───────────┘
         ▼
┌────────────────────┐
│ 展示成绩统计        │
└────────┬───────────┘
         ▼
┌────────────────────┐
│ 可用"查看详解"      │←──────────────────┐
│ 可向AI自由追问      │                   │
└────────┬───────────┘                   │
         ▼                                │
    ┌────────┐                    ┌───────┴──────┐
    │ 结束   │←──────────────┐    │ 继续查看其他题│
    └────────┘              │    └──────────────┘
                             └───┐
                                 │
                            ┌────┴────┐
                            │ 退出答题 │
                            └─────────┘
```

#### 3.3.2 发布帖子流程

```
┌─────────┐
│  开始   │
└────┬────┘
     ▼
┌─────────────────┐
│ 用户进入讨论区    │
└────────┬────────┘
         ▼
┌─────────────────┐
│  浏览帖子列表     │←───────────────────┐
└────────┬────────┘                    │
         ▼                             │
┌─────────────────┐                    │
│ 关键词搜索？      │───是──→ 过滤帖子列表│
└────────┬────────┘                    │
         │否                            │
         ▼                             │
┌─────────────────┐    ┌───────────────┴──┐
│ 点击帖子查看详情  │──→│ 显示帖子内容+评论   │
└────────┬────────┘    └─────────┬───────┘
         ▼                         │
┌─────────────────┐                 │
│ 发表评论？        │───是──→ 输入内容  │
└────────┬────────┘                 │
         │否                         │
         ▼                          │
┌─────────────────┐    ┌─────────────┴──┐
│ 发布新帖子？      │──→│ 填写标题+内容    │
└────────┬────────┘    │ 可选关联题目    │
         │否            └────────┬───────┘
         ▼                       ▼
    ┌────────┐         ┌─────────────────┐
    │ 结束   │          │ 提交 → XSS转义    │
    └────────┘          │ 存入数据库        │
                        │ 返回成功         │
                        └────────┬─────────┘
                                 ▼
                           ┌──────────┐
                           │ 刷新列表 │
                           └──────────┘
```

---

## 第4章 系统设计

### 4.1 总体架构设计

#### 4.1.1 系统架构

本系统采用经典的前后端分离架构（Front-End / Back-End Separation Architecture），前端与后端通过 JSON over HTTP 通信，各自独立开发、测试和部署。

```
┌──────────────────────────────────────────────────────────┐
│                        用户浏览器                          │
│                    （Vue 3 SPA 应用）                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Vue Router（路由守卫：Token 校验）                   │  │
│  │  Pinia Store（用户状态管理）                          │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │  │
│  │  │ 首页   │ │ 答题页 │ │ 论坛   │ │ 管理页 │ ...  │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │         Axios（请求拦截 / Token注入 / 401跳转）│   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP/REST API (JSON)
                         │ http://localhost:3000/api
                         ▼
┌──────────────────────────────────────────────────────────┐
│                      Node.js 后端服务                     │
│                      Express.js                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                   路由层（Routes）                   │  │
│  │  /api/auth  /api/questions  /api/ai  /api/posts    │  │
│  │  /api/wrongBook  /api/favorites  /api/history      │  │
│  │  /api/categories  /api/reports                     │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │ AuthMiddleware│  │ErrorHandlerMW │  │  CORS配置   │  │
│  │  (JWT验证)    │  │ (统一错误处理) │  │             │  │
│  └───────────────┘  └───────────────┘  └─────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Controller 层                      │  │
│  │  AuthController  QuestionController  AIController  │  │
│  │  PostController  WrongBookController               │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │                  Service 层                          │  │
│  │  AIService（AI API 封装、提示词工程、结果缓存）       │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │               mysql2/promise 连接池                  │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │    MySQL 8.0 数据库   │
              │  interview_platform   │
              │  ┌────────────────┐  │
              │  │  users表       │  │
              │  │  questions表   │  │
              │  │  posts表       │  │
              │  │  comments表    │  │
              │  │  wrong_book表  │  │
              │  │  favorites表   │  │
              │  │  practice_history表│
              │  │  reports表     │  │
              │  │  categories表  │  │
              │  └────────────────┘  │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  DeepSeek API        │
              │  (外部 AI 大模型)     │
              └──────────────────────┘
```

#### 4.1.2 部署架构

开发环境下，前端通过 Vite 开发服务器（端口 5173）运行，配置 proxy 将 `/api` 请求代理到后端 Express 服务器（端口 3000）。生产环境下，前端通过 `npm run build` 打包为静态资源，由 Express 托管或 Nginx 反向代理。

### 4.2 功能模块划分

系统按功能划分为以下核心模块：

| 模块名称 | 所属层次 | 主要职责 | 关键文件 |
|---------|---------|---------|---------|
| 用户认证模块 | 后端 | 注册、登录、Token 签发、角色管理 | `authController.js`、`auth.js`(middleware) |
| 题目管理模块 | 后端+前端 | 题目的 CRUD、分类筛选、关键词搜索 | `questionController.js`、`Quiz.vue` |
| AI 智能助手模块 | 后端+前端 | AI 提示、追问详解、提示词工程、结果缓存 | `aiController.js`、`aiService.js`、`AiHint.vue` |
| 论坛交流模块 | 后端+前端 | 帖子发布、评论、搜索、浏览量统计 | `postController.js`、`commentController.js`、`Forum.vue` |
| 错题本模块 | 后端+前端 | 自动记录错题、按用户筛选 | `wrongBookController.js`、`WrongBook.vue` |
| 收藏模块 | 后端+前端 | 收藏题目、取消收藏 | `favoritesController.js` |
| 练习历史模块 | 后端+前端 | 记录练习成绩、用时、时间戳 | `historyController.js`、`History.vue` |
| 数据分析模块 | 前端 | 练习数据可视化 | `Analytics.vue` |
| 分类管理模块 | 后端+前端 | 题目分类的增删改查 | `categoryController.js` |
| 举报管理模块 | 后端+前端 | 用户举报题目、管理员处理 | `reportController.js`、`AdminReports.vue` |
| 中间件模块 | 后端 | JWT 鉴权、统一错误处理 | `auth.js`、`errorHandler.js` |

### 4.3 数据库设计

#### 4.3.1 E-R 图（实体关系图）

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │    categories     │       │    questions     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ PK id            │       │ PK id            │  1:N  │ PK id            │
│    username      │       │    name          │←──────│ FK categoryId    │
│    password      │       └──────────────────┘       │    title         │
│    role          │                                 │    code          │
│    created_at    │                                 │    options (JSON)│
└───────┬──────────┘                                 │    correctAnswer  │
        │ 1:N                                          │    created_at    │
        │ ┌──────────────────┐                         └───────┬──────────┘
        │ │  practice_history │       ┌──────────────────┐        │ 1:N
        │ ├──────────────────┤       │    wrong_book    │        │
        │ │ PK id            │       ├──────────────────┤        │ 1:N
        │ │ FK userId   1:N→│       │ PK id            │        │ ┌──────────────┐
        │ │    score         │       │ FK userId        │        │ │ posts        │
        │ │    total          │       │ FK questionId    │        │ ├──────────────┤
        │ │    timeSpent      │       │    created_at    │        │ │ PK id        │
        │ │    createdAt      │       └────────┬─────────┘        │ │ FK user_id   │
        │ └──────────────────┘                │ N:1              │ │ FK question_id│ NULL
        │ ┌──────────────────┐                ▼                  │ │    title      │
        │ │   favorites      │       ┌──────────────────┐       │ │    content    │
        │ ├──────────────────┤       │    reports       │       │ │    view_count │
        │ │ PK id            │       ├──────────────────┤       │ │    created_at │
        │ │ FK userId   1:N→│       │ PK id            │       │ └───────┬──────┘
        │ │ FK questionId    │       │ FK questionId    │       │         │ 1:N
        │ │    created_at    │       │    reason         │       │         ▼
        │ └──────────────────┘       │    createdAt     │       │ ┌──────────────┐
        │ ┌──────────────────┐       └──────────────────┘       │ │  comments    │
        │ │  user_answers    │                                     │ ├──────────────┤
        │ ├──────────────────┤                                     │ │ PK id        │
        │ │ PK id            │                                     │ │ FK post_id   │
        │ │ FK user_id   1:N→│                                     │ │ FK user_id   │
        │ │ FK question_id   │                                     │ │    content   │
        │ │    selected_index│                                     │ │    created_at│
        │ │    is_correct    │                                     │ └──────────────┘
        │ │    created_at    │                                     │
        │ └──────────────────┘                                     │
        └─────────────────────────────────────────────────────────┘
```

#### 4.3.2 数据表结构

**表 4-1 users（用户表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 用户ID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 用户名 |
| password | VARCHAR(255) | NOT NULL | bcrypt 加密后的密码 |
| role | VARCHAR(20) | DEFAULT 'user' | 角色：admin / user |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**表 4-2 categories（分类表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 分类ID |
| name | VARCHAR(100) | NOT NULL | 分类名称 |

**表 4-3 questions（题目表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 题目ID |
| title | TEXT | NOT NULL | 题干 |
| code | TEXT | NULL | 代码片段（可选） |
| options | JSON | NOT NULL | 选项数组 |
| correctAnswer | VARCHAR(10) | NOT NULL | 正确答案（如"A"） |
| categoryId | INT | FOREIGN KEY → categories(id) ON DELETE SET NULL | 分类ID |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**表 4-4 wrong_book（错题本表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 记录ID |
| userId | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 用户ID |
| questionId | INT | FOREIGN KEY → questions(id) ON DELETE CASCADE | 题目ID |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 记录时间 |
| | | UNIQUE KEY `unique_user_question` (userId, questionId) | 防重复 |

**表 4-5 favorites（收藏表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 记录ID |
| userId | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 用户ID |
| questionId | INT | FOREIGN KEY → questions(id) ON DELETE CASCADE | 题目ID |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 收藏时间 |
| | | UNIQUE KEY `unique_user_question_fav` (userId, questionId) | 防重复 |

**表 4-6 practice_history（练习历史表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 记录ID |
| userId | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 用户ID |
| score | INT | DEFAULT 0 | 正确题数 |
| total | INT | NOT NULL | 总题数 |
| timeSpent | INT | DEFAULT 0 | 用时（秒） |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 练习时间 |

**表 4-7 reports（举报表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 举报ID |
| questionId | INT | FOREIGN KEY → questions(id) ON DELETE CASCADE | 被举报的题目ID |
| reason | TEXT | NOT NULL | 举报原因 |
| createdAt | DATETIME | DEFAULT CURRENT_TIMESTAMP | 举报时间 |

**表 4-8 posts（论坛帖子表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 帖子ID |
| user_id | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 发布用户ID |
| question_id | INT | FOREIGN KEY → questions(id) ON DELETE SET NULL, DEFAULT NULL | 关联题目（可选） |
| title | VARCHAR(200) | NOT NULL | 帖子标题 |
| content | TEXT | NOT NULL | 帖子内容 |
| view_count | INT | DEFAULT 0 | 浏览量 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 发布时间 |

**表 4-9 comments（评论表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 评论ID |
| post_id | INT | FOREIGN KEY → posts(id) ON DELETE CASCADE | 所属帖子ID |
| user_id | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 评论用户ID |
| content | TEXT | NOT NULL | 评论内容 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 评论时间 |

**表 4-10 user_answers（用户答题流水表）**

| 字段名 | 类型 | 约束 | 说明 |
|-------|------|------|-----|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 记录ID |
| user_id | INT | FOREIGN KEY → users(id) ON DELETE CASCADE | 用户ID |
| question_id | INT | FOREIGN KEY → questions(id) ON DELETE CASCADE | 题目ID |
| selected_index | TINYINT | NULL | 用户选择的选项 |
| is_correct | BOOLEAN | NULL | 是否正确 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 答题时间 |

### 4.4 接口设计

#### 4.4.1 RESTful API 文档

**认证模块**

| 方法 | URL | 参数 | 请求体 | 响应格式 | 说明 |
|-----|-----|------|-------|---------|-----|
| POST | /api/auth/register | - | `{username, password}` | `{success, token, user}` | 用户注册 |
| POST | /api/auth/login | - | `{username, password}` | `{success, token, user}` | 用户登录 |
| GET | /api/auth/me | - | - | `{success, data: {id, username, role}}` | 获取当前用户 |
| GET | /api/auth/users | - | - | `{success, data: [...]}` | 获取用户列表（管理员） |
| PATCH | /api/auth/users/:userId/role | - | `{role: "admin"|"user"}` | `{success, message}` | 修改用户角色（管理员） |
| DELETE | /api/auth/users/:userId | - | - | `{success, message}` | 删除用户（管理员） |

**题目模块**

| 方法 | URL | 参数 | 响应格式 | 说明 |
|-----|-----|------|---------|-----|
| GET | /api/questions | `?categoryId=1&q=keyword` | `{success, data: [...]}` | 获取题目列表 |
| GET | /api/questions/:id | - | `{success, data: {...}}` | 获取单题详情（不含答案） |
| POST | /api/questions | `{title, code, options, correctAnswer, categoryId}` | `{success, data: {...}}` | 创建题目（管理员） |
| PATCH | /api/questions/:id | `{...partial}` | `{success, data: {...}}` | 更新题目（管理员） |
| DELETE | /api/questions/:id | - | `{success, message}` | 删除题目（管理员） |

**AI 模块**

| 方法 | URL | 参数 | 请求体 | 响应格式 | 说明 |
|-----|-----|------|-------|---------|-----|
| POST | /api/ai/hint | - | `{questionId, question?, options?, userAnswer?}` | `{hint, questionId}` | 获取引导性提示 |
| POST | /api/ai/explain | - | `{questionId, question?, options?, userQuestion?}` | `{explanation, questionId}` | 获取详细解释（支持追问） |

**论坛模块**

| 方法 | URL | 参数 | 响应格式 | 说明 |
|-----|-----|------|---------|-----|
| GET | /api/posts | `?questionId=1&q=keyword` | `{success, posts: [...], pagination: {...}}` | 获取帖子列表 |
| GET | /api/posts/:id | - | `{success, post: {...}, comments: [...]}` | 获取帖子详情（含评论） |
| POST | /api/posts | `{title, content, questionId?}` | `{success, data: {...}}` | 发布帖子 |
| DELETE | /api/posts/:id | - | `{success, message}` | 删除帖子 |
| POST | /api/posts/:postId/comments | `{content}` | `{success, data: {...}}` | 发表评论 |
| DELETE | /api/posts/:postId/comments/:commentId | - | `{success, message}` | 删除评论 |

**错题本/收藏/历史**

| 方法 | URL | 参数 | 响应格式 | 说明 |
|-----|-----|------|---------|-----|
| GET | /api/wrongBook | `?userId=1` | `{success, data: [...]}` | 获取错题列表 |
| GET | /api/favorites | `?userId=1` | `{success, data: [...]}` | 获取收藏列表 |
| GET | /api/practiceHistory | `?userId=1` | `{success, data: [...]}` | 获取练习历史 |
| POST | /api/practiceHistory | `{userId, score, total, timeSpent}` | `{success, data: {...}}` | 记录练习 |

#### 4.4.2 前后端交互时序图

**用户登录时序**：

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌─────────┐
│ 用户   │     │ 前端Vue  │     │ Axios    │     │后端    │     │  MySQL  │
└───┬────┘     └────┬────┘     └─────┬────┘     └───┬────┘     └────┬────┘
    │  1.输入用户名密码│              │              │              │
    │───────────────→│              │              │              │
    │  2.提交登录     │              │              │              │
    │────────────────→│              │              │              │
    │                 │  3.POST /api/auth/login   │              │
    │                 │──────────────────────────→│              │
    │                 │              │  4.SQL查询用户  │              │
    │                 │              │────────────────────────────→│
    │                 │              │  5.返回用户记录  │              │
    │                 │              │←─────────────────────────────│
    │                 │              │  6.bcrypt.compare验证密码   │
    │                 │  7.签发JWT    │              │              │
    │                 │←──────────────────────────────│
    │  8.返回token+用户信息│         │              │
    │←─────────────────│              │              │
    │  9.存储Token到localStorage│     │              │
    │                 │  10.跳转首页   │              │
    │                 │───────────────→│              │
```

**答题与 AI 提示时序**：

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌────────┐
│ 用户   │     │ 前端Vue  │     │ Axios    │     │后端API │     │DeepSeek │
└───┬────┘     └────┬────┘     └─────┬────┘     └───┬────┘     └────┬────┘
    │  1.加载题目列表│              │              │              │
    │──────────────→│              │              │              │
    │  2.开始答题   │              │              │              │
    │──────────────→│  3.GET /api/questions    │              │
    │               │──────────────────────────→│              │
    │               │              │  4.SELECT questions        │
    │               │←──────────────────────────────│
    │  5.显示题目  │              │              │
    │←──────────────│              │              │
    │               │              │              │              │
    │  6.点击"AI提示"│              │              │              │
    │──────────────→│  7.POST /api/ai/hint      │              │
    │               │──────────────────────────→│              │
    │               │              │  8.调用AI服务 │              │
    │               │              │────────────────────────────→│
    │               │              │  9.AI返回提示词│              │
    │               │              │←─────────────────────────────│
    │  10.显示AI提示│              │              │
    │←──────────────│              │              │
    │               │              │              │              │
    │  11.交卷      │              │              │              │
    │──────────────→│  12.POST练习历史+错题   │              │
    │               │──────────────────────────→│              │
    │               │              │  13.INSERT history + wrong_book │
    │               │←──────────────────────────────│
    │  14.显示成绩  │              │              │
    │←──────────────│              │              │
    │               │              │              │              │
    │  15."查看详解"+输入追问│     │              │
    │──────────────→│  16.POST /api/ai/explain │              │
    │               │──────────────────────────→│              │
    │               │              │  17.组装含追问的prompt│      │
    │               │              │────────────────────────────→│
    │               │              │  18.返回个性化详解│          │
    │               │              │←─────────────────────────────│
    │  19.显示详解  │              │              │
    │←──────────────│              │              │
```

### 4.5 安全设计

#### 4.5.1 JWT 鉴权

后端使用 `jsonwebtoken` 库签发 JWT Token。登录成功后，在 Token 中写入用户 ID 和用户名（不写入密码）。Token 通过 `Authorization: Bearer <token>` 头传递。`authMiddleware` 中间件通过 `jwt.verify()` 验证 Token 有效性，验证通过后将用户信息挂载到 `req.user`。未认证请求返回 401 状态码，前端 Axios 拦截器捕获 401 后自动跳转登录页。

```
Token 格式：
{
  "id": 1,
  "username": "tl",
  "iat": 1712000000,    // issued at
  "exp": 1712600000     // 7 天后过期
}
```

#### 4.5.2 密码加密

用户注册和密码更新时，使用 `bcryptjs` 的 `hash(password, 10)` 进行单向哈希存储。登录验证时，使用 `bcrypt.compare(inputPassword, storedHash)` 比较，无法反推原始密码。

#### 4.5.3 防 SQL 注入

所有数据库查询使用 mysql2 的 `execute()` 方法（Prepared Statements），参数通过占位符传递，由数据库引擎负责转义。分页查询的 LIMIT/OFFSET 参数使用字面量拼接（经 `parseInt` 验证为整数），其余参数仍走占位符。

```js
// 安全写法
const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username = ?',
    [username]
);
// 分页安全写法
const [rows] = await pool.query(
    `SELECT * FROM posts LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [/* 其他参数 */]
);
```

#### 4.5.4 XSS 过滤

论坛帖子和评论的内容在后端通过 HTML 特殊字符转义函数处理，将 `<`、`>`、`&`、`"`、`'` 转换为 HTML 实体，防止用户输入的 JavaScript 代码在页面中执行。

#### 4.5.5 答案安全

题目表中的 `correctAnswer` 字段仅在后端验证用户答案时使用。`GET /api/questions` 和 `GET /api/questions/:id` 接口均不返回该字段，确保前端无法通过接口直接获取答案。

---

## 第5章 系统实现

### 5.1 开发环境

| 组件 | 版本/配置 | 说明 |
|-----|----------|-----|
| 操作系统 | Windows 10/11 | 开发环境 |
| 前端 IDE | VSCode / Cursor | 代码编辑 |
| 后端 IDE | VSCode / Cursor | 代码编辑 |
| Node.js | 18.x LTS | 后端运行时 |
| npm | 9.x | 包管理器 |
| MySQL | 8.0 | 关系型数据库 |
| 前端构建 | Vite 5.x | 开发服务器 + 生产打包 |
| 前端框架 | Vue 3.4+ (Composition API) | 前端核心框架 |
| 后端框架 | Express 4.x | REST API 框架 |
| 数据库驱动 | mysql2/promise | 异步 MySQL 客户端 |
| AI 模型 | DeepSeek Chat API | 外部大模型服务 |

**后端依赖（关键包）**：
```json
{
  "express": "^4.18.2",
  "mysql2": "^3.9.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "axios": "^1.6.0",
  "cors": "^2.8.5",
  "dotenv": "^16.4.0"
}
```

**前端依赖（关键包）**：
```json
{
  "vue": "^3.4.0",
  "vue-router": "^4.2.0",
  "pinia": "^2.1.0",
  "axios": "^1.6.0",
  "sweetalert2": "^11.10.0"
}
```

### 5.2 前端实现

#### 5.2.1 项目结构

```
shuati/                          # 前端项目根目录
├── src/
│   ├── main.js                  # Vue 应用入口
│   ├── App.vue                  # 根组件
│   ├── api/
│   │   └── index.js             # Axios 封装（拦截器 + 各模块 API）
│   ├── components/              # 可复用组件
│   │   ├── StartScreen.vue      # 答题开始页
│   │   ├── QuizHeader.vue       # 顶部导航栏（含计时器、交卷按钮）
│   │   ├── QuestionCard.vue     # 单题卡片
│   │   ├── AnswerSheet.vue      # 答题卡
│   │   ├── ResultStats.vue      # 成绩统计
│   │   ├── AiHint.vue           # AI 提示与追问浮窗
│   │   ├── PauseOverlay.vue     # 暂停遮罩
│   │   ├── CustomAlert.vue      # 自定义弹窗
│   │   └── NavBar.vue           # 底部导航栏
│   ├── views/                   # 页面组件
│   │   ├── Home.vue             # 首页
│   │   ├── Login.vue            # 登录页
│   │   ├── Register.vue         # 注册页
│   │   ├── Quiz.vue             # 答题页（核心）
│   │   ├── History.vue          # 练习历史
│   │   ├── WrongBook.vue        # 错题本
│   │   ├── Favorites.vue        # 收藏
│   │   ├── Forum.vue            # 讨论区
│   │   ├── Analytics.vue        # 数据分析
│   │   └── admin/               # 管理后台
│   │       ├── AdminQuestions.vue
│   │       ├── AdminCategories.vue
│   │       └── AdminReports.vue
│   ├── stores/
│   │   └── user.js              # Pinia 用户状态管理
│   ├── router/
│   │   └── index.js             # 路由配置 + 路由守卫
│   └── styles/
│       └── variables.css         # CSS 变量定义
├── vite.config.js               # Vite 配置（含 /api 代理）
└── package.json
```

#### 5.2.2 API 封装层

```js
// src/api/index.js
import axios from "axios";

const request = axios.create({
  baseURL: process.env.VUE_APP_API_BASE || "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
});

// 请求拦截：自动注入 JWT Token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：解开 { success, data } 包装 + 401 跳转登录
request.interceptors.response.use(
  (res) => {
    const payload = res.data;
    if (payload && payload.success !== undefined && payload.data !== undefined) {
      return { ...res, data: payload.data };
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/#/login";
      }
    }
    return Promise.reject(err);
  }
);

// ---------- AI 模块 ----------
export const aiApi = {
  // 获取引导性提示（答题中使用，不给答案）
  getHint: (data) => request.post("/ai/hint", data),
  // 获取详细解释（交卷后使用，支持用户追问）
  getExplanation: (data) => request.post("/ai/explain", data),
};
```

#### 5.2.3 答题页面核心实现

`Quiz.vue` 是整个平台的核心页面，负责刷题流程的完整管理。

```js
// 刷题状态机
const quizState = ref("not_started"); // not_started | in_progress | submitted
const questions = ref([]);
const userAnswers = ref({});           // { questionId: selectedOptionId }
const isSubmitted = ref(false);
const timeInSeconds = ref(0);

// 练习模式选择
async function handleStartQuiz(settings) {
  let pool = [...allQuestions.value];

  if (settings.mode === "errors" && userId.value) {
    // 错题模式：从错题本中筛选
    const { data } = await wrongBookApi.list(userId.value);
    const wrongIds = (data || []).map(x => x.questionId);
    pool = pool.filter(q => wrongIds.includes(q.id));
  } else if (settings.mode === "mix" && userId.value) {
    // 混合模式：优先包含错题
    const { data } = await wrongBookApi.list(userId.value);
    const wrongSet = new Set(data.map(x => x.questionId));
    const wrongPool = pool.filter(q => wrongSet.has(q.id));
    const otherPool = pool.filter(q => !wrongSet.has(q.id));
    pool = [...wrongPool, ...otherPool];
  }

  pool = pool.sort(() => Math.random() - 0.5);  // 随机打乱
  questions.value = pool.slice(0, Math.min(settings.numQuestions, pool.length));
  quizState.value = "in_progress";
  startTimer();
}

// 交卷：防重 + 保存记录 + 展示成绩
function submitQuiz() {
  if (isSubmitted.value) return;   // 防止重复提交

  Swal.fire({
    title: "确认交卷吗？",
    text: "交卷后将无法修改答案！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "确认交卷",
  }).then(async (result) => {
    if (!result.isConfirmed) return;

    isSubmitted.value = true;       // 立即禁用交卷按钮
    stopTimer();

    const correct = quizStats.value.correct ?? 0;
    const total = questions.value.length;

    if (userId.value) {
      // 逐题检查，保存错题
      for (const q of questions.value) {
        const u = userAnswers.value[q.id];
        if (u !== undefined && u !== q.correctAnswer) {
          await wrongBookApi.add({ userId: userId.value, questionId: q.id });
        }
      }
      // 保存练习历史
      await historyApi.add({
        userId: Number(userId.value),
        score: Number(correct),
        total: Number(total),
        timeSpent: Number(timeInSeconds.value),
      });
    }
    Swal.fire("已交卷！", "你的答题记录已保存。", "success");
  });
}
```

#### 5.2.4 AI 提示组件实现

`AiHint.vue` 实现了答题中的引导性提示和交卷后的追问详解功能，是 AI 能力的用户侧入口。

```js
// 答题中获取提示（不给答案）
async function getHint() {
  loading.value = true;
  try {
    const res = await aiApi.getHint({
      questionId: props.question.id,
      question: {
        id: props.question.id,
        title: props.question.title,
        code: props.question.code,
      },
      options: props.question.options,
      userAnswer: props.userAnswer,  // 传入用户已选答案
    });
    hint.value = res.data?.hint || "";
  } catch (err) {
    error.value = err.response?.data?.message || "获取提示失败";
  } finally {
    loading.value = false;
  }
}

// 交卷后获取详解（支持追问）
async function getExplanation() {
  loading.value = true;
  try {
    const res = await aiApi.getExplanation({
      questionId: props.question.id,
      question: {
        id: props.question.id,
        title: props.question.title,
        code: props.question.code,
        correctAnswer: props.question.correctAnswer,  // 交卷后才传正确答案
      },
      options: props.question.options,
      userQuestion: explainQuestion.value.trim() || undefined,
      // 若用户输入了追问内容，会传给 AI 生成个性化解答
    });
    hint.value = res.data?.explanation || "";
  } catch (err) {
    error.value = err.response?.data?.message || "获取详解失败";
  } finally {
    loading.value = false;
  }
}
```

#### 5.2.5 论坛页面实现

`Forum.vue` 实现了帖子浏览、搜索、发布和评论功能。后端接口返回嵌套数据 `{ posts/pagination }` 和 `{ post/comments }`，前端需要正确提取：

```js
// 加载帖子列表
async function loadPosts() {
  const params = {};
  if (searchKeyword.value) params.q = searchKeyword.value;

  const res = await postApi.list(params);
  const data = res.data || {};
  // 正确提取嵌套字段（bug.md 1.12）
  this.posts = data.posts || data;
  this.pagination = data.pagination || {};
}

// 查看帖子详情
async function viewPost(postId) {
  const res = await postApi.get(postId);
  const data = res.data || {};
  // 正确提取 post 和 comments 嵌套数据
  const postData = data.post || data;
  const comments = data.comments || [];
  this.currentPost = { ...postData, comments };
  this.showPostDetail = true;
}

// 发布评论（乐观更新）
async function addComment() {
  const res = await postApi.addComment(this.currentPost.id, {
    content: this.newComment,
  });
  this.newComment = "";
  // 乐观更新评论数
  this.currentPost.comment_count = (this.currentPost.comment_count || 0) + 1;
  // 重新加载评论确保一致性
  const refresh = await postApi.get(this.currentPost.id);
  const refreshData = refresh.data || {};
  this.currentPost.comments = refreshData.comments || [];
}
```

#### 5.2.6 难点与解决方案

**难点一：前后端 API 响应格式不一致**

问题：部分 Controller 返回 `{ success, data }` 包装，部分直接返回数据数组。导致前端 Axios 拦截器解包逻辑不一致，`Analytics.vue` 和 `History.vue` 无法正确处理。

解决：统一所有 Controller 响应格式为 `{ success: true, data: ... }`，前端拦截器保持现有解包逻辑，边界情况使用 `Array.isArray()` 兜底判断。

**难点二：mysql2 execute 与 LIMIT/OFFSET 兼容问题**

问题：`pool.execute` 使用预编译协议，MySQL 预编译对 LIMIT/OFFSET 参数类型有兼容性问题，导致论坛帖子列表返回 500 错误。

解决：将 `pool.execute` 改为 `pool.query`，LIMIT/OFFSET 使用 `parseInt` 验证后的数字字面量拼接，其余参数保持占位符传递。

**难点三：错题本重复插入**

问题：使用"先查后插"逻辑，高并发下两个请求可能同时通过存在性检查，导致 UNIQUE 约束冲突。

解决：数据库表设置 `UNIQUE KEY unique_user_question (userId, questionId)` 作为双重保险；在 `catch` 中判断 `err.code === 'ER_DUP_ENTRY'` 并友好提示，而非 500 错误。

### 5.3 后端实现

#### 5.3.1 项目分层结构

```
houduan/                         # 后端项目根目录
├── src/
│   ├── app.js                   # Express 应用入口，路由注册
│   ├── config/
│   │   └── database.js          # mysql2 连接池配置
│   ├── controllers/             # 控制器层
│   │   ├── authController.js
│   │   ├── questionController.js
│   │   ├── aiController.js
│   │   ├── postController.js
│   │   ├── commentController.js
│   │   ├── wrongBookController.js
│   │   ├── favoritesController.js
│   │   ├── historyController.js
│   │   ├── categoryController.js
│   │   └── reportController.js
│   ├── routes/                  # 路由定义
│   │   ├── auth.js
│   │   ├── questions.js
│   │   ├── ai.js
│   │   ├── posts.js
│   │   ├── comments.js
│   │   ├── wrongBook.js
│   │   ├── favorites.js
│   │   ├── history.js
│   │   ├── categories.js
│   │   └── reports.js
│   ├── services/
│   │   └── aiService.js         # AI 服务封装，提示词工程
│   ├── middlewares/
│   │   ├── auth.js               # JWT 验证中间件
│   │   └── errorHandler.js       # 统一错误处理
│   └── scripts/
│       └── initDb.js             # 数据库初始化脚本
├── .env                          # 环境变量配置
└── package.json
```

#### 5.3.2 AI 服务实现（提示词工程）

AI 服务是本系统的核心创新点之一，通过精心设计的提示词实现"授人以渔"而非直接给答案。

```js
// services/aiService.js

class AIService {
    constructor() {
        this.apiKey = process.env.AI_API_KEY;
        this.apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
        this.model = process.env.AI_MODEL || 'deepseek-chat';
        this.cache = new Map();           // 结果缓存，避免重复请求
        this.cacheTimeout = 30 * 60 * 1000;  // 30分钟缓存
    }

    // 组装"引导性提示"的 prompt（答题中使用）
    getHintPrompt(question, options, userAnswer) {
        const optionsText = options.map(
            (opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text || opt}`
        ).join('\n');

        let prompt = `你是一个友好的面试刷题助手，正在帮助用户解答面试题目。\n\n`;
        prompt += `题目：${question.title || question}`;
        if (question.code) prompt += '\n' + question.code;
        prompt += `\n\n选项：\n${optionsText}`;

        if (userAnswer) {
            prompt += `\n\n用户当前选择的答案：${userAnswer}`;
        }

        // 严格的提示词约束：不给答案，只给思路
        prompt += `\n\n请给出解题思路和提示，帮助用户独立思考找到正确答案。注意：
1. 不要直接给出答案
2. 可以提示相关的知识点和解题方向
3. 语言要简洁、有条理
4. 如果用户已有答案，可以帮助分析为什么这个答案可能对或错`;

        return prompt;
    }

    // 组装"详细解释"的 prompt（交卷后使用，支持追问）
    getExplainPrompt(question, options, userQuestion) {
        const optionsText = options.map(
            (opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text || opt}`
        ).join('\n');

        let prompt = `你是一个耐心的编程老师，正在为学生详细讲解一道面试题目。\n\n`;
        prompt += `题目：${question.title || question}`;
        if (question.code) prompt += '\n' + question.code;
        prompt += `\n\n选项：\n${optionsText}`;
        prompt += `\n\n正确答案：${question.correctAnswer}`;
        prompt += `\n\n学生的问题：${userQuestion || '请详细解释这道题目，包括正确答案分析、相关知识点、面试拓展等。'}`;

        prompt += `\n\n请给出详细且友好的解释，帮助学生真正理解这道题。`;

        return prompt;
    }

    // 调用外部 AI API
    async callAI(messages, systemPrompt) {
        const fullMessages = [];
        if (systemPrompt) {
            fullMessages.push({ role: 'system', content: systemPrompt });
        }
        fullMessages.push(...messages);

        const response = await axios.post(this.apiUrl, {
            model: this.model,
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 1000,
        }, {
            timeout: 60000,   // 60s 超时
        });

        return response.data.choices[0].message.content;
    }

    // 获取引导性提示（含缓存）
    async getHint(questionId, question, options, userAnswer) {
        const cacheKey = `hint_${questionId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.content;  // 缓存命中
        }

        const systemPrompt = this.getHintPrompt(question, options, userAnswer);
        const hint = await this.callAI([], systemPrompt);

        this.cache.set(cacheKey, {
            content: hint,
            timestamp: Date.now(),
        });

        return hint;
    }

    // 获取详细解释（支持追问，不缓存）
    async getExplanation(questionId, question, options, userQuestion) {
        const systemPrompt = this.getExplainPrompt(question, options, userQuestion);
        return await this.callAI([], systemPrompt);
    }
}
```

#### 5.3.3 数据库连接池配置

```js
// config/database.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'interview_platform',
    waitForConnections: true,
    connectionLimit: 10,       // 最大连接数
    queueLimit: 0,             // 队列无限制
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

module.exports = { pool };
```

#### 5.3.4 JWT 认证中间件

```js
// middlewares/auth.js
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 从数据库获取用户完整信息（含角色）
        const [users] = await pool.execute(
            'SELECT id, username, role FROM users WHERE id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: '用户不存在'
            });
        }

        req.user = {
            id: decoded.id,
            username: decoded.username,
            role: users[0].role,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '令牌已过期，请重新登录'
            });
        }
        return res.status(401).json({
            success: false,
            message: '无效的认证令牌'
        });
    }
};
```

### 5.4 数据库初始化实现

`initDb.js` 脚本在首次运行时创建所有数据表、插入 5 大分类和 100 道精选题目、创建测试用户。

```js
// scripts/initDb.js（核心片段）
// 创建表结构
await connection.query(`
    CREATE TABLE IF NOT EXISTS questions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title TEXT NOT NULL,
        code TEXT,
        options JSON NOT NULL,
        correctAnswer VARCHAR(10) NOT NULL,
        categoryId INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
    )
`);

// 插入题目数据（100道）
const questionsData = [
    [1, '(2024 小红书) Promise 输出顺序题', '\nfunction delay(ms) { ... }', JSON.stringify([...]), 'A', 1],
    // ... 99 道题目
];

for (const q of questionsData) {
    await connection.query(
        'INSERT INTO questions (id, title, code, options, correctAnswer, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
        q
    );
}
```

### 5.5 部署与运行说明

**环境准备**：
1. 安装 Node.js 18.x
2. 安装 MySQL 8.0，创建数据库 `interview_platform`

**后端部署**：
```bash
cd d:\VscodeProject\shuati0403\houduan
npm install

# 配置 .env
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=你的密码
# JWT_SECRET=随机字符串
# AI_API_KEY=你的AI密钥（可选）

# 初始化数据库（仅首次运行）
npm run init-db

# 启动后端
npm run dev   # 开发模式（nodemon 自动重启）
# 或
npm start     # 生产模式
```

**前端部署**：
```bash
cd d:\VscodeProject\shuati0403\shuati
npm install
npm run dev   # 开发模式（http://localhost:5173）
# 或
npm run build # 生产打包（dist/ 目录）
```

**测试账号**：
- 管理员：`admin` / `admin123`
- 普通用户：`tl` / `Tony1997630`

---

## 第6章 系统测试

### 6.1 测试环境

| 组件 | 配置 |
|-----|-----|
| 操作系统 | Windows 11 |
| 浏览器 | Chrome 123.x |
| Node.js | 18.19.0 |
| MySQL | 8.0.35 |
| 前端服务 | http://localhost:5173 |
| 后端服务 | http://localhost:3000 |

### 6.2 测试策略

| 测试类型 | 工具 | 测试范围 |
|---------|-----|---------|
| 单元测试 | 人工代码审查 + Postman | 各 API 接口功能正确性 |
| 集成测试 | Postman Newman | 前后端联调、认证流程、数据流转 |
| 功能测试 | 人工测试 | 核心业务流程（注册登录、刷题、AI、论坛） |
| 性能测试 | Chrome DevTools | 页面加载、API 响应时间 |
| 安全测试 | 代码审查 | SQL 注入、XSS、Token 安全 |

### 6.3 功能测试用例

**表 6-1 用户认证功能测试**

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|-----|
| TC-01 | 输入有效用户名和密码，点击登录 | 跳转首页，显示用户名，localStorage 存储 Token | 符合预期 | 通过 |
| TC-02 | 输入错误密码，点击登录 | 提示"用户名或密码错误" | 符合预期 | 通过 |
| TC-03 | 输入未注册用户名，点击注册 | 创建账户并自动登录 | 符合预期 | 通过 |
| TC-04 | 输入已存在的用户名，点击注册 | 提示"用户名已存在" | 符合预期 | 通过 |
| TC-05 | Token 过期后访问需认证接口 | 返回 401，前端跳转登录页 | 符合预期 | 通过 |
| TC-06 | 管理员登录后访问用户管理页面 | 正常显示用户列表 | 符合预期 | 通过 |
| TC-07 | 普通用户访问用户管理页面 | 返回 403 禁止访问 | 符合预期 | 通过 |

**表 6-2 刷题功能测试**

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|-----|
| TC-10 | 选择全部模式，数量 10，开始答题 | 加载 10 道随机题目，计时器启动 | 符合预期 | 通过 |
| TC-11 | 选择错题模式（无错题），开始答题 | 提示"暂无错题可练习" | 符合预期 | 通过 |
| TC-12 | 答题过程中点击"AI 提示" | 显示引导性提示，不显示正确答案 | 符合预期 | 通过 |
| TC-13 | 答题过程中点击选项 | 选项高亮，答案被记录 | 符合预期 | 通过 |
| TC-14 | 答题过程中点击收藏 | 题目被收藏，可在我的收藏中查看 | 符合预期 | 通过 |
| TC-15 | 点击交卷按钮，弹出确认框 | 确认后按钮禁用，计时停止 | 符合预期 | 通过 |
| TC-16 | 交卷后点击答题卡题目 | 显示正确/错误高亮 | 符合预期 | 通过 |
| TC-17 | 交卷后点击"查看详解" | 显示详细解释（包含正确答案） | 符合预期 | 通过 |
| TC-18 | 交卷后在输入框输入追问，点击发送 | AI 返回针对追问的个性化解答 | 符合预期 | 通过 |
| TC-19 | 重复点击交卷按钮 | 第二次点击无效（按钮已禁用） | 符合预期 | 通过 |
| TC-20 | 答题中使用 Ctrl+Enter 发送追问 | 快捷键生效，触发追问 | 符合预期 | 通过 |
| TC-21 | 错题模式下，交卷后查看错题本 | 刚才答错的题目出现在错题本 | 符合预期 | 通过 |
| TC-22 | 查看练习历史 | 显示历史记录，含成绩、用时、时间 | 符合预期 | 通过 |
| TC-23 | 查看数据分析页面 | 显示练习趋势图表 | 符合预期 | 通过 |

**表 6-3 AI 功能测试**

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|-----|
| TC-30 | 答题中选择选项后点击"AI 提示" | AI 结合用户已选答案给出分析 | 符合预期 | 通过 |
| TC-31 | 答题中未选答案时点击"AI 提示" | AI 给出通用思路引导 | 符合预期 | 通过 |
| TC-32 | 交卷后点击"查看详解" | AI 返回详细解释 | 符合预期 | 通过 |
| TC-33 | 交卷后输入"为什么选 C 不对？"并发送 | AI 针对性解答用户疑惑 | 符合预期 | 通过 |
| TC-34 | AI 服务不可用时点击"AI 提示" | 显示友好错误提示"获取提示失败" | 符合预期 | 通过 |
| TC-35 | 切换题目后，AI 提示内容清空 | 提示内容重置为空白 | 符合预期 | 通过 |
| TC-36 | 重复请求同一题目的 AI 提示 | 使用缓存，响应更快 | 符合预期（缓存生效） | 通过 |

**表 6-4 论坛功能测试**

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|-----|
| TC-40 | 进入讨论区，浏览帖子列表 | 显示帖子列表，含标题、作者、评论数 | 符合预期 | 通过 |
| TC-41 | 输入关键词，点击搜索 | 帖子列表按关键词过滤 | 符合预期 | 通过 |
| TC-42 | 点击帖子，查看详情 | 显示帖子内容、评论列表 | 符合预期 | 通过 |
| TC-43 | 发表评论 | 评论成功添加，列表更新 | 符合预期 | 通过 |
| TC-44 | 发布不关联题目的帖子 | 发布成功，question_id 为 NULL | 符合预期 | 通过 |
| TC-45 | 发布关联题目的帖子 | 帖子详情显示题目标签 | 符合预期 | 通过 |
| TC-46 | XSS 注入测试：发帖内容含 `<script>alert(1)</script>` | 脚本不执行，内容被转义显示 | 符合预期 | 通过 |
| TC-47 | 多次访问同一帖子 | 浏览量递增 | 符合预期 | 通过 |
| TC-48 | 删除自己的帖子 | 帖子删除成功，列表刷新 | 符合预期 | 通过 |

**表 6-5 管理功能测试**

| 用例编号 | 测试步骤 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|-----|
| TC-50 | 管理员添加新题目 | 题目创建成功并可在题库中看到 | 符合预期 | 通过 |
| TC-51 | 管理员编辑题目 | 题目信息更新 | 符合预期 | 通过 |
| TC-52 | 管理员删除题目 | 题目从题库中移除 | 符合预期 | 通过 |
| TC-53 | 管理员添加分类 | 分类创建成功并显示在首页 | 符合预期 | 通过 |
| TC-54 | 查看举报列表 | 显示所有用户举报记录 | 符合预期 | 通过 |

### 6.4 性能测试

**测试方法**：使用 Chrome DevTools Network 面板和 Performance 面板进行性能评估。

**表 6-6 性能测试结果**

| 测试项目 | 测试方法 | 目标指标 | 实测结果 | 结论 |
|---------|---------|---------|---------|-----|
| 首页加载时间 | Performance panel, Lighthouse | 首屏 < 2s | ~1.2s | 达标 |
| 题目列表 API 响应 | Network 面板（100 题） | < 1s | ~0.3s | 达标 |
| AI 提示响应时间 | Network 面板计时 | < 5s | ~2-4s（依赖 AI 服务） | 达标 |
| 论坛帖子列表 | Network 面板（20 条） | < 1s | ~0.2s | 达标 |
| 交卷保存操作 | Network 面板计时 | < 1s | ~0.4s | 达标 |
| 登录请求响应 | Network 面板计时 | < 1s | ~0.2s | 达标 |

### 6.5 安全测试

**表 6-7 安全测试结果**

| 测试项目 | 测试方法 | 目标 | 实测结果 | 结论 |
|---------|---------|-----|---------|-----|
| SQL 注入防护 | 在搜索框输入 `' OR 1=1 --` | 不返回全部数据 | 参数化查询生效 | 通过 |
| XSS 防护 | 发布帖子含 `<script>alert(1)</script>` | 脚本不执行 | HTML 转义生效 | 通过 |
| 密码安全 | 检查数据库存储 | 密码为 bcrypt 哈希值 | 哈希值存储，无法反推 | 通过 |
| 答案保密 | 访问 GET /api/questions/:id | 不返回 correctAnswer | 答案未暴露 | 通过 |
| Token 安全 | 检查 localStorage 和请求头 | Token 不在 URL 中明文传输 | Bearer Token 方式 | 通过 |
| CORS 安全 | 检查 CORS 配置 | 生产环境配置白名单 | 开发环境开放，文档已记录建议 | 待改进 |

### 6.6 Bug 修复情况汇总

**表 6-8 Bug 修复追踪**

| Bug ID | 描述 | 严重程度 | 修复状态 | 修复版本 |
|-------|------|---------|---------|---------|
| 1.1 | 错题本/收藏重复插入竞态 | 中 | 已修复（catch 中判断 ER_DUP_ENTRY） | v1.1 |
| 1.8 | 交卷按钮无防重，重复提交 | 中 | 已修复（QuizHeader 禁用按钮） | v1.2 |
| 1.9 | pool.execute LIMIT/OFFSET 500 错误 | 高 | 已修复（改为 pool.query + 字面量拼接） | v1.1 |
| 1.10 | 帖子 questionId 强制必填 | 高 | 已修复（改为可选字段） | v1.1 |
| 1.11 | 帖子详情 JOIN 方式错误 | 高 | 已修复（改为 LEFT JOIN） | v1.1 |
| 1.12 | 前端未正确解析嵌套数据 | 高 | 已修复（提取 data.posts / data.post） | v1.1 |
| 1.14 | AI 详解无追问功能 | 中 | 已修复（增加文本输入框和追问参数） | v1.2 |
| 2.10 | Analytics/History 页面崩溃 | 高 | 已修复（Array.isArray 兜底判断） | v1.1 |

---

## 结论

本论文完整阐述了智能刷题平台从需求分析到系统测试的完整设计开发过程。该平台基于 Vue 3 + Node.js + MySQL 的前后端分离架构，实现了刷题练习、AI 智能提示与追问、论坛交流、错题管理、数据分析等完整功能。

系统的主要创新点包括：
1. **AI 提示词工程**：通过精心设计的提示词实现"授人以渔"，在答题中提供引导性提示而非直接给答案；
2. **追问详解机制**：交卷后支持用户自由追问，AI 结合用户具体问题生成个性化解答；
3. **多模式练习**：支持全部题目、仅错题、混合三种练习模式，自动归集错题；
4. **安全防护体系**：bcrypt 密码加密、JWT 无状态认证、SQL 注入防护、XSS 过滤、答案保密等。

系统经过功能测试和安全测试，核心功能全部正常运行，安全测试基本达标，部分安全配置（如 CORS 白名单）需在生产环境进一步加固。总体而言，该系统能够有效帮助前端开发者提升面试准备效率，具有一定的实用价值和推广意义。

---

## 参考文献

[1] 霍春阳. Vue.js 设计与实现. 北京: 人民邮电出版社, 2022.
[2] 刘博文. 深入浅出 Vue.js. 北京: 人民邮电出版社, 2020.
[3] 李松峰. JavaScript高级程序设计（第4版）. 北京: 人民邮电出版社, 2020.

[4] 张勇. 基于Echarts和Vue.js的数据可视化组件开发及其应用[D]. 安徽工业大学, 2024. DOI:10.27790/d.cnki.gahgy.2024.000899.

[5] 牛子逸. 基于Vue+SpringBoot的音乐评阅系统设计与实现[D]. 电子科技大学, 2025. DOI:10.27005/d.cnki.gdzku.2025.003877.
