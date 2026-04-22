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

部署步骤总结
第 1 步：打包前端
cd d:\VscodeProject\shuati0403\shuati
npm run build
会生成 shuati/dist/ 文件夹，里面是压缩后的静态文件（CSS/JS/HTML）。

第 2 步：修改后端环境变量
编辑 houduan/.env：

NODE_ENV=production
第 3 步：重启后端

cd d:\VscodeProject\shuati0403\houduan

# 开发模式自动重启

npm run dev

.env 保持现状（不写 NODE_ENV=production）→ 原方式继续用，前端 npm run dev（端口 5173）+ 后端 npm run dev（端口 3000）
打包部署时 → 只需在 .env 加一行 NODE_ENV=production，前端 dist/ 由后端托管
