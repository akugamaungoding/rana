import { supabase } from '../supabase.js'
import { formatCurrency, formatDate, formatDateInput, todayISO, monthKey, emptyState, listItem, showMessage, showLoading, confirmAction } from './components.js'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other']

export function renderExpenses(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h2>Expenses</h2>
      <button class="btn-primary" id="exp-add-btn">Add Expense</button>
    </div>
    <div class="filters">
      <select class="filter-select" id="exp-month-filter"><option value="">All months</option></select>
      <select class="filter-select" id="exp-category-filter"><option value="">All categories</option></select>
    </div>
    <div class="card">
      <h3 id="exp-totals-title">Totals</h3>
      <div id="exp-totals" style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px;"></div>
    </div>
    <div id="exp-list" class="list-group"></div>
    <div id="exp-form-sheet" class="hidden">
      <div class="card">
        <h3 id="exp-form-title">Add Expense</h3>
        <form id="exp-form" class="form-grid">
          <input type="hidden" id="exp-id" />
          <div class="form-group"><label>Amount</label><input type="number" id="exp-amount" step="0.01" min="0" required placeholder="0" /></div>
          <div class="form-group"><label>Category</label><select id="exp-category"></select></div>
          <div class="form-group"><label>Date</label><input type="date" id="exp-date" required /></div>
          <div class="form-group"><label>Note (optional)</label><textarea id="exp-note" rows="2" placeholder="e.g. Lunch with client"></textarea></div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="exp-form-cancel">Cancel</button>
            <button type="submit" class="btn-primary" id="exp-form-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  `

  let currentMonth = monthKey()
  let editingId = null
  const monthFilter = container.querySelector('#exp-month-filter')
  const categoryFilter = container.querySelector('#exp-category-filter')
  const categorySelect = document.getElementById('exp-category')
  const listEl = container.querySelector('#exp-list')
  const totalsEl = document.getElementById('exp-totals')
  const totalsTitle = document.getElementById('exp-totals-title')
  const formSheet = document.getElementById('exp-form-sheet')
  const form = document.getElementById('exp-form')
  const addBtn = document.getElementById('exp-add-btn')
  const cancelBtn = document.getElementById('exp-form-cancel')
  const saveBtn = document.getElementById('exp-form-save')
  const formTitle = document.getElementById('exp-form-title')

  CATEGORIES.forEach(c => {
    const o1 = document.createElement('option'); o1.value = c; o1.textContent = c; categorySelect.appendChild(o1)
    const o2 = document.createElement('option'); o2.value = c; o2.textContent = c; categoryFilter.appendChild(o2)
  })

  function populateMonths() {
    monthFilter.innerHTML = '<option value="">All months</option>'
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      const opt = document.createElement('option')
      opt.value = mk; opt.textContent = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthFilter.appendChild(opt)
    }
  }

  async function load() {
    showLoading(true)
    populateMonths()
    monthFilter.value = currentMonth
    categoryFilter.value = ''
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showLoading(false); return }
    const uid = session.user.id
    try {
      const { data, error } = await supabase.from('expenses').select('*').eq('user_id', uid).order('spent_on', { ascending: false })
      if (error) throw error
      const expenses = data || []
      let filtered = expenses
      if (currentMonth && currentMonth !== '') filtered = filtered.filter(e => e.spent_on.startsWith(currentMonth))
      const catVal = categoryFilter.value
      if (catVal) filtered = filtered.filter(e => e.category === catVal)
      renderList(filtered)
      renderTotals(filtered)
    } catch (err) { showMessage(err.message || 'Failed to load expenses', 'error') }
    finally { showLoading(false) }
  }

  function renderList(expenses) {
    listEl.innerHTML = ''
    if (expenses.length === 0) {
      listEl.appendChild(emptyState('ti ti-credit-card', 'No expenses yet', 'Tap "Add Expense" to record your first expense.', 'Add Expense', () => openForm()))
      return
    }
    const grouped = {}
    expenses.forEach(e => { if (!grouped[e.spent_on]) grouped[e.spent_on] = []; grouped[e.spent_on].push(e) })
    Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(date => {
      const group = document.createElement('div')
      group.className = 'list-date-group'
      group.innerHTML = '<h4>' + formatDate(date) + '</h4>'
      listEl.appendChild(group)
      grouped[date].forEach(e => {
        listEl.appendChild(listItem({
          main: e.category,
          sub: formatDate(e.spent_on) + (e.note ? ' · ' + e.note : ''),
          amount: '-' + formatCurrency(e.amount),
          amountColor: 'var(--danger)',
          onEdit: () => openForm(e),
          onDelete: async () => {
            if (!(await confirmAction('Delete this expense?'))) return
            showLoading(true)
            try {
              const { error } = await supabase.from('expenses').delete().eq('id', e.id)
              if (error) throw error
              showMessage('Expense deleted')
              load()
            } catch (err) { showMessage(err.message || 'Failed to delete', 'error') }
            finally { showLoading(false) }
          },
        }))
      })
    })
  }

  function renderTotals(expenses) {
    const today = todayISO()
    const todayTotal = expenses.filter(e => e.spent_on === today).reduce((s, e) => s + Number(e.amount), 0)
    const monthTotal = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const catTotals = {}
    expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount) })
    totalsTitle.textContent = currentMonth ? 'Totals for ' + new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Totals (All)'
    const topCat = Object.keys(catTotals).length ? Object.keys(catTotals).reduce((a, b) => catTotals[a] > catTotals[b] ? a : b) : '—'
    totalsEl.innerHTML = `
      <div style="text-align:center;"><div style="font-size:12px; color:var(--text-muted);">Today</div><div style="font-size:18px; font-weight:500;">${formatCurrency(todayTotal)}</div></div>
      <div style="text-align:center;"><div style="font-size:12px; color:var(--text-muted);">This Month</div><div style="font-size:18px; font-weight:500;">${formatCurrency(monthTotal)}</div></div>
      <div style="flex:1; min-width:140px;"><div style="font-size:12px; color:var(--text-muted);">Top Category</div><div style="font-size:18px; font-weight:500;">${topCat}</div></div>
    `
  }

  function openForm(expense = null) {
    editingId = expense ? expense.id : null
    formTitle.textContent = expense ? 'Edit Expense' : 'Add Expense'
    form.reset()
    if (expense) {
      document.getElementById('exp-id').value = expense.id
      document.getElementById('exp-amount').value = expense.amount
      document.getElementById('exp-category').value = expense.category
      document.getElementById('exp-date').value = formatDateInput(expense.spent_on)
      document.getElementById('exp-note').value = expense.note || ''
    } else {
      document.getElementById('exp-id').value = ''
      document.getElementById('exp-amount').value = ''
      document.getElementById('exp-category').value = 'Food'
      document.getElementById('exp-date').value = todayISO()
      document.getElementById('exp-note').value = ''
    }
    formSheet.classList.remove('hidden')
    document.getElementById('exp-amount').focus()
  }

  function closeForm() { formSheet.classList.add('hidden'); editingId = null }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session.user.id
    const amount = document.getElementById('exp-amount').value
    const category = document.getElementById('exp-category').value
    const date = document.getElementById('exp-date').value
    const note = document.getElementById('exp-note').value
    if (!amount || parseFloat(amount) <= 0) { showMessage('Please enter a valid amount', 'error'); return }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { user_id: uid, amount: parseFloat(amount), category, spent_on: date, note: note || null }
      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId)
        if (error) throw error
        showMessage('Expense updated')
      } else {
        const { error } = await supabase.from('expenses').insert(payload)
        if (error) throw error
        showMessage('Expense added')
      }
      closeForm(); load()
    } catch (err) { showMessage(err.message || 'Failed to save expense', 'error') }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Save' }
  })

  cancelBtn.addEventListener('click', closeForm)
  addBtn.addEventListener('click', () => openForm())
  monthFilter.addEventListener('change', (e) => { currentMonth = e.target.value; load() })
  categoryFilter.addEventListener('change', () => load())
  load()
  return () => {}
}