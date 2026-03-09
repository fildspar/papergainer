/**
 * PaperGainer - AI 分析模式管理（重构版）
 *
 * 主力模式：上传PDF（模式C）→ pdf.js解析 → 模板化MiniMax分析
 * 辅助模式：结构化数据（模式B）→ 用于有元数据但无PDF的场景
 * 高级模式：PDF URL（模式A）→ 保留但标注CORS风险
 *
 * 依赖：pdf.js（CDN懒加载），minimax.js，templates.js，config.js
 */

const AIMode = (() => {
  /**
   * 主入口：分析论文
   * @param {object} paper - 论文对象（上传场景可为 null）
   * @param {string} mode - 'A' | 'B' | 'C'
   * @param {File} [uploadedFile] - 模式C时的PDF文件
   * @param {string} [templateId] - 模板ID，默认从Config读取
   * @returns {Promise<{summary: string, images: ImageInfo[]}>}
   */
  async function analyze(paper, mode, uploadedFile = null, templateId = null) {
    const activeMode = mode || window.Config.get('ai.mode') || 'C';
    const tplId = templateId || window.Config.get('ai.template') || 'structured';
    const systemPrompt = window.Templates.getPrompt(tplId);

    switch (activeMode) {
      case 'A': return modeA(paper, systemPrompt);
      case 'B': return modeB(paper, systemPrompt);
      case 'C': return modeC(paper, uploadedFile, systemPrompt);
      default: throw new Error(`未知模式: ${activeMode}`);
    }
  }

  /**
   * 模式A：从PDF URL解析全文（有CORS风险）
   */
  async function modeA(paper, systemPrompt) {
    if (!paper?.pdfUrl) throw new Error('该论文没有可用的PDF链接，请切换到模式B或上传PDF');

    window.Toast?.loading('正在解析PDF全文...');
    let text;
    try {
      text = await extractPdfText(paper.pdfUrl);
    } catch (e) {
      throw new Error(`PDF解析失败（可能受CORS限制）：${e.message}。建议下载后使用上传模式`);
    }

    if (!text || text.length < 200) throw new Error('PDF文本提取内容过少，请下载后使用上传模式');

    window.Toast?.loading('AI分析中...');
    const summary = await window.MiniMaxAI.ask(
      systemPrompt,
      buildUserContent(paper, text.slice(0, 12000))
    );

    return { summary, images: extractLinks(paper) };
  }

  /**
   * 模式B：使用平台结构化数据
   */
  async function modeB(paper, systemPrompt) {
    if (!paper) throw new Error('模式B需要论文元数据，请选择模式C上传PDF');
    window.Toast?.loading('AI分析中...');

    const content = [
      `论文标题：${paper.title}`,
      paper.authors?.length ? `作者：${paper.authors.slice(0, 5).join(', ')}` : '',
      paper.year ? `发表年份：${paper.year}` : '',
      paper.domains?.length ? `研究领域：${paper.domains.join(', ')}` : '',
      paper.tldr ? `平台AI摘要（TLDR）：${paper.tldr}` : '',
      paper.abstract ? `完整摘要：${paper.abstract}` : '',
      paper.citationCount != null ? `引用次数：${paper.citationCount}` : '',
    ].filter(Boolean).join('\n');

    const summary = await window.MiniMaxAI.ask(
      systemPrompt,
      `请基于以下论文元数据生成主要思路总结：\n\n${content}`
    );

    return { summary, images: extractLinks(paper) };
  }

  /**
   * 模式C：用户上传PDF（主力模式）
   */
  async function modeC(paper, uploadedFile, systemPrompt) {
    if (!uploadedFile) throw new Error('请先选择要上传的PDF文件');

    window.Toast?.loading('正在解析PDF...');
    const text = await extractPdfFromFile(uploadedFile);

    if (!text || text.length < 100) {
      throw new Error('PDF文本提取内容过少，请确认文件是否为可选中文字的PDF（非扫描件）');
    }

    window.Toast?.loading('AI分析中...');
    const title = paper?.title || uploadedFile.name.replace(/\.pdf$/i, '');
    const summary = await window.MiniMaxAI.ask(
      systemPrompt,
      buildUserContent({ title, ...paper }, text.slice(0, 14000))
    );

    return { summary, images: extractLinks(paper) };
  }

  /**
   * 构建用户消息内容
   */
  function buildUserContent(paper, fullText) {
    const meta = [
      paper?.title ? `论文标题：${paper.title}` : '',
      paper?.authors?.length ? `作者：${paper.authors.slice(0, 5).join(', ')}` : '',
      paper?.year ? `年份：${paper.year}` : '',
    ].filter(Boolean).join('\n');

    return `${meta}\n\n论文全文（节选）：\n${fullText}`;
  }

  /**
   * 从URL加载并解析PDF文本
   */
  async function extractPdfText(url) {
    const pdfjsLib = await ensurePdfJs();
    return extractTextFromPdf(await pdfjsLib.getDocument({ url, withCredentials: false }).promise);
  }

  /**
   * 从File对象解析PDF文本
   */
  async function extractPdfFromFile(file) {
    const pdfjsLib = await ensurePdfJs();
    const arrayBuffer = await file.arrayBuffer();
    return extractTextFromPdf(await pdfjsLib.getDocument({ data: arrayBuffer }).promise);
  }

  /**
   * 从pdf.js PDF对象提取文本（最多25页）
   */
  async function extractTextFromPdf(pdf) {
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 25);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map(item => item.str).join(' ') + '\n';
    }
    return fullText;
  }

  /**
   * 懒加载 pdf.js（legacy UMD build，挂载到 window.pdfjsLib）
   */
  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.onload = () => {
        if (!window.pdfjsLib) return reject(new Error('pdf.js 加载后未找到 window.pdfjsLib'));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error('pdf.js 加载失败，请检查网络'));
      document.head.appendChild(script);
    });
  }

  /**
   * 从论文对象提取相关链接
   */
  function extractLinks(paper) {
    if (!paper) return [];
    const links = [];
    if (paper.pdfUrl) links.push({ type: 'link', label: '下载PDF', url: paper.pdfUrl, description: '论文原始PDF文件' });
    if (paper.arxivId) links.push({ type: 'link', label: 'arXiv HTML版（含图表）', url: `https://arxiv.org/html/${paper.arxivId}`, description: '在浏览器中查看含图片的论文' });
    if (paper.pageUrl) links.push({ type: 'link', label: '来源页面', url: paper.pageUrl, description: '论文在数据库中的详情页' });
    return links;
  }

  return { analyze, modeA, modeB, modeC };
})();

window.AIMode = AIMode;
