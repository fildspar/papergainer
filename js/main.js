/**
 * PaperGainer - 主入口（重构版）
 * 首页：上传PDF + 搜索跳转 + 历史记录
 * 详情页：多模板看板分析
 * 设置页：API配置
 */

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(window.Config.get('theme') || 'light');

  const path = location.pathname;
  const page = path.split('/').pop() || 'index.html';

  if (page === 'index.html' || page === '') initIndexPage();
  else if (page === 'paper.html') initDetailPage();
  else if (page === 'settings.html') initSettingsPage();
});

/* ===== 主题 ===== */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  window.Config.set('theme', theme);
  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '◑';
}

function toggleTheme() {
  applyTheme(window.Config.get('theme') === 'dark' ? 'light' : 'dark');
}
window.toggleTheme = toggleTheme;

/* ===== 首页 ===== */
function initIndexPage() {
  renderTemplateTabs();
  initDropZone();
  renderHistory();

  // 清空历史
  document.querySelector('#pg-clear-history')?.addEventListener('click', () => {
    if (confirm('确认清空所有分析历史？')) {
      localStorage.removeItem('pg_history');
      renderHistory();
      window.Toast?.success('历史已清空', 2000);
    }
  });
}

/** 渲染模板选择栏 */
function renderTemplateTabs() {
  const tabsEl = document.querySelector('#pg-template-tabs');
  if (!tabsEl) return;
  const currentTpl = window.Config.get('ai.template') || 'structured';
  const templates = window.Templates.list();

  tabsEl.innerHTML = templates.map(t => `
    <button class="tpl-tab ${t.id === currentTpl ? 'active' : ''}" data-tpl="${t.id}" title="${t.desc}">
      <span class="tpl-tab__icon">${t.icon}</span>
      <span class="tpl-tab__name">${t.name}</span>
    </button>
  `).join('');

  tabsEl.addEventListener('click', e => {
    const tab = e.target.closest('[data-tpl]');
    if (!tab) return;
    tabsEl.querySelectorAll('.tpl-tab').forEach(t => t.classList.toggle('active', t === tab));
    window.Config.set('ai.template', tab.dataset.tpl);
  });
}

/** 拖拽上传区 */
let selectedFiles = [];

function initDropZone() {
  const dropZone = document.querySelector('#pg-drop-zone');
  const fileInput = document.querySelector('#pg-file-input');
  const analyzeBtn = document.querySelector('#pg-analyze-btn');

  if (!dropZone || !fileInput) return;

  // 拖拽事件
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragging');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (files.length === 0) return window.Toast?.error('请上传PDF文件', 2500);
    handleFilesSelected(files);
  });

  // 点击选择
  fileInput.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (files.length) handleFilesSelected(files);
    fileInput.value = ''; // 允许重复选择同一文件
  });

  // 分析按钮
  analyzeBtn?.addEventListener('click', startAnalysis);
}

function handleFilesSelected(files) {
  selectedFiles = files;
  renderFileList(files);
  const analyzeBtn = document.querySelector('#pg-analyze-btn');
  if (analyzeBtn) analyzeBtn.disabled = false;
}

function renderFileList(files) {
  const listEl = document.querySelector('#pg-file-list');
  if (!listEl) return;
  listEl.classList.remove('hidden');
  listEl.innerHTML = files.map((f, i) => `
    <div class="file-item">
      <span class="file-item__icon">📄</span>
      <span class="file-item__name">${escapeHtml(f.name)}</span>
      <span class="file-item__size">${(f.size / 1024).toFixed(0)} KB</span>
      <button class="file-item__remove btn btn--ghost btn--sm" data-idx="${i}">✕</button>
    </div>
  `).join('');
  // 用 onclick 替代 addEventListener，避免多次渲染时事件重复注册
  listEl.onclick = e => {
    const btn = e.target.closest('[data-idx]');
    if (!btn) return;
    selectedFiles.splice(parseInt(btn.dataset.idx), 1);
    if (selectedFiles.length === 0) {
      listEl.classList.add('hidden');
      listEl.onclick = null;
      const analyzeBtn = document.querySelector('#pg-analyze-btn');
      if (analyzeBtn) analyzeBtn.disabled = true;
    } else {
      renderFileList(selectedFiles);
    }
  };
}

/** 开始分析（支持批量） */
async function startAnalysis() {
  if (!selectedFiles.length) return;
  if (!window.MiniMaxAI.isConfigured()) {
    window.Toast?.error('请先在设置页面配置 API Key', 4000);
    setTimeout(() => { window.location.href = 'settings.html'; }, 2000);
    return;
  }

  const overlay = document.querySelector('#pg-overlay');
  const overlayMsg = document.querySelector('#pg-overlay-msg');
  const overlayFile = document.querySelector('#pg-overlay-file');
  overlay?.classList.remove('hidden');

  const tplId = window.Config.get('ai.template') || 'structured';

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    if (overlayFile) overlayFile.textContent = `${file.name} (${i + 1}/${selectedFiles.length})`;
    if (overlayMsg) overlayMsg.textContent = '正在解析PDF...';

    try {
      const historyItem = createHistoryItem(null, file.name, 'C');
      if (overlayMsg) overlayMsg.textContent = 'AI 分析中...';
      // 在跳转前完成分析，File 对象此时仍然有效
      const result = await window.AIMode.analyze(null, 'C', file, tplId);
      historyItem.results = { [tplId]: result.summary };
      saveHistoryItem(historyItem);

      // 单文件：分析完成后跳转到详情页展示结果
      if (selectedFiles.length === 1) {
        overlay?.classList.add('hidden');
        sessionStorage.setItem('pg_current_context', JSON.stringify({
          id: historyItem.id,
          paper: null,
          fileName: file.name,
          mode: 'C',
          result: { summary: result.summary },
        }));
        window.location.href = 'paper.html';
        return;
      }
    } catch (e) {
      window.Toast?.error(`${file.name} 分析失败：${e.message}`, 4000);
    }
  }

  // 多文件批量完成
  overlay?.classList.add('hidden');
  selectedFiles = [];
  const listEl = document.querySelector('#pg-file-list');
  listEl?.classList.add('hidden');
  const analyzeBtn = document.querySelector('#pg-analyze-btn');
  if (analyzeBtn) analyzeBtn.disabled = true;
  renderHistory();
  window.Toast?.success('批量分析完成！', 2500);
}

/** 历史记录 */
function createHistoryItem(paper, fileName, mode) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    paper,
    fileName: fileName || paper?.title,
    mode,
    createdAt: Date.now(),
    results: {},
  };
}

function saveHistoryItem(item) {
  try {
    const history = JSON.parse(localStorage.getItem('pg_history') || '[]');
    history.unshift(item);
    // 最多保留50条
    localStorage.setItem('pg_history', JSON.stringify(history.slice(0, 50)));
  } catch { /* ignore */ }
}

function renderHistory() {
  const section = document.querySelector('#pg-history-section');
  const listEl = document.querySelector('#pg-history-list');
  if (!listEl) return;

  let history = [];
  try { history = JSON.parse(localStorage.getItem('pg_history') || '[]'); } catch { /* ignore */ }

  if (history.length === 0) {
    section?.classList.remove('hidden');
    listEl.innerHTML = '<div class="history-empty">暂无分析记录<br>上传 PDF 开始分析吧</div>';
    return;
  }

  section?.classList.remove('hidden');
  listEl.innerHTML = history.map(item => {
    const date = new Date(item.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const hasResult = Object.keys(item.results || {}).length > 0;
    return `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item__info">
          <span class="history-item__name">${escapeHtml(item.fileName || '未命名')}</span>
          <span class="history-item__date">${date}</span>
        </div>
        <div class="history-item__actions">
          ${hasResult ? '<span class="badge badge--year">已分析</span>' : '<span class="badge" style="background:var(--bg-secondary);color:var(--text-muted)">待分析</span>'}
          <button class="btn btn--ghost btn--sm history-open-btn" data-id="${item.id}">查看</button>
          <button class="btn btn--ghost btn--sm history-delete-btn" data-id="${item.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');

  // 查看
  listEl.querySelectorAll('.history-open-btn').forEach(btn => {
    btn.addEventListener('click', () => openHistoryItem(btn.dataset.id));
  });

  // 删除单条
  listEl.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let history = JSON.parse(localStorage.getItem('pg_history') || '[]');
      history = history.filter(h => h.id !== btn.dataset.id);
      localStorage.setItem('pg_history', JSON.stringify(history));
      renderHistory();
    });
  });
}

function openHistoryItem(id) {
  const history = JSON.parse(localStorage.getItem('pg_history') || '[]');
  const item = history.find(h => h.id === id);
  if (!item) return;

  const tplId = window.Config.get('ai.template') || 'structured';
  const cachedResult = item.results?.[tplId] ? { summary: item.results[tplId] } : null;

  sessionStorage.setItem('pg_current_context', JSON.stringify({
    id: item.id,
    paper: item.paper || null,
    fileName: item.fileName,
    mode: item.mode || 'C',
    result: cachedResult,
  }));
  window.location.href = 'paper.html';
}

/* ===== 详情页 ===== */
function initDetailPage() {
  const container = document.querySelector('#pg-detail-container');
  if (!container) return;

  let context = null;
  try {
    const raw = sessionStorage.getItem('pg_current_context');
    if (raw) context = JSON.parse(raw);
  } catch { /* ignore */ }

  if (!context) {
    container.innerHTML = `<div class="empty-state"><p>数据丢失，请返回重新选择。</p><a href="index.html" class="btn btn--primary">返回首页</a></div>`;
    return;
  }

  // 恢复 File 对象（上传场景）
  // 注意：File 对象无法跨页面传递，分析已在跳转前完成，context.result 必定存在
  if (!context.result) {
    // 没有结果说明是从历史记录打开的待分析条目，提示用户重新上传
    context._needReupload = true;
  }

  if (context.paper?.title) document.title = `${context.paper.title} — PaperGainer`;
  else if (context.fileName) document.title = `${context.fileName} — PaperGainer`;

  window.DetailUI.render(container, context);
  window.DetailUI.triggerAnalyze(container, context);
}

/* ===== 设置页 ===== */
function initSettingsPage() {
  const cfg = window.Config.get();
  setVal('pg-api-base-url', cfg.ai.baseUrl);
  setVal('pg-api-key', cfg.ai.apiKey);
  setVal('pg-api-model', cfg.ai.model);
  setVal('pg-api-group-id', cfg.ai.groupId);
  setVal('pg-custom-prompt', cfg.customPrompt);

  document.querySelector('#pg-settings-save')?.addEventListener('click', saveSettings);
  document.querySelector('#pg-settings-reset')?.addEventListener('click', () => {
    if (confirm('确认重置所有配置为默认值？')) {
      window.Config.reset();
      window.Toast?.success('已重置，3秒后刷新...', 3000);
      setTimeout(() => location.reload(), 3000);
    }
  });
  document.querySelector('#pg-toggle-key')?.addEventListener('click', function () {
    const input = document.querySelector('#pg-api-key');
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    this.textContent = isHidden ? '隐藏' : '显示';
  });
}

function saveSettings() {
  window.Config.setMany({
    'ai.baseUrl': getVal('pg-api-base-url').trim(),
    'ai.apiKey': getVal('pg-api-key').trim(),
    'ai.model': getVal('pg-api-model').trim(),
    'ai.groupId': getVal('pg-api-group-id').trim(),
    'customPrompt': getVal('pg-custom-prompt').trim(),
  });
  window.Toast?.success('配置已保存！', 2500);
}

function setVal(id, val) { const el = document.querySelector(`#${id}`); if (el) el.value = val || ''; }
function getVal(id) { return document.querySelector(`#${id}`)?.value || ''; }
function escapeHtml(str = '') {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
