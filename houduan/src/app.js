const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const categoryRoutes = require('./routes/categories');
const wrongBookRoutes = require('./routes/wrongBook');
const favoritesRoutes = require('./routes/favorites');
const historyRoutes = require('./routes/history');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const postRoutes = require('./routes/posts');
const checkInRoutes = require('./routes/checkIn');
const goalRoutes = require('./routes/goals');
const topicRoutes = require('./routes/topics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/wrongBook', wrongBookRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/practiceHistory', historyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/checkIn', checkInRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/topics', topicRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('数据库连接失败，请检查配置并重启服务');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer().catch(err => {
    console.error('服务器启动失败:', err);
    process.exit(1);
});

module.exports = app;
