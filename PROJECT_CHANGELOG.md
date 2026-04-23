# 刷题平台更新日志 / 项目全局记忆

> 本文件是项目的全局记忆核心文档，每次重大更新后在此追加记录。
> FEATURE_ROADMAP.md 侧重功能规划，本文件侧重交付物细节与技术上下文。

---

## 项目基本信息

**仓库路径：** `D:\VscodeProject\shuati0403`

**项目结构：**
```
shuati0403/
├── houduan/                  # Node.js + Express 后端（MySQL）
│   ├── src/
│   │   ├── app.js            # Express 主入口，注册所有路由
│   │   ├── config/database.js # MySQL 连接池
│   │   ├── controllers/       # 控制器层
│   │   ├── routes/            # 路由定义
│   │   ├── services/          # 业务逻辑层（核心）
│   │   ├── scripts/           # 迁移脚本 + 初始化
│   │   └── middleware/
├── shuati/                   # Vue 3 + Vite 前端
│   ├── src/
│   │   ├── api/index.js       # axios 封装 + 全量 API
│   │   ├── components/        # 可复用组件
│   │   ├── views/              # 页面视图
│   │   ├── stores/             # Pinia 状态管理
│   │   └── router/index.js    # Vue Router
└── FEATURE_ROADMAP.md         # 功能规划与路线图
```

**技术栈：**
| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) + Vite |
| 状态管理 | Pinia |
| UI 组件 | 自定义 CSS 设计令牌（`--color-primary` 等） |
| HTTP 客户端 | axios（含 Token 拦截器） |
| 图表库 | ECharts 5.4.3 |
| 弹窗 | SweetAlert2 11.26.1 |
| 后端框架 | Node.js + Express |
| 数据库 | MySQL（连接池：`mysql2/promise`） |
| 认证 | JWT（Bearer Token，存于 `localStorage`） |

**数据库连接：** `houduan/src/config/database.js`，使用 `pool.execute` / `pool.query`

**前后端通信约定：**
- 后端统一响应 `{ success: true, data: ... }` 或 `{ success: false, message: "..." }`
- 前端 `request.interceptors.response` 自动解包 `payload.data`，遇到 401 跳转登录页
- 所有涉及用户资源的接口通过 `userId` 参数区分（GET `?userId=xxx`，POST body `userId`）

---

## 更新记录

### 2026-04-23 签到体验升级

签到卡片升级为「点击弹出日历面板」交互：

- 首页签到卡片点击后弹出 `CheckInCalendar` 弹窗，展示完整月历
- 日历支持月份切换，已签到日期 / 今日 / 未来日期三种状态区分
- 弹窗顶部显示连续天数、累计天数、本月签到次数统计
- 底部激励文案根据连续签到天数动态变化
- 日历弹窗内可直接签到（未签到时）
- 后端 `getCheckInRecord` 新增 `weekCheckInDates`、`monthCheckInDates` 字段

涉及文件：`CheckInCalendar.vue`（新建）、`CheckInCard.vue`（重构）、`learning.js`（store 扩展）、`checkInService.js`（返回月签到数据）

---

### 2026-04-23 学习型讨论区重构

讨论区从"普通帖子+评论区"升级为"围绕题目学习展开的讨论区"：

- 帖子类型：提问/回答/笔记，带图标和颜色区分
- 帖子标签（最多3个）
- 帖子点赞、评论精选/点赞/采纳（帖主可采纳答案）
- 评论排序：采纳 > 精选 > 点赞数 > 时间
- 详情页：关联题目卡片 + 去这道题按钮 + 相关推荐侧边栏
- 发布弹窗：帖子类型选择器 + 标签输入 + 题目关联搜索

详情：`BUG_FIXES.md` — 学习讨论区重构

### 2026-04-23 Bug 修复（第二轮）

**BUG-20240423-005：** 答题后知识图谱数据不更新
- 根因：提交时未保存 `user_answers` 表（知识图谱数据来源）；`allHistory` 等用 `let` 普通数组，Vue 无法追踪变化
- 修复：新建 `userAnswers` 接口；`Quiz.vue` 提交时批量保存作答结果；`Analytics.vue` 数据变量改为 `ref()`

**BUG-20240423-006：** 学习统计页时间筛选不响应
- 根因：同上，`setRange` 调用 `calculateStats` 时 `allHistory` 等仍为空旧值
- 修复：同上

**BUG-20240423-001：** 答题提交 500 错误
- 根因：`addToGoalProgress` 缺少 `count` 参数；保存失败时 `isSubmitted` 已被设为 `true`
- 修复：`learning.js` 加参数校验；`Quiz.vue` 先保存主记录再同步目标，`isSubmitted` 只在成功后设值

**BUG-20240423-002：** 练习模式图标显示 HTML 实体字符串
- 根因：`icon` 字段用 HTML 实体（`&#x1F3AF;`），Vue 不解析
- 修复：改为真实 emoji 字符（`🎯 ❌ 🔀 ⏱️ 📚`）

**BUG-20240423-003：** 知识图谱状态与视觉样式不一致
- 根因：`isWeak` 只看错题本，未练习分类也被套红色边框
- 修复：`isWeak` 视觉绑定加 `&& item.ability !== null` 条件

**BUG-20240423-004：** 知识图谱左侧雷达图区域整块空白
- 根因：无数据时仍初始化空 ECharts；容器无高度；`v-if` 与渲染逻辑不同步
- 修复：加 `hasRadarData` 计算属性；`nextTick` 包裹初始化；容器固定高度；空状态改 SVG 占位

---

### 2026-04-22 第二阶段功能迭代

#### 1. 练习模式增强

**数据库变更：**
- `practice_history` 表新增 `mode` VARCHAR(20) 字段
- 迁移脚本：`houduan/src/scripts/migrate_practice_mode.sql`
- 支持模式值：`normal` | `errors` | `mix` | `challenge` | `review`
- 已有记录默认 `mode = 'normal'`

**后端：**
| 文件 | 说明 |
|------|------|
| `src/controllers/historyController.js` | 接收并保存 `mode` 字段 |
| `src/app.js` | 注册路由 |

**前端：**
| 文件 | 说明 |
|------|------|
| `src/components/StartScreen.vue` | 5种模式卡片 UI |
| `src/components/QuizHeader.vue` | 模式标签 badge + 挑战警告 |
| `src/views/Quiz.vue` | 模式逻辑、超时自动交卷、mode 保存 |

**模式行为：**
| mode | 行为 |
|------|------|
| `normal` | 随机抽题，正常提交 |
| `errors` | 优先从错题本抽取 |
| `mix` | 错题+新题各半 |
| `challenge` | 固定5题，支持 1/2/3/5 分钟限时，超时 SweetAlert 2s 后自动交卷 |
| `review` | 提交后直接展示答案，跳过确认弹窗 |

---

#### 2. 知识图谱 / 能力雷达图

**后端：**
| 文件 | 说明 |
|------|------|
| `src/services/analysisService.js` | 核心分析逻辑（纯聚合计算，无新表） |
| `src/controllers/analysisController.js` | 知识图谱 + 推荐接口 |
| `src/routes/analysis.js` | `GET /api/analysis/ability` |

**数据来源（纯聚合）：**
- `user_answers` — 答题记录（`is_correct`）
- `questions` — 题目（含 `categoryId`）
- `categories` — 分类
- `wrong_book` — 错题本（用于识别薄弱分类）

**能力值算法：** `ability = (correct / total) * 100`，若无做题记录则为 `null`

**前端：**
| 文件 | 说明 |
|------|------|
| `src/views/Analytics.vue` | ECharts 雷达图 + 分类掌握度进度条 + 薄弱分类红色卡片 |
| `src/api/index.js` | 新增 `analysisApi.getAbility` |

---

#### 3. 题目详情页

**后端：**
| 文件 | 说明 |
|------|------|
| `src/controllers/questionController.js` | 新增 `getQuestionDetail` 聚合方法 |
| `src/routes/questions.js` | 新增 `GET /api/questions/:id/detail` |

**聚合返回字段：** `id, title, code, options, correctAnswer, categoryId, relation{ inWrongBook, inFavorites, bestResult, attemptCount }, similarQuestions[], relatedPosts[]`

**前端：**
| 文件 | 说明 |
|------|------|
| `src/views/QuestionDetail.vue` | 详情页（题目/选项/答案/用户状态/相似题/相关帖子/操作按钮） |
| `src/api/index.js` | 新增 `questionApi.getDetail` |
| `src/router/index.js` | 注册路由 `path: "question/:id"` |

**路由：** `/question/:id`

**入口：** 首页推荐题 → 详情页；收藏页/错题本 → 详情页

---

#### 4. 首页个性化推荐

**后端：**
| 文件 | 说明 |
|------|------|
| `src/services/analysisService.js` | `getHomeRecommendations()` + `analyzePracticeMode()` |
| `src/routes/analysis.js` | `GET /api/analysis/recommendations` |

**推荐策略（规则推荐，无推荐引擎）：**
1. 薄弱分类：错题本中错题最多 + 正确率最低的分类（最多3个）
2. 推荐练习模式：近期5次正确率均值 <50%→`errors`，50-80%→`mix`，>80%→`challenge`
3. 近期错题推荐：错题本最近3道
4. 收藏题目推荐：收藏中最近3道

**前端：**
| 文件 | 说明 |
|------|------|
| `src/api/index.js` | 新增 `analysisApi.getRecommendations` |
| `src/views/Home.vue` | "为你推荐"模块（模式推荐卡片 + 薄弱分类列表 + 错题复习） |

---

### 2026-04-22 第一阶段功能迭代（已上线）

#### 界面现代化升级
- 全局 CSS 设计令牌（`--color-primary: #2D6A4F` 等）
- 导航栏重构（脉冲动画 Logo、用户下拉菜单）
- 首页重构为学习工作台（Hero区 + 概览卡 + 快速开始 + 学习概览 + 推荐区 + 论坛预览）

#### 学习打卡系统
- 数据库：`check_ins` 表（`user_id`, `checkin_date UNIQUE`, `streak_days`, `total_days`）
- 路由：`POST/GET /api/checkIn`
- `Home.vue` 签到卡片驱动

#### 学习目标系统
- 数据库：`study_goals` 表（`user_id`, `type(daily/weekly)`, `target_count`, `current_count`）
- 路由：`GET/POST /api/goals`，`PATCH /api/goals/:id/progress`
- `Home.vue` 目标进度驱动，`Quiz.vue` 提交时通过 `addToGoalProgress` 同步

#### 专题练习系统
- 数据库：`topics` + `topic_questions`（多对多，`UNIQUE(topic_id, question_id)`）
- `topicService.js`：完整 CRUD + 题目增删排 + 专题练习模式 `?mode=topic&topicId=xxx`
- `Topics.vue`：完整 UI

---

## 已完成的数据库表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `users` | 用户 | id, username, password, role, avatar, created_at |
| `categories` | 分类 | id, name |
| `questions` | 题目 | id, title, code, options(JSON), correctAnswer, categoryId, created_at |
| `user_answers` | 答题记录 | id, user_id, question_id, is_correct, created_at |
| `wrong_book` | 错题本 | id, userId, questionId, created_at |
| `favorites` | 收藏 | id, userId, questionId, created_at |
| `practice_history` | 练习记录 | id, userId, mode, score, total, timeSpent, createdAt |
| `check_ins` | 每日签到 | id, user_id, checkin_date(UNIQUE), streak_days, total_days, created_at |
| `study_goals` | 学习目标 | id, user_id, type, target_count, current_count, status, created_at |
| `topics` | 专题 | id, user_id, name, description, question_count, created_at |
| `topic_questions` | 专题-题目 | topic_id, question_id(UNIQUE), sort_order |
| `posts` | 论坛帖子 | id, user_id, question_id, title, content, view_count, created_at |
| `comments` | 帖子评论 | id, post_id, user_id, content, created_at |
| `reports` | 举报记录 | id, user_id, type, target_id, reason, created_at |

---

## 全量 API 路由清单（当前版本）

### 认证
- `POST /api/auth/register`
- `POST /api/auth/register/admin`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/users`
- `PATCH /api/auth/users/:userId/role`
- `DELETE /api/auth/users/:userId`

### 题目
- `GET /api/questions`（支持 `q` 关键词、`categoryId` 筛选）
- `GET /api/questions/:id`
- `GET /api/questions/:id/detail` ← 新增
- `POST /api/questions`
- `PATCH /api/questions/:id`
- `DELETE /api/questions/:id`

### 分类
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

### 错题本
- `GET /api/wrongBook`（`?userId=xxx`）
- `POST /api/wrongBook`
- `DELETE /api/wrongBook/:id`

### 收藏
- `GET /api/favorites`（`?userId=xxx`）
- `POST /api/favorites`
- `DELETE /api/favorites/:id`

### 练习历史
- `GET /api/practiceHistory`（`?userId=xxx`）
- `POST /api/practiceHistory`（含 `mode` 字段）

### 分析（新增）
- `GET /api/analysis/ability`（`?userId=xxx`）← 知识图谱
- `GET /api/analysis/recommendations`（`?userId=xxx`）← 首页推荐

### 每日签到
- `GET /api/checkIn`（`?userId=xxx`）— 返回 `weekCheckInDates`、`monthCheckInDates`
- `POST /api/checkIn`（`{ userId }`）

### 论坛
- `GET /api/posts`（`?q=` `?post_type=`）
- `GET /api/posts/:id`
- `GET /api/posts/:postId/comments`
- `POST /api/posts`
- `PATCH /api/posts/:postId`
- `DELETE /api/posts/:postId`
- `POST /api/posts/:postId/like` ← 新增
- `POST /api/posts/:postId/comments`（`{ content }`）
- `DELETE /api/posts/:postId/comments/:commentId`
- `PATCH /api/posts/:postId/comments/:commentId/like` ← 新增
- `PATCH /api/posts/:postId/comments/:commentId/accept` ← 新增
- `PATCH /api/posts/:postId/comments/:commentId/highlight` ← 新增

### 学习目标
- `GET /api/goals`（`?userId=xxx`）
- `POST /api/goals`
- `PATCH /api/goals/:id`
- `PATCH /api/goals/:id/progress`

### 专题
- `GET /api/topics`（`?userId=xxx`）
- `GET /api/topics/:id`（`?userId=xxx`）
- `POST /api/topics`
- `PATCH /api/topics/:id`
- `DELETE /api/topics/:id`（`?userId=xxx`）
- `POST /api/topics/:id/questions`（`{ questionId, userId }`）
- `DELETE /api/topics/:id/questions/:questionId`（`?userId=xxx`）
- `PATCH /api/topics/:id/reorder`

### 论坛
- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments`
- `DELETE /api/posts/:id/comments/:commentId`

### AI
- `POST /api/ai/hint`
- `POST /api/ai/explain`

### 举报
- `GET /api/reports`
- `POST /api/reports`
- `DELETE /api/reports/:id`

---

## 前端路由清单

| 路径 | 视图组件 |
|------|---------|
| `/` | Login |
| `/register` | Register |
| `/home` | Home |
| `/quiz` | Quiz（`?mode=` `normal`\|`errors`\|`mix`\|`challenge`\|`review`；`?categoryId=xxx`；`?mode=topic&topicId=xxx`） |
| `/question/:id` | QuestionDetail ← 新增 |
| `/wrongbook` | WrongBook |
| `/favorites` | Favorites |
| `/history` | History |
| `/analytics` | Analytics |
| `/forum` | Forum |
| `/topics` | Topics |
| `/admin/*` | AdminLayout |

---

## 关键前端 API 函数（src/api/index.js）

```javascript
authApi        // login, register, me, getUsers, updateUserRole, deleteUser
categoryApi    // list, get, create, update, remove
questionApi    // list, listByCategory, search, get, create, update, remove
               // + getDetail(id, userId) ← 扩展方法
wrongBookApi   // list, add, remove, removeByUserAndQuestion
favoritesApi   // list, add, remove, removeByUserAndQuestion
historyApi     // list, add
analysisApi    // getAbility, getRecommendations ← 新增
checkInApi     // getRecord, checkIn
goalApi        // getGoal, setGoal, updateGoal, addProgress
topicApi       // list, get, create, update, remove, addQuestion, removeQuestion, reorderQuestions
postApi        // list, get, create, update, remove, getComments, addComment, removeComment
               // + toggleLike, toggleCommentLike, toggleAccept ← 新增
aiApi          // getHint, getExplanation
reportApi      // list, add, remove
```

---

## 项目启动方式

```bash
# 后端（端口 3000）
cd d:\VscodeProject\shuati0403\houduan
node src/app.js

# 前端（端口 8080）
cd d:\VscodeProject\shuati0403\shuati
npm run serve

# 数据库迁移（如需）
cd d:\VscodeProject\shuati0403\houduan
node src/scripts/migrate_practice_mode.js
node src/scripts/migrate_learning.js
```

---

*每次完成新功能后，请在本文件「更新记录」区域追加，并同步更新 FEATURE_ROADMAP.md。*
