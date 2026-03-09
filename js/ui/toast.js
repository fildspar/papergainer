/**
 * PaperGainer - Toast 通知组件
 * 轻量级全局提示，支持 loading / success / error / info
 */

const Toast = (() => {
  let container = null;
  let currentTimeout = null;

  function ensureContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'pg-toast-container';
    document.body.appendChild(container);
  }

  /**
   * 显示通知
   * @param {string} message
   * @param {'info'|'success'|'error'|'loading'} type
   * @param {number} duration - ms，0表示不自动消失
   */
  function show(message, type = 'info', duration = 0) {
    ensureContainer();
    clearTimeout(currentTimeout);

    // 清空旧通知
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `pg-toast pg-toast--${type}`;

    const icons = {
      info: '◎',
      success: '✓',
      error: '✕',
      loading: '◌',
    };

    toast.innerHTML = `
      <span class="pg-toast__icon ${type === 'loading' ? 'pg-spin' : ''}">${icons[type] || icons.info}</span>
      <span class="pg-toast__msg">${message}</span>
    `;

    container.appendChild(toast);
    // 触发动画
    requestAnimationFrame(() => toast.classList.add('pg-toast--visible'));

    if (duration > 0) {
      currentTimeout = setTimeout(() => hide(), duration);
    }
  }

  function hide() {
    if (!container) return;
    const toast = container.querySelector('.pg-toast');
    if (toast) {
      toast.classList.remove('pg-toast--visible');
      setTimeout(() => { container.innerHTML = ''; }, 300);
    }
  }

  // 快捷方法
  const success = (msg, duration = 2500) => show(msg, 'success', duration);
  const error = (msg, duration = 4000) => show(msg, 'error', duration);
  const info = (msg, duration = 2500) => show(msg, 'info', duration);
  const loading = (msg) => show(msg, 'loading', 0);

  return { show, hide, success, error, info, loading };
})();

window.Toast = Toast;
