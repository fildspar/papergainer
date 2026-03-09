/**
 * PaperGainer - MiniMax API 封装
 * 使用 OpenAI 兼容接口，同时支持国际版和国内版
 *
 * 国内版（api.minimaxi.com）：
 *   端点：https://api.minimaxi.com/v1/chat/completions
 *   认证：Authorization: Bearer {API_KEY}
 *   无需 GroupId（OpenAI 兼容接口不需要）
 *
 * 国际版（api.minimax.chat）：
 *   端点：https://api.minimax.chat/v1/chat/completions
 *   认证：Authorization: Bearer {API_KEY}
 */

const MiniMaxAI = (() => {
  /**
   * 调用 MiniMax Chat Completion API（OpenAI 兼容格式）
   * @param {string} systemPrompt
   * @param {string} userContent
   * @param {object} options
   * @returns {Promise<string>}
   */
  async function ask(systemPrompt, userContent, options = {}) {
    const cfg = window.Config.get('ai');

    if (!cfg.apiKey) throw new Error('未配置 API Key，请前往设置页面填写');
    if (!cfg.baseUrl) throw new Error('未配置 API Base URL，请前往设置页面填写');
    if (!cfg.model) throw new Error('未配置模型名称，请前往设置页面填写');

    const endpoint = cfg.baseUrl.replace(/\/$/, '') + '/chat/completions';

    // MiniMax temperature 范围 (0.0, 1.0]，不能为 0
    const temperature = Math.max(0.1, Math.min(1.0, options.temperature ?? 0.5));

    const body = {
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature,
      max_tokens: options.maxTokens ?? 2048,
    };

    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`网络请求失败：${e.message}。请检查 Base URL 是否正确，以及是否存在跨域（CORS）限制`);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`MiniMax API 错误 ${res.status}: ${errText}`);
    }

    const data = await res.json();

    // 标准 OpenAI 兼容响应格式
    const raw = data.choices?.[0]?.message?.content || '';

    if (!raw) {
      console.error('[MiniMax] 返回内容为空，完整响应：', JSON.stringify(data));
      const baseResp = data.base_resp;
      throw new Error(
        baseResp
          ? `MiniMax 返回错误：${baseResp.status_msg}（code: ${baseResp.status_code}）`
          : 'MiniMax 返回内容为空，请检查模型名称是否正确'
      );
    }

    // 拆分思考过程和正式内容
    // MiniMax-M2.5 等推理模型会在 content 中混入 <think>...</think>
    const thinkMatch = raw.match(/^<think>([\s\S]*?)<\/think>\s*/);
    const thinking = thinkMatch ? thinkMatch[1].trim() : null;
    const content = thinkMatch ? raw.slice(thinkMatch[0].length).trim() : raw.trim();

    // 将思考过程附加到返回值（用特殊分隔符），由调用方决定如何展示
    return thinking ? `__THINK__${thinking}__ENDTHINK__${content}` : content;
  }

  /**
   * 检查配置是否完整
   */
  function isConfigured() {
    const cfg = window.Config.get('ai');
    return !!(cfg.apiKey && cfg.baseUrl && cfg.model);
  }

  return { ask, isConfigured };
})();

window.MiniMaxAI = MiniMaxAI;
