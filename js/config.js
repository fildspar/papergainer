/**
 * PaperGainer - 配置管理模块
 * 统一读写 localStorage，提供全局配置中心
 */

const Config = (() => {
  const STORAGE_KEY = 'papergainer_config';

  const DEFAULTS = {
    // AI 配置
    ai: {
      provider: 'minimax',
      baseUrl: '',           // 用户在 settings 页填写
      apiKey: '',            // 用户在 settings 页填写
      model: '',             // 用户在 settings 页填写
      groupId: '',           // 国内版 minimaxi.com 需要，国际版留空
      mode: 'B',             // 默认模式：B（平台结构化数据，无需消耗大量token）
    },
    // 论文来源
    source: 'semantic',      // 'arxiv' | 'semantic' | 'pubmed'
    // 领域偏好（空数组=全部）
    domains: [],
    // 主题
    theme: 'light',          // 'light' | 'dark'
    // 搜索历史（最近10条）
    searchHistory: [],
  };

  /**
   * 从 localStorage 读取完整配置，与默认值深合并
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      return deepMerge(structuredClone(DEFAULTS), JSON.parse(raw));
    } catch {
      return structuredClone(DEFAULTS);
    }
  }

  /**
   * 将完整配置写入 localStorage
   */
  function save(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  /**
   * 获取配置项，支持点路径，如 'ai.apiKey'
   */
  function get(path) {
    const cfg = load();
    if (!path) return cfg;
    return path.split('.').reduce((obj, key) => obj?.[key], cfg);
  }

  /**
   * 设置配置项，支持点路径，如 Config.set('ai.apiKey', 'xxx')
   */
  function set(path, value) {
    const cfg = load();
    const keys = path.split('.');
    let cur = cfg;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] === undefined) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    save(cfg);
  }

  /**
   * 批量设置，传入对象，如 Config.setMany({ 'ai.apiKey': 'x', 'ai.model': 'y' })
   */
  function setMany(map) {
    Object.entries(map).forEach(([path, value]) => set(path, value));
  }

  /**
   * 重置为默认值
   */
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 添加搜索历史（最多保留10条）
   */
  function addSearchHistory(query) {
    const cfg = load();
    const hist = cfg.searchHistory.filter(q => q !== query);
    hist.unshift(query);
    cfg.searchHistory = hist.slice(0, 10);
    save(cfg);
  }

  // 深合并工具函数
  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  return { get, set, setMany, reset, addSearchHistory, DEFAULTS };
})();

// 全局暴露
window.Config = Config;
