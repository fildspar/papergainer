/**
 * PaperGainer - 论文卡片组件
 * 渲染搜索结果列表
 */

const CardUI = (() => {
  /**
   * 渲染论文列表到容器
   * @param {HTMLElement} container
   * @param {Paper[]} papers
   * @param {object} options
   */
  function render(container, papers, options = {}) {
    if (!papers || papers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">◎</div>
          <div class="empty-state__text">暂无结果，请尝试其他关键词</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="paper-grid">
        ${papers.map(paper => renderCard(paper)).join('')}
      </div>
    `;

    // 绑定卡片点击
    container.querySelectorAll('.paper-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('a')) return; // 不拦截链接点击
        const paperId = card.dataset.id;
        const paper = papers.find(p => p.id === paperId);
        if (paper) {
          // 存储到 sessionStorage 供详情页使用
          sessionStorage.setItem('pg_current_paper', JSON.stringify(paper));
          window.location.href = `paper.html?id=${encodeURIComponent(paperId)}`;
        }
      });
    });
  }

  function renderCard(paper) {
    const authors = formatAuthors(paper.authors);
    const sourceLabel = { arxiv: 'arXiv', semantic: 'S2', pubmed: 'PubMed' }[paper.source] || paper.source;
    const abstract = paper.abstract
      ? paper.abstract.slice(0, 200) + (paper.abstract.length > 200 ? '…' : '')
      : '（暂无摘要）';

    const citationBadge = paper.citationCount != null
      ? `<span class="badge badge--citation">引用 ${paper.citationCount}</span>`
      : '';

    const pdfLink = paper.pdfUrl
      ? `<a href="${paper.pdfUrl}" target="_blank" class="card-link" title="下载PDF" onclick="event.stopPropagation()">PDF ↗</a>`
      : '';

    return `
      <article class="paper-card" data-id="${escapeAttr(paper.id)}">
        <div class="paper-card__header">
          <span class="badge badge--source badge--${paper.source}">${sourceLabel}</span>
          ${paper.year ? `<span class="badge badge--year">${paper.year}</span>` : ''}
          ${citationBadge}
        </div>
        <h3 class="paper-card__title">${escapeHtml(paper.title)}</h3>
        <p class="paper-card__authors">${escapeHtml(authors)}</p>
        <p class="paper-card__abstract">${escapeHtml(abstract)}</p>
        <div class="paper-card__footer">
          ${pdfLink}
          <span class="card-detail-hint">点击查看主要思路 →</span>
        </div>
      </article>
    `;
  }

  /**
   * 渲染分页控件
   */
  function renderPagination(container, current, total, pageSize, onPageChange) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    const start = Math.max(0, current - 2);
    const end = Math.min(totalPages - 1, current + 2);
    const pages = [];

    for (let i = start; i <= end; i++) pages.push(i);

    container.innerHTML = `
      <div class="pagination">
        <button class="page-btn" ${current === 0 ? 'disabled' : ''} data-page="${current - 1}">← 上一页</button>
        ${pages.map(p => `
          <button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">${p + 1}</button>
        `).join('')}
        <button class="page-btn" ${current === totalPages - 1 ? 'disabled' : ''} data-page="${current + 1}">下一页 →</button>
        <span class="page-info">共 ${total} 条</span>
      </div>
    `;

    container.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
    });
  }

  function formatAuthors(authors = []) {
    if (!authors.length) return '未知作者';
    if (authors.length <= 3) return authors.join(', ');
    return authors.slice(0, 3).join(', ') + ` 等${authors.length}人`;
  }

  function escapeHtml(str = '') {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeAttr(str = '') {
    return str.replace(/"/g, '&quot;');
  }

  return { render, renderPagination };
})();

window.CardUI = CardUI;
