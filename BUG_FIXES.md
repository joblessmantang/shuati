# Bug 修复记录

> 本文件记录所有已修复的 Bug，每次修复后在此追加。
> 与 FEATURE_ROADMAP.md（功能规划）和 PROJECT_CHANGELOG.md（功能变更）配合使用。

---

## 2026-04-23

### 签到体验升级：点击弹出日历弹窗

**涉及文件：**

| 文件 | 改动 |
|------|------|
| `shuati/src/components/CheckInCalendar.vue` | 新建，签到日历弹窗组件 |
| `shuati/src/components/CheckInCard.vue` | 重构，点击卡片弹出日历弹窗，移除冗余周日历 |
| `shuati/src/stores/learning.js` | 新增 `weekCheckInDates`、`monthCheckInDates` getter |
| `houduan/src/services/checkInService.js` | `getCheckInRecord` 新增 `weekCheckInDates`、`monthCheckInDates` 字段 |

---

### 学习讨论区重构（学习型讨论区）

**涉及文件：**

| 文件 | 改动 |
|------|------|
| `houduan/src/scripts/migrate_forum_enhanced.js` | 新建，迁移脚本增加 6 个字段 |
| `houduan/src/controllers/postController.js` | 重写，支持 post_type/tags/like_count；评论排序优化；相关推荐查询 |
| `houduan/src/controllers/commentController.js` | 新增点赞/精选/采纳接口 |
| `houduan/src/routes/posts.js` | 新增 like、highlight、accept 路由 |
| `shuati/src/components/ForumPostDetail.vue` | 新建，学习型帖子详情页 |
| `shuati/src/views/Forum.vue` | 完全重构，列表页加类型筛选，发布页加帖子类型选择和标签 |
| `shuati/src/api/index.js` | 新增 toggleLike、toggleCommentLike、toggleAccept 接口 |

**功能清单：**

- 帖子类型：提问 / 回答 / 笔记，带图标和颜色区分
- 帖子标签（JSON 字段），最多 3 个
- 帖子点赞（第一阶段简单累加）
- 评论精选 / 点赞 / 采纳，采纳只有帖主可操作
- 评论排序：采纳 > 精选 > 点赞数 > 时间
- 帖子详情页：关联题目卡片 + 去这道题按钮 + 相关推荐侧边栏
- 发布弹窗：帖子类型选择器 + 标签输入 + 题目关联搜索

---

### BUG-20240423-001：答题提交 500 错误

**影响范围：** 答题交卷功能

**根因（双层）：**

| 层次 | 问题 | 位置 |
|------|------|------|
| 主因 | `learningStore.addToGoalProgress(goalId)` 调用时缺少 `count` 参数，后端 SQL `current = current + null` 导致 MySQL 类型错误，返回 500 | `shuati/src/stores/learning.js` |
| 次因 | 保存失败时 `isSubmitted` 已设为 `true`，用户答题结果被锁定，无法重试 | `shuati/src/views/Quiz.vue` |
| 次因 | 计时挑战超时自动交卷时，嵌套 SweetAlert 导致 `doSubmit` 未被 await，流程混乱 | `shuati/src/views/Quiz.vue` |

**涉及文件：**
- `shuati/src/stores/learning.js`
- `shuati/src/views/Quiz.vue`

**修复内容：**
1. `addToGoalProgress` 增加 `count` 参数的 `typeof` 校验，无效值直接 return 不调用后端
2. `submitQuiz` 改为 `async` 函数，`doSubmit` 内部先保存主记录（history），成功后才调用 `addToGoalProgress`
3. `isSubmitted = true` 只在所有保存逻辑完成后才设置，失败时用户可重试
4. 错题保存改用 `Promise.all` 并发，失败不影响主记录
5. 错误提示区分 500 状态码，显示更清晰文案
6. 计时挑战超时自动交卷去掉嵌套 SweetAlert，直接调用 `submitQuiz(true)`

---

### BUG-20240423-002：练习模式页图标显示 HTML 实体字符串

**影响范围：** 练习模式选择页（StartScreen）

**根因：** `modes` 数组中 `icon` 字段定义为 HTML 实体字符串（如 `&#x1F3AF;`），Vue 模板直接插值时视为普通文本，不解析为 HTML

**涉及文件：**
- `shuati/src/components/StartScreen.vue`

**修复内容：** 将所有 HTML 实体改为真实 emoji 字符

| 原值 | 修复后 | 用途 |
|------|--------|------|
| `&#x1F3AF;` | `🎯` | 普通练习图标 |
| `&#x274C;` | `❌` | 错题练习图标 |
| `&#x1F504;` | `🔀` | 混合练习图标 |
| `&#x23F1;` | `⏱️` | 计时挑战图标 |
| `&#x1F4DA;` | `📚` | 背题模式图标 |
| `&#x23F1;` | `⏱️` | 开始挑战按钮 |
| `&#x1F4DA;` | `📚` | 开始背题按钮 |
| `&#x25B6;` | `▶️` | 开始刷题按钮 |
| `&#x1F50D;` | `🔍` | 搜索图标 |

---

### BUG-20240423-003：知识图谱分类状态与视觉样式不一致

**影响范围：** 统计页（Analytics）知识图谱区域

**根因：** `isWeak` 判定仅基于错题本中是否有该分类的题，与 `ability === null`（从未练习过）无关联；导致从未练习过的分类也被套上红色边框和"薄弱"标签，但文案显示"未练习"，视觉与数据不统一

**涉及文件：**
- `shuati/src/views/Analytics.vue`

**修复内容：** `isWeak` 视觉绑定增加 `&& item.ability !== null` 条件，只有真正练习过且薄弱才显示红色边框和标签

```diff
- :class="{ 'ability-item--weak': item.isWeak, 'ability-item--empty': item.ability === null }"
+ :class="{ 'ability-item--weak': item.isWeak && item.ability !== null, 'ability-item--empty': item.ability === null }"

- <span v-if="item.isWeak" class="ability-item__badge">薄弱</span>
+ <span v-if="item.isWeak && item.ability !== null" class="ability-item__badge">薄弱</span>
```

**修复后逻辑对照：**

| ability | isWeak | 视觉样式 | 标签 | 说明 |
|---------|--------|---------|------|------|
| `null` | false | 无特殊样式 | 无 | 未练习 |
| `null` | true | 红色边框+背景 | 无（修复后） | 未练习（修复前会错误显示"薄弱"） |
| `30%` | true | 红色边框+背景 | 薄弱 ✓ | 练习过但薄弱 |
| `80%` | false | 无特殊样式 | 无 | 熟练 |

---

### BUG-20240423-004：知识图谱左侧雷达图区域整块空白

**影响范围：** 统计页（Analytics）左侧雷达图区域

**根因（双层）：**

| 层次 | 问题 | 位置 |
|------|------|------|
| 主因 | `renderRadarChart` 在无数据时仍初始化了 ECharts 实例（空 radar），此时 `radarRef` 容器宽高可能为 0，图表内容不可见 | `shuati/src/views/Analytics.vue` |
| 次因 | Vue `v-if="abilityData.length === 0"` 判断与 ECharts 渲染逻辑不同步，导致空白和图表渲染竞争 | `shuati/src/views/Analytics.vue` |
| 次因 | `.radar-chart-wrapper` 外层容器无固定高度，ECharts `init` 时获取到的尺寸为 0 | `shuati/src/views/Analytics.vue` |

**涉及文件：**
- `shuati/src/views/Analytics.vue`

**修复内容：**
1. 新增 `hasRadarData = computed(() => abilityData.value.some(item => item.ability !== null))`，控制模板中雷达图容器的 `v-if`
2. `renderRadarChart` 去掉无数据时的空图初始化，无数据时直接 return
3. `renderRadarChart` 内加 `nextTick` 包裹 ECharts 初始化，确保 DOM 尺寸就绪
4. 新增 `.radar-chart-wrapper` 高度 `.radar-chart-wrapper { height: 300px; }`，确保 ECharts 初始化时有有效尺寸
5. 空状态改为 SVG 图标 + 两行文案占位，不再依赖 ECharts 空图

---

### BUG-20240423-005：答题后知识图谱数据不更新

**影响范围：** 答题提交后，统计页（Analytics）知识图谱和分类统计均无变化

**根因（双层）：**

| 层次 | 问题 | 位置 |
|------|------|------|
| 主因 | `Quiz.vue` 提交时只保存了 `practice_history`（总览记录），**没有保存 `user_answers` 表**，而 `analysisApi.getAbility` 查的是 `user_answers`，所以知识图谱永远为空 | `shuati/src/views/Quiz.vue` |
| 次因 | `Analytics.vue` 中 `allHistory`/`allWrongList`/`allQuestions`/`allCategories` 用 `let` 声明为普通数组，赋值后 Vue 响应式系统无法追踪变化，导致切换时间筛选时 `filterByTime` 用的是空数组旧值 | `shuati/src/views/Analytics.vue` |
| 次因 | `loadData` 中 `Array.isArray(historyRes)` 判断 Axios 响应对象，永远为 `false`，实际数据路径不对 | `shuati/src/views/Analytics.vue` |

**涉及文件：**
- `houduan/src/controllers/userAnswersController.js`（新建）
- `houduan/src/routes/userAnswers.js`（新建）
- `houduan/src/app.js`
- `shuati/src/api/index.js`
- `shuati/src/views/Quiz.vue`
- `shuati/src/views/Analytics.vue`

**修复内容：**
1. 新建 `userAnswersController.js` + `userAnswers.js` 路由，提供 `POST /api/userAnswers` 批量保存每道题的作答结果
2. `Quiz.vue` 提交时，将每道题的作答结果（含 `questionId`、`selectedIndex`、`isCorrect`）批量发送到 `userAnswersApi`
3. `Analytics.vue` 将所有 `let` 数据变量改为 `const xxx = ref([])`，确保响应式追踪
4. `Analytics.vue` `loadData` 中修复 `Array.isArray(historyRes)` 判断，直接取 `.data` 字段

---

### BUG-20240423-006：学习统计页时间筛选条件不显示/不响应

**影响范围：** 统计页（Analytics）时间范围切换标签

**根因：** 与 BUG-005 次因相同——`allHistory` 等用 `let` 声明，切换 `range` 时 `calculateStats` 读取的永远是初始化时的空数组，筛选功能形同虚设；`renderTrendChart`/`renderCategoryChart` 同理

**涉及文件：**
- `shuati/src/views/Analytics.vue`

**修复内容：** 与 BUG-005 修复第 3 条相同，将 `let allHistory` 等改为 `const allHistory = ref([])`，所有读取处加 `.value`

---

## 历史修复（归档）

（后续在此追加更早的 Bug 记录）

