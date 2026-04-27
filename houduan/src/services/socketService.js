/**
 * Socket.IO 实时通信模块
 * - 用户连接时按 userId 加入 room（user:{id}）
 * - 点赞/回复/系统通知时，向对应用户的 room 推送消息
 */

const socketio = require('socket.io');

let io = null;
const userSocketMap = new Map(); // userId -> socketId

function init(httpServer) {
    io = new socketio.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.handshake.auth?.userId;
        if (userId) {
            socket.join(`user:${userId}`);
            userSocketMap.set(userId, socket.id);
            console.log(`[socket] user:${userId} connected`);
        }

        socket.on('disconnect', () => {
            if (userId) {
                userSocketMap.delete(userId);
                console.log(`[socket] user:${userId} disconnected`);
            }
        });
    });

    console.log('[socket] Socket.IO initialized');
    return io;
}

/**
 * 向指定用户推送消息
 * @param {number} userId - 目标用户ID
 * @param {string} event - 事件名，如 'new_message'
 * @param {object} data - 推送的数据
 */
function pushToUser(userId, event, data) {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
}

/**
 * 推送新消息给目标用户
 */
function pushNewMessage(userId, message) {
    pushToUser(userId, 'new_message', message);
}

module.exports = { init, pushToUser, pushNewMessage };
