/**
 * Shared UI components for Rana.
 * Toast, confirm dialog, empty state, list item, skeleton.
 */
import { formatCurrency, formatDate } from '../lib/calc.js'

// ── Toast ──
let toastTimer = null
export function showToast(text, type = 'info') {
  let toast = document.getElementById('rana-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'rana-toast'
    toast.className = 'toast'
    document.body.appendChild(toast)
  }
  clearTimeout(toastTimer)
  toast.className = `toast toast-${type}`
  toast.textContent = text
  // force reflow
  toast.offsetHeight
  toast.classList.add('show')
  toastTimer = setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

// ── Confirm Dialog ──
export function confirmAction(message) {
  return new Promise((resolve) => {
    const dlg = document.createElement('div')
    dlg.className = 'confirm-backdrop'
    dlg.innerHTML = `
      <div class="confirm-card">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn-primary" data-action="confirm" style="background:var(--danger);">Delete</button>
        </div>
      </div>
    `
    document.body.appendChild(dlg)
    const done = (val) => { dlg.remove(); resolve(val) }
    dlg.querySelector('[data-action="cancel"]').onclick = () => done(false)
    dlg.querySelector('[data-action="confirm"]').onclick = () => done(true)
    dlg.addEventListener('click', (e) => { if (e.target === dlg) done(false) })
  })
}

// ── Empty State ──
export function emptyState(icon, title, subtitle, actionText, onAction) {
  const el = document.createElement('div')
  el.className = 'empty-state'
  el.innerHTML = `
    <i class="ti ${icon}"></i>
    <h3>${title}</h3>
    <p>${subtitle}</p>
    ${actionText ? `<button class="btn-primary">${actionText}</button>` : ''}
  `
  if (onAction && actionText) {
    el.querySelector('button').addEventListener('click', onAction)
  }
  return el
}

// ── List Item ──
export function listItem({ icon, iconBg, main, sub, amount, amountColor, badge, onEdit, onDelete }) {
  const el = document.createElement('div')
  el.className = 'list-item'
  el.innerHTML = `
    ${icon ? `<div class="cat-icon" style="background:${iconBg || 'var(--purple-soft)'};color:${amountColor || 'var(--purple)'}"><i class="ti ${icon}"></i></div>` : ''}
    <div class="list-item-body">
      <div class="main-text">${main}${badge ? `<span class="badge-recurring">${badge}</span>` : ''}</div>
      ${sub ? `<div class="sub-text">${sub}</div>` : ''}
    </div>
    <div class="list-item-amount" style="color:${amountColor || 'var(--text)'}">${amount}</div>
    <div class="list-item-actions">
      ${onEdit ? `<button class="btn-icon" title="Edit" aria-label="Edit"><i class="ti ti-pencil"></i></button>` : ''}
      ${onDelete ? `<button class="btn-icon btn-delete" title="Delete" aria-label="Delete"><i class="ti ti-trash"></i></button>` : ''}
    </div>
  `
  if (onEdit) el.querySelector('[title="Edit"]').addEventListener('click', (e) => { e.stopPropagation(); onEdit() })
  if (onDelete) el.querySelector('[title="Delete"]').addEventListener('click', (e) => { e.stopPropagation(); onDelete() })
  return el
}

// ── Skeleton Loading ──
export function skeletonList(count = 3) {
  let html = ''
  for (let i = 0; i < count; i++) {
    html += `<div class="skeleton skeleton-card"></div>`
  }
  return html
}

// ── Category Icons Map ──
export const CATEGORY_ICONS = {
  'Food': 'ti-tools-kitchen-2',
  'Transport': 'ti-car',
  'Shopping': 'ti-shopping-cart',
  'Bills': 'ti-file-invoice',
  'Entertainment': 'ti-movie',
  'Health': 'ti-heart',
  'Other': 'ti-dots-circle-horizontal',
}

// Category colors (purple shades)
export const CATEGORY_COLORS = {
  'Food': '#7F3DD0',
  'Transport': '#9B59D0',
  'Shopping': '#6C3DB0',
  'Bills': '#5A2F9A',
  'Entertainment': '#B47EE5',
  'Health': '#4A1F8A',
  'Other': '#C9A4F0',
}

export const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']

// ── Sheet helpers ──
export function openSheet(sheetEl, backdropEl) {
  if (backdropEl) { backdropEl.style.display = 'block'; requestAnimationFrame(() => backdropEl.classList.add('open')) }
  requestAnimationFrame(() => sheetEl.classList.add('open'))
}

export function closeSheet(sheetEl, backdropEl) {
  sheetEl.classList.remove('open')
  if (backdropEl) {
    backdropEl.classList.remove('open')
    setTimeout(() => { backdropEl.style.display = 'none' }, 200)
  }
}
