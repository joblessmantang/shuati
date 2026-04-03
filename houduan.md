使用步骤
配置 MySQL：确保已安装 MySQL 5.7+ 并创建数据库

修改 .env 配置：

DB_PASSWORD=你的MySQL密码
JWT_SECRET=随机字符串
AI_API_KEY=你的AI密钥（可选）
安装依赖并初始化：

cd d:\VscodeProject\shuati0403\houduan

# 第一次使用或依赖缺失时
npm install

# 初始化数据库（创建表、插入初始数据，仅需运行一次）
npm run init-db

# 启动服务器
cd houduan
npm start
# 或开发模式（代码改动自动重启）
cd houduan
npm run dev

netstat -ano | findstr :3000
taskkill /PID <PID号> /F

cd shuati
npm run serve

npm run dev
服务运行在 http://localhost:3000，API 接口包括：

/api/auth/* - 用户认证
/api/questions/* - 题目相关
/api/ai/* - AI辅助
/api/posts/* - 论坛功能

JWT_SECRET=dafagweanlgkaer