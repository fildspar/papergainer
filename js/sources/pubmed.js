/**
 * PaperGainer - PubMed 论文来源模块
 * API文档：https://www.ncbi.nlm.nih.gov/books/NBK25501/
 * 免费，生物医学专项，权威数据库
 */

const PUBMED_DOMAINS = {
  '全部': '',
  '肿瘤学': 'oncology',
  '心血管': 'cardiovascular',
  '神经科学': 'neuroscience',
  '免疫学': 'immunology',
  '药理学': 'pharmacology',
  '遗传学': 'genetics',
  '传染病': 'infectious disease',
  '公共卫生': 'public health',
  '精神病学': 'psychiatry',
  '内分泌学': 'endocrinology',
};

const PubmedSource = (() => {
  const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const TOOL = 'papergainer';
  const EMAIL = 'papergainer@github.com';

  /**
   * 搜索论文（两步：先搜索ID列表，再获取详情）
   */
  async function search(query, domain = '全部', page = 0, pageSize = 10) {
    const domainFilter = PUBMED_DOMAINS[domain];
    let searchQuery = query;
    if (domainFilter) {
      searchQuery = `${query} AND ${domainFilter}[MeSH Terms]`;
    }

    // Step 1: esearch 获取 PMID 列表
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term: searchQuery,
      retstart: page * pageSize,
      retmax: pageSize,
      retmode: 'json',
      tool: TOOL,
      email: EMAIL,
    });

    const searchRes = await fetch(`${BASE_URL}/esearch.fcgi?${searchParams}`);
    if (!searchRes.ok) throw new Error(`PubMed 搜索错误: ${searchRes.status}`);

    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];
    const total = parseInt(searchData.esearchresult?.count || '0');

    if (ids.length === 0) return { papers: [], total };

    // Step 2: efetch 获取论文详情
    const fetchParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
      rettype: 'abstract',
      tool: TOOL,
      email: EMAIL,
    });

    const fetchRes = await fetch(`${BASE_URL}/efetch.fcgi?${fetchParams}`);
    if (!fetchRes.ok) throw new Error(`PubMed 获取详情错误: ${fetchRes.status}`);

    const text = await fetchRes.text();
    // PubMed efetch JSON 模式，改用 esummary
    return fetchSummaries(ids, total);
  }

  /**
   * 用 esummary 获取结构化摘要数据
   */
  async function fetchSummaries(ids, total) {
    const params = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
      tool: TOOL,
      email: EMAIL,
    });

    const res = await fetch(`${BASE_URL}/esummary.fcgi?${params}`);
    if (!res.ok) throw new Error(`PubMed 摘要获取错误: ${res.status}`);

    const data = await res.json();
    const result = data.result || {};

    const papers = ids
      .map(id => result[id])
      .filter(Boolean)
      .map(normalizePaper);

    return { papers, total };
  }

  /**
   * 标准化论文对象
   */
  function normalizePaper(item) {
    const pmid = item.uid || '';
    const doi = item.elocationid?.replace('doi: ', '') || null;

    const authors = (item.authors || [])
      .filter(a => a.authtype === 'Author')
      .map(a => a.name);

    const pubDate = item.pubdate || '';
    const year = pubDate ? parseInt(pubDate.split(' ')[0]) : null;

    return {
      id: `pubmed:${pmid}`,
      pmid,
      doi,
      title: item.title || '',
      authors,
      year,
      abstract: '',  // esummary 不含摘要，需单独获取
      pdfUrl: doi ? `https://doi.org/${doi}` : null,
      pageUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      source: 'pubmed',
      domains: (item.meshterms || []),
      publishedDate: pubDate,
      citationCount: null,
      thumbnailUrl: null,
    };
  }

  function getDomains() {
    return Object.keys(PUBMED_DOMAINS);
  }

  return { search, getDomains, name: 'PubMed', id: 'pubmed' };
})();

window.PubmedSource = PubmedSource;
