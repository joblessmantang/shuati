-- ================================================================
-- 智能刷题平台 · 增量迁移脚本
-- 补齐签到、学习目标、专题练习三模块
-- 适用 MySQL 8.x
-- ================================================================
-- 运行方式（任选其一）：
--   1. mysql -u root -p interview_platform < src/scripts/migrate_learning.sql
--   2. 在 Navicat/Workbench 中打开执行
--   3. 在项目根目录执行: node src/scripts/migrate_learning.js
-- ================================================================

-- 如果使用 .js 脚本运行，需要以下头（SQL 文件本身直接执行则不需要）：
-- require('dotenv').config();
-- const mysql = require('mysql2/promise');

-- ================================================================
-- 1. 每日签到表 check_ins
-- ================================================================
CREATE TABLE IF NOT EXISTS check_ins (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    checkin_date    DATE NOT NULL COMMENT '签到日期，格式 YYYY-MM-DD',
    streak_days     INT DEFAULT 1 COMMENT '签到当天的连续签到天数（含今天）',
    total_days      INT DEFAULT 1 COMMENT '截至当天的累计签到天数',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 同一用户同一天只能签到一次
    UNIQUE KEY uk_user_checkin_date (user_id, checkin_date),

    -- 外键关联
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='每日签到记录表';

-- 索引：按用户查签到历史
CREATE INDEX idx_checkins_user ON check_ins (user_id);
-- 索引：按日期范围查询（用于本周签到日历）
CREATE INDEX idx_checkins_user_date ON check_ins (user_id, checkin_date DESC);


-- ================================================================
-- 2. 学习目标表 study_goals
-- ================================================================
CREATE TABLE IF NOT EXISTS study_goals (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    type            ENUM('daily', 'weekly') NOT NULL DEFAULT 'daily'
                        COMMENT '目标类型：daily=每日目标，weekly=每周目标',
    target_count    INT NOT NULL DEFAULT 10 COMMENT '目标刷题数量',
    current_count   INT NOT NULL DEFAULT 0 COMMENT '当前已完成数量',
    start_date      DATE NOT NULL COMMENT '目标周期起始日期',
    end_date        DATE NOT NULL COMMENT '目标周期结束日期',
    status          ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'
                        COMMENT '目标状态',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 外键关联
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- 索引：按用户+状态查有效目标
    INDEX idx_goals_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='学习目标表';


-- ================================================================
-- 3. 专题表 topics
-- ================================================================
CREATE TABLE IF NOT EXISTS topics (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    name            VARCHAR(100) NOT NULL COMMENT '专题名称',
    description     VARCHAR(500) DEFAULT '' COMMENT '专题描述',
    question_count  INT DEFAULT 0 COMMENT '专题内题目数量（冗余字段，由 topic_questions 表驱动更新）',
    practice_count INT DEFAULT 0 COMMENT '专题练习次数（预留扩展字段）',
    last_practiced_at DATETIME DEFAULT NULL COMMENT '最近一次练习时间（预留扩展字段）',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- 外键关联
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    -- 索引
    INDEX idx_topics_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='专题练习表';


-- ================================================================
-- 4. 专题-题目关联表 topic_questions
-- ================================================================
CREATE TABLE IF NOT EXISTS topic_questions (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    topic_id        INT NOT NULL,
    question_id     INT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '题目在专题内的顺序，数字越小越靠前',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- 同一专题内同一题目只能出现一次
    UNIQUE KEY uk_topic_question (topic_id, question_id),

    -- 外键关联
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,

    -- 索引
    INDEX idx_tq_topic_order (topic_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='专题与题目的关联表（多对多）';


-- ================================================================
-- 5. 示例种子数据（仅在表为空时插入，避免重复运行污染数据）
-- ================================================================

-- ---------- 签到数据（基于已有测试用户 tl，id=2） ----------
-- 检查用户 tl 是否存在（用户名可能不同，按实际情况调整）
INSERT IGNORE INTO check_ins (user_id, checkin_date, streak_days, total_days)
SELECT 2, CURDATE() - INTERVAL 3 DAY, 1, 1 FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2);

INSERT IGNORE INTO check_ins (user_id, checkin_date, streak_days, total_days)
SELECT 2, CURDATE() - INTERVAL 2 DAY, 2, 2 FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2);

INSERT IGNORE INTO check_ins (user_id, checkin_date, streak_days, total_days)
SELECT 2, CURDATE() - INTERVAL 1 DAY, 3, 3 FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2);

INSERT IGNORE INTO check_ins (user_id, checkin_date, streak_days, total_days)
SELECT 2, CURDATE(), 4, 4 FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2);


-- ---------- 学习目标数据 ----------
INSERT IGNORE INTO study_goals (user_id, type, target_count, current_count, start_date, end_date, status)
SELECT 2, 'daily', 20, 8, CURDATE(), CURDATE(), 'active'
FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2 AND NOT EXISTS (
    SELECT 1 FROM study_goals WHERE user_id = 2 AND type = 'daily' AND status = 'active'
));

INSERT IGNORE INTO study_goals (user_id, type, target_count, current_count, start_date, end_date, status)
SELECT 2, 'weekly', 100, 35,
    DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY),   -- 本周一
    DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), -- 本周日
    'active'
FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2 AND NOT EXISTS (
    SELECT 1 FROM study_goals WHERE user_id = 2 AND type = 'weekly' AND status = 'active'
));


-- ---------- 专题数据 ----------
INSERT IGNORE INTO topics (id, user_id, name, description, question_count, practice_count, last_practiced_at)
SELECT 1, 2, 'JavaScript 核心概念', '涵盖闭包、原型链、异步等高频面试知识点', 5, 2, DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2 AND NOT EXISTS (SELECT 1 FROM topics WHERE id = 1));

INSERT IGNORE INTO topics (id, user_id, name, description, question_count, practice_count, last_practiced_at)
SELECT 2, 2, 'CSS 布局专项', 'Flexbox 与 Grid 布局练习', 3, 0, NULL
FROM DUAL WHERE EXISTS (SELECT 1 FROM users WHERE id = 2 AND NOT EXISTS (SELECT 1 FROM topics WHERE id = 2));


-- ---------- 专题-题目关联 ----------
-- 专题1 关联题目 4, 7, 8, 20, 31（JavaScript相关）
INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 1, 4, 1 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 1 AND question_id = 4));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 1, 7, 2 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 1 AND question_id = 7));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 1, 8, 3 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 1 AND question_id = 8));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 1, 20, 4 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 1 AND question_id = 20));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 1, 31, 5 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 1 AND question_id = 31));

-- 专题2 关联题目 3, 9, 24（CSS相关）
INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 2, 3, 1 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 2 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 2 AND question_id = 3));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 2, 9, 2 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 2 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 2 AND question_id = 9));

INSERT IGNORE INTO topic_questions (topic_id, question_id, sort_order)
SELECT 2, 24, 3 FROM DUAL WHERE EXISTS (SELECT 1 FROM topics WHERE id = 2 AND NOT EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = 2 AND question_id = 24));

-- 更新专题的 question_count 冗余字段
UPDATE topics t SET question_count = (
    SELECT COUNT(*) FROM topic_questions tq WHERE tq.topic_id = t.id
) WHERE EXISTS (SELECT 1 FROM topic_questions WHERE topic_id = t.id);
