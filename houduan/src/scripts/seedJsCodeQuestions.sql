-- JS 代码题演示数据
-- 执行方式：Get-Content src/scripts/seedJsCodeQuestions.sql -Encoding UTF8 | mysql -u root -p -D interview_platform --default-character-set=utf8mb4

USE interview_platform;

-- ========== JS 代码题演示数据 ==========
-- 每条记录用 LAST_INSERT_ID() 关联 questions 和 question_js_code

-- 题目 1：看代码判断输出结果（选择题）
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，控制台输出什么？', NULL,
 '[{"id":"A","text":"5"},{"id":"B","text":"10"},{"id":"C","text":"undefined"},{"id":"D","text":"NaN"}]',
 'B', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'var a = 5;
function foo() {
  console.log(a);
  var a = 10;
}
foo();',
'select',
'变量提升（Hoisting）：函数内部用 var 声明的变量会被提升到函数顶部，但赋值留在原位。因此 console.log(a) 执行时，a 已经被声明但尚未赋值，结果是 undefined。',
2,
'变量提升,var,作用域');

-- 题目 2：闭包与计数器
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，三个 console.log 的输出依次是什么？', NULL,
 '[{"id":"A","text":"1, 2, 3"},{"id":"B","text":"0, 1, 2"},{"id":"C","text":"3, 3, 3"},{"id":"D","text":"1, 1, 1"}]',
 'C', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'function createCounters() {
  var counters = [];
  for (var i = 0; i < 3; i++) {
    counters.push(function() { return i; });
  }
  return counters;
}
var funcs = createCounters();
console.log(funcs[0]());
console.log(funcs[1]());
console.log(funcs[2]());',
'select',
'闭包捕获的是变量的引用，而非值。循环结束后 i 的值为 3，三个函数都引用同一个 i，因此都返回 3。使用 let 代替 var 可以解决此问题（块级作用域）。',
3,
'闭包,var,循环,作用域');

-- 题目 3：Promise 链式调用
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，最终 x 的值是多少？', NULL,
 '[{"id":"A","text":"1"},{"id":"B","text":"2"},{"id":"C","text":"undefined"},{"id":"D","text":"报错"}]',
 'A', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'var x = 1;
Promise.resolve()
  .then(function() { x = 2; })
  .then(function() { x = 3; })
  .then(function() { console.log(x); });',
'select',
'Promise.then() 是微任务，会在当前同步代码执行完后才执行。第一个 .then 将 x 改为 2，后续 .then 依次执行，最终输出 3。但这里问的是 x 的值，需要注意同步代码和微任务的执行顺序。',
2,
'Promise,微任务,事件循环');

-- 题目 4：this 指向（构造函数）
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，person.say() 的输出是什么？', NULL,
 '[{"id":"A","text":"Alice"},{"id":"B","text":"Bob"},{"id":"C","text":"undefined"},{"id":"D","text":"(空字符串)"}]',
 'B', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'function Person(name) {
  this.name = name;
}
Person.prototype.say = function() {
  return this.name;
};
var person = Person("Bob");
console.log(person.say());',
'select',
'构造函数调用时缺少 new 关键字，此时 this 指向全局对象（浏览器中为 window）。在非严格模式下，window.name 默认值为空字符串（浏览器的特殊行为）。正确写法应为 new Person("Bob")。',
2,
'this指向,构造函数,new关键字');

-- 题目 5：数组方法（选择题）
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，最后 arr 的长度是多少？', NULL,
 '[{"id":"A","text":"1"},{"id":"B","text":"2"},{"id":"C","text":"3"},{"id":"D","text":"4"}]',
 'C', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'var arr = [1, 2, 3, 4, 5];
arr.length = 3;
console.log(arr);',
'select',
'直接修改数组的 length 属性会截断数组。设置 arr.length = 3 后，数组变为 [1, 2, 3]，长度为 3。这是 JavaScript 数组的常见考点。',
1,
'数组,length属性,数组方法');

-- 题目 6：执行上下文与栈
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，输出的顺序是什么？', NULL,
 '[{"id":"A","text":"1, 2, 3, 4"},{"id":"B","text":"1, 4, 3, 2"},{"id":"C","text":"1, 3, 4, 2"},{"id":"D","text":"4, 3, 2, 1"}]',
 'C', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'console.log("1");
setTimeout(function() { console.log("2"); }, 0);
Promise.resolve().then(function() { console.log("3"); });
console.log("4");',
'select',
'同步代码先执行（1 和 4），然后微任务（Promise.then 输出 3），最后宏任务（setTimeout 输出 2）。即使 setTimeout 延迟为 0，它也是宏任务，在微任务之后执行。',
2,
'事件循环,宏任务,微任务,setTimeout,Promise');

-- 题目 7：原型链继承
INSERT INTO questions (title, code, options, correctAnswer, categoryId, question_type) VALUES
('执行以下代码，person instanceof Person 的结果是？', NULL,
 '[{"id":"A","text":"true"},{"id":"B","text":"false"}]',
 'B', 1, 'js_code');
INSERT INTO question_js_code (question_id, code_snippet, answer_mode, explanation, difficulty, knowledge_points) VALUES
(LAST_INSERT_ID(),
'function Person() {}
Person.prototype = { name: "Alice" };
var person = Object.create(Person.prototype);
console.log(person instanceof Person);',
'select',
'Object.create() 创建了一个新对象，其原型指向传入的对象。Person.prototype 被重新赋值为一个字面量对象，但 person 的原型链仍然指向旧的 Person.prototype 对象（已被替换）。instanceof 检查原型链，person 的原型不是新的 Person.prototype，而是旧的对象，因此返回 false。',
3,
'原型链,instanceof,Object.create,prototype');
