-- 为 practice_history 添加 mode 字段，记录练习模式
-- 支持：normal(普通), errors(错题), mix(混合), challenge(计时挑战), review(背题)

ALTER TABLE practice_history
ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER timeSpent;

-- 为已存在的数据设置默认模式
UPDATE practice_history SET mode = 'normal' WHERE mode IS NULL OR mode = '';

-- 添加索引（按用户和时间范围查询更高效）
CREATE INDEX IF NOT EXISTS idx_practice_history_user_mode ON practice_history(userId, mode);
