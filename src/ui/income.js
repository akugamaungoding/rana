import { supabase } from '../supabase.js'
import { todayLocal, formatCurrency, formatDate } from '../lib/calc.js'
import { showToast, confirmAction, emptyState, listItem, skeletonList, openSheet, closeSheet } from './components.js'

export function renderIncome(container) {
  let editingId = null

  container.innerHTML = `
    <h2 class="section-title">Income</h2>
    <div id="inc-list" class="list-group">${skeletonList(3)}</div>

    <button class="fab" id="inc-fab" aria-label="Add Income"><i class="ti ti-plus"></i></button>
    <div class="sheet-backdrop" id="inc-backdrop"></div>
    <div class="bottom-sheet" id="inc-sheet">
      <div class="sheet-handle"></div>
      <h3 id="inc-form-title" style="font-size:16px;margin-bottom:12px;">Add Income</h3>
      <form id="inc-form" class="form-grid">
        <div class="form-group">
          <label>Source</label>
          <input type="text" id="inc-source" required placeholder="e.g. Salary, Freelance" />
        </div>
        <div class="form-group">
          <label>Amount (Rp)</label>
          <input type="text" id="inc-amount" inputmode="numeric" required placeholder="0" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="inc-date" required />
        </div>
        <div class="form-check">
          <input type="checkbox" id="inc-recurring" />
          <label for="inc-recurring">Repeats monthly</label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="inc-cancel">Cancel</button>
          <button type="submit" class="btn-primary" id="inc-save">Save</button>
        </div>
      </form>
    </div>
  `

  const listEl = document.getElementById('inc-list')
  const sheet = document.getElementById('inc-sheet')
  const backdrop = document.getElementById('inc-backdrop')
  const form = document.getElementById('inc-form')
  const formTitle = document.getElementById('inc-form-title')
  const saveBtn = document.getElementById('inc-save')
  const amountInput = document.getElementById('inc-amount')

  // Format amount
  amountInput.addEventListener('input', () => {
    let raw = amountInput.value.replace(/[^\d]/g, '')
    if (raw) amountInput.value = Number(raw).toLocaleString('id-ID')
  })

  document.getElementById('inc-fab').addEventListener('click', () => openForm())
  document.getElementById('inc-cancel').addEventListener('click', () => closeForm())
  backdrop.addEventListener('click', () => closeForm())

  function openForm(income) {
    editingId = income ? income.id : null
    formTitle.textContent = income ? 'Edit Income' : 'Add Income'
    form.reset()
    if (income) {
      document.getElementById('inc-source').value = income.source
      amountInput.value = Number(income.amount).toLocaleString('id-ID')
      document.getElementById('inc-date').value = income.received_on
      document.getElementById('inc-recurring').checked = income.is_recurring
    } else {
      document.getElementById('inc-date').value = todayLocal()
    }
    openSheet(sheet, backdrop)
  }

  function closeForm() {
    closeSheet(sheet, backdrop)
    editingId = null
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const source = document.getElementById('inc-source').value.trim()
    if (!source) { showToast('Please enter a source', 'error'); return }

    const rawAmt = amountInput.value.replace(/\./g, '').replace(/,/g, '')
    const amount = Number(rawAmt)
    if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid amount', 'error'); return }

    const date = document.getElementById('inc-date').value
    if (!date) { showToast('Please select a date', 'error'); return }

    const isRecurring = document.getElementById('inc-recurring').checked

    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { source, amount, received_on: date, is_recurring: isRecurring }
      if (editingId) {
        const { error } = await supabase.from('incomes').update(payload).eq('id', editingId)
        if (error) { console.error('[incomes.update]', error); showToast(error.message, 'error'); return }
        showToast('Income updated', 'success')
      } else {
        const { error } = await supabase.from('incomes').insert(payload)
        if (error) { console.error('[incomes.insert]', error); showToast(error.message, 'error'); return }
        showToast('Income added', 'success')
      }
      closeForm()
      load()
    } catch (err) {
      console.error('[incomes.submit]', err)
      showToast('Failed to save income', 'error')
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Save'
    }
  })

  async function load() {
    try {
      const { data, error } = await supabase.from('incomes').select('*').order('received_on', { ascending: false })
      if (error) { console.error('[incomes.select]', error); showToast(error.message, 'error'); return }

      const incomes = data || []
      listEl.innerHTML = ''

      if (incomes.length === 0) {
        listEl.appendChild(emptyState('ti ti-coins', 'No income yet', 'Tap + to record your first income.'))
        return
      }

      incomes.forEach(inc => {
        listEl.appendChild(listItem({
          icon: 'ti-coins',
          iconBg: '#E6F7EF',
          main: inc.source,
          sub: formatDate(inc.received_on),
          amount: `+${formatCurrency(inc.amount)}`,
          amountColor: 'var(--success)',
          badge: inc.is_recurring ? 'Monthly' : null,
          onEdit: () => openForm(inc),
          onDelete: async () => {
            if (!(await confirmAction('Delete this income?'))) return
            try {
              const { error } = await supabase.from('incomes').delete().eq('id', inc.id)
              if (error) { console.error('[incomes.delete]', error); showToast(error.message, 'error'); return }
              showToast('Income deleted', 'success')
              load()
            } catch (err) { showToast('Failed to delete', 'error') }
          },
        }))
      })
    } catch (err) {
      console.error('[incomes.load]', err)
      showToast('Failed to load income', 'error')
    }
  }

  load()
}
