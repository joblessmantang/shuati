-- 创建数据库
CREATE DATABASE IF NOT EXISTS interview_platform
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE interview_platform;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL
);

-- 题目表（完全匹配前端 db.json 的结构）
CREATE TABLE IF NOT EXISTS questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title TEXT NOT NULL,
    code TEXT,
    options JSON NOT NULL,
    correctAnswer VARCHAR(10) NOT NULL,
    categoryId INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
);

-- 错题本表
CREATE TABLE IF NOT EXISTS wrong_book (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    questionId INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (userId, questionId)
);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    questionId INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question_fav (userId, questionId)
);

-- 练习历史表
CREATE TABLE IF NOT EXISTS practice_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    score INT DEFAULT 0,
    total INT NOT NULL,
    timeSpent INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- 举报表
CREATE TABLE IF NOT EXISTS reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    questionId INT NOT NULL,
    reason TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE
);

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT DEFAULT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    view_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户答题记录表（用于统计）
CREATE TABLE IF NOT EXISTS user_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_index TINYINT,
    is_correct BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- 插入分类
INSERT INTO categories (id, name) VALUES
(1, 'JavaScript'),
(2, 'CSS'),
(3, 'HTML'),
(4, 'Vue/前端框架'),
(5, 'HTTP/网络');

-- 插入题目（20道，与 db.json 一致）
INSERT INTO questions (id, title, code, options, correctAnswer, categoryId) VALUES
(1, '(2024 小红书) 下面的代码使用了 Promise，请问输出结果是什么？', '\nfunction delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\nconsole.log("Start");\ndelay(1000).then(() => console.log("Hello!"));\nconsole.log("End");\n    ', '[{"id":"A","text":"Start, End, Hello!"},{"id":"B","text":"Start, Hello!, End"},{"id":"C","text":"End, Start, Hello!"},{"id":"D","text":"Hello!, Start, End"}]', 'A', 1),
(2, '(2025 字节) 关于 AJAX 请求的步骤，哪个选项是正确的？', NULL, '[{"id":"A","text":"创建 XMLHttpRequest 对象, 设置请求方法和 URL, 发送请求, 处理响应数据"},{"id":"B","text":"创建 XMLHttpRequest 对象, 设置请求方法和 URL, 处理响应数据, 发送请求"},{"id":"C","text":"设置请求方法和 URL, 创建 XMLHttpRequest 对象, 发送请求, 处理响应数据"},{"id":"D","text":"发送请求, 创建 XMLHttpRequest 对象, 设置请求方法和 URL, 处理响应数据"}]', 'A', 1),
(3, '在 CSS 中，要让一个元素相对于其最近的已定位（非 static）的祖先元素进行定位，应该使用哪个 position 值？', NULL, '[{"id":"A","text":"static"},{"id":"B","text":"relative"},{"id":"C","text":"absolute"},{"id":"D","text":"fixed"}]', 'C', 2),
(4, '关于 JavaScript 中的 let, const, var 声明变量的方式，下列说法错误的是？', NULL, '[{"id":"A","text":"var 声明的变量存在变量提升（hoisting）"},{"id":"B","text":"let 和 const 声明的变量存在块级作用域"},{"id":"C","text":"const 声明一个对象后，该对象的属性值不能被修改"},{"id":"D","text":"在全局作用域下，var 声明的变量会成为 window 对象的属性"}]', 'C', 1),
(5, '在 CSS 盒模型中，设置 box-sizing: border-box; 后，元素的宽度（width）计算方式是？', NULL, '[{"id":"A","text":"宽度 = 内容区宽度"},{"id":"B","text":"宽度 = 内容区宽度 + 内边距（padding）"},{"id":"C","text":"宽度 = 内容区宽度 + 内边距（padding）+ 边框（border）"},{"id":"D","text":"宽度 = 内容区宽度 + 内边距（padding）+ 边框（border）+ 外边距（margin）"}]', 'C', 2),
(6, '以下哪个 HTML 标签最适合用于表示一个独立的、完整的、可以独立于网站其余部分进行分发或重用的内容块（如一篇博客文章、一则新闻）？', NULL, '[{"id":"A","text":"<section>"},{"id":"B","text":"<article>"},{"id":"C","text":"<div>"},{"id":"D","text":"<aside>"}]', 'B', 3),
(7, '观察以下代码，两次 console.log 的输出分别是什么？', '\nconst person = {\n  name: \'老王\',\n  sayHi: function() {\n    console.log(this.name);\n  },\n  sayHiArrow: () => {\n    console.log(this.name);\n  }\n};\nperson.sayHi();\nperson.sayHiArrow();\n    ', '[{"id":"A","text":"老王, 老王"},{"id":"B","text":"undefined, 老王"},{"id":"C","text":"老王, undefined (或全局 name)"},{"id":"D","text":"undefined, undefined"}]', 'C', 1),
(8, '下列代码的输出结果是什么？', '\nconsole.log(1);\nsetTimeout(() => {\n  console.log(2);\n}, 0);\nPromise.resolve().then(() => {\n  console.log(3);\n});\nconsole.log(4);\n    ', '[{"id":"A","text":"1, 2, 3, 4"},{"id":"B","text":"1, 4, 2, 3"},{"id":"C","text":"1, 2, 4, 3"},{"id":"D","text":"1, 4, 3, 2"}]', 'D', 1),
(9, '在 CSS Flexbox 布局中，要让弹性项目（flex items）在主轴上两端对齐，中间项目等间距分布，应该使用哪个属性值？', NULL, '[{"id":"A","text":"justify-content: center;"},{"id":"B","text":"justify-content: space-around;"},{"id":"C","text":"justify-content: space-between;"},{"id":"D","text":"justify-content: space-evenly;"}]', 'C', 2),
(10, '关于浏览器的 localStorage 和 sessionStorage，下列说法正确的是？', NULL, '[{"id":"A","text":"两者都遵循同源策略"},{"id":"B","text":"sessionStorage 的数据在浏览器关闭后依然存在"},{"id":"C","text":"localStorage 的数据在同一浏览器的不同标签页之间不共享"},{"id":"D","text":"两者存储的数据大小都没有限制"}]', 'A', 1),
(11, '一个被 async 关键字修饰的函数，其返回值总是什么？', NULL, '[{"id":"A","text":"一个 Promise 对象"},{"id":"B","text":"一个普通对象"},{"id":"C","text":"undefined"},{"id":"D","text":"一个 Generator 函数"}]', 'A', 1),
(12, '在 HTML 的 <script> 标签中，defer 和 async 属性的主要区别是？', NULL, '[{"id":"A","text":"没有区别，它们是同义词"},{"id":"B","text":"async 脚本会阻塞 HTML 解析，而 defer 不会"},{"id":"C","text":"defer 脚本会按顺序执行，而 async 脚本不保证顺序"},{"id":"D","text":"defer 脚本在 DOMContentLoaded 事件之前执行，async 在之后"}]', 'C', 3),
(13, '要将一个数组 [1, 2, 3] 转换为 [2, 4, 6]，使用哪个数组方法最高效简洁？', NULL, '[{"id":"A","text":".forEach()"},{"id":"B","text":".filter()"},{"id":"C","text":".reduce()"},{"id":"D","text":".map()"}]', 'D', 1),
(14, '以下哪个 CSS 选择器的权重（Specificity）最高？', NULL, '[{"id":"A","text":"div.container p"},{"id":"B","text":"#main-content p"},{"id":"C","text":"p[data-type=\'important\']"},{"id":"D","text":".container .item"}]', 'B', 2),
(15, '在 Vue 或 React 中，进行列表渲染（如 v-for 或 .map）时，提供 key 属性的主要目的是什么？', NULL, '[{"id":"A","text":"为每个元素提供一个唯一的 CSS 钩子"},{"id":"B","text":"帮助框架高效地更新虚拟 DOM，进行 DOM-diff 操作"},{"id":"C","text":"用于在父组件中通过 key 直接访问子组件实例"},{"id":"D","text":"它是一个必需的属性，没有它代码会报错"}]', 'B', 4),
(16, '关于 JavaScript 中的 == 和 ===，下列哪个表达式的结果为 false？', NULL, '[{"id":"A","text":"null == undefined"},{"id":"B","text":"\'2\' == 2"},{"id":"C","text":"false == 0"},{"id":"D","text":"\'2\' === 2"}]', 'D', 1),
(17, '一个元素的 CSS 属性设置为 position: fixed;，它的定位是相对于哪个参照物？', NULL, '[{"id":"A","text":"其父元素"},{"id":"B","text":"最近的已定位（非 static）的祖先元素"},{"id":"C","text":"<html> 元素"},{"id":"D","text":"浏览器视口（viewport）"}]', 'D', 2),
(18, '在 HTTP 协议中，哪种请求方法通常被认为是幂等的（Idempotent），即多次执行同一请求应产生相同的结果？', NULL, '[{"id":"A","text":"POST"},{"id":"B","text":"PUT"},{"id":"C","text":"PATCH"},{"id":"D","text":"DELETE"}]', 'B', 5),
(19, '执行以下代码后，a 和 b 的值分别是什么？', '\nlet [a, , b] = [1, 2, 3, 4];\n    ', '[{"id":"A","text":"1, 2"},{"id":"B","text":"1, 3"},{"id":"C","text":"1, 4"},{"id":"D","text":"undefined, undefined"}]', 'B', 1),
(20, '下列哪个操作是 JavaScript 中的"事件委托"（Event Delegation）的典型应用？', NULL, '[{"id":"A","text":"给 100 个按钮分别绑定 100 个点击事件"},{"id":"B","text":"在一个 <ul> 元素上监听点击事件，来处理其所有 <li> 子项的点击"},{"id":"C","text":"使用 setTimeout 来延迟一个函数的执行"},{"id":"D","text":"在一个函数内部返回另一个函数"}]', 'B', 1);
