require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    const connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    const connection = await mysql.createConnection(connectionConfig);

    try {
        console.log('正在创建数据库...');
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'interview_platform'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.query(`USE ${process.env.DB_NAME || 'interview_platform'}`);

        console.log('正在创建表...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL
            )
        `);

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

        await connection.query(`
            CREATE TABLE IF NOT EXISTS wrong_book (
                id INT PRIMARY KEY AUTO_INCREMENT,
                userId INT NOT NULL,
                questionId INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_question (userId, questionId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INT PRIMARY KEY AUTO_INCREMENT,
                userId INT NOT NULL,
                questionId INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_question_fav (userId, questionId)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS practice_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                userId INT NOT NULL,
                score INT DEFAULT 0,
                total INT NOT NULL,
                timeSpent INT DEFAULT 0,
                mode VARCHAR(20) NOT NULL DEFAULT 'normal',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id INT PRIMARY KEY AUTO_INCREMENT,
                questionId INT NOT NULL,
                reason TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (questionId) REFERENCES questions(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
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
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_answers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                question_id INT NOT NULL,
                selected_index TINYINT,
                is_correct BOOLEAN,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            )
        `);

        console.log('正在检查并插入分类...');
        const [catExists] = await connection.query('SELECT COUNT(*) as count FROM categories');
        if (catExists[0].count === 0) {
            await connection.query(`
                INSERT INTO categories (id, name) VALUES
                (1, 'JavaScript'),
                (2, 'CSS'),
                (3, 'HTML'),
                (4, 'Vue/前端框架'),
                (5, 'HTTP/网络')
            `);
            console.log('已插入 5 个分类');
        } else {
            console.log('分类已存在，跳过');
        }

        console.log('正在检查并插入题目...');
        const [qExists] = await connection.query('SELECT COUNT(*) as count FROM questions');
        if (qExists[0].count === 0) {
            const questionsData = [
                [1, '(2024 小红书) 下面的代码使用了 Promise，请问输出结果是什么？', '\nfunction delay(ms) {\n  return new Promise(resolve => setTimeout(resolve, ms));\n}\nconsole.log("Start");\ndelay(1000).then(() => console.log("Hello!"));\nconsole.log("End");\n    ', JSON.stringify([{id:'A',text:'Start, End, Hello!'},{id:'B',text:'Start, Hello!, End'},{id:'C',text:'End, Start, Hello!'},{id:'D',text:'Hello!, Start, End'}]), 'A', 1],
                [2, '(2025 字节) 关于 AJAX 请求的步骤，哪个选项是正确的？', null, JSON.stringify([{id:'A',text:'创建 XMLHttpRequest 对象, 设置请求方法和 URL, 发送请求, 处理响应数据'},{id:'B',text:'创建 XMLHttpRequest 对象, 设置请求方法和 URL, 处理响应数据, 发送请求'},{id:'C',text:'设置请求方法和 URL, 创建 XMLHttpRequest 对象, 发送请求, 处理响应数据'},{id:'D',text:'发送请求, 创建 XMLHttpRequest 对象, 设置请求方法和 URL, 处理响应数据'}]), 'A', 1],
                [3, '在 CSS 中，要让一个元素相对于其最近的已定位（非 static）的祖先元素进行定位，应该使用哪个 position 值？', null, JSON.stringify([{id:'A',text:'static'},{id:'B',text:'relative'},{id:'C',text:'absolute'},{id:'D',text:'fixed'}]), 'C', 2],
                [4, '关于 JavaScript 中的 let, const, var 声明变量的方式，下列说法错误的是？', null, JSON.stringify([{id:'A',text:'var 声明的变量存在变量提升（hoisting）'},{id:'B',text:'let 和 const 声明的变量存在块级作用域'},{id:'C',text:'const 声明一个对象后，该对象的属性值不能被修改'},{id:'D',text:'在全局作用域下，var 声明的变量会成为 window 对象的属性'}]), 'C', 1],
                [5, '在 CSS 盒模型中，设置 box-sizing: border-box; 后，元素的宽度（width）计算方式是？', null, JSON.stringify([{id:'A',text:'宽度 = 内容区宽度'},{id:'B',text:'宽度 = 内容区宽度 + 内边距（padding）'},{id:'C',text:'宽度 = 内容区宽度 + 内边距（padding）+ 边框（border）'},{id:'D',text:'宽度 = 内容区宽度 + 内边距（padding）+ 边框（border）+ 外边距（margin）'}]), 'C', 2],
                [6, '以下哪个 HTML 标签最适合用于表示一个独立的、完整的、可以独立于网站其余部分进行分发或重用的内容块（如一篇博客文章、一则新闻）？', null, JSON.stringify([{id:'A',text:'<section>'},{id:'B',text:'<article>'},{id:'C',text:'<div>'},{id:'D',text:'<aside>'}]), 'B', 3],
                [7, '观察以下代码，两次 console.log 的输出分别是什么？', '\nconst person = {\n  name: \'老王\',\n  sayHi: function() {\n    console.log(this.name);\n  },\n  sayHiArrow: () => {\n    console.log(this.name);\n  }\n};\nperson.sayHi();\nperson.sayHiArrow();\n    ', JSON.stringify([{id:'A',text:'老王, 老王'},{id:'B',text:'undefined, 老王'},{id:'C',text:'老王, undefined (或全局 name)'},{id:'D',text:'undefined, undefined'}]), 'C', 1],
                [8, '下列代码的输出结果是什么？', '\nconsole.log(1);\nsetTimeout(() => {\n  console.log(2);\n}, 0);\nPromise.resolve().then(() => {\n  console.log(3);\n});\nconsole.log(4);\n    ', JSON.stringify([{id:'A',text:'1, 2, 3, 4'},{id:'B',text:'1, 4, 2, 3'},{id:'C',text:'1, 2, 4, 3'},{id:'D',text:'1, 4, 3, 2'}]), 'D', 1],
                [9, '在 CSS Flexbox 布局中，要让弹性项目（flex items）在主轴上两端对齐，中间项目等间距分布，应该使用哪个属性值？', null, JSON.stringify([{id:'A',text:'justify-content: center;'},{id:'B',text:'justify-content: space-around;'},{id:'C',text:'justify-content: space-between;'},{id:'D',text:'justify-content: space-evenly;'}]), 'C', 2],
                [10, '关于浏览器的 localStorage 和 sessionStorage，下列说法正确的是？', null, JSON.stringify([{id:'A',text:'两者都遵循同源策略'},{id:'B',text:'sessionStorage 的数据在浏览器关闭后依然存在'},{id:'C',text:'localStorage 的数据在同一浏览器的不同标签页之间不共享'},{id:'D',text:'两者存储的数据大小都没有限制'}]), 'A', 1],
                [11, '一个被 async 关键字修饰的函数，其返回值总是什么？', null, JSON.stringify([{id:'A',text:'一个 Promise 对象'},{id:'B',text:'一个普通对象'},{id:'C',text:'undefined'},{id:'D',text:'一个 Generator 函数'}]), 'A', 1],
                [12, '在 HTML 的 <script> 标签中，defer 和 async 属性的主要区别是？', null, JSON.stringify([{id:'A',text:'没有区别，它们是同义词'},{id:'B',text:'async 脚本会阻塞 HTML 解析，而 defer 不会'},{id:'C',text:'defer 脚本会按顺序执行，而 async 脚本不保证顺序'},{id:'D',text:'defer 脚本在 DOMContentLoaded 事件之前执行，async 在之后'}]), 'C', 3],
                [13, '要将一个数组 [1, 2, 3] 转换为 [2, 4, 6]，使用哪个数组方法最高效简洁？', null, JSON.stringify([{id:'A',text:'.forEach()'},{id:'B',text:'.filter()'},{id:'C',text:'.reduce()'},{id:'D',text:'.map()'}]), 'D', 1],
                [14, '以下哪个 CSS 选择器的权重（Specificity）最高？', null, JSON.stringify([{id:'A',text:'div.container p'},{id:'B',text:'#main-content p'},{id:'C',text:'p[data-type=\'important\']'},{id:'D',text:'.container .item'}]), 'B', 2],
                [15, '在 Vue 或 React 中，进行列表渲染（如 v-for 或 .map）时，提供 key 属性的主要目的是什么？', null, JSON.stringify([{id:'A',text:'为每个元素提供一个唯一的 CSS 钩子'},{id:'B',text:'帮助框架高效地更新虚拟 DOM，进行 DOM-diff 操作'},{id:'C',text:'用于在父组件中通过 key 直接访问子组件实例'},{id:'D',text:'它是一个必需的属性，没有它代码会报错'}]), 'B', 4],
                [16, '关于 JavaScript 中的 == 和 ===，下列哪个表达式的结果为 false？', null, JSON.stringify([{id:'A',text:'null == undefined'},{id:'B',text:'\n2\' == 2'},{id:'C',text:'false == 0'},{id:'D',text:'\n2\' === 2'}]), 'D', 1],
                [17, '一个元素的 CSS 属性设置为 position: fixed;，它的定位是相对于哪个参照物？', null, JSON.stringify([{id:'A',text:'其父元素'},{id:'B',text:'最近的已定位（非 static）的祖先元素'},{id:'C',text:'<html> 元素'},{id:'D',text:'浏览器视口（viewport）'}]), 'D', 2],
                [18, '在 HTTP 协议中，哪种请求方法通常被认为是幂等的（Idempotent），即多次执行同一请求应产生相同的结果？', null, JSON.stringify([{id:'A',text:'POST'},{id:'B',text:'PUT'},{id:'C',text:'PATCH'},{id:'D',text:'DELETE'}]), 'B', 5],
                [19, '执行以下代码后，a 和 b 的值分别是什么？', '\nlet [a, , b] = [1, 2, 3, 4];\n    ', JSON.stringify([{id:'A',text:'1, 2'},{id:'B',text:'1, 3'},{id:'C',text:'1, 4'},{id:'D',text:'undefined, undefined'}]), 'B', 1],
                [20, '下列哪个操作是 JavaScript 中的"事件委托"（Event Delegation）的典型应用？', null, JSON.stringify([{id:'A',text:'给 100 个按钮分别绑定 100 个点击事件'},{id:'B',text:'在一个 <ul> 元素上监听点击事件，来处理其所有 <li> 子项的点击'},{id:'C',text:'使用 setTimeout 来延迟一个函数的执行'},{id:'D',text:'在一个函数内部返回另一个函数'}]), 'B', 1],
                [21, '执行 console.log(typeof null) 的输出是什么？', null, JSON.stringify([{id:'A',text:'\'null\''},{id:'B',text:'\'undefined\''},{id:'C',text:'\'object\''},{id:'D',text:'\'boolean\''}]), 'C', 1],
                [22, '下列代码的输出是什么？', '\nvar a = 10;\nfunction test() {\n  console.log(a);\n  var a = 20;\n  console.log(a);\n}\ntest();\n    ', JSON.stringify([{id:'A',text:'10, 20'},{id:'B',text:'undefined, 20'},{id:'C',text:'10, undefined'},{id:'D',text:'undefined, undefined'}]), 'B', 1],
                [23, '关于 Vue 3 中的 Composition API，以下说法正确的是？', null, JSON.stringify([{id:'A',text:'setup() 函数在 created 生命周期之前同步执行'},{id:'B',text:'ref() 用于定义响应式对象，reactive() 用于定义响应式基本类型'},{id:'C',text:'computed() 返回的值是不可变的'},{id:'D',text:'watch() 和 watchEffect() 效果完全相同'}]), 'A', 4],
                [24, '在 CSS Grid 布局中，要让某元素占据从第 2 条纵线到第 4 条纵线之间的区域，正确的 grid-column 属性写法是？', null, JSON.stringify([{id:'A',text:'grid-column: 2 / 4;'},{id:'B',text:'grid-column: 2 to 4;'},{id:'C',text:'grid-column: 2 - 4;'},{id:'D',text:'grid-column: span 2 from 2;'}]), 'A', 2],
                [25, 'HTTP 状态码 304 表示什么？', null, JSON.stringify([{id:'A',text:'服务器内部错误'},{id:'B',text:'找不到资源'},{id:'C',text:'未修改，客户端可以使用缓存'},{id:'D',text:'请求格式错误'}]), 'C', 5],
                [26, '以下哪个方法可以深拷贝一个 JavaScript 对象？', null, JSON.stringify([{id:'A',text:'Object.assign()'},{id:'B',text:'Array.from()'},{id:'C',text:'JSON.parse(JSON.stringify(obj))'},{id:'D',text:'arr.slice()'}]), 'C', 1],
                [27, '在 CSS 中，z-index 属性只在哪些情况下才会生效？', null, JSON.stringify([{id:'A',text:'所有元素'},{id:'B',text:'position 值为 relative 或 absolute 的元素'},{id:'C',text:'position 值为 static 以外（relative, absolute, fixed, sticky）的元素'},{id:'D',text:'所有块级元素'}]), 'C', 2],
                [28, '关于浏览器的渲染过程，以下顺序正确的是？', null, JSON.stringify([{id:'A',text:'解析 HTML -> 构建 DOM -> 构建 CSSOM -> 布局 -> 绘制'},{id:'B',text:'构建 DOM -> 解析 HTML -> 构建 CSSOM -> 绘制 -> 布局'},{id:'C',text:'解析 HTML -> 绘制 -> 布局 -> 构建 DOM -> 构建 CSSOM'},{id:'D',text:'构建 DOM -> 构建 CSSOM -> 解析 HTML -> 布局 -> 绘制'}]), 'A', 5],
                [29, '下列代码执行后，arr 的长度是多少？', '\nconst arr = [1, 2, 3, 4, 5];\narr.length = 2;\nconsole.log(arr);\n    ', JSON.stringify([{id:'A',text:'5'},{id:'B',text:'2'},{id:'C',text:'3'},{id:'D',text:'0'}]), 'B', 1],
                [30, '在 HTML5 中，哪个元素用于定义文档或文章的头部区域？', null, JSON.stringify([{id:'A',text:'<top>'},{id:'B',text:'<header>'},{id:'C',text:'<head>'},{id:'D',text:'<banner>'}]), 'B', 3],
                [31, '关于 JavaScript 中的 Generator 函数，以下说法正确的是？', null, JSON.stringify([{id:'A',text:'Generator 函数可以用普通 function 关键字声明'},{id:'B',text:'Generator 函数每次调用 next() 都会执行到函数末尾'},{id:'C',text:'Generator 函数可以使用 yield 关键字暂停执行并返回值'},{id:'D',text:'Generator 函数不能作为类的构造函数使用'}]), 'C', 1],
                [32, 'CSS 中 display: none 与 visibility: hidden 的主要区别是？', null, JSON.stringify([{id:'A',text:'两者完全等价，只是写法不同'},{id:'B',text:'display: none 不占据文档流空间，visibility: hidden 占据'},{id:'C',text:'visibility: hidden 不占据文档流空间，display: none 占据'},{id:'D',text:'两者都不占据文档流空间'}]), 'B', 2],
                [33, '执行以下代码，输出结果是什么？', '\nconst arr = [3, 1, 4, 1, 5, 9];\nconst result = arr.reduce((sum, n) => sum + n, 0);\nconsole.log(result);\n    ', JSON.stringify([{id:'A',text:'23'},{id:'B',text:'[3, 1, 4, 1, 5, 9]'},{id:'C',text:'undefined'},{id:'D',text:'{total: 23}'}]), 'A', 1],
                [34, '关于 Vue 中的 v-if 和 v-show，下列说法正确的是？', null, JSON.stringify([{id:'A',text:'v-if 和 v-show 都是通过 CSS display 属性来控制显示隐藏'},{id:'B',text:'v-if 是真正的条件渲染，v-show 通过 CSS display 控制'},{id:'C',text:'v-if 在初始渲染时就会渲染所有符合条件的元素'},{id:'D',text:'v-show 切换时会产生销毁和重建 DOM 的开销'}]), 'B', 4],
                [35, '在 TCP/IP 四层模型中，HTTP 协议属于哪一层？', null, JSON.stringify([{id:'A',text:'网络接口层'},{id:'B',text:'网络层'},{id:'C',text:'传输层'},{id:'D',text:'应用层'}]), 'D', 5],
                [36, '下列哪个方法可以清空一个数组 arr？', null, JSON.stringify([{id:'A',text:'arr = []'},{id:'B',text:'arr.length = 0'},{id:'C',text:'arr.clear()'},{id:'D',text:'arr.removeAll()'}]), 'B', 1],
                [37, '在 CSS 中，1rem 等于多少像素？', null, JSON.stringify([{id:'A',text:'10px'},{id:'B',text:'16px'},{id:'C',text:'浏览器默认字号，通常 16px'},{id:'D',text:'等于 1em'}]), 'C', 2],
                [38, '执行 console.log(0.1 + 0.2 === 0.3) 的结果是什么？', null, JSON.stringify([{id:'A',text:'true'},{id:'B',text:'false'},{id:'C',text:'undefined'},{id:'D',text:'NaN'}]), 'B', 1],
                [39, '关于浏览器的同源策略（Same-Origin Policy），以下哪个不是跨域解决方案？', null, JSON.stringify([{id:'A',text:'CORS'},{id:'B',text:'JSONP'},{id:'C',text:'document.domain'},{id:'D',text:'localStorage.setItem'}]), 'D', 5],
                [40, '在 Vue 3 中，以下哪个不是获取 DOM 元素的正确方式？', null, JSON.stringify([{id:'A',text:'在标签上使用 ref="myRef"，然后通过 this.$refs.myRef 访问'},{id:'B',text:'在 <script setup> 中使用 ref，在标签上使用 ref="myRef"，通过 myRef.value 访问'},{id:'C',text:'使用 document.getElementById()'},{id:'D',text:'使用 document.querySelector()'}]), 'A', 4],
                [41, '以下哪个 CSS 属性可以修改列表项的图标？', null, JSON.stringify([{id:'A',text:'list-icon'},{id:'B',text:'list-style-image'},{id:'C',text:'list-marker'},{id:'D',text:'list-bullet'}]), 'B', 2],
                [42, '关于 JavaScript 中的 this，以下哪个场景中 this 指向的是 window（全局对象）？', null, JSON.stringify([{id:'A',text:'对象方法内部通过 object.method() 调用'},{id:'B',text:'定时器 setTimeout 中的回调函数（默认绑定）'},{id:'C',text:'事件处理函数中通过 addEventListener 绑定'},{id:'D',text:'构造函数中使用 new 关键字调用'}]), 'B', 1],
                [43, '在 HTML 中，<meta charset="UTF-8"> 的作用是什么？', null, JSON.stringify([{id:'A',text:'设置网页的标题'},{id:'B',text:'设置网页的关键词用于 SEO'},{id:'C',text:'声明网页使用的字符编码为 UTF-8'},{id:'D',text:'设置网页的视口宽度'}]), 'C', 3],
                [44, '以下哪个数组方法的参数是一个回调函数，返回一个新数组？', null, JSON.stringify([{id:'A',text:'forEach'},{id:'B',text:'some'},{id:'C',text:'find'},{id:'D',text:'filter'}]), 'D', 1],
                [45, '关于 CSS 的层叠（cascade）规则，以下优先级从高到低正确的是？', null, JSON.stringify([{id:'A',text:'内联样式 > ID选择器 > 类选择器 > 元素选择器'},{id:'B',text:'ID选择器 > 内联样式 > 类选择器 > 元素选择器'},{id:'C',text:'元素选择器 > 类选择器 > ID选择器 > 内联样式'},{id:'D',text:'类选择器 > 内联样式 > ID选择器 > 元素选择器'}]), 'A', 2],
                [46, '执行以下代码，输出结果是什么？', '\nfunction fibonacci(n) {\n  return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2);\n}\nconsole.log(fibonacci(5));\n    ', JSON.stringify([{id:'A',text:'5'},{id:'B',text:'8'},{id:'C',text:'10'},{id:'D',text:'13'}]), 'A', 1],
                [47, '关于 JavaScript 中的 Promise，以下说法错误的是？', null, JSON.stringify([{id:'A',text:'Promise 有三种状态：pending、fulfilled、rejected'},{id:'B',text:'Promise 一旦状态变更就不能再改变'},{id:'C',text:'Promise.then() 可以链式调用'},{id:'D',text:'Promise.all() 在其中一个 Promise 失败时不会调用 catch'}]), 'D', 1],
                [48, '在 CSS 中，如何让一个 flex 容器的主轴方向变为纵向（从上到下）？', null, JSON.stringify([{id:'A',text:'flex-direction: column;'},{id:'B',text:'flex-direction: row-reverse;'},{id:'C',text:'flex-wrap: wrap;'},{id:'D',text:'flex-flow: column;'}]), 'A', 2],
                [49, '关于 DNS 解析的顺序，以下哪个是正确的？', null, JSON.stringify([{id:'A',text:'浏览器缓存 -> 操作系统缓存 -> Hosts文件 -> DNS服务器'},{id:'B',text:'操作系统缓存 -> 浏览器缓存 -> Hosts文件 -> DNS服务器'},{id:'C',text:'Hosts文件 -> 浏览器缓存 -> 操作系统缓存 -> DNS服务器'},{id:'D',text:'DNS服务器 -> 浏览器缓存 -> 操作系统缓存 -> Hosts文件'}]), 'A', 5],
                [50, '执行以下代码，最终 arr 和 obj 的值分别是什么？', '\nlet arr = [1, 2, 3];\nlet obj = { name: \'test\' };\nconst arrRef = arr;\nconst objRef = obj;\narrRef.push(4);\nobjRef.age = 25;\nconsole.log(arr, obj);\n    ', JSON.stringify([{id:'A',text:'[1,2,3] 和 {name:\'test\'}'},{id:'B',text:'[1,2,3,4] 和 {name:\'test\', age:25}'},{id:'C',text:'[1,2,3] 和 {name:\'test\', age:25}'},{id:'D',text:'[1,2,3,4] 和 {name:\'test\'}'}]), 'B', 1]
            ];

            for (const q of questionsData) {
                await connection.query(
                    'INSERT INTO questions (id, title, code, options, correctAnswer, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
                    q
                );
            }
            console.log('已插入 50 道题目');
        } else {
            console.log('题目已存在，跳过');
        }

        console.log('正在检查并创建测试用户...');
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (users[0].count === 0) {
            const hashedPassword1 = await bcrypt.hash('admin123', 10);
            await connection.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword1, 'admin']
            );

            const hashedPassword2 = await bcrypt.hash('Tony1997630', 10);
            await connection.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['tl', hashedPassword2, 'user']
            );

            console.log('测试用户已创建: admin/admin123, tl/Tony1997630');
        } else {
            console.log('用户已存在，跳过');
        }

        console.log('数据库初始化完成！');
    } catch (error) {
        console.error('初始化失败:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
