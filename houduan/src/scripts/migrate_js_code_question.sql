-- JS 代码题功能迁移脚本
-- 执行方式：node src/scripts/migrate_js_code_question.js
-- 或在 MySQL 客户端中手动执行以下 SQL

USE interview_platform;

-- 1. questions 表新增题目类型字段（先检查是否存在）
-- 如果提示 "Duplicate column"，说明字段已存在，可忽略
ALTER TABLE questions
  ADD COLUMN question_type ENUM('normal', 'js_code') DEFAULT 'normal' AFTER categoryId;

-- 2. 新建代码题扩展表
CREATE TABLE IF NOT EXISTS question_js_code (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    question_id     INT NOT NULL,
    code_snippet    TEXT NOT NULL COMMENT '代码片段（核心内容）',
    answer_mode     ENUM('select', 'fill') NOT NULL DEFAULT 'select' COMMENT 'select=选择题模式(选输出)，fill=填空模式(填结果)',
    explanation     TEXT COMMENT '解析/答案说明',
    difficulty      TINYINT DEFAULT 1 COMMENT '难度1-3',
    knowledge_points VARCHAR(255) COMMENT '知识点标签，逗号分隔',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_question_id (question_id),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 为旧题目标记为 normal
UPDATE questions SET question_type = 'normal' WHERE question_type IS NULL;
