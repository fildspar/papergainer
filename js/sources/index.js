/**
 * PaperGainer - 论文来源注册中心
 * 统一入口，管理所有来源的注册和切换
 * 依赖：arxiv.js, semantic.js, pubmed.js（需先加载）
 */

const Sources = (() => {
  // 已注册的来源（依赖各来源脚本全局挂载后注册）
  const registry = new Map();

  /**
   * 注册一个论文来源
   * @param {object} source - 需包含 id, name, search(), getDomains()
   */
  function register(source) {
    registry.set(source.id, source);
  }

  /**
   * 获取指定来源，默认读取 Config 中的当前来源
   */
  function use(sourceId) {
    const id = sourceId || window.Config?.get('source') || 'semantic';
    const source = registry.get(id);
    if (!source) throw new Error(`未知论文来源: ${id}`);
    return source;
  }

  /**
   * 获取所有已注册的来源列表
   */
  function list() {
    return Array.from(registry.values()).map(s => ({ id: s.id, name: s.name }));
  }

  /**
   * 获取当前来源支持的领域列表
   */
  function getDomains(sourceId) {
    return use(sourceId).getDomains();
  }

  /**
   * 搜索论文（使用当前配置的来源）
   */
  async function search(query, domain, page, pageSize) {
    const sourceId = window.Config?.get('source') || 'semantic';
    return use(sourceId).search(query, domain, page, pageSize);
  }

  return { register, use, list, getDomains, search };
})();

// 各来源脚本在 index.js 之前已同步加载，直接注册
// 无需等待 DOMContentLoaded（此时脚本已执行完毕，window.XxxSource 均可用）
if (window.ArxivSource) Sources.register(window.ArxivSource);
if (window.SemanticSource) Sources.register(window.SemanticSource);
if (window.PubmedSource) Sources.register(window.PubmedSource);

window.Sources = Sources;
