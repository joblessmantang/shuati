# 刷题平台功能拓展维护文档

> 本文件记录所有已完成的功能改造和待拓展功能清单。
> 后续新增功能请在此文件的相关区域追加记录。
> 最后更新：2026-04-27

---

## 一、已完成改造（已上线）

### 1.7 首页功能增强集（2026-04-25）

本模块包含 7 个互不干扰的首页增强功能，均以"即插即用"方式接入，不破坏现有首页结构。

#### 1.7.1 公告栏 / 活动横幅

**后端实现：**
- 新增 `src/scripts/migrate_home_features.js`：幂等迁移脚本，一次运行创建全部新表
- 新增 `announcements` 表（`id`, `title`, `content`, `type` enum[notice/promo/event], `priority`, `start_date`, `end_date`, `is_pinned`, `created_by`）
- 新增 `GET /api/announcements`：返回有效期内公告，按置顶+优先级排序
- 种子数据：2 条演示公告（欢迎通知 + 本周专题活动）

**前端实现：**
- 新增 `src/components/AnnouncementBanner.vue`：
  - 位于 Hero 区最顶部，优先于所有内容
  - 支持多公告轮播（左右箭头+底部圆点指示器）
  - 右上角关闭按钮，关闭记录存 localStorage，24h 不重复展示
  - 公告类型区分颜色：通知（绿色）/ 活动（紫色）/ 促销（橙色）
  - 未登录用户同样可见

**接口变更：**
- `GET /api/announcements` 返回 `{ success, data: [...] }`

---

#### 1.7.2 全局搜索增强

**后端实现：**
- 新增 `src/routes/search.js`：`GET /api/search?q=xxx&type=all`
- 聚合搜索：题目（最多 10 条）+ 资料（最多 5 条）+ 帖子（最多 5 条）
- 支持按 `type` 参数过滤（questions / resources / posts / all）
- 复用现有 LIKE 查询，无需新表

**前端实现：**
- `NavBar.vue`：搜索框回车改为跳转到 `/search`（原跳 `/quiz`）
- 新增 `src/views/SearchResults.vue`：
  - 搜索框（带 Debounce 300ms 实时搜索）
  - 4 个 Tab：全部 / 题目 / 资料 / 帖子
  - 结果高亮分类展示，每条可点击跳转
  - 空状态 / 无结果 / Loading 状态

**接口变更：**
- `GET /api/search?q=xxx` 返回 `{ success, data: { questions, resources, posts } }`

---

#### 1.7.3 最近访问记录

**后端实现：**
- 无需后端改动——直接复用 `practiceHistory` API 数据

**前端实现：**
- 新增 `src/components/RecentVisits.vue`：
  - 位于学习概览区（`overview-section`）底部
  - 横向滚动卡片列表，最多展示最近 5 条练习记录
  - 每条显示：时间 / 题目数 / 正确率（颜色区分：绿/黄/红）
  - 点击跳转到历史记录页

---

#### 1.7.4 消息中心

**后端实现：**
- 新增 `messages` 表（`id`, `user_id`, `type` enum[reply/like/system], `title`, `content`, `is_read`, `related_id`, `related_type`）
- 新增 4 个接口：
  - `GET /api/messages?page=1`：分页消息列表
  - `GET /api/messages/unread-count`：未读数
  - `PATCH /api/messages/:id/read`：标记单条已读
  - `PATCH /api/messages/read-all`：全部已读

**前端实现：**
- 新增 `src/components/MessageBadge.vue`：
  - 放置于 NavBar 搜索框右侧
  - 铃铛图标 + 右上角红色未读数字角标（最多显示 99+）
  - 点击展开消息面板（最新 5 条），支持一键全部已读
  - 30s 轮询未读数
  - 每条消息类型区分图标（回复/点赞/系统）
- 新增 `src/views/Messages.vue`：消息中心完整页，支持 Tab 分类 + 分页

**接口变更：**
- `GET /api/messages`、`/api/messages/unread-count`、`PATCH /api/messages/:id/read`、`PATCH /api/messages/read-all`

---

#### 1.7.5 个人主页 / 学习报告

**后端实现：**
- 无需新建接口——复用 `practiceHistory`、`wrongBook`、`favorites`、`analysis/ability`、`analysis/recommendations`

**前端实现：**
- 新增 `src/views/Profile.vue`：
  - 用户信息卡（头像+用户名+角色+加入时间）
  - 4 格统计数据：累计刷题 / 近期正确率 / 连续签到 / 收藏数
  - 能力雷达图（ECharts，调用 `analysis/ability` 数据）
  - 薄弱点分析（红色进度条，可点击跳转到分类练习）
  - 最近活动时间线（练习记录）
  - "去刷题"按钮
- 路由：`/profile`

---

#### 1.7.6 主题切换（浅色 / 深色）

**后端实现：**
- `users` 表新增 `theme ENUM('light','dark') DEFAULT 'light'` 字段
- `authController.js`：登录/注册/`/me` 接口均返回 `theme` 字段
- 新增 `PATCH /api/auth/theme`：切换主题偏好（需要认证）

**前端实现：**
- `src/stores/user.js`：新增 `isDark`、`theme` getter + `setTheme` action
- `App.vue`：新增 `.dark-mode` CSS 变量集（深色背景 #0F1419 / #1C2733，绿色品牌色加深）
- `NavBar.vue`：
  - 用户下拉菜单新增"浅色模式/深色模式"切换按钮
  - 头像旁增加消息角标（`MessageBadge` 组件）
  - 主题切换后同步更新 `<html data-theme>` 属性
- 个人主页 Profile 顶部也支持一键切换主题

---

#### 1.7.7 反馈建议入口

**后端实现：**
- 新增 `feedbacks` 表（`id`, `user_id`, `type` enum[bug/suggestion/other], `content`, `contact`, `status`）
- 新增 `POST /api/feedbacks`：提交反馈（支持匿名，登录用户自动关联 userId）

**前端实现：**
- 新增 `src/components/FeedbackModal.vue`：
  - 弹窗表单：反馈类型选择（功能建议/问题反馈/其他）+ 文本域（1000 字限制）+ 联系方式选填
  - 提交后 SweetAlert2 成功提示
- `Home.vue`：论坛预览区底部加"意见反馈"文字链接（虚线分隔）

---

## 首页新结构（2026-04-25 更新）：
```
公告横幅（AnnouncementBanner） ← 新增，Hero 顶部，优先级最高
Hero 欢迎区（深绿渐变）
├─ 问候语 + 副文案
├─ 开始刷题 / 继续上次练习 按钮
└─ 右侧学习面板（登录用户）
   ├─ 每日签到卡片
   ├─ 学习目标进度卡片
   ├─ 智能下一步建议卡片
   └─ 用户资料卡（头像+用户名+角色）

快速开始区（4张彩色卡）
├─ 开始新练习（绿色）
├─ 错题重做（红色）
├─ 混合练习（蓝色）
└─ 随机一题（橙色）

学习概览区（双面板）
├─ 最近一次练习
├─ 本周摘要 + 成绩圆点趋势图
└─ 最近访问记录 ← 新增（横向滚动卡片）

推荐学习区
├─ 分类卡片网格
└─ 今日推荐题目

交流广场（论坛预览）
└─ 最近帖子列表 + 意见反馈入口 ← 新增（底部链接）

NavBar 新增：
├─ 搜索框（增强 → SearchResults 页面）
├─ 消息角标（MessageBadge） ← 新增
└─ 用户下拉菜单（个人主页/消息/主题切换） ← 增强
```

---

### 1.8 JS 代码题（2026-04-24）

**设计原则：**
- 不改 `questions` 主表结构，新增 `question_js_code` 扩展表
- 复用现有 `question.id` 主键，收藏/错题本/历史记录无需改动
- 复用现有 `categoryId` 分类体系
- 第一阶段支持：选择题模式（选输出结果）和填空题模式（填执行结果）

**数据库变更：**
- `questions` 表新增 `question_type ENUM('normal','js_code') DEFAULT 'normal'` 字段
- 新建 `question_js_code` 扩展表：
  - `question_id` UNIQUE（1:1 关联主表）
  - `code_snippet`：代码片段（核心内容）
  - `answer_mode`：作答模式（`select`/`fill`）
  - `explanation`：解析说明
  - `difficulty`：难度 1-3
  - `knowledge_points`：知识点标签（逗号分隔）

**后端实现：**
- `src/scripts/migrate_js_code_question.sql`：DDL 迁移脚本
- `src/scripts/migrate_js_code_question.js`：幂等迁移运行脚本
- `src/scripts/seedJsCodeQuestions.sql`：7 道演示代码题
- `src/controllers/questionController.js`：
  - `getAllQuestions`：附加 `question_type` 和 `jsCodeMeta`，支持 `questionType` 参数过滤
  - `getQuestionById`：附加 `jsCodeMeta` 完整信息
  - `getQuestionDetail`：同步附加代码题信息
  - `create`/`update`/`remove`：支持写入和联动管理扩展表

**前端实现：**
- `src/components/QuestionCard.vue`：
  - 检测 `question_type === 'js_code'` 展示专属样式
  - 深色代码区域（VS Code 风格），知识点标签
  - 选择题模式：同普通题展示选项
  - 填空题模式：文本输入框交互
  - 交卷后显示解析说明
- `src/views/admin/AdminQuestions.vue`：
  - 列表页新增"类型"列和按类型筛选
  - 表单新增题目类型选择（普通题 / JS 代码题）
  - 代码题专属表单：代码片段 / 作答模式 / 难度 / 知识点 / 解析说明
  - 普通题与代码题表单字段随类型切换动态变化

**接口变更：**
- `GET /api/questions` 新增 `question_type`、`jsCodeMeta` 字段
- `GET /api/questions/:id` 新增 `question_type`、`jsCodeMeta` 字段
- `GET /api/questions/:id/detail` 新增 `question_type`、`jsCodeMeta` 字段
- `POST/PATCH /api/questions` 支持 `question_type` 和 `jsCodeMeta` 参数

**联调步骤：**
```bash
# 1. 运行迁移脚本（只需一次）
cd d:\VscodeProject\shuati0403\houduan
node src/scripts/migrate_js_code_question.js

# 2. 运行 seed 数据（可选）
mysql -u root -p interview_platform < src/scripts/seedJsCodeQuestions.sql

# 3. 重启后端
node src/index.js

# 4. 重启前端
cd ../shuati && npm run serve
```

---

### 1.2 用户头像功能（2026-04-24）

**设计原则：**
- 不改动现有登录/用户体系，新增 `avatar_url` 字段即全部增量
- 默认头像纯前端生成，不依赖后端图片文件
- 上传头像复用现有 multer 中间件，存 `uploads/avatars/`
- 抽离 `UserAvatar.vue` 统一组件，避免多处重复实现

**数据库变更：**
- `users` 表新增 `avatar_url VARCHAR(500) DEFAULT NULL` 字段

**后端实现：**
- `src/controllers/authController.js`：
  - `register`：新用户返回 `avatar_url: null`
  - `login`：返回 `avatar_url` 字段
  - `getCurrentUser`（`GET /auth/me`）：返回 `avatar_url`
  - `getUsers`（`GET /auth/users`）：返回 `avatar_url`
  - 新增 `uploadAvatar` 方法（multer 头像上传，限制 2MB，支持 jpg/png/webp/gif）
- `src/routes/auth.js`：新增 `POST /api/auth/avatar` 路由
- `src/controllers/postController.js`：
  - 帖子列表 JOIN 新增 `u.avatar_url as author_avatar`
  - 帖子详情 JOIN 新增 `u.avatar_url as author_avatar`
  - 评论列表 JOIN 新增 `u.avatar_url as author_avatar`

**前端实现：**
- 新增 `src/components/UserAvatar.vue`：
  - Props：`username`（必填）、`avatarUrl`（可选）、`size`（sm/md/lg/xl/number）
  - `avatarUrl` 有值：显示 `<img>` 标签（支持相对/绝对 URL）
  - `avatarUrl` 为空/null：显示默认首字符头像（英文转大写，中文原样显示，异常显示 `?`）
  - 颜色映射：基于 username 字符码哈希，8 种预设柔和渐变色
  - 支持 `img @error` 回退机制
- `src/api/index.js`：`authApi.uploadAvatar(formData)` 新增方法
- `src/components/NavBar.vue`：用 `UserAvatar` 替换原有 `.user-avatar` 首字符逻辑
- `src/views/Forum.vue`：帖子列表作者区用 `UserAvatar` 替换 `.avatar-sm`
- `src/components/ForumPostDetail.vue`：帖子详情 + 评论用 `UserAvatar` 替换 `.avatar`
- `src/views/admin/AdminUsers.vue`：表格新增"头像"列，`UserAvatar` 展示
- `src/views/Home.vue`：
  - Hero 右侧新增用户资料卡（含用户名/角色）
  - 资料卡内头像支持点击上传（`<label>` 包裹 `<input type=file>`）
  - 上传成功后更新 store 和 localStorage 中的 `user.avatar_url`

**接口变更：**
- `POST /api/auth/avatar`：上传头像（FormData，单字段 `avatar`），返回 `{ avatar_url }`
- 登录/注册/`/me`/`/users` 响应均新增 `avatar_url` 字段
- 帖子/评论接口返回新增 `author_avatar` 字段

**默认头像颜色映射（8种）：**

| 序号 | 渐变色 | 风格 |
|---|---|---|
| 1 | #2D6A4F → #40916C | 品牌绿 |
| 2 | #3B82F6 → #60A5FA | 蓝色 |
| 3 | #8B5CF6 → #A78BFA | 紫色 |
| 4 | #EC4899 → #F472B6 | 粉色 |
| 5 | #F59E0B → #FCD34D | 橙黄 |
| 6 | #10B981 → #6EE7B7 | 青绿 |
| 7 | #EF4444 → #FCA5A5 | 红色 |
| 8 | #0EA5E9 → #38BDF8 | 天蓝 |

---

### 1.3 界面现代化升级（2026-04-22）

**改造范围：**

| 文件 | 改造内容 |
|------|---------|
| `src/App.vue` | 设计令牌（CSS 变量）补全、全局工具类（`.card` `.btn` `.tag` `.section-*` `.empty-state` 等） |
| `src/components/NavBar.vue` | 导航项补全（收藏/历史）、SVG Logo、刷题入口强化（脉冲动画）、搜索框胶囊化、用户下拉菜单重构 |
| `src/views/Home.vue` | 完全重构为学习工作台：Hero区 + 概览卡 + 快速开始 + 学习概览 + 推荐区 + 论坛预览 |
| `src/views/Forum.vue` | 按钮样式对齐全局配色、卡片悬停动效、搜索框、标签色升级 |
| `src/views/admin/AdminUsers.vue` | 角色徽章、禁用按钮样式对齐全局设计 |

**首页新结构（2026-04-25 更新）：**
```
Hero 欢迎区（深绿渐变）
├─ 问候语 + 副文案
├─ 开始刷题 / 继续上次练习 按钮
└─ 右侧学习面板（登录用户）
   ├─ 每日签到卡片
   ├─ 学习目标进度卡片
   ├─ 智能下一步建议卡片 ← 新增
   └─ 用户资料卡（头像+用户名+角色）

快速开始区（4张彩色卡）
├─ 开始新练习（绿色）
├─ 错题重做（红色）
├─ 混合练习（蓝色）
└─ 随机一题（橙色）

学习概览区（双面板）
├─ 最近一次练习：时间/题数/对错/用时/正确率
└─ 本周摘要 + 成绩圆点趋势图

推荐学习区
├─ 分类卡片网格（彩色图标）
└─ 今日推荐题目（3道，标签+难度+立即作答）

交流广场（论坛预览）
└─ 最近3帖 + 浏览/评论数
```

**导航栏新结构：**
```
刷题助手  [刷题·] [错题本] [收藏] [历史] [统计] [论坛]   🔍搜索   [头像用户名 ▼]
                                                              ├─ 个人中心
                                                              ├─ 管理后台（仅管理员）
                                                              └─ 退出登录
```

---

### 1.4 第二阶段增强功能（2026-04-22）

#### 1.4.1 知识图谱 / 能力雷达图

**后端实现：**
- 新增 `src/services/analysisService.js`：分类能力聚合计算（基于 `user_answers` + `questions` + `categories`）
- 新增 `src/controllers/analysisController.js`
- 新增 `src/routes/analysis.js`，注册路由 `GET /api/analysis/ability`
- 接口：`GET /api/analysis/ability?userId=xxx`，返回各分类的 `total / correct / ability(%) / isWeak`
- 无需新建表，纯聚合计算

**前端实现：**
- `src/views/Analytics.vue`：新增能力雷达图（ECharts radar）、分类掌握度列表、薄弱分类卡片
- 雷达图展示各分类掌握程度，颜色为品牌绿色
- 薄弱分类高亮红色，可直接跳转到对应分类练习

**数据库变更：**
- 无新表，`practice_history` 新增 `mode` 字段（见 1.2.2）

---

#### 1.4.2 练习模式增强

**数据库变更：**
- `practice_history` 表新增 `mode` VARCHAR(20) 字段（SQL：`migrate_practice_mode.sql`）
- 支持模式：`normal` | `errors` | `mix` | `challenge` | `review`
- 为已存在记录设置默认值 `normal`

**后端实现：**
- `src/controllers/historyController.js`：历史记录保存时支持 `mode` 参数
- 模式通过 `POST /api/practiceHistory` 的 body 参数传递

**前端实现：**
- `src/components/StartScreen.vue`：5种练习模式卡片选择（普通/错题/混合/计时挑战/背题）
  - 普通练习：`mode=normal`，随机抽题
  - 错题练习：`mode=errors`，优先从错题本抽取
  - 混合练习：`mode=mix`，错题+新题各半
  - 计时挑战：`mode=challenge`，固定5题，限时（1/2/3/5分钟），超时常醒自动交卷
  - 背题模式：`mode=review`，提交后直接展示答案，无需确认
- `src/components/QuizHeader.vue`：新增模式标签（彩色badge）、挑战模式限时警告（红色闪烁）
- `src/views/Quiz.vue`：
  - 支持挑战模式超时自动交卷（SweetAlert 2s 后自动触发）
  - 提交时将 `mode` 字段传给后端
  - 背题模式跳过确认交卷弹窗

---

#### 1.4.3 题目详情页

**后端实现：**
- `src/controllers/questionController.js`：新增 `getQuestionDetail` 方法
- 新增路由 `GET /api/questions/:id/detail?userId=xxx`
- 聚合返回：题目信息 + 用户关系状态（收藏/错题/作答历史）+ 相似题（同分类）+ 相关帖子

**前端实现：**
- 新增 `src/views/QuestionDetail.vue`：
  - 题目基本信息 + 选项展示
  - "查看答案"按钮（保护答案隐私）
  - 右侧边栏：用户学习状态（收藏/错题/作答次数/最近结果）
  - 相似题推荐（同分类题目，最多5道）
  - 相关帖子入口（关联本题的论坛帖子）
  - 操作按钮：收藏/加入错题本/练习本类题目
- `src/router/index.js`：注册路由 `path: "question/:id"`
- 入口：首页推荐题 → 详情页；收藏页/错题本 → 详情页

---

#### 1.4.4 首页个性化推荐

**后端实现：**
- `src/services/analysisService.js`：`getHomeRecommendations()` 方法实现规则推荐
- 新增路由 `GET /api/analysis/recommendations?userId=xxx`
- 推荐策略：
  1. 薄弱分类（错题最多 + 正确率最低的分类）
  2. 推荐练习模式（基于近期正确率：<50%→错题模式，50-80%→混合，>80%→挑战）
  3. 近期错题推荐（错题本最近3道）
  4. 收藏题目推荐（收藏中最近3道）

**前端实现：**
- `src/api/index.js`：新增 `analysisApi`（`getAbility` + `getRecommendations`）
- `src/views/Home.vue`：
  - 登录用户新增"为你推荐"模块（位于概览区和推荐区之间）
  - 练习模式推荐卡片：显示推荐模式 + 原因 + 立即开始按钮
  - 薄弱分类列表：红色边框，点击跳转分类练习
  - 需要复习的题目列表：链接到题目详情页
  - 今日推荐题目卡片：从"立即作答"改为"查看详情"链接

---

### 1.5 学习激励系统（2026-04-22）

**数据库变更：**
- 新增 `check_ins` 表（`user_id`, `checkin_date(UNIQUE)`, `streak_days`, `total_days`）
- 新增 `study_goals` 表（`user_id`, `type(daily/weekly)`, `target_count`, `current_count`, `status`）
- 新增 `topics` + `topic_questions` 表（专题 CRUD + 题目管理）
- 迁移脚本：`houduan/src/scripts/migrate_learning.js`（幂等）

**后端实现：**

| 文件 | 说明 |
|------|------|
| `src/services/checkInService.js` | 签到逻辑（连续签到计算） |
| `src/services/goalService.js` | 学习目标 CRUD + 进度追加 |
| `src/services/topicService.js` | 专题 CRUD + 题目增删排 |
| `src/controllers/checkInController.js` | 签到控制器 |
| `src/controllers/goalController.js` | 学习目标控制器（含 `addProgress`） |
| `src/controllers/topicController.js` | 专题控制器 |
| `src/routes/checkIn.js` | `GET/POST /api/checkIn` |
| `src/routes/goals.js` | `GET/POST/PATCH /api/goals`，`PATCH /api/goals/:id/progress` |
| `src/routes/topics.js` | 专题 CRUD + 题目管理全套路由 |
| `src/app.js` | 注册 3 组新路由 |

**前端实现：**

| 文件 | 说明 |
|------|------|
| `src/api/index.js` | 新增 `checkInApi`、`goalApi`（含 `addProgress`）、`topicApi` |
| `src/stores/learning.js` | `addToGoalProgress` 改为异步同步后端 |
| `src/views/Home.vue` | 签到卡片 + 目标进度 + 专题入口 |
| `src/views/Favorites.vue` | 选中收藏 → 创建专题 |
| `src/views/Topics.vue` | 专题完整 CRUD + 题目增删排 + 开始练习 |
| `src/views/Quiz.vue` | `?mode=topic&topicId=xxx` 专题练习模式 |

**前后端联动关键点：**
- `Home.vue`：签到卡片、目标进度、专题入口全部由对应 API 驱动
- `Favorites.vue`：选中收藏 → 创建专题，自动写入 `topic_questions`
- `Topics.vue`：完整 CRUD + 题目增删排 + 开始练习
- `Quiz.vue`：`?mode=topic&topicId=xxx` 模式加载专题题目；练习提交后通过 `addToGoalProgress` 异步同步到后端目标进度

**种子数据：** 4天连续签到记录（用户 tl）、每日目标 20 题（8/20）、每周目标 100 题（35/100）、专题2个

### 1.6 首页智能下一步建议卡片（2026-04-25）

**设计原则：**
- 前端纯计算，不改后端
- 替换 Hero 右侧面板的空白区域，利用现有数据驱动
- 优先级清晰：目标未完成 > 目标已完成 > 有薄弱点 > 论坛动态

**前端实现：**
- 新增 `src/components/SmartSuggestionCard.vue`：
  - Props：`weakCategories`（薄弱点数组）、`recentPostCount`（论坛新帖数）、`username`
  - Emits：`go-quiz`（跳转刷题）、`go-weak`（跳转薄弱点练习）、`go-forum`（跳转论坛）、`open-goal`（打开目标设置）
  - **无目标用户**：引导设定目标 + 直接开始刷题两条建议
  - **有目标未完成**：显示距目标还差 N 题 + 进度百分比徽章 + 动态文案（加快脚步/胜利在望/最后冲刺）
  - **有目标已完成**：显示达成激励 + 继续挑战或休息建议
  - **有薄弱点**：显示薄弱点名称 + 跳转到 `?mode=weak`
  - **论坛有新动态**：显示新帖数 + 跳转到论坛
  - **兜底**：无上述情况时显示"继续探索题库"建议
  - 样式：与 `CheckInCard` / `GoalTracker` 风格一致（深色卡片 + 悬停动效）
- `src/views/Home.vue`：
  - `hero-learning-panel` 新增 `<SmartSuggestionCard>` 组件（登录用户可见）
  - Props 从 `personalizedRecs.weakCategories` 和 `recentPosts.length` 注入

**后端改动：** 无

**数据来源：**
- `learningStore.currentGoal` → 目标状态
- `learningStore.goalCurrent / goalTarget` → 进度
- `personalizedRecs.weakCategories` → 薄弱点
- `recentPosts.length` → 论坛动态

---

## 二、首页功能增强清单（已完成 ✅）

以下 7 个功能均于 2026-04-25 完成，全部以"即插即用"方式接入首页，不破坏现有结构和主次关系。

| # | 功能 | 落点区域 | 后端改动 | 前端改动 | 难度 |
|---|------|---------|---------|---------|------|
| 1 | 公告栏 / 活动横幅 | Hero 顶部 | 新表 + 1 个只读接口 | 1 个组件 | 低 |
| 2 | 全局搜索增强 | NavBar + 新页面 | 复用现有查询，1 个聚合接口 | 1 个新页面 | 中 |
| 3 | 最近访问记录 | 概览区底部 | 无 | 1 个组件 | 低 |
| 4 | 消息中心 | NavBar + 新页面 | 新表 + 4 个接口 | 2 个组件/页面 | 中 |
| 5 | 个人主页 / 学习报告 | 新页面 | 无 | 1 个新页面 | 低-中 |
| 6 | 主题切换 | 用户区下拉 | users 表 + 2 接口 | App.vue + store | 低 |
| 7 | 反馈建议入口 | 论坛区底部 | 新表 + 1 个接口 | 1 个弹窗组件 | 低 |

**联调步骤（运行一次即可）：**
```bash
# 1. 运行迁移脚本
cd d:\VscodeProject\shuati0403\houduan
node src/scripts/migrate_home_features.js

# 2. 重启后端
npm run serve

# 3. 重启前端（编译会自动通过）
cd ../shuati && npm run serve
```

---

## 三、待拓展功能清单

### 2.1 高优先级（建议下一步）

- [ ] **JS 代码题后续增强**（见 1.1）
  - 支持在线运行代码（需引入沙箱，如 VM2）
  - 代码补全/填空题目（用户需补充部分代码）
  - 代码题独立入口和筛选
  - 代码题统计（代码题专项正确率）

- [ ] **每日打卡/签到奖励机制**
  - 连续签到奖励机制（签到徽章/积分）
  - [x] 签到日历可视化 ✅ 已完成（2026-04-23，点击签到卡片弹出 `CheckInCalendar` 月历弹窗）
  - 关联首页 Hero 区的"每日学习"徽章

- [x] **学习资料 / 书籍资料库** ✅ 已完成（2026-04-23）
  - 首页「学习资料」入口卡片 + 推荐资料
  - 资料列表页（分类筛选/关键词搜索/分页）
  - 资料详情弹窗（封面/简介/知识点关联/下载）
  - 基于用户薄弱点的规则推荐
  - 管理后台 CRUD + 文件上传

- [x] **学习目标达成激励** ✅ 已完成（2026-04-25）
  - 目标达成后展示激励文案/动画（`GoalTracker.vue` 🏆徽章 + `SmartSuggestionCard.vue` 达成状态卡片）

### 2.2 中优先级（已完成 ✅）

- [x] **知识图谱 / 能力雷达图** ✅ 已完成（2026-04-22，见 1.2.1）
- [x] **练习模式增强** ✅ 已完成（2026-04-22，见 1.2.2）
- [x] **题目详情页** ✅ 已完成（2026-04-22，见 1.2.3）
- [x] **首页个性化推荐** ✅ 已完成（2026-04-22，见 1.2.4）
- [x] **学习激励系统（签到/目标/专题）** ✅ 已完成（2026-04-22，见 1.3）

### 2.3 低优先级（可后期做）

- [ ] **用户等级/积分系统**
  - 刷题获经验值
  - 等级徽章展示
  - 排行榜

- [ ] **笔记功能**
  - 题目下添加个人笔记
  - 笔记支持 Markdown
  - 笔记搜索

- [ ] **多语言/主题切换**
  - 深色模式
  - 国际化（i18n）

- [ ] **PWA 支持**
  - 离线刷题
  - 手机桌面快捷方式

---

## 二·补充、个人中心 / 用户空间功能方案池（2026-04-25）

> 本章节为"个人中心"专题的增量功能方案池，供后续选择和迭代。
> 方案均基于现有用户体系（users 表 + 已有 store/API）自然扩展，不重构用户系统。

---

### P1. 方案一：个人主页增强 —— 昵称 + 个性签名 + 头像展示区

#### 1. 功能目标

- **解决什么问题**：当前 `Profile.vue` 只展示学习数据，缺少用户个性化表达。用户无法设置昵称、个性签名，头像区域也缺乏定制空间。
- **为什么适合个人中心**：个人主页是用户的"门面"，昵称和签名是最基础的个性化表达，与学习数据共同构成完整的用户空间。

#### 2. 页面落点

- **个人资料页**（新建 `src/views/UserProfile.vue`，路由 `/user/profile`）
- 与现有 `Profile.vue`（学习报告页）形成互补：一个是学习数据视角，一个是个人信息视角
- NavBar 用户下拉菜单新增"编辑资料"入口

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/router/index.js` | 新增 `/user/profile` 路由 |
| `src/views/UserProfile.vue` | 新建：昵称编辑、个性签名编辑、头像重新上传、社交信息（加入时间/最后登录） |
| `src/stores/user.js` | 新增 `updateProfile(nickname, bio)` action，调用 `PATCH /api/auth/profile` |
| `src/api/index.js` | 新增 `authApi.updateProfile(data)` |
| `src/views/Profile.vue` | 顶部资料卡改为可编辑状态入口，链接到 UserProfile |
| `NavBar.vue` | 用户下拉菜单加"编辑资料"菜单项 |
| `Home.vue` | Hero 右侧用户资料卡可点击跳转个人主页 |

#### 4. 后端改造点

- `users` 表新增 `nickname VARCHAR(50)`、`bio VARCHAR(200)` 字段
- 新增 `PATCH /api/auth/profile`：更新昵称+签名（需认证，只更新传入字段）
- 登录/`/me`/`/users` 接口已返回全部字段，无需额外接口
- **最小修改方案**：字段加默认值，前端直接用现有的 `username` 当昵称，`bio` 留空即可增量上线

#### 5. 最小修改方案

```
1. ALTER TABLE users ADD COLUMN bio VARCHAR(200) DEFAULT '';
2. PATCH /api/auth/profile（1个新接口）
3. 前端 UserProfile.vue（新建页面，2-3小时可完成）
```
无需改动 auth 核心逻辑，不碰登录注册流程。

#### 6. 难度评估

- **低**
- 只加字段、加 1 个 PATCH 接口、前端 1 个新页面
- 不涉及任何业务逻辑变更

#### 7. 是否适合当前阶段

- **适合优先做**（MVP 版本：只做昵称+签名编辑，1天可完成）
- 用户个性化是最基础的体验提升，上线后立刻有感知

---

### P2. 方案二：学习偏好设置面板

#### 1. 功能目标

- **解决什么问题**：当前没有用户级偏好设置。用户无法控制练习的默认参数（每组题数、难度筛选、是否显示计时器、推送通知开关等），所有用户共用同一套默认值。
- **为什么适合个人中心**：偏好设置是典型的"个人空间"功能，与学习行为深度绑定，放在设置页最自然。

#### 2. 页面落点

- **设置页**（新建 `src/views/Settings.vue`，路由 `/settings`）
- 作为个人中心的子页面，通过侧边 Tab 切换：资料 / 偏好 / 安全 / 反馈记录

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/router/index.js` | 新增 `/settings` 路由 |
| `src/views/Settings.vue` | 新建：偏好设置面板（题数组数/难度/计时器/通知开关） |
| `src/stores/user.js` | 新增 `preferences` state + `setPreferences` action |
| `src/api/index.js` | 新增 `authApi.updatePreferences(data)` |
| `NavBar.vue` | 用户下拉菜单加"设置"入口 |

#### 4. 后端改造点

- `users` 表新增 `preferences JSON DEFAULT '{}'` 字段（JSON 格式存储任意偏好，灵活扩展）
- 新增 `PATCH /api/auth/preferences`：更新偏好设置
- **最小修改方案**：`preferences` 用 JSON 列，不需要建新表，前端默认偏好全为 `false`/`default`，逐步引导用户开启

#### 5. 最小修改方案

```
1. ALTER TABLE users ADD COLUMN preferences JSON DEFAULT '{}';
2. PATCH /api/auth/preferences（1个新接口）
3. 前端 Settings.vue（新建页面）
```
偏好项可逐步增加，第一版只做"每组题数"和"默认难度"两个开关。

#### 6. 难度评估

- **低-中**
- JSON 列设计避免后续 schema 变更，但前端偏好项的持久化和应用逻辑需仔细设计

#### 7. 是否适合当前阶段

- **中等优先级**
- MVP 版本只做"每组题数"和"显示计时器"两个开关，后续逐步丰富

---

### P3. 方案三：成就徽章系统

#### 1. 功能目标

- **解决什么问题**：当前平台缺乏学习激励的视觉反馈。用户刷了再多题也没有任何"成就获得"的感知，缺少成就感和游戏化元素。
- **为什么适合个人中心**：徽章是用户学习历程的里程碑，自然呈现在个人主页或 Profile 页，形成持续激励。

#### 2. 页面落点

- **个人主页**（`Profile.vue` 新增徽章展示区）
- **个人主页**（`UserProfile.vue` 独立徽章 Tab 页面）

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/views/Profile.vue` | 顶部资料卡下方新增徽章网格展示 |
| `src/components/BadgeCard.vue` | 新建：单个徽章卡片（图标+名称+获得时间+描述） |
| `src/components/BadgeGrid.vue` | 新建：徽章网格（已获得+未获得灰显） |
| `src/stores/learning.js` | 新增 `badges` state |
| `src/api/index.js` | 新增 `badgeApi.getUserBadges(userId)` |

#### 4. 后端改造点

- 新增 `badges` 表（`id`, `code` UNIQUE, `name`, `icon`, `description`, `condition_type`, `condition_value`）
- 新增 `user_badges` 表（`user_id`, `badge_id`, `earned_at`）
- 新增 `GET /api/badges?userId=xxx`：返回用户已获得+全部徽章列表
- 徽章规则在应用层判断（后端按条件聚合计算，不写复杂触发器）
- **初始徽章集**（7枚）：
  - 初出茅庐（完成第1次练习）
  - 渐入佳境（连续签到3天）
  - 一周坚持（连续签到7天）
  - 错题克星（累计消灭10道错题）
  - 刷题达人（累计刷题100道）
  - 全对王者（单次练习10题全对）
  - 收藏家（收藏10道题）

#### 5. 最小修改方案

```
1. 新建 2 张表（badges + user_badges）
2. 1 个新接口 GET /api/badges
3. 前端 BadgeGrid.vue 组件 + Profile.vue 集成
```
可先做前端展示层（硬编码徽章集），后端数据后补。

#### 6. 难度评估

- **中**
- 徽章数量多，规则逻辑分散在后端各处，需要在练习提交/签到等关键节点统一触发检查
- 建议：先做前端展示，后端逐步接入

#### 7. 是否适合当前阶段

- **后续迭代**（游戏化元素应在核心功能稳定后再做）
- 但展示层（徽章卡 + 网格）可以提前做，前端硬编码数据即可

---

### P4. 方案四：消息中心增强 —— 公告聚合 + 系统通知分类

#### 1. 功能目标

- **解决什么问题**：当前 `Messages.vue` 三个 Tab（全部/回复/点赞/系统）体验混杂；公告（`AnnouncementBanner`）只在首页顶部一闪而过，用户错过后无法回溯；系统通知没有独立展示。
- **为什么适合个人中心**：消息是个人空间的核心功能，集中管理所有通知、公告、活动，让用户不漏掉重要信息。

#### 2. 页面落点

- **消息页**（`src/views/Messages.vue` 改造）
- 新增 Tab：全部 / 互动（回复+点赞）/ 系统 / 公告
- 公告 Tab 展示历史公告（已过期+进行中），支持分页

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/views/Messages.vue` | Tab 改造（新增"公告"Tab）+ 公告分页展示 |
| `src/components/MessageBadge.vue` | 增加"公告"未读角标（独立于互动通知） |
| `NavBar.vue` | 消息图标角标逻辑改为：互动未读数 + 公告未读数，取较大者 |

#### 4. 后端改造点

- `messages` 表新增 `type enum` 扩展：`message`/`announcement`/`system`（或新建 `announcements_read` 关联表）
- `messages` 表新增 `is_announcement TINYINT` 字段：标记消息是否由公告系统同步而来
- 新增 `GET /api/messages/announcements?page=1`：公告列表（分页）
- 新增 `PATCH /api/messages/announcements/read`：公告全部已读
- 或复用现有 `messages` 接口，新增 `type=announcement` 过滤

#### 5. 最小修改方案

```
1. messages 表加 is_announcement 字段
2. 公告写入时同步插一条 messages 记录（type=announcement）
3. Messages.vue 加公告 Tab
```
不需要新建表，前端改动小，可快速上线。

#### 6. 难度评估

- **低**
- 主要是前端 Tab 改造 + 后端新增 type 过滤
- 公告同步逻辑在公告写入时做，无额外定时任务

#### 7. 是否适合当前阶段

- **适合优先做**（与现有 Messages.vue 无冲突，纯增量）
- 用户对消息有明确需求，上线后体验提升明显

---

### P5. 方案五：最近访问记录独立页面

#### 1. 功能目标

- **解决什么问题**：当前 `RecentVisits.vue` 只展示最近 5 条记录，用户无法查看完整历史、无法筛选（按时间/按正确率/按模式）、无法搜索特定题目的练习记录。
- **为什么适合个人中心**：练习历史是用户学习轨迹的核心数据，独立页面可提供完整的个人学习档案感。

#### 2. 页面落点

- **最近访问区**（新建 `src/views/History.vue`，路由 `/history`，整合现有历史记录）
- 替代或增强现有 `/history` 相关路由（若有）

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/router/index.js` | 新增 `/history` 路由 |
| `src/views/History.vue` | 新建：练习历史完整列表 + 筛选 + 搜索 + 分页 |
| `src/views/Home.vue` | 移除内嵌的 `RecentVisits.vue`（或降级为入口卡片） |
| `src/components/PracticeHistoryCard.vue` | 新建：单条练习记录卡片（时间/题数/模式/正确率/用时/操作） |

#### 4. 后端改造点

- 复用现有 `GET /api/practiceHistory?userId=xxx` 接口
- 可新增参数：`sort`（default/accuracy/date）、`mode` 过滤
- **最小修改方案**：后端不加接口，前端自行过滤 + 排序现有数据

#### 5. 最小修改方案

```
1. 新建 History.vue（复用 historyApi）
2. Home.vue RecentVisits 降级为"查看全部"入口卡片
```
后端零改动，1 天可完成。

#### 6. 难度评估

- **低**
- 纯前端页面，后端复用现有接口
- 筛选/搜索逻辑纯前端实现

#### 7. 是否适合当前阶段

- **适合优先做**（轻量、价值明确）
- 与个人中心主题高度契合（个人学习轨迹管理）

---

### P6. 方案六：反馈建议历史记录

#### 1. 功能目标

- **解决什么问题**：当前用户提交反馈后没有任何回溯能力，看不到自己的反馈历史和处理状态（待处理/已回复/已解决），也无法追加补充说明。
- **为什么适合个人中心**：反馈记录是用户参与产品改进的印记，适合作为个人中心的独立模块。

#### 2. 页面落点

- **设置页**（`Settings.vue` 新增"我的反馈"Tab）
- 或新建 `src/views/MyFeedback.vue`（路由 `/feedback/my`）

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/views/Settings.vue` | 新增"我的反馈"Tab（或新建 MyFeedback.vue） |
| `src/components/FeedbackModal.vue` | 提交成功后展示"查看反馈记录"入口 |
| `src/api/index.js` | 新增 `feedbackApi.getMyFeedbacks(userId)` |
| `src/views/Messages.vue` | 系统通知 Tab 可展示反馈处理状态更新 |

#### 4. 后端改造点

- 新增 `GET /api/feedbacks?userId=xxx`：返回用户反馈列表（含 status 字段）
- `feedbacks` 表已有（见 1.7.7），只需新增查询接口
- 管理员可在后台更新反馈状态（`PATCH /api/admin/feedbacks/:id`）
- 状态变更时自动发一条系统消息通知用户

#### 5. 最小修改方案

```
1. 新增 GET /api/feedbacks?userId=xxx（1个新接口）
2. 前端 Settings.vue 或 MyFeedback.vue（新建页面）
```
后端改动极小，前端独立模块。

#### 6. 难度评估

- **低**
- 复用现有 feedbacks 表，只需新加 1 个查询接口
- 前端展示逻辑简单

#### 7. 是否适合当前阶段

- **适合优先做**（MVP 版本：只有"我的反馈"列表，管理端状态更新后用户可见）
- 让用户感受到反馈被重视，提升参与感

---

### P7. 方案七：学习数据导出

#### 1. 功能目标

- **解决什么问题**：用户无法导出自己的学习数据（练习记录、错题本、收藏）用于备份、分析或与他人分享。当前平台对用户数据没有"可携带性"支持。
- **为什么适合个人中心**：数据导出是用户对个人空间控制权的体现，在个人中心放置导出入口非常自然。

#### 2. 页面落点

- **设置页**（`Settings.vue` 新增"数据管理"区域）
- 或在 `Profile.vue` 新增"导出报告"按钮

#### 3. 前端改造点

| 文件 | 改造内容 |
|------|---------|
| `src/views/Settings.vue` | 新增"导出我的数据"按钮 |
| `src/components/ExportReportModal.vue` | 新建：导出选项弹窗（练习记录/错题/收藏/报告） |
| `src/api/index.js` | 新增 `exportApi.getExportLink(userId, type)` |

#### 4. 后端改造点

- 新增 `GET /api/exports/:userId/:type`：生成并返回数据（JSON 格式或 CSV）
- `type` 参数支持：`history`（练习记录）/ `wrongbook`（错题）/ `favorites`（收藏）/ `report`（综合报告）
- 综合报告用 ECharts 生成一张能力分析 PNG（可选，难度提升）
- **最小修改方案**：先做 JSON 导出（用户下载一个 `.json` 文件），后续再支持 CSV

#### 5. 最小修改方案

```
1. 4 个 GET 接口（或合并为 1 个带 type 参数）
2. ExportReportModal.vue（新建弹窗组件）
```
全部复用现有查询逻辑，无需新表新字段。

#### 6. 难度评估

- **中**
- CSV 格式生成和文件下载流处理需要一些经验
- 综合报告生成较复杂，可拆为二期

#### 7. 是否适合当前阶段

- **后续迭代**
- 价值明确但非核心，适合在主要功能稳定后做

---

### 个人中心功能方案池汇总

| 方案 | 功能 | 落点 | 后端改动 | 前端改动 | 难度 | 建议优先级 |
|------|------|------|---------|---------|------|---------|
| P1 | 个人主页增强（昵称+签名） | 新建 UserProfile.vue | 2字段 + 1接口 | 新页面 | 低 | **P0** |
| P2 | 学习偏好设置面板 | 新建 Settings.vue | JSON字段 + 1接口 | 新页面 | 低-中 | P1 |
| P3 | 成就徽章系统 | Profile.vue + BadgeGrid | 2表 + 1接口 | 2组件 | 中 | P2 |
| P4 | 消息中心增强（公告聚合） | Messages.vue 改造 | 字段 + 过滤 | Tab改造 | 低 | **P0** |
| P5 | 最近访问记录独立页面 | 新建 History.vue | 无 | 新页面 | 低 | **P0** |
| P6 | 反馈建议历史记录 | Settings/MyFeedback | 1接口 | 新页面 | 低 | P1 |
| P7 | 学习数据导出 | Settings 改造 | 4接口 | 弹窗组件 | 中 | P2 |

**推荐优先实现（P0）**：P1（昵称签名） + P4（消息增强） + P5（历史记录页）

---

## 四、技术债务 / 遗留问题

- [ ] `Quiz.vue` 中 SweetAlert 的按钮颜色仍为硬编码 `#3085d6` / `#d33`，可后续替换为 CSS 变量
- [ ] `Analytics.vue` 中 ECharts 配置含硬编码色值，建议抽取为常量
- [ ] `AdminLayout.vue` 侧边栏样式可与主站统一
- [ ] 各页面 `max-width` 不统一（800/900/960/1200px），建议统一为 1200px 容器宽度

---

## 五、API 接口清单（参考）

现有后端接口位于 `src/api/index.js`，主要模块：

| 模块 | 接口前缀 | 说明 |
|------|---------|------|
| 认证 | `/api/auth` | 登录/注册/用户信息 |
| 题目 | `/api/questions` | CRUD + 搜索 + 分类筛选 |
| 题目详情 | `/api/questions/:id/detail` | 题目学习中心（含关系状态/相似题/相关帖子） |
| 分类 | `/api/categories` | 分类列表 |
| 错题本 | `/api/wrongBook` | 按 userId 过滤 |
| 收藏 | `/api/favorites` | 按 userId 过滤 |
| 历史 | `/api/practiceHistory` | 按 userId 过滤（支持 mode 字段） |
| 论坛 | `/api/posts` | 帖子 CRUD + 评论 |
| AI | `/api/ai` | 提示词/解析 |
| 签到 | `/api/checkIn` | 每日签到 |
| 目标 | `/api/goals` | 学习目标 |
| 专题 | `/api/topics` | 专题 CRUD + 题目管理 |
| **分析** | `/api/analysis` | **知识图谱/能力分析 + 首页个性化推荐**（2026-04-22 新增） |

**新增接口（2026-04-22）：**

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/analysis/ability?userId=xxx` | GET | 分类能力分析（知识图谱） |
| `/api/analysis/recommendations?userId=xxx` | GET | 首页个性化推荐 |
| `/api/questions/:id/detail?userId=xxx` | GET | 题目详情聚合页 |

> 新增功能若需后端接口，请在 `src/api/index.js` 中按现有格式追加。

---

## 六、依赖说明

当前技术栈（`package.json`）：

```
vue: ^3.2.13
vue-router: ^4.2.5
pinia: ^2.1.7
axios: ^1.6.0
echarts: ^5.4.3
sweetalert2: ^11.26.1
```

**如需引入新依赖，请确认：**
1. 不与现有依赖冲突
2. 评估 bundle 体积影响
3. 在本文档依赖说明区记录

---

*每次完成新功能后，请在本文件对应区域追加记录，保持文档时效性。*
# 1. 运行迁移脚本（只需一次，自动幂等）
cd d:\VscodeProject\shuati0403\houduan
node src/scripts/migrate_learning.js

# 2. 重启后端服务
npm run serve

# 3. 重启前端服务（用 npm run serve）
全部后端实现完成
以下是本次后端实现的完整总结。

新增/修改文件清单
文件路径	操作	说明
src/scripts/migrate_learning.sql
新增
纯 SQL 迁移脚本（MySQL 8.x）
src/scripts/migrate_learning.js
新增
Node.js 迁移运行脚本（幂等，可重复运行）
src/services/checkInService.js
新增
签到服务层
src/services/goalService.js
新增
学习目标服务层
src/services/topicService.js
新增
专题服务层
src/controllers/checkInController.js
新增
签到控制器
src/controllers/goalController.js
新增
学习目标控制器（含 addProgress）
src/controllers/topicController.js
新增
专题控制器
src/routes/checkIn.js
新增
签到路由
src/routes/goals.js
新增
学习目标路由
src/routes/topics.js
新增
专题路由
src/app.js
修改
注册 3 组新路由
src/api/index.js (前端)
修改
新增 addProgress + 补全 userId 参数
src/stores/learning.js (前端)
修改
addToGoalProgress 改为异步同步后端
src/views/Topics.vue (前端)
修改
所有 topicApi 调用补 userId
src/views/Quiz.vue (前端)
修改
topicApi.get 补 userId
src/views/Favorites.vue (前端)
修改
topicApi.addQuestion 补 userId
数据库设计
表名	说明	关键字段
check_ins
每日签到
user_id, checkin_date(UNIQUE), streak_days, total_days
study_goals
学习目标
user_id, type(daily/weekly), target_count, current_count, start_date, end_date, status
topics
专题
user_id, name, description, question_count(冗余), practice_count(预留)
topic_questions
专题-题目关联
topic_id, question_id(UNIQUE), sort_order
接口路由总览
POST   /api/checkIn              # 签到
GET    /api/checkIn?userId=xxx   # 获取签到记录
GET    /api/goals?userId=xxx     # 获取当前目标
POST   /api/goals                # 创建目标
PATCH  /api/goals/:id             # 更新目标(type/target)
PATCH  /api/goals/:id/progress    # 追加目标进度(练习提交时调用)
GET    /api/topics?userId=xxx    # 专题列表
GET    /api/topics/:id?userId=xxx # 专题详情(含题目)
POST   /api/topics               # 创建专题
PATCH  /api/topics/:id           # 更新专题
DELETE /api/topics/:id?userId=xxx # 删除专题
POST   /api/topics/:id/questions # 添加题目到专题
DELETE /api/topics/:id/questions/:questionId?userId=xxx # 移除题目
PATCH  /api/topics/:id/reorder   # 调整题目顺序
联调步骤
# 1. 运行迁移脚本（只需一次，自动幂等）
cd d:\VscodeProject\shuati0403\houduan
node src/scripts/migrate_learning.js
# 2. 重启后端服务
npm run serve
# 3. 重启前端服务（用 npm run serve）
种子数据包含：

4 天连续签到记录（用户 tl）
每日目标：20 题，当前 8/20
每周目标：100 题，当前 35/100
专题 1「JavaScript 核心概念」含 5 题
专题 2「CSS 布局专项」含 3 题
前后端联动关键点
Home.vue：签到卡片、目标进度、专题入口 — 全部由对应 API 驱动
Favorites.vue：选中收藏 → 创建专题，自动写入 topic_questions
Topics.vue：完整 CRUD + 题目增删排 + 开始练习
Quiz.vue：?mode=topic&topicId=xxx 模式加载专题题目；练习提交后通过 addToGoalProgress 异步同步到后端目标进度

---

## 论坛增强功能集（2026-04-25）

### F.1 论坛评论通知系统

**后端实现：**
- `houduan/src/controllers/commentController.js` 的 `createComment` 方法：
  - 评论创建成功后，自动向帖子作者发送 `reply` 类型消息
  - 消息内容包含帖子标题和回复摘要
  - 不会给自己回复发通知

**前端实现：**
- 发帖评论后，帖子作者在消息中心可看到回复通知
- `messages` 路由已完整：`GET /api/messages`、`GET /api/messages/unread-count`、`PATCH /api/messages/:id/read`、`PATCH /api/messages/read-all`

---

### F.2 论坛公告栏

**前端实现：**
- `Forum.vue` 顶部引入 `AnnouncementBanner` 组件
- 公告栏支持多公告轮播、类型区分颜色（通知/活动/促销）
- 已做深色模式适配：使用 CSS 变量 `var(--color-primary)` 替代硬编码绿色

---

### F.3 论坛帖子反馈建议入口

**前端实现：**
- `ForumPostDetail.vue` 侧边栏底部新增「意见反馈」按钮
- 点击弹出 `FeedbackModal` 弹窗
- 后端 `POST /api/feedbacks` 已完整实现

---

### F.4 最近访问论坛帖子记录

**前端实现：**
- `ForumPostDetail.vue` 的 `loadPost` 方法：
  - 每次打开帖子详情时自动记录到 `localStorage['forum_recent_visits']`
  - 最多保存 20 条记录
  - 记录字段：id, title, post_type, author_name, like_count, comment_count, visited_at

---

### F.5 论坛深色模式全面适配

**涉及文件：**
- `App.vue`：`--bg-sidebar` CSS 变量（浅色 `#F1F5F9` / 深色 `#111921`）
- `NavBar.vue`：移除硬编码 `rgba(255,255,255,0.95)` 白色背景
- `AdminLayout.vue`：sidebar 背景、nav-item hover 全部改用 CSS 变量
- `Home.vue`：新增 `.dark-mode .hero-section` 深色渐变覆盖
- `AnnouncementBanner.vue`：公告栏背景改用 CSS 变量
- `Forum.vue`：`search-bar input` 深色模式背景适配
- `ForumPostDetail.vue`：`question-card`、`option-preview`、`reply-input` 深色模式适配
- 全局滚动条深色 hover 颜色

---

## 个人主页增强功能集（2026-04-25）

### P.1 加入时间显示修复

**后端实现：**
- `houduan/src/controllers/authController.js`：
  - `login` 方法：返回 user 对象补上 `created_at` 字段
  - `register` 方法：返回 user 对象补上 `created_at` 字段

**前端实现：**
- `Profile.vue` 使用 `user?.created_at` 格式化显示加入时间

---

### P.2 能力雷达图渲染修复

**前端实现：**
- `Profile.vue`：
  - echarts 正确导入（`import * as echarts from 'echarts'`）
  - `nextTick()` 确保 DOM 更新后再初始化
  - 复用 echarts 实例 + `onUnmounted` 清理
  - 主题切换时重新渲染
  - tooltip 悬浮提示、动态坐标轴缩放
  - 深色/浅色模式配色适配

---

### P.3 薄弱点分析数据修复

**前端实现：**
- `Profile.vue`：`weakCategories` 改为直接从 `getAbility` API 数据计算
  - 过滤掉未做过题的分类
  - 按 `ability` 值升序排序，取最低的前 5 个
  - 每项包含智能生成的原因说明（基于能力和错题数）

**设计规范：**
- 进度条结构：轨道（track）+ 填充（fill）+ 右侧百分比数字
- 填充色：`linear-gradient(90deg, #EF4444 0%, #F87171 100%)`
- 每项能力值不同，进度条长度差异化

---

## 论坛通知增强（2026-04-27）

### N.1 评论点赞通知

**后端实现：**
- `houduan/src/controllers/commentController.js`：新增 `toggleLike` 方法（之前缺失但路由已指向它）
  - 点赞后自动向评论作者发送 `like` 类型消息
  - 消息内容：帖子标题 + "你的评论被赞了"
  - 自己不能给自己点赞发通知

**前端实现：**
- 评论点赞按钮已在 `ForumPostDetail.vue` 实现

---

### N.2 评论回复通知

**后端实现：**
- `houduan/src/controllers/commentController.js` 的 `createComment` 方法：
  - 评论创建成功后，自动向帖子作者发送 `reply` 类型消息
  - 消息内容包含帖子标题和回复摘要（最多 50 字）
  - 不会给自己回复发通知

---

### N.3 帖子点赞通知

**后端实现：**
- `houduan/src/controllers/postController.js` 的 `toggleLike` 方法：
  - 点赞后自动向帖子作者发送 `like` 类型消息
  - 消息内容：帖子标题 + "收到了 1 个赞"
  - 自己不能给自己点赞发通知

---

### N.4 管理员系统通知

**后端实现：**
- `houduan/src/routes/messages.js`：新增 `POST /api/messages/broadcast` 端点
  - 仅管理员可调用
  - 向数据库中所有用户批量发送 `system` 类型消息
  - 使用事务保证一致性
- `houduan/src/routes/announcements.js`：`POST /api/announcements` 新增 `send_notification` 参数，勾选后同时发送系统消息

**前端实现：**
- 新增 `shuati/src/views/admin/AdminAnnouncements.vue`：
  - 「公告管理」标签页：CRUD 公告 + 创建时可选同时发系统通知
  - 「系统通知」标签页：直接输入标题+内容，向所有用户广播
- 管理后台侧边栏已有「公告与通知」入口（`/admin/announcements`）
