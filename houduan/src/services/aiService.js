const axios = require('axios');

class AIService {
    constructor() {
        this.apiKey = process.env.AI_API_KEY;
        this.apiUrl = process.env.AI_API_URL || 'https://api.deepseek.com/v1/chat/completions';
        this.model = process.env.AI_MODEL || 'deepseek-chat';
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000;
    }

    async callAI(messages, systemPrompt) {
        if (!this.apiKey) {
            throw new Error('AI API密钥未配置，请检查 .env 文件中的 AI_API_KEY');
        }

        const fullMessages = [];
        if (systemPrompt) {
            fullMessages.push({ role: 'system', content: systemPrompt });
        }
        fullMessages.push(...messages);

        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            };

            const response = await axios.post(this.apiUrl, {
                model: this.model,
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 1000
            }, {
                headers,
                timeout: 60000
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            if (error.response) {
                console.error('AI API Error:', error.response.status, error.response.data);
                throw new Error(`AI服务错误: ${error.response.data.error?.message || '未知错误'}`);
            }
            throw new Error(`AI服务请求失败: ${error.message}`);
        }
    }

    getHintPrompt(question, options, userAnswer) {
        const optionsText = Array.isArray(options) 
            ? options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text || opt}`).join('\n')
            : '';

        let prompt = `你是一个友好的面试刷题助手，正在帮助用户解答面试题目。\n\n题目：`;

        if (typeof question === 'object' && question.code) {
            prompt += '\n' + question.code;
        }
        prompt += `\n${typeof question === 'object' ? question.title : question}\n\n选项：\n${optionsText}`;

        if (userAnswer) {
            prompt += `\n\n用户当前选择的答案：${userAnswer}`;
        }

        prompt += `\n\n请给出解题思路和提示，帮助用户独立思考找到正确答案。注意：
1. 不要直接给出答案
2. 可以提示相关的知识点和解题方向
3. 语言要简洁、有条理
4. 如果用户已有答案，可以帮助分析为什么这个答案可能对或错`;

        return prompt;
    }

    getExplainPrompt(question, options, userQuestion) {
        const optionsText = Array.isArray(options)
            ? options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text || opt}`).join('\n')
            : '';

        let prompt = `你是一个耐心的编程老师，正在为学生详细讲解一道面试题目。\n\n题目：${typeof question === 'object' ? question.title : question}`;

        if (typeof question === 'object' && question.code) {
            prompt += '\n' + question.code;
        }

        prompt += `\n\n选项：\n${optionsText}`;
        prompt += `\n\n学生的问题：${userQuestion || '请详细解释这道题目'}`;
        prompt += `\n\n请给出详细解释，包括正确答案分析、相关知识点、面试拓展等。`;

        return prompt;
    }

    async getHint(questionId, question, options, userAnswer) {
        const cacheKey = `hint_${questionId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.content;
        }

        const systemPrompt = this.getHintPrompt(question, options, userAnswer);
        const hint = await this.callAI([], systemPrompt);

        this.cache.set(cacheKey, {
            content: hint,
            timestamp: Date.now()
        });

        return hint;
    }

    async getExplanation(questionId, question, options, userQuestion) {
        const systemPrompt = this.getExplainPrompt(question, options, userQuestion);
        return await this.callAI([], systemPrompt);
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = new AIService();
