/**
 * PaperGainer - Semantic Scholar 论文来源模块
 * API文档：https://api.semanticscholar.org/graph/v1
 * 免费，多学科，提供高质量结构化数据
 */

const SEMANTIC_DOMAINS = {
  '全部': '',
  '计算机科学': 'Computer Science',
  '医学': 'Medicine',
  '生物学': 'Biology',
  '物理学': 'Physics',
  '数学': 'Mathematics',
  '化学': 'Chemistry',
  '工程学': 'Engineering',
  '经济学': 'Economics',
  '心理学': 'Psychology',
  '社会科学': 'Social Sciences',
  '材料科学': 'Materials Science',
  '环境科学': 'Environmental Science',
  '地球科学': 'Geography',
  '艺术与人文': 'Art',
  '历史': 'History',
  '哲学': 'Philosophy',
  '商科': 'Business',
  '政治学': 'Political Science',
  '法学': 'Law',
};

const SemanticSource = (() => {
  const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
  // 需要返回的字段
  const FIELDS = 'paperId,title,authors,year,abstract,openAccessPdf,externalIds,fieldsOfStudy,s2FieldsOfStudy,tldr,publicationDate,citationCount,influentialCitationCount';

  /**
   * 搜索论文（含429自动重试）
   */
  async function search(query, domain = '全部', page = 0, pageSize = 10) {
    const params = new URLSearchParams({
      query,
      fields: FIELDS,
      offset: page * pageSize,
      limit: pageSize,
    });

    const domainFilter = SEMANTIC_DOMAINS[domain];
    if (domainFilter) {
      params.set('fieldsOfStudy', domainFilter);
    }

    // 429限速时自动等待重试，最多3次
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${BASE_URL}/paper/search?${params}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (res.status === 429) {
        if (attempt === 2) throw new Error('Semantic Scholar 请求频率限制，请等待几秒后重试');
        // 指数退避：1s → 2s → 4s
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }

      if (!res.ok) throw new Error(`Semantic Scholar API 错误: ${res.status}`);

      const data = await res.json();
      return {
        papers: (data.data || []).map(normalizePaper),
        total: data.total || 0,
      };
    }
  }

  /**
   * 标准化论文对象
   */
  function normalizePaper(item) {
    const pdfUrl = item.openAccessPdf?.url || null;
    const arxivId = item.externalIds?.ArXiv || null;
    const doi = item.externalIds?.DOI || null;

    // 构建页面链接
    const pageUrl = `https://www.semanticscholar.org/paper/${item.paperId}`;
    // 如果有arXiv ID，优先用arXiv PDF
    const resolvedPdfUrl = pdfUrl || (arxivId ? `https://arxiv.org/pdf/${arxivId}` : null);

    return {
      id: `semantic:${item.paperId}`,
      semanticId: item.paperId,
      arxivId,
      doi,
      title: item.title || '',
      authors: (item.authors || []).map(a => a.name),
      year: item.year,
      abstract: item.abstract || '',
      // tldr 是 Semantic Scholar 提供的AI生成简短摘要，模式B的核心数据
      tldr: item.tldr?.text || null,
      pdfUrl: resolvedPdfUrl,
      pageUrl,
      source: 'semantic',
      domains: (item.fieldsOfStudy || []),
      citationCount: item.citationCount || 0,
      influentialCitationCount: item.influentialCitationCount || 0,
      publishedDate: item.publicationDate || null,
      thumbnailUrl: null,
    };
  }

  function getDomains() {
    return Object.keys(SEMANTIC_DOMAINS);
  }

  return { search, getDomains, name: 'Semantic Scholar', id: 'semantic' };
})();

window.SemanticSource = SemanticSource;
