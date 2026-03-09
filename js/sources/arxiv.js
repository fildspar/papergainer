/**
 * PaperGainer - arXiv 论文来源模块
 * API文档：https://export.arxiv.org/api/
 * 免费，无需API Key，支持全文搜索
 */

// 领域映射：显示名 → arXiv分类前缀
const ARXIV_DOMAINS = {
  '全部': '',
  '计算机科学': 'cs',
  '物理学': 'physics',
  '数学': 'math',
  '统计学': 'stat',
  '电气工程': 'eess',
  '经济学': 'econ',
  '生物学': 'q-bio',
  '金融': 'q-fin',
};

const ArxivSource = (() => {
  const BASE_URL = 'https://export.arxiv.org/api/query';

  /**
   * 搜索论文
   * @param {string} query - 搜索关键词
   * @param {string} domain - 领域（显示名）
   * @param {number} page - 页码（从0开始）
   * @param {number} pageSize - 每页数量
   * @returns {Promise<{papers: Paper[], total: number}>}
   */
  async function search(query, domain = '全部', page = 0, pageSize = 10) {
    const domainPrefix = ARXIV_DOMAINS[domain] || '';
    let searchQuery = query;
    if (domainPrefix) {
      searchQuery = `cat:${domainPrefix}* AND (${query})`;
    }

    const params = new URLSearchParams({
      search_query: `all:${searchQuery}`,
      start: page * pageSize,
      max_results: pageSize,
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`arXiv API 错误: ${res.status}`);

    const xml = await res.text();
    return parseAtomFeed(xml);
  }

  /**
   * 解析 Atom XML 响应为标准论文对象
   */
  function parseAtomFeed(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const totalEl = doc.querySelector('opensearch\\:totalResults, totalResults');
    const total = totalEl ? parseInt(totalEl.textContent) : 0;

    const entries = doc.querySelectorAll('entry');
    const papers = Array.from(entries).map(entry => {
      const id = entry.querySelector('id')?.textContent?.trim() || '';
      const arxivId = id.split('/abs/')[1] || id;

      // 提取图片链接（arXiv论文页面的缩略图）
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;
      const pageUrl = `https://arxiv.org/abs/${arxivId}`;

      const authors = Array.from(entry.querySelectorAll('author name'))
        .map(el => el.textContent.trim());

      const published = entry.querySelector('published')?.textContent || '';
      const year = published ? new Date(published).getFullYear() : null;

      const categories = Array.from(entry.querySelectorAll('category'))
        .map(el => el.getAttribute('term'))
        .filter(Boolean);

      return {
        id: `arxiv:${arxivId}`,
        arxivId,
        title: entry.querySelector('title')?.textContent?.trim().replace(/\s+/g, ' ') || '',
        authors,
        year,
        abstract: entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g, ' ') || '',
        pdfUrl,
        pageUrl,
        source: 'arxiv',
        domains: categories,
        publishedDate: published,
        // arXiv 论文页面截图（通过 arxiv-vanity 获取）
        thumbnailUrl: `https://arxiv.org/html/${arxivId}`,
      };
    });

    return { papers, total };
  }

  /**
   * 获取支持的领域列表
   */
  function getDomains() {
    return Object.keys(ARXIV_DOMAINS);
  }

  return { search, getDomains, name: 'arXiv', id: 'arxiv' };
})();

window.ArxivSource = ArxivSource;
