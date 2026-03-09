/**
 * PaperGainer - 论文详情页组件（重构版）
 * 支持多模板看板切换、重新分析、复制/导出
 */

const DetailUI = (() => {
  /**
   * 渲染详情页
   * @param {HTMLElement} container
   * @param {object} context - { id, paper, file, fileName, mode, result }
   */
  function render(container, context) {
    const { paper, fileName, mode, result } = context || {};

    const title = paper?.title || fileName || '未命名论文';
    const authors = (paper?.authors || []).join(', ');
    const templates = window.Templates.list();
    const currentTplId = window.Config.get('ai.template') || 'structured';

    const sourceNames = { arxiv: 'arXiv', semantic: 'Semantic Scholar', pubmed: 'PubMed' };

    container.innerHTML = `
      <div class="detail-page">

        <!-- 论文基本信息 -->
        <div class="detail-header">
          <div class="detail-header__meta">
            ${paper?.source
              ? `<span class="badge badge--source badge--${paper.source}">${sourceNames[paper.source] || paper.source}</span>`
              : '<span class="badge badge--source" style="background:var(--bg-secondary);color:var(--text-secondary)">上传PDF</span>'}
            ${paper?.year ? `<span class="badge badge--year">${paper.year}</span>` : ''}
            ${paper?.citationCount != null ? `<span class="badge badge--citation">引用 ${paper.citationCount}</span>` : ''}
          </div>
          <h1 class="detail-title">${escapeHtml(title)}</h1>
          ${authors ? `<p class="detail-authors">${escapeHtml(authors)}</p>` : ''}
          ${paper?.abstract ? `
            <details class="detail-abstract">
              <summary>原始摘要</summary>
              <p>${escapeHtml(paper.abstract)}</p>
            </details>
          ` : ''}
        </div>

        <!-- 主体：左侧分析 + 右侧资源 -->
        <div class="detail-layout">

          <!-- 左侧：模板看板 -->
          <div class="detail-main">

            <!-- 模板切换栏 -->
            <div class="template-bar">
              <div class="template-bar__tabs" id="pg-tpl-tabs">
                ${templates.map(t => `
                  <button class="tpl-tab ${t.id === currentTplId ? 'active' : ''}" data-tpl="${t.id}" title="${escapeHtml(t.desc)}">
                    <span class="tpl-tab__icon">${t.icon}</span>
                    <span class="tpl-tab__name">${t.name}</span>
                  </button>
                `).join('')}
              </div>
              <button class="btn btn--ghost btn--sm" id="pg-reanalyze-btn">重新分析</button>
            </div>

            <!-- 当前模板描述 -->
            <div class="template-desc" id="pg-tpl-desc">${escapeHtml(window.Templates.get(currentTplId).desc)}</div>

            <!-- 分析结果区 -->
            <div class="summary-panel" id="pg-summary-panel">
              ${result
                ? renderSummaryContent(result.summary)
                : `<div class="summary-placeholder"><p class="summary-hint">分析结果将在此显示</p></div>`}
            </div>

          </div>

          <!-- 右侧：资源 + 导出 -->
          <aside class="detail-sidebar">

            ${(paper?.pdfUrl || paper?.pageUrl || paper?.arxivId) ? `
              <div class="sidebar-section">
                <h3 class="sidebar-title">论文链接</h3>
                ${paper.pdfUrl ? `<a href="${paper.pdfUrl}" target="_blank" class="btn btn--primary btn--full">下载 PDF ↗</a>` : ''}
                ${paper.pageUrl ? `<a href="${paper.pageUrl}" target="_blank" class="btn btn--ghost btn--full">来源页面 ↗</a>` : ''}
                ${paper.arxivId ? `<a href="https://arxiv.org/html/${paper.arxivId}" target="_blank" class="btn btn--ghost btn--full">HTML版（含图表）↗</a>` : ''}
              </div>
            ` : ''}

            <div class="sidebar-section">
              <h3 class="sidebar-title">导出</h3>
              <button class="btn btn--ghost btn--full" id="pg-copy-btn">复制全文</button>
              <button class="btn btn--ghost btn--full" id="pg-export-md-btn">导出 Markdown</button>
            </div>

            <div class="sidebar-section">
              <h3 class="sidebar-title">文件信息</h3>
              <p class="sidebar-note">${escapeHtml(fileName || paper?.title || '—')}</p>
              <p class="sidebar-note">模式：${mode === 'C' ? '上传PDF' : mode === 'B' ? '结构化数据' : 'PDF全文解析'}</p>
            </div>

          </aside>
        </div>
      </div>
    `;

    bindDetailEvents(container, context);
  }

  /**
   * 渲染总结内容（增强版Markdown解析）
   * 支持：思考折叠、【标题】、**标题**、# 标题、数字列表、bullet、引用块、分隔线、粗体/行内代码
   */
  function renderSummaryContent(summary) {
    if (!summary) return '<p class="summary-hint">暂无内容</p>';

    // 拆分思考过程
    let thinking = null;
    let mainContent = summary;
    const thinkMatch = summary.match(/^__THINK__([\s\S]*?)__ENDTHINK__([\s\S]*)$/);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      mainContent = thinkMatch[2].trim();
    }

    let html = '';

    // 思考过程折叠区（默认收起）
    if (thinking) {
      html += `
        <details class="think-block">
          <summary class="think-block__toggle">◌ AI 思考过程（点击展开）</summary>
          <div class="think-block__content">${escapeHtml(thinking).replace(/\n/g, '<br>')}</div>
        </details>
      `;
    }

    // 解析正文
    html += parseMarkdown(mainContent);
    return html;
  }

  /**
   * 解析 Markdown 正文为 HTML
   */
  function parseMarkdown(text) {
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    let inOrderedList = false;

    const closeList = () => {
      if (inList) { html += '</ul>'; inList = false; }
      if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // 空行：关闭列表
      if (!line) { closeList(); continue; }

      // 分隔线 ---
      if (/^---+$/.test(line)) {
        closeList();
        html += '<hr class="summary-hr">';
        continue;
      }

      // # 标题（1-3级）
      const hMatch = line.match(/^(#{1,3})\s+(.+)/);
      if (hMatch) {
        closeList();
        const level = Math.min(hMatch[1].length + 2, 4); // h3/h4
        html += `<h${level} class="summary-heading summary-heading--${level}">${formatInline(hMatch[2])}</h${level}>`;
        continue;
      }

      // 【标题】
      if (/^【.+】$/.test(line)) {
        closeList();
        html += `<h3 class="summary-heading summary-heading--bracket">${escapeHtml(line)}</h3>`;
        continue;
      }

      // **整行粗体标题**
      if (/^\*\*[^*]+\*\*[：:：]?$/.test(line)) {
        closeList();
        const text = line.replace(/^\*\*|\*\*[：:：]?$/g, '');
        html += `<h3 class="summary-heading summary-heading--bold">${escapeHtml(text)}</h3>`;
        continue;
      }

      // 引用块 >
      if (/^>\s/.test(line)) {
        closeList();
        html += `<blockquote class="summary-quote">${formatInline(line.slice(2))}</blockquote>`;
        continue;
      }

      // 有序列表 1. 2. 3.
      if (/^\d+[.)]\s/.test(line)) {
        if (inList) { html += '</ul>'; inList = false; }
        if (!inOrderedList) { html += '<ol class="summary-ol">'; inOrderedList = true; }
        html += `<li class="summary-li">${formatInline(line.replace(/^\d+[.)]\s/, ''))}</li>`;
        continue;
      }

      // 无序列表 • · - *
      if (/^[•·\-\*]\s/.test(line)) {
        if (inOrderedList) { html += '</ol>'; inOrderedList = false; }
        if (!inList) { html += '<ul class="summary-ul">'; inList = true; }
        html += `<li class="summary-li">${formatInline(line.replace(/^[•·\-\*]\s/, ''))}</li>`;
        continue;
      }

      // 普通段落
      closeList();
      html += `<p class="summary-p">${formatInline(line)}</p>`;
    }

    closeList();
    return html;
  }

  /**
   * 处理行内格式：**粗体**、`代码`
   */
  function formatInline(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  }

  function bindDetailEvents(container, context) {
    // 模板切换 → 优先展示已有缓存，无缓存才调用AI
    container.querySelector('#pg-tpl-tabs')?.addEventListener('click', async e => {
      const tab = e.target.closest('[data-tpl]');
      if (!tab) return;
      const tplId = tab.dataset.tpl;
      container.querySelectorAll('.tpl-tab').forEach(t => t.classList.toggle('active', t === tab));
      const descEl = container.querySelector('#pg-tpl-desc');
      if (descEl) descEl.textContent = window.Templates.get(tplId).desc;
      window.Config.set('ai.template', tplId);

      // 检查是否有该模板的缓存结果
      const cached = getCachedResult(context.id, tplId);
      if (cached) {
        const panel = container.querySelector('#pg-summary-panel');
        if (panel) panel.innerHTML = renderSummaryContent(cached);
      } else {
        await doAnalyze(container, context, tplId);
      }
    });

    // 重新分析
    container.querySelector('#pg-reanalyze-btn')?.addEventListener('click', async () => {
      await doAnalyze(container, context, window.Config.get('ai.template') || 'structured');
    });

    // 复制
    container.querySelector('#pg-copy-btn')?.addEventListener('click', () => {
      const text = container.querySelector('#pg-summary-panel')?.innerText || '';
      navigator.clipboard.writeText(text)
        .then(() => window.Toast?.success('已复制', 2000))
        .catch(() => window.Toast?.error('复制失败，请手动选择', 3000));
    });

    // 导出Markdown
    container.querySelector('#pg-export-md-btn')?.addEventListener('click', () => {
      const text = container.querySelector('#pg-summary-panel')?.innerText || '';
      const title = context.paper?.title || context.fileName || '论文分析';
      const tplName = window.Templates.get(window.Config.get('ai.template') || 'structured').name;
      const md = `# ${title}\n\n> 模板：${tplName} | ${new Date().toLocaleString('zh-CN')}\n\n${text}`;
      downloadText(md, `${title.slice(0, 40).replace(/[\\/:*?"<>|]/g, '_')}.md`);
    });
  }

  /**
   * 执行AI分析（外部可调用）
   */
  async function doAnalyze(container, context, tplId) {
    const panel = container.querySelector('#pg-summary-panel');
    if (!panel) return;

    if (!window.MiniMaxAI.isConfigured()) {
      window.Toast?.error('请先在设置页面配置 API Key', 4000);
      setTimeout(() => { window.location.href = 'settings.html'; }, 2500);
      return;
    }

    panel.innerHTML = `<div class="summary-loading"><div class="pg-spinner"></div><p>AI 分析中，请稍候...</p></div>`;

    try {
      const result = await window.AIMode.analyze(
        context.paper,
        context.mode || 'C',
        context.file,
        tplId
      );
      panel.innerHTML = renderSummaryContent(result.summary);
      window.Toast?.success('分析完成', 2000);
      // 缓存结果到历史
      saveResultToHistory(context, result.summary, tplId);
    } catch (e) {
      panel.innerHTML = `
        <div class="summary-error">
          <p>${escapeHtml(e.message)}</p>
          <button class="btn btn--ghost" id="pg-retry-btn">重试</button>
        </div>
      `;
      window.Toast?.error(e.message, 5000);
      container.querySelector('#pg-retry-btn')?.addEventListener('click',
        () => doAnalyze(container, context, tplId));
    }
  }

  function saveResultToHistory(context, summary, tplId) {
    try {
      const history = JSON.parse(localStorage.getItem('pg_history') || '[]');
      const idx = history.findIndex(h => h.id === context.id);
      if (idx !== -1) {
        if (!history[idx].results) history[idx].results = {};
        history[idx].results[tplId] = summary;
        localStorage.setItem('pg_history', JSON.stringify(history));
      }
    } catch { /* ignore */ }
  }

  function getCachedResult(id, tplId) {
    try {
      const history = JSON.parse(localStorage.getItem('pg_history') || '[]');
      const item = history.find(h => h.id === id);
      return item?.results?.[tplId] || null;
    } catch { return null; }
  }

  /**
   * 自动触发分析（页面加载时）
   * - 有缓存结果：直接展示，不重复分析
   * - 需要重新上传：显示提示
   */
  function triggerAnalyze(container, context) {
    if (context.result) return; // 有缓存结果，已在 render 时展示

    if (context._needReupload) {
      // 历史记录中无结果的条目，提示用户回首页重新上传
      const panel = container.querySelector('#pg-summary-panel');
      if (panel) {
        panel.innerHTML = `
          <div class="summary-placeholder" style="flex-direction:column;gap:12px;">
            <p class="summary-hint">此记录没有分析结果缓存</p>
            <a href="index.html" class="btn btn--primary">返回首页重新上传PDF</a>
          </div>
        `;
      }
      return;
    }

    // 正常情况不应走到这里（分析已在首页完成）
    const tplId = window.Config.get('ai.template') || 'structured';
    doAnalyze(container, context, tplId);
  }

  function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: filename,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { render, triggerAnalyze };
})();

window.DetailUI = DetailUI;
