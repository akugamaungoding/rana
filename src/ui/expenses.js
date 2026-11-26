import { supabase } from '../supabase.js'
import { todayLocal, formatCurrency, formatDate } from '../lib/calc.js'
import { showToast, confirmAction, emptyState, listItem, skeletonList, openSheet, closeSheet, CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS } from './components.js'

export function renderExpenses(container) {
  const now = new Date()
  let viewYear = now.getFullYear()
  let viewMonth = now.getMonth()
  let filterCat = ''
  let editingId = null

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  container.innerHTML = `
    <div class="month-switcher">
      <button class="month-btn" id="exp-prev" aria-label="Previous month"><i class="ti ti-chevron-left"></i></button>
      <h3 id="exp-month-title">${MONTH_NAMES[viewMonth]} ${viewYear}</h3>
      <button class="month-btn" id="exp-next" aria-label="Next month"><i class="ti ti-chevron-right"></i></button>
    </div>

    <div class="filter-bar" id="exp-chips"></div>
    <div id="exp-breakdown" class="breakdown-bar"></div>
    <div class="card mb-16">
      <div style="display:flex;gap:16px;flex-wrap:wrap;" id="exp-totals"></div>
    </div>
    <div id="exp-list" class="list-group">${skeletonList(3)}</div>

    <button class="fab" id="exp-fab" aria-label="Add Expense"><i class="ti ti-plus"></i></button>
    <div class="sheet-backdrop" id="exp-backdrop"></div>
    <div class="bottom-sheet" id="exp-sheet">
      <div class="sheet-handle"></div>
      <h3 id="exp-form-title" style="font-size:16px;margin-bottom:12px;">Add Expense</h3>
      <form id="exp-form" class="form-grid">
        <div class="form-group">
          <label>Amount (Rp)</label>
          <input type="text" id="exp-amount" inputmode="numeric" required placeholder="0" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="exp-category">${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="exp-date" required />
        </div>
        <div class="form-group">
          <label>Note (optional)</label>
          <input type="text" id="exp-note" placeholder="e.g. Lunch with client" />
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="exp-cancel">Cancel</button>
          <button type="submit" class="btn-primary" id="exp-save">Save</button>
        </div>
      </form>
    </div>
  `

  // Elements
  const listEl = document.getElementById('exp-list')
  const totalsEl = document.getElementById('exp-totals')
  const breakdownEl = document.getElementById('exp-breakdown')
  const monthTitle = document.getElementById('exp-month-title')
  const chipsEl = document.getElementById('exp-chips')
  const sheet = document.getElementById('exp-sheet')
  const backdrop = document.getElementById('exp-backdrop')
  const form = document.getElementById('exp-form')
  const formTitle = document.getElementById('exp-form-title')
  const saveBtn = document.getElementById('exp-save')
  const amountInput = document.getElementById('exp-amount')

  // Build category chips
  function buildChips() {
    chipsEl.innerHTML = `<button class="chip ${filterCat === '' ? 'active' : ''}" data-cat="">All</button>` +
      CATEGORIES.map(c => `<button class="chip ${filterCat === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')
  }
  buildChips()

  chipsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]')
    if (!btn) return
    filterCat = btn.dataset.cat
    buildChips()
    load()
  })

  // Format amount input with thousand separators
  amountInput.addEventListener('input', () => {
    let raw = amountInput.value.replace(/[^\d]/g, '')
    if (raw) {
      amountInput.value = Number(raw).toLocaleString('id-ID')
    }
  })

  // Month navigation
  document.getElementById('exp-prev').addEventListener('click', () => {
    viewMonth--
    if (viewMonth < 0) { viewMonth = 11; viewYear-- }
    monthTitle.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`
    load()
  })
  document.getElementById('exp-next').addEventListener('click', () => {
    viewMonth++
    if (viewMonth > 11) { viewMonth = 0; viewYear++ }
    monthTitle.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`
    load()
  })

  // Sheet
  document.getElementById('exp-fab').addEventListener('click', () => openForm())
  document.getElementById('exp-cancel').addEventListener('click', () => closeForm())
  backdrop.addEventListener('click', () => closeForm())

  function openForm(expense) {
    editingId = expense ? expense.id : null
    formTitle.textContent = expense ? 'Edit Expense' : 'Add Expense'
    form.reset()
    if (expense) {
      amountInput.value = Number(expense.amount).toLocaleString('id-ID')
      document.getElementById('exp-category').value = expense.category
      document.getElementById('exp-date').value = expense.spent_on
      document.getElementById('exp-note').value = expense.note || ''
    } else {
      amountInput.value = ''
      document.getElementById('exp-date').value = todayLocal()
    }
    openSheet(sheet, backdrop)
  }

  function closeForm() {
    closeSheet(sheet, backdrop)
    editingId = null
  }

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const rawAmt = amountInput.value.replace(/\./g, '').replace(/,/g, '')
    const amount = Number(rawAmt)
    if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount', 'error'); return }

    const category = document.getElementById('exp-category').value
    const date = document.getElementById('exp-date').value
    const note = document.getElementById('exp-note').value.trim() || null

    if (!date) { showToast('Please select a date', 'error'); return }

    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { amount, category, spent_on: date, note }
      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId)
        if (error) { console.error('[expenses.update]', error); showToast(error.message, 'error'); return }
        showToast('Expense updated', 'success')
      } else {
        const { error } = await supabase.from('expenses').insert(payload)
        if (error) { console.error('[expenses.insert]', error); showToast(error.message, 'error'); return }
        showToast('Expense added', 'success')
      }
      closeForm()
      load()
    } catch (err) {
      console.error('[expenses.submit]', err)
      showToast('Failed to save expense', 'error')
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Save'
    }
  })

  async function load() {
    const mk = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    const startDate = `${mk}-01`
    // End of month: use first day of next month as exclusive bound
    const nextM = viewMonth + 1 > 11 ? 0 : viewMonth + 1
    const nextY = viewMonth + 1 > 11 ? viewYear + 1 : viewYear
    const endDate = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('spent_on', startDate)
        .lt('spent_on', endDate)
        .order('spent_on', { ascending: false })

      if (error) { console.error('[expenses.select]', error); showToast(error.message, 'error'); return }

      let items = data || []

      // Filter by category
      if (filterCat) items = items.filter(e => e.category === filterCat)

      renderTotals(items, data || [])
      renderBreakdown(data || [])
      renderList(items)
    } catch (err) {
      console.error('[expenses.load]', err)
      showToast('Failed to load expenses', 'error')
    }
  }

  function renderTotals(filtered, allMonth) {
    const today = todayLocal()
    const todayTotal = allMonth.filter(e => e.spent_on === today).reduce((s, e) => s + Number(e.amount), 0)
    const monthTotal = allMonth.reduce((s, e) => s + Number(e.amount), 0)
    const filteredTotal = filtered.reduce((s, e) => s + Number(e.amount), 0)

    totalsEl.innerHTML = `
      <div style="text-align:center;flex:1;">
        <div style="font-size:12px;color:var(--text-muted);">Today</div>
        <div style="font-size:18px;font-weight:500;">${formatCurrency(todayTotal)}</div>
      </div>
      <div style="text-align:center;flex:1;">
        <div style="font-size:12px;color:var(--text-muted);">This Month</div>
        <div style="font-size:18px;font-weight:500;">${formatCurrency(monthTotal)}</div>
      </div>
      ${filterCat ? `<div style="text-align:center;flex:1;">
        <div style="font-size:12px;color:var(--text-muted);">${filterCat}</div>
        <div style="font-size:18px;font-weight:500;">${formatCurrency(filteredTotal)}</div>
      </div>` : ''}
    `
  }

  function renderBreakdown(allMonth) {
    const total = allMonth.reduce((s, e) => s + Number(e.amount), 0)
    if (total === 0) { breakdownEl.innerHTML = ''; return }
    const catTotals = {}
    allMonth.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount) })
    breakdownEl.innerHTML = Object.entries(catTotals).map(([cat, amt]) => {
      const pct = (amt / total * 100).toFixed(1)
      const color = CATEGORY_COLORS[cat] || 'var(--purple)'
      return `<div class="breakdown-segment" style="width:${pct}%;background:${color};" title="${cat}: ${pct}%"></div>`
    }).join('')
  }

  function renderList(items) {
    listEl.innerHTML = ''
    if (items.length === 0) {
      listEl.appendChild(emptyState('ti ti-credit-card', 'No expenses', 'Tap + to record your first expense.'))
      return
    }

    // Group by date
    const grouped = {}
    items.forEach(e => { if (!grouped[e.spent_on]) grouped[e.spent_on] = []; grouped[e.spent_on].push(e) })

    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const header = document.createElement('div')
      header.className = 'date-header'
      header.textContent = formatDate(date)
      listEl.appendChild(header)

      grouped[date].forEach(e => {
        const catIcon = CATEGORY_ICONS[e.category] || 'ti-dots-circle-horizontal'
        listEl.appendChild(listItem({
          icon: catIcon,
          iconBg: 'var(--purple-soft)',
          main: e.category,
          sub: e.note || '',
          amount: `-${formatCurrency(e.amount)}`,
          amountColor: 'var(--danger)',
          onEdit: () => openForm(e),
          onDelete: async () => {
            if (!(await confirmAction('Delete this expense?'))) return
            try {
              const { error } = await supabase.from('expenses').delete().eq('id', e.id)
              if (error) { console.error('[expenses.delete]', error); showToast(error.message, 'error'); return }
              showToast('Expense deleted', 'success')
              load()
            } catch (err) { showToast('Failed to delete', 'error') }
          },
        }))
      })
    })
  }

  load()
}
