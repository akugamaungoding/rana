// Shared UI helper functions

// Format currency as Rp 1.250.000
export function formatCurrency(amount) {
  const num = Math.abs(Number(amount || 0));
  const parts = num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${parts}`;
}

// Format date as 26 Nov 2026
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Format date for input type="date" (YYYY-MM-DD)
export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}

// Get today's date as YYYY-MM-DD
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Get first day of month as YYYY-MM-DD
export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

// Get last day of month as YYYY-MM-DD
export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

// Get month key like "2026-11"
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse month key to Date
export function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

// Create an empty state element
export function emptyState(icon, title, subtitle, actionText, onAction) {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.innerHTML = `
    <i class="ti ${icon}"></i>
    <h3>${title}</h3>
    <p>${subtitle}</p>
    ${actionText ? `<button class="btn-primary">${actionText}</button>` : ''}
  `;
  if (onAction && actionText) {
    el.querySelector('button').addEventListener('click', onAction);
  }
  return el;
}

// Create a list item with edit/delete actions
export function listItem({ main, sub, amount, onEdit, onDelete, amountColor }) {
  const el = document.createElement('div');
  el.className = 'list-item';
  el.innerHTML = `
    <div class="list-item-content">
      <div class="main">${main}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
    </div>
    <div class="list-item-amount" style="color: ${amountColor || 'var(--text-main)'}">${amount}</div>
    <div class="list-item-actions">
      ${onEdit ? `<button class="btn-icon btn-edit" title="Edit"><i class="ti ti-pencil"></i></button>` : ''}
      ${onDelete ? `<button class="btn-icon btn-delete" title="Delete"><i class="ti ti-trash"></i></button>` : ''}
    </div>
  `;
  if (onEdit) el.querySelector('.btn-edit').addEventListener('click', (e) => { e.stopPropagation(); onEdit(); });
  if (onDelete) el.querySelector('.btn-delete').addEventListener('click', (e) => { e.stopPropagation(); onDelete(); });
  return el;
}

// Show error message
export function showError(container, message) {
  container.innerHTML = `<div class="empty-state"><i class="ti ti-alert-circle"></i><h3>Error</h3><p>${message}</p></div>`;
}

// Show a temporary message banner
export function showMessage(text, type = 'info') {
  const existing = document.getElementById('message-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'message-banner';
  banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);padding:10px 16px;border-radius:8px;font-size:14px;font-weight:500;font-family:Inter,sans-serif;z-index:1000;box-sizing:border-box;max-width:90%;text-align:center;opacity:0;transition:opacity 150ms ease;background:#7F3DD0;color:#ffffff;';
  banner.textContent = text;
  document.body.appendChild(banner);
  banner.offsetHeight;
  banner.style.opacity = '1';
  setTimeout(() => { banner.style.opacity = '0'; setTimeout(() => banner.remove(), 150); }, 3000);
}

// Show/hide loading overlay
export function showLoading(show) {
  let overlay = document.getElementById('loading-overlay');
  if (show) {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:Inter,sans-serif;font-size:16px;font-weight:500;color:#7F3DD0;';
    overlay.textContent = 'Loading...';
    document.body.appendChild(overlay);
  } else {
    if (overlay) overlay.remove();
  }
}

// Confirm dialog
export function confirmAction(message) {
  return new Promise((resolve) => {
    const dlg = document.createElement('div');
    dlg.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10000;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#ffffff;border:1px solid #E4D6F5;border-radius:16px;padding:24px;max-width:300px;width:88%;font-family:Inter,sans-serif;box-sizing:border-box;';
    card.innerHTML = '<p style="margin:0 0 16px; font-size:15px; color:#1a1a1a;">' + message + '</p><div style="display:flex; gap:8px; justify-content:flex-end;"><button id="cancel-btn" style="background:#ffffff;border:1px solid #E4D6F5;border-radius:8px;padding:10px 16px;font:500 14px Inter;cursor:pointer;color:#1a1a1a;">Cancel</button><button id="confirm-btn" style="background:#7F3DD0;border:none;border-radius:8px;padding:10px 16px;font:500 14px Inter;cursor:pointer;color:#ffffff;">Delete</button></div>';
    dlg.appendChild(card);
    document.body.appendChild(dlg);
    const resolveResult = (val) => { dlg.remove(); resolve(val); };
    card.querySelector('#cancel-btn').onclick = () => resolveResult(false);
    card.querySelector('#confirm-btn').onclick = () => resolveResult(true);
  });
}