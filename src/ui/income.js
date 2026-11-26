import { supabase } from '../supabase.js'
import { formatCurrency, formatDate, formatDateInput, todayISO, emptyState, listItem, showMessage, showLoading, confirmAction } from './components.js'

export function renderIncome(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h2>Income</h2>
      <button class="btn-primary" id="inc-add-btn">Add Income</button>
    </div>
    <div id="inc-list" class="list-group"></div>
    <div id="inc-form-sheet" class="hidden">
      <div class="card">
        <h3 id="inc-form-title">Add Income</h3>
        <form id="inc-form" class="form-grid">
          <input type="hidden" id="inc-id" />
          <div class="form-group"><label>Source (e.g. Salary, Freelance)</label><input type="text" id="inc-source" required placeholder="Salary" /></div>
          <div class="form-group"><label>Amount</label><input type="number" id="inc-amount" step="0.01" min="0" required placeholder="0" /></div>
          <div class="form-group"><label>Date</label><input type="date" id="inc-date" required /></div>
          <div class="form-group" style="display:flex; align-items:center; gap:8px; padding-top: 4px;"><input type="checkbox" id="inc-recurring" /><label style="margin:0; font-size:14px;">Repeats monthly</label></div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="inc-form-cancel">Cancel</button>
            <button type="submit" class="btn-primary" id="inc-form-save">Save</button>
          </div>
  async function load() {
    showLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showLoading(false); return }
    const uid = session.user.id
    try {
      const { data, error } = await supabase.from('incomes').select('*').eq('user_id', uid).order('received_on', { ascending: false })
      if (error) throw error
      const incomes = data || []
      listEl.innerHTML = ''
      if (incomes.length === 0) {
        listEl.appendChild(emptyState('ti ti-coins', 'No income yet', 'Tap "Add Income" to record your first income.', 'Add Income', () => openForm()))
        return
      }
      incomes.forEach(inc => {
        const recurringBadge = inc.is_recurring ? ' · recurring' : ''
        listEl.appendChild(listItem({
          main: inc.source + recurringBadge,
          sub: formatDate(inc.received_on),
          amount: '+' + formatCurrency(inc.amount),
          amountColor: '#16a34a',
          onEdit: () => openForm(inc),
          onDelete: async () => {
            if (!(await confirmAction('Delete this income?'))) return
            showLoading(true)
            try {
              const { error } = await supabase.from('incomes').delete().eq('id', inc.id)
              if (error) throw error
              showMessage('Income deleted')
              load()
            } catch (err) { showMessage(err.message || 'Failed to delete', 'error') }
            finally { showLoading(false) }
          },
        }))
      })
    } catch (err) { showMessage(err.message || 'Failed to load income', 'error') }
    finally { showLoading(false) }
  }
        </form>
      </div>
    </div>
  `

  let editingId = null
  const listEl = container.querySelector('#inc-list')
  const formSheet = document.getElementById('inc-form-sheet')
  const form = document.getElementById('inc-form')
  const addBtn = document.getElementById('inc-add-btn')
  const cancelBtn = document.getElementById('inc-form-cancel')
  const saveBtn = document.getElementById('inc-form-save')
  const formTitle = document.getElementById('inc-form-title')
  function openForm(income = null) {
    editingId = income ? income.id : null
    formTitle.textContent = income ? 'Edit Income' : 'Add Income'
    form.reset()
    if (income) {
      document.getElementById('inc-id').value = income.id
      document.getElementById('inc-source').value = income.source
      document.getElementById('inc-amount').value = income.amount
      document.getElementById('inc-date').value = formatDateInput(income.received_on)
      document.getElementById('inc-recurring').checked = income.is_recurring
    } else {
      document.getElementById('inc-id').value = ''
      document.getElementById('inc-source').value = ''
      document.getElementById('inc-amount').value = ''
      document.getElementById('inc-date').value = todayISO()
      document.getElementById('inc-recurring').checked = false
    }
    formSheet.classList.remove('hidden')
    document.getElementById('inc-source').focus()
  }

  function closeForm() { formSheet.classList.add('hidden'); editingId = null }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session.user.id
    const source = document.getElementById('inc-source').value.trim()
    const amount = document.getElementById('inc-amount').value
    const date = document.getElementById('inc-date').value
    const isRecurring = document.getElementById('inc-recurring').checked
    if (!source) { showMessage('Please enter a source', 'error'); return }
    if (!amount || parseFloat(amount) <= 0) { showMessage('Please enter a valid amount', 'error'); return }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { user_id: uid, source, amount: parseFloat(amount), received_on: date, is_recurring: isRecurring }
      if (editingId) {
        const { error } = await supabase.from('incomes').update(payload).eq('id', editingId)
        if (error) throw error
        showMessage('Income updated')
      } else {
        const { error } = await supabase.from('incomes').insert(payload)
        if (error) throw error
        showMessage('Income added')
      }
      closeForm(); load()
    } catch (err) { showMessage(err.message || 'Failed to save income', 'error') }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Save' }
  })

  cancelBtn.addEventListener('click', closeForm)
  addBtn.addEventListener('click', () => openForm())
  load()
  return () => {}
}