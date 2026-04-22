# 刷题平台功能拓展维护文档

> 本文件记录所有已完成的功能改造和待拓展功能清单。
> 后续新增功能请在此文件的相关区域追加记录。
> 最后更新：2026-04-22

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

## 二、待拓展功能清单

### 2.1 高优先级（建议下一步）

- [ ] **每日打卡/签到系统**
  - 连续签到奖励机制
  - 签到日历可视化
  - 关联首页 Hero 区的"每日学习"徽章

- [ ] **学习目标设定**
  - 用户设定每日/每周刷题目标
  - 首页概览卡展示目标进度条
  - 达成目标后展示激励文案

- [ ] **题目收藏 → 专题练习**
  - 从收藏夹创建自定义专题
  - 专题内题目可增删排序
  - 专题入口放首页推荐区

### 2.2 中优先级

- [ ] **知识图谱 / 能力雷达图**
  - 基于分类统计绘制能力雷达图
  - 展示各分类掌握程度
  - 关联统计页面

- [ ] **练习模式增强**
  - 计时挑战模式（限时答完N题）
  - 背题模式（只看不答）
  - 闯关模式（连续答对N题解锁下一关）

- [ ] **题目详情页**
  - 查看本题完整解析
  - 查看本题讨论区
  - 关联相似题目推荐

- [ ] **首页个性化推荐**
  - 基于历史记录推荐薄弱分类
  - 基于错题本推荐相关题目
  - "你可能需要复习" 卡片

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
| 分类 | `/api/categories` | 分类列表 |
| 错题本 | `/api/wrongBook` | 按 userId 过滤 |
| 收藏 | `/api/favorites` | 按 userId 过滤 |
| 历史 | `/api/practiceHistory` | 按 userId 过滤 |
| 论坛 | `/api/posts` | 帖子 CRUD + 评论 |
| AI | `/api/ai` | 提示词/解析 |

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
