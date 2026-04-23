# 刷题平台功能拓展维护文档

> 本文件记录所有已完成的功能改造和待拓展功能清单。
> 后续新增功能请在此文件的相关区域追加记录。
> 最后更新：2026-04-23

---

## 一、已完成改造（已上线）

### 1.1 界面现代化升级（2026-04-22）

**改造范围：**

| 文件 | 改造内容 |
|------|---------|
| `src/App.vue` | 设计令牌（CSS 变量）补全、全局工具类（`.card` `.btn` `.tag` `.section-*` `.empty-state` 等） |
| `src/components/NavBar.vue` | 导航项补全（收藏/历史）、SVG Logo、刷题入口强化（脉冲动画）、搜索框胶囊化、用户下拉菜单重构 |
| `src/views/Home.vue` | 完全重构为学习工作台：Hero区 + 概览卡 + 快速开始 + 学习概览 + 推荐区 + 论坛预览 |
| `src/views/Forum.vue` | 按钮样式对齐全局配色、卡片悬停动效、搜索框、标签色升级 |
| `src/views/admin/AdminUsers.vue` | 角色徽章、禁用按钮样式对齐全局设计 |

**首页新结构：**
```
Hero 欢迎区（深绿渐变）
├─ 问候语 + 副文案
├─ 开始刷题 / 继续上次练习 按钮
└─ 4张概览卡：累计刷题 / 错题待复习 / 收藏 / 正确率

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

### 1.2 第二阶段增强功能（2026-04-22）

#### 1.2.1 知识图谱 / 能力雷达图

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

#### 1.2.2 练习模式增强

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

#### 1.2.3 题目详情页

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

#### 1.2.4 首页个性化推荐

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

#### 1.3 学习激励系统（2026-04-22）

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

---

## 二、待拓展功能清单

### 2.1 高优先级（建议下一步）

- [ ] **每日打卡/签到奖励机制**
  - 连续签到奖励机制（签到徽章/积分）
  - [x] 签到日历可视化 ✅ 已完成（2026-04-23，点击签到卡片弹出 `CheckInCalendar` 月历弹窗）
  - 关联首页 Hero 区的"每日学习"徽章

- [ ] **学习目标达成激励**
  - 达成目标后展示激励文案/动画
  - 目标达成徽章

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

## 三、技术债务 / 遗留问题

- [ ] `Quiz.vue` 中 SweetAlert 的按钮颜色仍为硬编码 `#3085d6` / `#d33`，可后续替换为 CSS 变量
- [ ] `Analytics.vue` 中 ECharts 配置含硬编码色值，建议抽取为常量
- [ ] `AdminLayout.vue` 侧边栏样式可与主站统一
- [ ] 各页面 `max-width` 不统一（800/900/960/1200px），建议统一为 1200px 容器宽度

---

## 四、API 接口清单（参考）

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

## 五、依赖说明

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
