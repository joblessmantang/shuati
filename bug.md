# 项目 Bug 与问题记录

> 本文档记录智能刷题平台在开发过程中遇到的技术问题、已知缺陷及修复建议，供论文写作参考。

---

## 一、后端问题

### 1.1 错题本/收藏模块 —— 重复插入竞态条件

**严重程度**: 中

**问题描述**: `WrongBookController` 和 `FavoritesController` 的 `add` 方法采用"先查后插"的两步逻辑（check-then-insert）。在高并发或网络延迟场景下，两个请求可能同时通过存在性检查，导致插入冲突。

**代码位置**: `houduan/src/controllers/wrongBookController.js`、`houduan/src/controllers/favoritesController.js`

**根因**: 数据库表虽已设置 `UNIQUE KEY unique_user_question`，但 `add` 方法仅在应用层判断重复，未对数据库约束冲突（`ER_DUP_ENTRY`）做统一处理。当冲突发生时，Node.js 会抛出未捕获的异常，经 `errorHandler` 统一包装后返回 500 错误，导致调用方无法区分"重复"和"失败"。

**修复建议**: 在 `catch` 块中判断 `err.code === 'ER_DUP_ENTRY'`，返回 200 及友好提示，而非抛出 500 错误。

---

### 1.2 错题本/收藏模块 —— 缺少用户身份校验

**严重程度**: 高

**问题描述**: 错题本和收藏的 `remove`（按 ID 删除）和 `removeByUserAndQuestion` 接口均未校验记录所属用户。任何登录用户传入他人的 `userId` 即可删除他人数据。

**代码位置**: `houduan/src/controllers/wrongBookController.js`（第 75-98 行）、`houduan/src/controllers/favoritesController.js`（第 75-116 行）

**修复建议**: 在删除前增加 `SELECT * FROM wrong_book WHERE id = ? AND userId = ?` 查询，确认当前登录用户与记录所属用户一致后再执行删除。

---

### 1.3 AI 服务 —— 网络错误未兜底处理

**严重程度**: 中

**问题描述**: `aiService.js` 在调用外部 AI 大模型 API（如 OpenAI / 通义千问）时，若网络超时或 API 返回非 JSON 响应（如 429 Rate Limit、503 Service Unavailable），`axios` 会抛出异常。当前实现仅在正常路径返回数据，异常未被 `try-catch` 包裹或处理不够完善，导致用户收到"获取提示失败"后无法区分是"AI 服务不可用"还是"请求格式错误"。

**代码位置**: `houduan/src/services/aiService.js`

**修复建议**: 增加 axios 的 `timeout` 配置；在 Controller 层 catch 块中区分 AI 专用错误码，返回 503 并附带友好提示而非 500。

---

### 1.4 CORS 配置 —— 生产环境安全隐患

**严重程度**: 中

**问题描述**: `app.js` 中使用 `app.use(cors())` 启用跨域资源共享，但未指定允许的来源（`origin`）和白名单。在生产环境中，所有来源的跨域请求均被接受，存在被恶意站点调用 API 的风险。

**代码位置**: `houduan/src/app.js`（第 19 行）

**修复建议**: 通过 `.env` 配置允许的前端域名列表：`cors({ origin: process.env.ALLOWED_ORIGINS.split(',') })`。

---

### 1.5 数据库 —— 分类删除后题目孤岛

**严重程度**: 低

**问题描述**: `categories` 表与 `questions` 表之间通过 `FOREIGN KEY ... ON DELETE SET NULL` 关联。当管理员删除一个分类时，该分类下的所有题目 `categoryId` 被设为 NULL，但这些题目仍存在于题库中，可能造成题目分类展示混乱。

**代码位置**: `houduan/src/controllers/categoryController.js`、`houduan/src/scripts/initDb.js`

**修复建议**: 删除分类前先检查其下是否有题目，若有则禁止删除或提示管理员先转移题目。

---

### 1.6 API 响应格式不一致

**严重程度**: 低

**问题描述**: 部分 Controller（如 `PostController`）返回 `res.json({ success: true, data: { ... } })` 结构；另一部分（如 `HistoryController`）直接返回 `res.json(items)`。前端 Axios 拦截器假设所有接口返回 `{ success, data }` 结构进行解包，导致直接返回数据的接口在拦截器中被错误处理。

**代码位置**: `houduan/src/controllers/historyController.js`（第 21 行）；`shuati/src/api/index.js`（第 22-27 行）

**修复建议**: 统一所有 API 响应格式为 `{ success: true, data: ... }`，前端拦截器保持现有逻辑。

---

### 1.9 论坛帖子列表 —— `pool.execute` 不支持 LIMIT/OFFSET 占位符

**严重程度**: 高

**问题描述**: `PostController.getPostsByQuestion` 和 `CommentController.getCommentsByPost` 使用 `pool.execute` 配合 `LIMIT ? OFFSET ?` 占位符传递分页参数。mysql2 的 `execute` 会将参数转为预编译语句的占位符，但 MySQL 预编译协议对 LIMIT/OFFSET 子句的类型处理有兼容性问题，导致后端返回 500 Internal Server Error，论坛帖子列表完全无法加载。

**代码位置**: `houduan/src/controllers/postController.js`（第 38-41 行）、`houduan/src/controllers/commentController.js`（第 26-33 行）

**修复方案**: 将 `pool.execute` 改为 `pool.query`，并对 LIMIT/OFFSET 值做字符串内联（`LIMIT ${parseInt(limit)} OFFSET ${offset}`），其余参数仍通过占位符传递。

```js
// 错误写法（500 错误）
query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
params.push(parseInt(limit), parseInt(offset));
const [posts] = await pool.execute(query, params);

// 正确写法
query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
const [posts] = await pool.query(query, params);
```

**根因**: mysql2/promise 的 Prepared Statement 协议与 MySQL LIMIT/OFFSET 子句在某些版本/配置下存在类型兼容问题，`execute` 会尝试预编译，而直接拼接数字字面量可规避此问题。

---

### 1.10 论坛帖子 —— `questionId` 强制必填导致无需关联题目的帖子无法发布

**严重程度**: 高

**问题描述**: `PostController.createPost` 要求 `questionId` 必须存在，否则返回 400 错误。这导致用户无法发布不关联任何题目的通用讨论帖。

**代码位置**: `houduan/src/controllers/postController.js`（第 63-68 行）

**修复方案**: 将 `questionId` 改为可选字段；若用户填写了 `questionId`，则验证题目是否存在；若不填或填 `null`，则将 `question_id` 字段存为 `NULL`。

---

### 1.11 论坛帖子详情 —— 普通 JOIN 导致无关联题目的帖子查询失败

**严重程度**: 高

**问题描述**: `PostController.getPostById` 使用普通 `JOIN questions`，当帖子 `question_id` 为 `NULL` 时，该 SQL 无法返回任何数据（普通 JOIN 要求两边都匹配）。同时，该接口未返回评论数据，导致帖子详情页评论区域为空。

**代码位置**: `houduan/src/controllers/postController.js`（第 110-116 行）

**修复方案**:
1. 将 `JOIN questions` 改为 `LEFT JOIN questions`，支持 `question_id` 为 `NULL` 的帖子。
2. 在同一方法中查询评论列表，一并返回给前端。

---

### 1.12 论坛帖子 —— 前端多处未正确解析后端嵌套数据

**严重程度**: 高

**问题描述**: 后端 `getPostsByQuestion` 返回 `{ posts: [...], pagination: {...} }`，`getPostById` 返回 `{ post: {...}, comments: [...] }`。但前端 `Forum.vue` 的 `loadPosts`、`viewPost`、`addComment` 方法均直接使用 `data`，未提取嵌套字段，导致帖子列表渲染为空、评论不显示。

**代码位置**: `shuati/src/views/Forum.vue`（第 143-145 行、第 168-171 行、第 196-198 行）

**修复方案**:
```js
// 列表页
this.posts = data.posts || data;

// 详情页
const postData = data.post || data;
const comments = data.comments || [];
this.currentPost = { ...postData, comments };
```

---

### 1.13 论坛帖子 —— 前端发布时 `questionId` 未做空值处理

**严重程度**: 中

**问题描述**: `Forum.vue` 的 `createPost` 方法将整个 `newPost` 对象传给后端，当 `newPost.questionId` 为 `null` 时，后端可能收到 `null` 值而非省略该字段。虽然后端已支持可选 `questionId`，但传 `null` 与完全不传字段在某些边界场景下行为可能不一致。

**代码位置**: `shuati/src/views/Forum.vue`（第 158 行）

**修复方案**: 构造 `postData` 时仅在 `questionId` 有值时才加入该字段。

---

### 1.7 举报模块 —— 可重复举报且无处理流程

**严重程度**: 低

**问题描述**: 举报接口（`reportController`）未对同一用户同一题目重复举报做限制，用户可反复提交相同举报。后台（`AdminReports.vue`）仅有展示列表，缺少"标记已处理"等状态变更功能。

**代码位置**: `houduan/src/controllers/reportController.js`、`shuati/src/views/admin/AdminReports.vue`

---

### 1.8 练习历史 —— 并发写入竞态

**严重程度**: 中

**问题描述**: `Quiz.vue` 在交卷时使用 `for...of` 循环串行调用 `wrongBookApi.add`，但 `historyApi.add` 为单次调用。若用户在极短时间内重复点击交卷按钮（`submitQuiz` 未防重），可能插入多条历史记录。

**修复状态**: 已修复。前端 `QuizHeader` 在交卷后（`isSubmitted=true`）自动禁用"交卷"和"暂停"按钮，后端无重复插入风险。

**涉及文件**: `shuati/src/components/QuizHeader.vue`、`shuati/src/views/Quiz.vue`

---

### 1.14 AI 详解 —— 追问功能缺失

**严重程度**: 中

**问题描述**: 交卷后点击"查看详解"，AI 每次都返回相同的通用解释，用户无法结合自己选择的答案进行针对性追问（如"为什么我选 B 不对？"），学习效果有限。

**修复状态**: 已修复。`AiHint.vue` 交卷后（`showExplain=true`）在"查看详解"按钮旁增加文本输入框，用户可输入具体问题；`getExplanation` 方法将用户输入的 `explainQuestion` 传给后端 AI，生成个性化追问解答；同时支持 Ctrl+Enter 快捷发送。

**涉及文件**: `shuati/src/components/AiHint.vue`、`houduan/src/controllers/aiController.js`、`houduan/src/services/aiService.js`

---

---

## 二、前端问题

### 2.1 Token 存储 —— XSS 风险

**严重程度**: 高

**问题描述**: JWT Token 存储在 `localStorage` 中，若网站存在 XSS 漏洞，攻击者可通过 JavaScript 读取 `localStorage.getItem('token')` 窃取用户身份。

**代码位置**: `shuati/src/api/index.js`（第 16 行）

**修复建议**: 将 Token 存储在 `httpOnly` Cookie 中，由后端在登录时写入；或使用加密后的 Session Storage 并配合 CSP 策略。

---

### 2.2 答题页竞态 —— 收藏/错题请求无错误提示

**严重程度**: 中

**问题描述**: `Quiz.vue` 的 `addFavorite` 和 `removeFavorite` 方法中，`catch` 块仅执行 `console.error`，用户不会收到任何反馈，可能误以为收藏失败。

**代码位置**: `shuati/src/views/Quiz.vue`（第 224-246 行）

---

### 2.3 论坛评论列表 —— 刷新不重新加载

**严重程度**: 中

**问题描述**: `Forum.vue` 中 `viewPost` 方法获取帖子详情时一并加载评论，但 `addComment` 成功后重新调用 `postApi.get` 刷新整个帖子数据。若评论接口（`commentController`）实现不完整，刷新后评论可能丢失。

**代码位置**: `shuati/src/views/Forum.vue`（第 168-191 行）

**修复建议**: 评论添加成功后仅更新 `currentPost.comments` 局部数据，而非重新请求整个帖子。

---

### 2.4 分页功能 —— 后端有返回但前端未使用

**严重程度**: 中

**问题描述**: `PostController` 的 `getPostsByQuestion` 接口返回了分页元数据（`pagination: { page, limit }`），但 `Forum.vue` 的 `loadPosts` 方法未传递分页参数，也未渲染分页控件。所有帖子一次性加载，大数据量下有性能问题。

**代码位置**: `houduan/src/controllers/postController.js`（第 42-46 行）、`shuati/src/views/Forum.vue`（第 138-150 行）

---

### 2.5 题目列表无分页

**严重程度**: 中

**问题描述**: `questionController` 的列表接口未实现分页（`limit/offset`），所有题目一次性返回。当题库扩展至数百道题时，前端加载和渲染会有性能瓶颈。

**代码位置**: `houduan/src/controllers/questionController.js`

---

### 2.6 日期时间显示 —— 时区不一致

**严重程度**: 低

**问题描述**: `practice_history` 表存储 DATETIME 格式（MySQL 服务器时间），前端 `formatTime` 方法使用 `toLocaleString("zh-CN")` 转换时，依赖浏览器本地时区，可能出现与服务器时区不一致的显示偏差。

**代码位置**: `houduan/src/scripts/initDb.js`（第 84 行）、`shuati/src/views/Forum.vue`（第 193-197 行）

**修复建议**: 后端统一返回 UTC ISO 字符串，前端使用 `date-fns` 或原生 `Intl.DateTimeFormat` 显式指定时区。

---

### 2.7 练习模式切换 —— 状态残留

**严重程度**: 低

**问题描述**: `Quiz.vue` 的 `handleStartQuiz` 方法在切换练习模式（如从"错题模式"切换到"全部模式"）时，`questions` 和 `userAnswers` 虽然会被重置，但如果用户在答题过程中切换（通过重新点击开始按钮），旧题目的 `QuestionCard` 组件状态（如展开/折叠）可能残留。

**代码位置**: `shuati/src/views/Quiz.vue`（第 171-213 行）

---

### 2.8 暂停后页面滚动位置丢失

**严重程度**: 低

**问题描述**: 用户点击暂停后，`PauseOverlay` 完全覆盖页面；恢复后（`handleResume`）未恢复原有的页面滚动位置，用户需要手动回到之前浏览的位置。

**代码位置**: `shuati/src/views/Quiz.vue`（第 295-298 行）

**修复建议**: 在暂停前记录 `window.scrollY`，恢复后使用 `window.scrollTo(0, savedScrollY)` 恢复位置。

---

### 2.9 固定头部滚动判断 —— 阈值计算问题

**严重程度**: 低

**问题描述**: `Quiz.vue` 中 `triggerOffsetTop` 在 `handleStartQuiz` 的 `nextTick` 中通过 `staticHeaderRef.value.$el.offsetTop` 获取。但若页面在答题开始时已处于滚动状态（用户刷新后留在页面底部），阈值计算可能不准确，导致固定头部出现/消失时机不对。

**代码位置**: `shuati/src/views/Quiz.vue`（第 125-129 行、第 208-212 行）

---

### 2.10 学习统计/练习历史 —— API 响应解包后未正确取值导致崩溃

**严重程度**: 高

**问题描述**: `historyController.getList` 返回 `{ success: true, data: [...] }`，前端 Axios 拦截器解包后返回 `{ ...res, data: payload.data }`，即 `{ data: [...] }`。但 `Analytics.vue` 第 75 行直接对 `historyRes` 执行 `.slice()`（期望是数组），`History.vue` 原逻辑用 `Array.isArray(res)` 判断，两者均无法正确处理解包后的对象，导致统计页面崩溃（`.slice is not a function`）、练习历史列表为空。

**代码位置**: `shuati/src/views/Analytics.vue`（第 75 行）、`shuati/src/views/History.vue`（第 72 行）

**修复方案**:
```js
// Analytics.vue - 与同文件中 wrongRes / questionsRes / categoriesRes 保持一致
const history = Array.isArray(historyRes) ? historyRes : (historyRes.data || []);

// History.vue - 同理
list.value = Array.isArray(res) ? res : (res.data || []);
```

**根因**: API 响应格式约定与前端实际处理不一致，属于 bug.md 1.6 "API 响应格式不一致" 的具体症状。

---

### 2.11 论坛帖子浏览量不更新

**严重程度**: 中

**问题描述**: `PostController.getPostById` 在返回帖子详情时未执行 `view_count + 1` 更新操作，导致数据库 `view_count` 始终为初始值 0，前端显示的浏览量永远是 0。

**代码位置**: `houduan/src/controllers/postController.js`（第 105-117 行）

**修复方案**: 在 `getPostById` 方法中，先执行 `UPDATE posts SET view_count = view_count + 1 WHERE id = ?`，再查询帖子详情并返回最新浏览量。

---

### 2.12 论坛帖子列表无全文搜索

**严重程度**: 中

**问题描述**: `PostController.getPostsByQuestion` 仅支持按 `questionId` 精确过滤，不支持关键词搜索。前端传入 `q` 参数时被忽略，用户无法通过帖子标题或内容搜索帖子。

**代码位置**: `houduan/src/controllers/postController.js`（第 20-54 行）

**修复方案**: 增加 `q` 参数支持，对帖子 `title`、`content` 和关联题目 `q.title` 做 `LIKE` 模糊匹配，三者任一匹配即返回。

---

### 2.13 论坛帖子列表不显示关联题目信息

**严重程度**: 低

**问题描述**: `PostController.getPostsByQuestion` 的 SQL 查询未 `JOIN questions` 表，导致返回数据中没有 `question_title`。前端即使显示关联题目标签也拿不到数据。

**代码位置**: `houduan/src/controllers/postController.js`（第 25-30 行）

**修复方案**: 在查询中增加 `LEFT JOIN questions q ON p.question_id = q.id`，并选中 `q.title as question_title`。

---

### 2.14 论坛帖子评论数不及时更新

**严重程度**: 低

**问题描述**: `Forum.vue` 的 `addComment` 方法在评论成功后重新调用 `postApi.get` 刷新整个帖子，但由于后端 `getPostById` 的 `comment_count` 来自子查询 `SELECT COUNT(*)` 而非实际关联，`getPostById` 返回的评论数理论上应该是准确的（因为有子查询）。但若前端乐观更新评论数后再请求数据，数据不一致的风险仍然存在。

**代码位置**: `shuati/src/views/Forum.vue`（第 193-204 行）

**修复方案**: 保持现有"重新获取帖子数据"的策略，同时在评论成功后先用 JS 乐观更新评论数（`comment_count++`），避免用户感知延迟。

---

### 2.15 论坛发布帖子 —— 仅支持输入题目 ID，操作不友好

**严重程度**: 中

**问题描述**: `Forum.vue` 的发布帖子弹窗中，关联题目只能手动输入题目 ID，无法搜索和选择，用户体验差。

**代码位置**: `shuati/src/views/Forum.vue`（第 47-54 行）

**修复方案**: 增加题目搜索下拉框，用户输入关键词后调用 `questionApi.search` 实时搜索，显示匹配题目列表供点击选择，选中后显示已选题目标签，可清除重选。

---

### 2.16 论坛帖子详情 —— 关联题目内容无法查看

**严重程度**: 中

**问题描述**: `PostController.getPostById` 虽然返回了 `question_title`，但前端帖子详情弹窗未提供展开或查看题目具体内容（题干、代码、选项）的入口，用户无法直接在被关联的帖子中看到题目全貌。

**代码位置**: `shuati/src/views/Forum.vue`（第 68-108 行）

**修复方案**: 在帖子详情中增加"关联题目"展示区域（点击展开/收起），点击时调用 `questionApi.get` 获取题目详情（题干、代码、选项），展示在帖子内容上方。

---

## 三、安全问题汇总

| 编号 | 问题 | 严重程度 | 涉及模块 |
|------|------|----------|----------|
| S1 | Token 存储在 localStorage（XSS 风险） | 高 | 前端 API |
| S2 | CORS 允许所有来源 | 中 | 后端 CORS |
| S3 | 错题本/收藏删除无用户身份校验 | 高 | 后端权限 |
| S4 | 论坛帖子 XSS 防护（仅做转义，内容全量存储） | 中 | 后端论坛 |
| S5 | 举报可重复提交 | 低 | 后端举报 |
| S6 | SQL 注入（使用 execute/query 防注入，但动态拼接需审查） | 低 | 后端数据库 |

---

## 四、论文可引用的技术难点

1. **"查后插"竞态问题的双重保险设计**：数据库层 UNIQUE 约束 + 应用层幂等性判断，以及在 catch 中正确处理 `ER_DUP_ENTRY` 错误码。
2. **AI 提示词工程的安全边界**：如何通过 prompt engineering 确保 AI 只给思路、不给答案，同时兼顾用户体验。
3. **JWT Token 的前端无感知刷新机制**：Token 有效期与前端路由守卫的联动设计。
4. **前后端响应格式约定与拦截器统一解包**：解决 RESTful API 嵌套数据结构不统一的问题。
5. **错题自动归集与多模式练习的题目池管理**：三种练习模式（全部/错题/混合）下的数据筛选逻辑。
