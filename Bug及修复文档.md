# Bug 及修复文档（Bug and Fix Documentation）

> **【开发提醒】每次修复 Bug 后，必须同步更新本文档：**
> - 在「Bug 概览」表格中追加新 Bug（ID/日期/严重程度/影响范围）
> - 在「详细修复记录」章节追加完整的根因分析和修复方案（含修复前后代码对比）
> - 总结经验教训到「Bug 修复经验总结」章节
> - 如发现新 Bug 根因类型，更新「根因分类统计」表格
> - 最后更新字段：`最后更新：YYYY-MM-DD`
>
> 本文档详细记录刷题平台开发过程中遇到的所有 Bug，包括根因分析、修复方案及经验总结，用于支撑论文中"系统测试"或"调试与修复"章节。
> 最后更新：2026-04-24

---

## 一、Bug 概览

| Bug ID | 日期 | 严重程度 | 影响范围 | 状态 |
|--------|------|---------|---------|------|
| BUG-20240423-001 | 2026-04-23 | 高 | 答题提交功能完全不可用（500 错误） | ✅ 已修复 |
| BUG-20240423-002 | 2026-04-23 | 低 | 练习模式页图标显示 HTML 实体字符串 | ✅ 已修复 |
| BUG-20240423-003 | 2026-04-23 | 中 | 知识图谱视觉状态与数据不一致 | ✅ 已修复 |
| BUG-20240423-004 | 2026-04-23 | 中 | 知识图谱雷达图整块空白 | ✅ 已修复 |
| BUG-20240423-005 | 2026-04-23 | 高 | 答题后知识图谱数据不更新 | ✅ 已修复 |
| BUG-20240423-006 | 2026-04-23 | 中 | 学习统计页时间筛选条件不响应 | ✅ 已修复 |
| BUG-20240424-001 | 2026-04-24 | 高 | userAnswersApi.add 无 await + 错误被吞，导致知识图谱数据从未成功保存 | ✅ 已修复 |
| BUG-20240424-002 | 2026-04-24 | 中 | 知识图谱隐藏逻辑 v-if="hasRadarData" 导致页面结构不可见 | ✅ 已修复 |
| BUG-20240424-003 | 2026-04-24 | 高 | userAnswersController 批量 INSERT VALUES ? 格式错误导致交卷时 500 | ✅ 已修复 |
| BUG-20240424-004 | 2026-04-24 | 低 | Analytics setRange 缺少 renderRadarChart，雷达图不响应时间切换 | ✅ 已修复 |

---

## 二、详细修复记录

### BUG-20240423-001：答题提交 500 错误

#### 2.1.1 问题描述

用户完成答题后点击"交卷"按钮，系统返回 HTTP 500 错误，无法保存练习记录。

#### 2.1.2 影响范围

答题提交功能，导致所有练习记录无法保存。

#### 2.1.3 根因分析（双层）

| 层次 | 问题 | 位置 |
|------|------|------|
| **主因** | `learningStore.addToGoalProgress(goalId)` 调用时缺少 `count` 参数，后端 SQL 执行 `current = current + null`，MySQL 类型错误返回 500 | `shuati/src/stores/learning.js` |
| **次因** | 保存失败时 `isSubmitted` 已设为 `true`，答题结果被锁定，用户无法重试 | `shuati/src/views/Quiz.vue` |
| **次因** | 计时挑战超时自动交卷时，嵌套 SweetAlert 导致 `doSubmit` 未被 await，流程混乱 | `shuati/src/views/Quiz.vue` |

**主因代码定位：**

```javascript
// 修复前 — learning.js
async addToGoalProgress(goalId) {
    if (!this.currentGoal?.id) return;
    // ❌ 缺少 count 参数，后端收到 undefined
    await goalApi.addProgress(this.currentGoal.id);  // count 缺失
}
```

后端 `goalService.js` 中的 SQL：

```sql
-- 后端期望 count 参数
UPDATE study_goals
SET current_count = current_count + ?   -- 收到 null
WHERE id = ?
```

#### 2.1.4 修复方案

**修复 1：参数校验（learning.js）**

```javascript
// 修复后 — learning.js
async addToGoalProgress(questionCount) {
    if (!this.currentGoal?.id) return;
    // ✅ 增加参数类型校验，无效值直接 return，不调用后端
    if (typeof questionCount !== 'number' || questionCount <= 0) return;
    const newCurrent = (this.currentGoal.current ?? 0) + questionCount;
    this.currentGoal = { ...this.currentGoal, current: newCurrent };
    try {
        await goalApi.addProgress(this.currentGoal.id, questionCount);
    } catch (err) {
        console.warn('目标进度同步失败（本地已更新）:', err);
    }
}
```

**修复 2：提交流程重构（Quiz.vue）**

```javascript
// 修复后 — Quiz.vue
async submitQuiz(isAuto = false) {
    if (this.isSubmitted) return;

    const score = this.calculateScore();
    const results = this.questions.map((q, i) => ({
        questionId: q.id,
        selectedIndex: this.answers[i] ?? -1,
        isCorrect: q.correctAnswer === this.answers[i]
    }));

    try {
        // ✅ 1. 先保存主记录（practice_history）
        await historyApi.add({
            userId: this.userId,
            mode: this.mode,
            score,
            total: this.questions.length,
            timeSpent: this.elapsedSeconds
        });

        // ✅ 2. 成功后调用目标进度同步
        await this.learningStore.addToGoalProgress(this.questions.length);

        // ✅ 3. 保存每道题答题记录
        await userAnswersApi.add({ userId: this.userId, answers: results });

        // ✅ 4. 错题保存（Promise.all 并行，不阻塞主流程）
        const wrongPromises = results
            .filter(r => !r.isCorrect)
            .map(r => wrongBookApi.add({ userId: this.userId, questionId: r.questionId }));
        await Promise.all(wrongPromises);

        // ✅ 5. 所有保存成功后，才标记已提交
        this.isSubmitted = true;

        // 显示结果
        this.showResult(results, score);

    } catch (err) {
        // ✅ 失败时不设置 isSubmitted，用户可以重试
        if (!isAuto) Swal.fire('提交失败', err.response?.data?.message || '请重试', 'error');
    }
}
```

**修复 3：超时自动交卷（Quiz.vue）**

```javascript
// 修复后 — 计时挑战超时处理
else if (this.mode === 'challenge') {
    this.timer = setInterval(() => {
        this.elapsedSeconds++;
        if (this.elapsedSeconds >= this.timeLimit) {
            clearInterval(this.timer);
            Swal.fire({
                title: '时间到！',
                text: '即将自动交卷',
                timer: 2000,
                showConfirmButton: false,
                willClose: () => {
                    this.submitQuiz(true);  // ✅ 直接调用，不嵌套 SweetAlert
                }
            });
        }
    }, 1000);
}
```

#### 2.1.5 经验总结

1. **防御性编程**：后端接口对所有参数做类型校验，前端在调用前也应校验，避免无效参数传播到数据库层
2. **状态管理顺序**：关键状态变量（如 `isSubmitted`）应在所有数据保存成功后才能设置，失败时保持可重试状态
3. **异步流程编排**：串行保存（主记录 → 目标 → 答题 → 错题），各步骤有明确的依赖关系，不能随意并发

---

### BUG-20240423-002：练习模式图标显示 HTML 实体字符串

#### 2.2.1 问题描述

练习模式选择页面（StartScreen.vue）中，各模式卡片上的图标显示为原始字符串（如 `&#x1F3AF;`），而非预期的 emoji 字符（`🎯`）。

#### 2.2.2 影响范围

练习模式选择页 UI 展示，影响用户体验。

#### 2.2.3 根因分析

Vue 3 模板插值默认将内容作为文本处理，不会解析 HTML。因此 `icon: '&#x1F3AF;'`（HTML 实体字符串）被直接渲染为文本，而非转义为 emoji。

**代码片段：**

```vue
<!-- 修复前 — StartScreen.vue -->
<div class="mode-card__icon">{{ mode.icon }}</div>

<script setup>
const modes = [
    { icon: '&#x1F3AF;', label: '普通练习' },  // ❌ Vue 不解析 HTML 实体
    { icon: '&#x274C;', label: '错题练习' },
    // ...
]
</script>
```

#### 2.2.4 修复方案

将所有 HTML 实体字符串替换为真实的 emoji 字符：

```javascript
// 修复后
const modes = [
    { icon: '🎯', label: '普通练习' },    // ✅ 真实 emoji
    { icon: '❌', label: '错题练习' },    // ✅ 真实 emoji
    { icon: '🔀', label: '混合练习' },    // ✅ 真实 emoji
    { icon: '⏱️', label: '计时挑战' },    // ✅ 真实 emoji
    { icon: '📚', label: '背题模式' },    // ✅ 真实 emoji
]
```

#### 2.2.5 经验总结

- Vue 模板插值默认不解析 HTML，若需要渲染 HTML，应使用 `v-html` 指令（需确保内容可信）
- emoji 字符应直接使用 Unicode 字符，而非 HTML 实体，这是最简洁可靠的方案

---

### BUG-20240423-003：知识图谱分类状态与视觉样式不一致

#### 2.3.1 问题描述

统计页（Analytics.vue）中，从未练习过的分类也被显示为"薄弱"（红色边框和背景），但实际文案显示"未练习"，视觉与数据不一致。

#### 2.3.2 根因分析

`isWeak` 判定仅基于错题本中是否有该分类的题，未考虑用户是否真正练习过该分类：

```vue
<!-- 修复前 — Analytics.vue -->
<span v-if="item.isWeak" class="ability-item__badge">薄弱</span>
<!-- ❌ 未练习过的分类如果进了错题本，isWeak 也为 true -->

<!-- 修复前 — 样式绑定 -->
:class="{ 'ability-item--weak': item.isWeak }"
```

**逻辑漏洞：**

| 场景 | isWeak | ability | 预期视觉 | 修复前 | 修复后 |
|------|--------|---------|---------|--------|--------|
| 未练习 | false | null | 无特殊样式 | 无特殊样式 | 无特殊样式 |
| 未练习但在错题本 | true | null | 无特殊样式 | **红色边框** ❌ | 无特殊样式 |
| 练习过且薄弱 | true | 30% | 红色边框 | 红色边框 | 红色边框 |
| 练习过且熟练 | false | 80% | 无特殊样式 | 无特殊样式 | 无特殊样式 |

#### 2.3.3 修复方案

```vue
<!-- 修复后 — 样式绑定增加 ability 非空判断 -->
:class="{
    'ability-item--weak': item.isWeak && item.ability !== null,
    'ability-item--empty': item.ability === null
}"

<!-- 修复后 — 标签条件增加 ability 非空判断 -->
<span v-if="item.isWeak && item.ability !== null" class="ability-item__badge">
    薄弱
</span>
```

#### 2.3.4 经验总结

- 复合状态判定需要穷举所有状态组合，确保每种组合的视觉表现符合预期
- 可以建立"状态矩阵"来系统化验证复合条件的正确性

---

### BUG-20240423-004：知识图谱雷达图区域整块空白

#### 2.4.1 问题描述

统计页左侧的 ECharts 雷达图区域完全没有内容显示，容器为空白。

#### 2.4.2 根因分析（三层）

| 层次 | 问题 | 位置 |
|------|------|------|
| **主因** | 无数据时仍调用 `init()` 初始化了空 ECharts 实例，容器宽高可能为 0 | `Analytics.vue` `renderRadarChart()` |
| **次因** | Vue `v-if` 与 ECharts 渲染时序竞争：DOM 还未渲染时就尝试初始化 | `Analytics.vue` 模板 |
| **次因** | `.radar-chart-wrapper` 外层容器无固定高度，ECharts 获取尺寸为 0 | CSS 样式 |

#### 2.4.3 修复方案

**修复 1：数据控制渲染**

```javascript
// 修复后 — 新增计算属性
const hasRadarData = computed(() =>
    abilityData.value.some(item => item.ability !== null)
);

// 模板
<div v-if="hasRadarData" class="radar-chart-wrapper">
    <div ref="radarRef" class="radar-chart"></div>
</div>
<div v-else class="empty-state">  <!-- ✅ 无数据时显示占位 -->
    <!-- SVG 图标 + 文案 -->
</div>
```

**修复 2：延迟初始化**

```javascript
// 修复后 — 使用 nextTick 确保 DOM 尺寸就绪
import { nextTick } from 'vue';

function renderRadarChart() {
    // ✅ 无数据时直接 return，不初始化空图
    if (!hasRadarData.value) return;

    nextTick(() => {
        if (!radarRef.value) return;
        const chart = echarts.init(radarRef.value);
        chart.setOption({ /* ... */ });
    });
}
```

**修复 3：CSS 固定高度**

```css
/* 修复后 */
.radar-chart-wrapper {
    height: 300px;  /* ✅ 确保 ECharts 有可用尺寸 */
}

.radar-chart {
    width: 100%;
    height: 100%;
}
```

#### 2.4.4 经验总结

- ECharts 必须在 DOM 元素有明确尺寸后才能正确初始化
- `nextTick` 是解决 Vue 响应式更新与 DOM 渲染时序问题的标准方案
- 数据驱动渲染：`v-if` 控制组件是否挂载，而非在组件内部"容忍"空数据

---

### BUG-20240423-005：答题后知识图谱数据不更新

#### 2.5.1 问题描述

用户完成答题并提交后，统计页（Analytics）的知识图谱和分类统计均无变化，数据像没有答题一样。

#### 2.5.2 根因分析（三层）

| 层次 | 问题 | 位置 |
|------|------|------|
| **主因** | `Quiz.vue` 提交时只保存了 `practice_history`（总览记录），没有保存 `user_answers`（每题记录），而 `getAbility` 查的是 `user_answers`，所以知识图谱永远为空 | `shuati/src/views/Quiz.vue` |
| **次因** | `Analytics.vue` 中 `allHistory`、`allWrongList` 等用 `let` 声明为普通数组，赋值后 Vue 响应式系统无法追踪变化 | `shuati/src/views/Analytics.vue` |
| **次因** | `loadData` 中 `Array.isArray(historyRes)` 判断 Axios 响应对象，永远为 `false`，实际数据路径错误 | `shuati/src/views/Analytics.vue` |

**主因图示：**

```
答题提交
  │
  ├─ 保存 practice_history（总分/用时等） ✅ 已实现
  │
  └─ 保存 user_answers（每道题的作答情况） ❌ 缺失
       │
       └─ getAbility() 查询 user_answers → 空 → 知识图谱无数据
```

**次因（响应式失效）：**

```javascript
// 修复前 — Analytics.vue
let allHistory = [];        // ❌ 普通变量，Vue 追踪不到
let allWrongList = [];       // ❌ 普通变量

async function loadData() {
    allHistory = res.data;   // ❌ 重新赋值，Vue 不知道变化
    calculateStats();        // ❌ 此时 allHistory 仍为空（响应式未触发）
}
```

#### 2.5.3 修复方案

**修复 1：新建 userAnswers 接口（后端）**

新建文件 `houduan/src/controllers/userAnswersController.js` + `houduan/src/routes/userAnswers.js`：

```javascript
// 后端：批量保存答题记录
async function saveUserAnswers(req, res) {
    const { userId, answers } = req.body;
    const values = answers.map(a => [userId, a.questionId, a.isCorrect ? 1 : 0]);
    await pool.query(
        'INSERT INTO user_answers (user_id, question_id, is_correct) VALUES ?',
        [values]
    );
    res.json({ success: true, data: { count: answers.length } });
}
```

**修复 2：答题提交时调用（Quiz.vue）**

```javascript
// submitQuiz() 中新增
await userAnswersApi.add({
    userId: this.userId,
    answers: results  // [{ questionId, selectedIndex, isCorrect }]
});
```

**修复 3：Vue 响应式改造（Analytics.vue）**

```javascript
// 修复后 — 使用 ref() 声明响应式变量
import { ref } from 'vue';

const allHistory = ref([]);
const allWrongList = ref([]);
const allQuestions = ref([]);
const allCategories = ref([]);

// 调用处改为 .value 访问
allHistory.value = historyRes;
calculateStats();
```

#### 2.5.4 经验总结

- **数据流完整性**：分析功能依赖的数据必须从业务操作中正确持久化，缺一不可
- **Vue 3 响应式**：`ref()` 和 `reactive()` 是响应式数据的唯一来源，普通 `let` 变量不是；`reactive()` 包装的对象/数组内的元素变化可以追踪，但重新赋值整个数组不能
- **Axios 响应对象结构**：Axios 响应是 `{ data: { ... }, status: 200, headers: {...} }`，业务数据在 `res.data` 中，而非 `res` 本身

---

### BUG-20240423-006：学习统计页时间筛选条件不响应

#### 2.6.1 问题描述

统计页（Analytics）中切换时间范围标签（近7天/近30天/全部）时，图表数据和统计数据没有任何变化。

#### 2.6.2 根因分析

与 BUG-005 的次因相同——`allHistory` 等用 `let` 声明，切换 `range` 时 `calculateStats` 读取的永远是初始化时的空数组，筛选功能形同虚设。

```javascript
// 修复前
let range = 'week';  // ❌ 普通变量

function setRange(r) {
    range = r;        // ❌ 赋值后 calculateStats 读不到
    calculateStats(); // ❌ allHistory 等仍是空数组
    renderTrendChart();
    renderCategoryChart();
}
```

#### 2.6.3 修复方案

```javascript
// 修复后 — 使用 ref() 响应式
const range = ref('week');

function setRange(r) {
    range.value = r;   // ✅ 触发响应式更新
    calculateStats();  // ✅ 内部 allHistory.value 等已是最新数据
    renderTrendChart();
    renderCategoryChart();
}
```

#### 2.6.4 经验总结

- Vue 3 中所有页面状态（不仅仅是 API 数据）都应使用 `ref()` 或 `reactive()` 声明，确保模板和数据变化能被响应式系统追踪
- "筛选不响应"类 Bug 的典型根因是状态变量未声明为响应式，或数据源本身为空（参见 BUG-005）

---

### BUG-20240424-001：userAnswersApi.add 无 await + 错误被吞，知识图谱数据从未成功保存

#### 2.7.1 问题描述

`user_answers` 表为空（0 条记录），导致知识图谱页面始终显示占位状态，所有分类统计为 0。

#### 2.7.2 根因分析

`Quiz.vue` 提交时调用 `userAnswersApi.add()` 保存答题记录，但存在两个问题：

**问题 1：无 await，Promise 未等待**

```javascript
// 修复前 — Quiz.vue doSubmit()
userAnswersApi.add({ userId, answers })   // ❌ 无 await，无人接收 Promise
    .catch(err => console.warn('答题记录保存失败（不影响交卷）:', err));
```

`userAnswersApi.add()` 返回 Promise，但没有被 `await`，外层 `try/catch` 捕获不到其错误。更关键的是：由于 `.catch()` 只打印 `console.warn`，即使后端返回 500/400，用户也完全不知道答题记录没有保存成功，只看到"已交卷"的成功弹窗。

**问题 2：后端从未被调用（推断）**

因为没有 `await`，`doSubmit` 立即继续执行后续代码并弹出成功提示，HTTP 请求可能发出但由于后端接口格式不匹配等原因返回了错误，然而这个错误被静默吞掉。

#### 2.7.3 修复方案

将 `userAnswersApi.add()` 改为 `await` 等待，并移除静默 `.catch()`，纳入主流程的 try/catch：

```javascript
// 修复后 — Quiz.vue
// 批量保存每道题的作答结果（知识图谱数据来源）
const answers = questions.value.map(q => ({
    questionId: q.id,
    selectedIndex: userAnswers.value[q.id] !== undefined ? userAnswers.value[q.id] : null,
    isCorrect: userAnswers.value[q.id] === q.correctAnswer
}));
await userAnswersApi.add({
    userId: Number(userId.value),
    answers
});
```

现在若保存失败，会和 `historyApi.add()` 一起被外层 catch 捕获，用户能看到明确错误提示，服务器日志也会记录真实失败原因。

#### 2.7.4 经验总结

- **Promise 必须被 await 或正确处理**：没有 `await` 的 Promise 调用，函数不会等待其完成；`.catch()` 吞掉错误只应用于明确知道可以安全忽略的场景（如下游日志服务），业务数据保存绝不能用
- **重要操作失败必须对用户可见**：用 `console.warn` 记录日志对用户不可见，答题记录这类核心数据保存失败必须用弹窗或 toast 告知用户

---

### BUG-20240424-002：知识图谱隐藏逻辑 v-if="hasRadarData" 导致页面结构不可见

#### 2.8.1 问题描述

`/analytics` 页面的知识图谱整块区域（含标题、说明文字、布局结构）在用户未登录或无练习数据时完全不渲染，切换"全部/近一周/近一月"等时间筛选时页面布局会出现跳动。

#### 2.8.2 根因分析

```html
<!-- 修复前 — Analytics.vue -->
<div v-if="hasRadarData" class="ability-section">
```

`hasRadarData` 是一个 computed，返回 `abilityData.value.some(item => item.ability !== null)`，即"至少有一个分类的能力值不为 null"。这意味着：

- 未登录用户或未做练习的用户：整个知识图谱区域完全消失，标题、说明文字、雷达图、分类列表全部不渲染
- 用户切换时间筛选时：`hasRadarData` 的值变化（从 false 变 true，或反过来），导致整个区块从 DOM 中移除/插入，页面布局跳动

#### 2.8.3 修复方案

移除外层 `v-if="hasRadarData"`，让知识图谱区块始终渲染，仅内部雷达图和分类列表根据是否有数据显示对应内容：

```html
<!-- 修复后 — Analytics.vue -->
<div class="ability-section">
    <!-- 雷达图内部仍有空状态提示 -->
    <div v-if="hasRadarData" ref="radarRef" class="radar-chart"></div>
    <div v-else class="radar-empty">
        <p>开始练习后<br/>自动生成知识图谱</p>
    </div>
</div>
```

#### 2.8.4 经验总结

- **页面区块级 UI 不能用数据有无作为显示条件**：大区块（标题 + 内容）应该始终渲染，内容区用内层 `v-if/v-else` 切换空状态和有数据状态，避免页面骨架在数据变化时消失/出现导致布局跳动
- **可访问性**：空状态本身也是有价值的信息，应该让用户知道"还没有数据"而非让区块直接消失

---

### BUG-20240424-003：userAnswersController 交卷时报 500（Unknown column 'NaN'）

#### 2.9.1 问题描述

交卷时 HTTP 500，后端报错：`Unknown column 'NaN' in 'field list'`。

#### 2.9.2 根因分析

`userAnswersController` 使用 `pool.query('INSERT ... VALUES ?', [values])` 批量插入时，若前端传了无效 `questionId`（如 `undefined`），`Number(undefined)` 返回 `NaN`，mysql2 将 `NaN` 字面量当作列名插入 SQL，导致报错。

**前端根因**：`Quiz.vue` 构建 `answers` 时没有过滤掉 `id` 无效的题目，导致无效数据流入后端。

#### 2.9.3 修复方案

**前端过滤（Quiz.vue）**：过滤掉 `id` 无效的题目后再构建 answers 数组：

```javascript
const answers = questions.value
    .filter(q => q.id != null && q.id !== '')
    .map(q => ({ ... }));
if (answers.length > 0) {
    await userAnswersApi.add({ userId, answers });
}
```

**后端防御（userAnswersController）**：改用逐条 INSERT + 类型校验，`INSERT IGNORE` 防重复：

```javascript
for (const a of answers) {
    const qid = Number(a.questionId);
    if (isNaN(qid) || qid <= 0) continue;
    const selectedIndex = a.selectedIndex != null ? Number(a.selectedIndex) : null;
    const isCorrect = a.isCorrect ? 1 : 0;
    await pool.query(
        `INSERT IGNORE INTO user_answers (user_id, question_id, selected_index, is_correct) VALUES (?, ?, ?, ?)`,
        [uid, qid, selectedIndex, isCorrect]
    );
}
```

#### 2.9.4 经验总结

- 数据必须在源头（前端）过滤，不应依赖后端兜底；后端防御性编程只能作为最后防线
- `Number(undefined)` 返回 `NaN`，`NaN` 被插入 SQL 时 mysql2 报 `Unknown column 'NaN'`

---

### BUG-20240424-004：Analytics setRange 缺少 renderRadarChart

#### 2.10.1 问题描述

统计页切换"全部/近一周/近一月"时，雷达图不响应，仅趋势图和分类错题图更新。

#### 2.10.2 根因分析

`setRange` 函数调用了 `calculateStats`、`renderTrendChart`、`renderCategoryChart`，但遗漏了 `renderRadarChart`。

```javascript
// 修复前
function setRange(newRange) {
    range.value = newRange;
    calculateStats();
    renderTrendChart();
    renderCategoryChart();   // 雷达图未重绘
}
```

#### 2.10.3 修复方案

```javascript
function setRange(newRange) {
    range.value = newRange;
    calculateStats();
    renderTrendChart();
    renderCategoryChart();
    renderRadarChart();   // ✅ 新增
}
```

#### 2.10.4 经验总结

- 同一类图表的重绘函数应保持一致的更新策略，避免遗漏导致部分图表"卡死"

---

## 三、Bug 修复经验总结

### 3.1 根因分类统计

| 根因类型 | 出现次数 | 代表性 Bug |
|---------|---------|-----------|
| 缺少必要参数/数据持久化 | 2 | BUG-001, BUG-005 |
| Vue 响应式状态管理不当 | 3 | BUG-005, BUG-006, BUG-004 |
| DOM 渲染时序问题 | 1 | BUG-004 |
| 前端数据解包路径错误 | 1 | BUG-005 |
| UI 数据格式错误 | 1 | BUG-002 |
| 复合状态判定不完整 | 1 | BUG-003 |
| 异步调用无 await + 错误被吞 | 1 | BUG-20240424-001 |
| 条件渲染导致页面结构缺失 | 1 | BUG-20240424-002 |

### 3.2 调试方法论

1. **复现优先**：修复前必须能稳定复现问题，无法复现的 Bug 无法验证修复
2. **分层排查**：从前端请求 → 后端接口 → 数据库，逐步确认数据在各层的状态
3. **日志追踪**：在关键流程节点添加 `console.log`，观察数据流向
4. **边界测试**：重点测试边界情况（空数据、极端值、并发请求）
5. **错误可见性**：异步 API 调用必须加入主流程 try/catch；重要数据的保存接口失败时必须对用户可见，不能只打印日志

### 3.3 防御性措施建议

| 问题类型 | 预防措施 |
|---------|---------|
| 参数缺失 | 后端所有接口增加参数校验，前端调用前增加类型检查 |
| 响应式失效 | 强制规范：所有组件状态必须用 `ref`/`reactive`，禁止使用普通变量 |
| DOM 时序 | ECharts 等依赖 DOM 尺寸的库统一在 `nextTick` 中初始化 |
| 数据流断裂 | 新增数据源时，同步检查所有依赖该数据的展示/分析功能 |
| 格式渲染错误 | UI 字符串统一使用 Unicode 字符，避免 HTML 实体 |

### 3.4 测试策略建议

| 测试类型 | 覆盖场景 |
|---------|---------|
| 单元测试 | Service 层业务逻辑（签到算法、推荐规则、能力计算） |
| 集成测试 | 完整答题提交流程（前端 → 后端 → 数据库 → 知识图谱展示） |
| UI 交互测试 | 空数据状态、ECharts 加载状态、雷达图无数据占位 |
| 边界测试 | 连续签到中断、目标进度为 0、并发提交同一试卷 |
