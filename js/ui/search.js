/**
 * PaperGainer - 搜索栏组件
 * 包含：关键词输入、来源切换、领域筛选、AI模式切换
 */

const SearchUI = (() => {
  /**
   * 渲染搜索栏到指定容器
   * @param {HTMLElement} container
   * @param {function} onSearch - 搜索回调 (query, source, domain, mode) => void
   */
  function render(container, onSearch) {
    const currentSource = window.Config.get('source') || 'semantic';
    const currentMode = window.Config.get('ai.mode') || 'B';
    const currentDomain = window.Config.get('domains')?.[0] || '全部';

    container.innerHTML = `
      <div class="search-bar">
        <div class="search-input-wrap">
          <input
            id="pg-search-input"
            type="text"
            class="search-input"
            placeholder="搜索论文关键词、标题或作者..."
            autocomplete="off"
          />
          <button id="pg-search-btn" class="btn btn--primary search-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            搜索
          </button>
        </div>

        <div class="search-filters">
          <!-- 论文来源 -->
          <div class="filter-group">
            <label class="filter-label">来源</label>
            <div class="filter-tabs" id="pg-source-tabs">
              <button class="filter-tab ${currentSource === 'semantic' ? 'active' : ''}" data-source="semantic">Semantic Scholar</button>
              <button class="filter-tab ${currentSource === 'arxiv' ? 'active' : ''}" data-source="arxiv">arXiv</button>
              <button class="filter-tab ${currentSource === 'pubmed' ? 'active' : ''}" data-source="pubmed">PubMed</button>
            </div>
          </div>

          <!-- AI模式 -->
          <div class="filter-group">
            <label class="filter-label">AI模式</label>
            <div class="filter-tabs" id="pg-mode-tabs">
              <button class="filter-tab mode-tab ${currentMode === 'B' ? 'active' : ''}" data-mode="B" title="使用平台结构化数据，速度快">模式B·结构化</button>
              <button class="filter-tab mode-tab ${currentMode === 'A' ? 'active' : ''}" data-mode="A" title="解析PDF全文，内容更深">模式A·PDF解析</button>
              <button class="filter-tab mode-tab ${currentMode === 'C' ? 'active' : ''}" data-mode="C" title="上传本地PDF文件">模式C·上传PDF</button>
            </div>
          </div>

          <!-- 领域筛选 -->
          <div class="filter-group" id="pg-domain-group">
            <label class="filter-label">领域</label>
            <select class="filter-select" id="pg-domain-select">
              <!-- 动态填充 -->
            </select>
          </div>
        </div>
      </div>
    `;

    // 绑定事件
    bindEvents(container, onSearch, currentSource, currentMode, currentDomain);
    // 初始化领域列表
    updateDomainOptions(currentSource, currentDomain);
  }

  function bindEvents(container, onSearch, initSource, initMode, initDomain) {
    let selectedSource = initSource;
    let selectedMode = initMode;

    // 来源切换
    container.querySelector('#pg-source-tabs').addEventListener('click', e => {
      const tab = e.target.closest('[data-source]');
      if (!tab) return;
      selectedSource = tab.dataset.source;
      container.querySelectorAll('[data-source]').forEach(t => t.classList.toggle('active', t === tab));
      window.Config.set('source', selectedSource);
      updateDomainOptions(selectedSource, '全部');
    });

    // AI模式切换
    container.querySelector('#pg-mode-tabs').addEventListener('click', e => {
      const tab = e.target.closest('[data-mode]');
      if (!tab) return;
      selectedMode = tab.dataset.mode;
      container.querySelectorAll('[data-mode]').forEach(t => t.classList.toggle('active', t === tab));
      window.Config.set('ai.mode', selectedMode);
    });

    // 搜索
    const input = container.querySelector('#pg-search-input');
    const btn = container.querySelector('#pg-search-btn');

    const doSearch = () => {
      const query = input.value.trim();
      if (!query) return window.Toast?.info('请输入搜索关键词', 2000);
      const domain = container.querySelector('#pg-domain-select')?.value || '全部';
      window.Config.set('domains', domain === '全部' ? [] : [domain]);
      window.Config.addSearchHistory(query);
      onSearch(query, selectedSource, domain, selectedMode);
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  }

  /**
   * 更新领域下拉选项
   */
  function updateDomainOptions(sourceId, currentDomain) {
    const select = document.querySelector('#pg-domain-select');
    if (!select) return;

    const domains = window.Sources?.getDomains(sourceId) || ['全部'];
    select.innerHTML = domains
      .map(d => `<option value="${d}" ${d === currentDomain ? 'selected' : ''}>${d}</option>`)
      .join('');
  }

  return { render };
})();

window.SearchUI = SearchUI;
