require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedData() {
    const connectionConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    };

    const connection = await mysql.createConnection(connectionConfig);

    try {
        await connection.query(`USE ${process.env.DB_NAME || 'interview_platform'}`);

        // 获取用户和题目
        const [users] = await connection.query('SELECT id, username FROM users LIMIT 5');
        const [questions] = await connection.query('SELECT id, title FROM questions LIMIT 10');

        if (users.length === 0) {
            console.log('没有用户，请先运行 initDb.js');
            return;
        }

        const adminUser = users.find(u => u.role === 'admin') || users[0];
        const normalUser = users.find(u => u.role === 'user') || users[0];
        const user3 = users[2] || users[0];

        console.log('正在插入论坛帖子数据...');

        // 插入帖子
        const postsData = [
            {
                user_id: adminUser.id,
                question_id: questions[0]?.id || null,
                title: '这道 Promise 题目做错了，求大佬解释！',
                content: '我理解了 Promise 是异步的，但是搞不清楚 setTimeout(0) 和 Promise.resolve().then() 的执行顺序。\n\n为什么会先输出 4 再输出 3 呢？Promise 不是应该先执行吗？',
                view_count: 42
            },
            {
                user_id: normalUser.id,
                question_id: questions[3]?.id || null,
                title: '关于 var、let、const 的作用域问题讨论',
                content: '最近在项目中遇到了变量提升的问题，查了很多资料终于搞清楚了。\n\n总结一下：\n1. var 有变量提升，会被提升到函数顶部\n2. let 和 const 有暂时性死区（TDZ），在声明之前不能访问\n3. const 声明的对象，其属性是可以修改的，只是不能重新赋值\n\n欢迎大家补充纠正！',
                view_count: 128
            },
            {
                user_id: user3?.id || normalUser.id,
                question_id: questions[5]?.id || null,
                title: '<article> 和 <section> 到底该怎么用？',
                content: '写页面的时候总是纠结这两个标签的选择。\n\n我的理解是：\n- <article> 表示独立完整的内容，可以单独分发\n- <section> 是文档中的一个章节\n\n但是实际开发中经常混用，有没有最佳实践？',
                view_count: 67
            },
            {
                user_id: normalUser.id,
                question_id: null,
                title: '前端面试八股文整理分享',
                content: '整理了一份前端面试常考知识点，包含：\n\n一、JavaScript\n- 执行上下文、作用域链、闭包\n- 原型链、继承\n- 事件循环\n- Promise、async/await\n\n二、CSS\n- 盒模型\n- Flexbox 布局\n- 响应式设计\n\n三、框架\n- Vue 响应式原理\n- React 虚拟 DOM\n- 状态管理\n\n需要的同学可以留言！',
                view_count: 256
            },
            {
                user_id: adminUser.id,
                question_id: questions[7]?.id || null,
                title: '字节跳动这道题考的是什么？',
                content: '刚做了字节的面试题，这道事件循环的题目把我整懵了。\n\n我一直以为 Promise.then 会比 setTimeout 先执行，结果发现不对。\n\n有没有大佬能详细讲解一下事件循环的执行顺序？',
                view_count: 89
            },
            {
                user_id: user3?.id || normalUser.id,
                question_id: null,
                title: '求助：localStorage 和 sessionStorage 的区别',
                content: '这两个 API 看起来很像，但是用起来有什么区别呢？\n\n我知道 sessionStorage 在关闭浏览器标签页后会清除，那 localStorage 呢？\n\n还有，它们的大小限制是多少？',
                view_count: 34
            },
            {
                user_id: normalUser.id,
                question_id: questions[9]?.id || null,
                title: 'CSS Flexbox 的 space-between 和 space-around 有什么区别？',
                content: '今天写样式的时候被这两个属性搞混了。\n\n测试了一下发现效果不太一样，但又说不上来具体区别在哪里。\n\n求大佬解释一下这两种分布方式的区别！',
                view_count: 45
            },
            {
                user_id: adminUser.id,
                question_id: null,
                title: '分享一个 Vue 3 面试被问到的题目',
                content: '面试官问我：Vue 3 的响应式系统是如何实现的？\n\n我回答了 Proxy 和 Reflect，结果面试官追问：为什么 Vue 3 放弃了 Object.defineProperty？\n\n这个问题要怎么回答比较好？',
                view_count: 178
            }
        ];

        for (const post of postsData) {
            const [result] = await connection.query(
                'INSERT INTO posts (user_id, question_id, title, content, view_count) VALUES (?, ?, ?, ?, ?)',
                [post.user_id, post.question_id, post.title, post.content, post.view_count]
            );

            // 给前几个帖子添加评论
            if (result.insertId <= 3) {
                const comments = [
                    {
                        user_id: users[(result.insertId % users.length) || 1]?.id || normalUser.id,
                        content: '这个问题我也遇到过，理解事件循环就好了！'
                    },
                    {
                        user_id: users[((result.insertId + 1) % users.length) || 0]?.id || adminUser.id,
                        content: '建议看看 Node.js 事件循环的文章，讲得很清楚。'
                    }
                ];

                for (const comment of comments) {
                    if (comment.user_id) {
                        await connection.query(
                            'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
                            [result.insertId, comment.user_id, comment.content]
                        );
                    }
                }
            }

            console.log(`帖子 "${post.title}" 已插入，ID: ${result.insertId}`);
        }

        console.log('\n论坛数据插入完成！');

        // 再添加 20 道新题目
        console.log('\n正在添加 20 道新题目...');

        const [existingCount] = await connection.query('SELECT COUNT(*) as count FROM questions');
        const existingIds = [];
        for (let i = 1; i <= existingCount[0].count; i++) {
            existingIds.push(i);
        }

        const newQuestions = [
            {
                title: '(2024 美团) 执行以下代码，输出顺序是什么？',
                code: `async function async1() {
  console.log("1");
  await async2();
  console.log("2");
}
async function async2() {
  console.log("3");
}
console.log("4");
setTimeout(() => console.log("5"), 0);
async1();
console.log("6");`,
                options: JSON.stringify([
                    {id: 'A', text: '1, 3, 2, 4, 6, 5'},
                    {id: 'B', text: '4, 1, 3, 6, 2, 5'},
                    {id: 'C', text: '4, 1, 3, 2, 6, 5'},
                    {id: 'D', text: '1, 3, 4, 6, 2, 5'}
                ]),
                correctAnswer: 'B',
                categoryId: 1
            },
            {
                title: '(2024 腾讯) 关于 TCP 三次握手，以下说法正确的是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '三次握手可以防止历史连接初始化混乱'},
                    {id: 'B', text: '第三次握手时，客户端已经可以发送数据'},
                    {id: 'C', text: 'SYN 洪水攻击利用了三次握手的漏洞'},
                    {id: 'D', text: '以上全部正确'}
                ]),
                correctAnswer: 'D',
                categoryId: 5
            },
            {
                title: '(2024 阿里) 下列 JavaScript 代码的输出是什么？',
                code: `const arr = [1, 2, 3];
const result = arr.reduce((acc, cur) => {
  acc.push(cur * 2);
  return acc;
}, []);
console.log(result);`,
                options: JSON.stringify([
                    {id: 'A', text: '[2, 4, 6]'},
                    {id: 'B', text: '[1, 2, 3, 2, 4, 6]'},
                    {id: 'C', text: '[6]'},
                    {id: 'D', text: '[undefined, 2, 4, 6]'}
                ]),
                correctAnswer: 'A',
                categoryId: 1
            },
            {
                title: '(2024 京东) 在 Vue 3 中，使用 setup 函数时，如何获取组件实例？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '通过 this 获取'},
                    {id: 'B', text: '通过 getCurrentInstance() 获取'},
                    {id: 'C', text: '通过 useCurrentInstance() 获取'},
                    {id: 'D', text: 'setup 中无法获取组件实例'}
                ]),
                correctAnswer: 'B',
                categoryId: 4
            },
            {
                title: '(2024 快手) 下面关于 HTTP/2 的说法，错误的是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'HTTP/2 使用二进制分帧层'},
                    {id: 'B', text: 'HTTP/2 支持多路复用'},
                    {id: 'C', text: 'HTTP/2 允许服务器主动推送资源'},
                    {id: 'D', text: 'HTTP/2 必须使用 HTTPS'}
                ]),
                correctAnswer: 'D',
                categoryId: 5
            },
            {
                title: '(2024 拼多多) 以下哪个 CSS 属性不会触发重排（reflow）？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'color'},
                    {id: 'B', text: 'width'},
                    {id: 'C', text: 'height'},
                    {id: 'D', text: 'margin'}
                ]),
                correctAnswer: 'A',
                categoryId: 2
            },
            {
                title: '(2024 网易) JavaScript 中，以下哪个不是创建对象的方式？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '使用对象字面量'},
                    {id: 'B', text: '使用 Object.create()'},
                    {id: 'C', text: '使用 new Object()'},
                    {id: 'D', text: '使用 Object.defineProperty() 直接创建'}
                ]),
                correctAnswer: 'D',
                categoryId: 1
            },
            {
                title: '(2024 B站) 下列关于 Webpack 的说法，正确的是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'Tree shaking 可以删除未使用的代码'},
                    {id: 'B', text: 'Code splitting 用于合并代码'},
                    {id: 'C', text: 'Loader 用于处理 JSON 文件'},
                    {id: 'D', text: 'Plugin 在构建完成后执行'}
                ]),
                correctAnswer: 'A',
                categoryId: 4
            },
            {
                title: '(2024 小米) 执行以下代码，最终 a 和 b 的值是多少？',
                code: `let a = { n: 1 };
let b = a;
a.x = a = { n: 2 };
console.log(a.x);
console.log(b.x);`,
                options: JSON.stringify([
                    {id: 'A', text: 'undefined, {n: 2}'},
                    {id: 'B', text: '{n: 2}, undefined'},
                    {id: 'C', text: '{n: 2}, {n: 2}'},
                    {id: 'D', text: 'undefined, undefined'}
                ]),
                correctAnswer: 'A',
                categoryId: 1
            },
            {
                title: '(2024 滴滴) 在 HTML5 中，哪个标签用于定义客户端脚本？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '<javascript>'},
                    {id: 'B', text: '<scripting>'},
                    {id: 'C', text: '<script>'},
                    {id: 'D', text: '<js>'}
                ]),
                correctAnswer: 'C',
                categoryId: 3
            },
            {
                title: '(2024 蚂蚁金服) 以下关于 React Hooks 的说法，正确的是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'useState 的更新是同步的'},
                    {id: 'B', text: 'useEffect 的依赖数组为空时，每次渲染都会执行'},
                    {id: 'C', text: 'useCallback 可以缓存函数'},
                    {id: 'D', text: 'useRef 不能访问 DOM 元素'}
                ]),
                correctAnswer: 'C',
                categoryId: 4
            },
            {
                title: '(2024 携程) 下列哪种 HTTP 状态码表示"请求超时"？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '400'},
                    {id: 'B', text: '404'},
                    {id: 'C', text: '408'},
                    {id: 'D', text: '504'}
                ]),
                correctAnswer: 'C',
                categoryId: 5
            },
            {
                title: '(2024 360) 执行 console.log(typeof null)，输出结果是什么？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '"null"'},
                    {id: 'B', text: '"undefined"'},
                    {id: 'C', text: '"object"'},
                    {id: 'D', text: '"boolean"'}
                ]),
                correctAnswer: 'C',
                categoryId: 1
            },
            {
                title: '(2024 好未来) CSS Grid 布局中，grid-template-columns: 1fr 2fr 1fr 表示什么意思？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '三列等宽'},
                    {id: 'B', text: '中间列是两边列的 2 倍宽'},
                    {id: 'C', text: '第一列和第三列宽度是中间列的一半'},
                    {id: 'D', text: 'B 和 C 都正确'}
                ]),
                correctAnswer: 'D',
                categoryId: 2
            },
            {
                title: '(2024 平安科技) 以下哪个是 ES6 新增的数据结构？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'Set'},
                    {id: 'B', text: 'Map'},
                    {id: 'C', text: 'WeakSet 和 WeakMap'},
                    {id: 'D', text: '以上全部是'}
                ]),
                correctAnswer: 'D',
                categoryId: 1
            },
            {
                title: '(2024 有赞) 下列哪个 HTML5 元素用于定义导航链接区域？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '<navigate>'},
                    {id: 'B', text: '<navigation>'},
                    {id: 'C', text: '<nav>'},
                    {id: 'D', text: '<links>'}
                ]),
                correctAnswer: 'C',
                categoryId: 3
            },
            {
                title: '(2024 虎牙) 在 JavaScript 中，如何判断一个对象是空对象？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: 'obj === {}'},
                    {id: 'B', text: 'Object.keys(obj).length === 0'},
                    {id: 'C', text: 'obj.length === 0'},
                    {id: 'D', text: 'JSON.stringify(obj) === "{}"'}
                ]),
                correctAnswer: 'B',
                categoryId: 1
            },
            {
                title: '(2024 斗鱼) 关于浏览器的同源策略（Same-Origin Policy），下列说法正确的是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '同源策略只限制 XMLHttpRequest 请求'},
                    {id: 'B', text: '不同源的页面可以相互读取 DOM'},
                    {id: 'C', text: 'CORS 可以解决跨域问题'},
                    {id: 'D', text: '同源策略不影响 Cookie 的读取'}
                ]),
                correctAnswer: 'C',
                categoryId: 5
            },
            {
                title: '(2024 珍爱网) 执行以下代码后，数组的长度是多少？',
                code: `let arr = [1, 2, 3, 4, 5];
arr.length = 2;
console.log(arr);`,
                options: JSON.stringify([
                    {id: 'A', text: '2'},
                    {id: 'B', text: '5'},
                    {id: 'C', text: '3'},
                    {id: 'D', text: '不确定'}
                ]),
                correctAnswer: 'A',
                categoryId: 1
            },
            {
                title: '(2024 微店) CSS 中，display: none 和 visibility: hidden 的主要区别是？',
                code: null,
                options: JSON.stringify([
                    {id: 'A', text: '前者隐藏元素并释放空间，后者隐藏但保留空间'},
                    {id: 'B', text: '两者效果完全相同'},
                    {id: 'C', text: '前者保留空间，后者释放空间'},
                    {id: 'D', text: '两者都不响应事件'}
                ]),
                correctAnswer: 'A',
                categoryId: 2
            }
        ];

        for (const q of newQuestions) {
            await connection.query(
                'INSERT INTO questions (title, code, options, correctAnswer, categoryId) VALUES (?, ?, ?, ?, ?)',
                [q.title, q.code, q.options, q.correctAnswer, q.categoryId]
            );
        }

        console.log('已添加 20 道新题目！');
        console.log('\n数据填充完成！');

    } catch (error) {
        console.error('数据填充失败:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
