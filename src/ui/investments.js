import { supabase } from '../supabase.js'
import { formatCurrency, formatDate, formatDateInput, todayISO, emptyState, listItem, showMessage, showLoading, confirmAction } from './components.js'

function returnPercent(value, capital) {
  // Return % = (value - capital) / capital * 100
  if (!capital || capital <= 0) return 0
  return ((value - capital) / capital) * 100
}

function profitLoss(value, capital) {
  return value - capital
}

function daysSinceStart(recordedOn, startDate) {
  const start = new Date(startDate + 'T00:00:00')
  const recorded = new Date(recordedOn + 'T00:00:00')
  return Math.ceil((recorded - start) / (1000 * 60 * 60 * 24))
}

function annualizedReturn(value, capital, days) {
  // ((value / capital) ^ (365 / days) - 1) * 100
  if (!days || days <= 0) return null
  if (!capital || capital <= 0) return null
  try {
    return ((Math.pow(value / capital, 365 / days) - 1) * 100)
  } catch (e) {
    return null
  }
}

export function renderInvestments(container) {
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
      <h2>Investments</h2>
      <button class="btn-primary" id="inv-add-btn">Add Investment</button>
    </div>
    <div class="summary-card">
      <h2>Portfolio Summary</h2>
      <div class="summary-grid">
        <div class="summary-item"><div class="value" id="port-total-capital">Rp 0</div><div class="label">Total Capital</div></div>
        <div class="summary-item"><div class="value" id="port-total-value">Rp 0</div><div class="label">Total Latest Value</div></div>
        <div class="summary-item positive" id="port-total-pl"><div class="value" id="port-total-pl-value">Rp 0</div><div class="label">Total Profit/Loss</div></div>
        <div class="summary-item"><div class="value" id="port-return-pct">0%</div><div class="label">Overall Return %</div></div>
      </div>
    </div>
    <div id="inv-list"></div>
    <div id="inv-form-sheet" class="hidden">
      <div class="card">
        <h3 id="inv-form-title">Add Investment</h3>
        <form id="inv-form" class="form-grid">
          <input type="hidden" id="inv-id" />
          <div class="form-group"><label>Name</label><input type="text" id="inv-name" required placeholder="e.g. Tech Stocks" /></div>
          <div class="form-group"><label>Initial Capital</label><input type="number" id="inv-capital" step="0.01" min="0" required placeholder="0" /></div>
          <div class="form-group"><label>Start Date</label><input type="date" id="inv-start-date" required /></div>
          <div class="form-group"><label>End Date</label><input type="date" id="inv-end-date" required /></div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" id="inv-form-cancel">Cancel</button>
            <button type="submit" class="btn-primary" id="inv-form-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  `

  let editingId = null
  const listEl = container.querySelector('#inv-list')
  const formSheet = document.getElementById('inv-form-sheet')
  async function load() {
    showLoading(true)
    // No auth check - show all investments (mode tanpa login)
    try {
      const [invRes, updRes] = await Promise.all([
        supabase.from('investments').select('*').order('created_at', { ascending: false }),
        supabase.from('investment_updates').select('*').order('recorded_on', { ascending: true }),
      ])
      if (invRes.error) throw invRes.error
      if (updRes.error) throw updRes.error
      const investments = invRes.data || []
      const allUpdates = updRes.data || []
      const updatesByInv = {}
      allUpdates.forEach(u => {
        if (!updatesByInv[u.investment_id]) updatesByInv[u.investment_id] = []
        updatesByInv[u.investment_id].push(u)
      })
      renderPortfolioSummary(investments, updatesByInv)
      renderInvestmentsList(investments, updatesByInv)
    } catch (err) { showMessage(err.message || 'Failed to load investments', 'error') }
    finally { showLoading(false) }
  }

  function renderPortfolioSummary(investments, updatesByInv) {
    let totalCapital = 0
    let totalLatestValue = 0
    investments.forEach(inv => {
      totalCapital += Number(inv.capital)
      const updates = updatesByInv[inv.id] || []
      if (updates.length > 0) {
        const latest = updates[updates.length - 1]
        totalLatestValue += Number(latest.value)
      } else {
        totalLatestValue += Number(inv.capital)
      }
    })
    const totalPL = totalLatestValue - totalCapital
    const overallReturn = totalCapital > 0 ? (totalPL / totalCapital) * 100 : 0
    document.getElementById('port-total-capital').textContent = formatCurrency(totalCapital)
    document.getElementById('port-total-value').textContent = formatCurrency(totalLatestValue)
    const plEl = document.getElementById('port-total-pl-value')
    const plItem = document.getElementById('port-total-pl')
    plEl.textContent = totalPL >= 0 ? '+' + formatCurrency(totalPL) : '-' + formatCurrency(Math.abs(totalPL))
    plItem.className = 'summary-item ' + (totalPL >= 0 ? 'positive' : 'negative')
    document.getElementById('port-return-pct').textContent = (overallReturn >= 0 ? '+' : '') + overallReturn.toFixed(2) + '%'
  }
  const form = document.getElementById('inv-form')
  const addBtn = document.getElementById('inv-add-btn')
  const cancelBtn = document.getElementById('inv-form-cancel')
  const saveBtn = document.getElementById('inv-form-save')
  const formTitle = document.getElementById('inv-form-title')
  function renderInvestmentsList(investments, updatesByInv) {
    listEl.innerHTML = ''
    if (investments.length === 0) {
      listEl.appendChild(emptyState('ti ti-trending-up', 'No investments yet', 'Tap "Add Investment" to start tracking your portfolio.', 'Add Investment', () => openForm()))
      return
    }
    investments.forEach(inv => {
      const updates = updatesByInv[inv.id] || []
      const latest = updates.length > 0 ? updates[updates.length - 1] : null
      const capital = Number(inv.capital)
      const latestValue = latest ? Number(latest.value) : capital
      const retPct = returnPercent(latestValue, capital)
      const pl = profitLoss(latestValue, capital)
      const daysElapsed = latest ? daysSinceStart(latest.recorded_on, inv.start_date) : 0
      const totalDays = daysSinceStart(inv.end_date, inv.start_date)
      const daysRemaining = totalDays - daysElapsed
      const annualized = latest ? annualizedReturn(latestValue, capital, daysElapsed) : null
      const card = document.createElement('div')
      card.className = 'investment-card'
      card.innerHTML = '<div class="investment-card-header">' +
        '<h3>' + inv.name + '</h3>' +
        '<button class="btn-icon btn-delete" title="Delete Investment" id="del-' + inv.id + '"><i class="ti ti-trash"></i></button>' +
        '</div>' +
        '<div class="investment-meta">' +
        '<div class="meta-item"><span class="meta-value">' + formatDate(inv.start_date) + '</span><span>Start</span></div>' +
        '<div class="meta-item"><span class="meta-value">' + formatDate(inv.end_date) + '</span><span>End</span></div>' +
        '<div class="meta-item"><span class="meta-value">' + totalDays + ' days</span><span>Duration</span></div>' +
        '<div class="meta-item"><span class="meta-value">' + daysElapsed + ' days</span><span>Elapsed</span></div>' +
        '</div>' +
        '<div class="investment-returns">' +
        '<h4>Current Position</h4>' +
        '<div class="return-row"><span>Latest Value</span><span class="return-value">' + formatCurrency(latestValue) + '</span></div>' +
        '<div class="return-row"><span>Return %</span><span class="return-value ' + (retPct >= 0 ? 'positive' : 'negative') + '">' + (retPct >= 0 ? '+' : '') + retPct.toFixed(2) + '%</span></div>' +
        '<div class="return-row"><span>Profit/Loss</span><span class="return-value ' + (pl >= 0 ? 'positive' : 'negative') + '">' + (pl >= 0 ? '+' : '') + formatCurrency(pl) + '</span></div>' +
        '<div class="return-row"><span>Days Remaining</span><span class="return-value">' + Math.max(daysRemaining, 0) + '</span></div>' +
        (annualized !== null ? '<div class="return-row"><span>Annualized Return</span><span class="return-value ' + (annualized >= 0 ? 'positive' : 'negative') + '">' + (annualized >= 0 ? '+' : '') + annualized.toFixed(2) + '%</span></div>' : '<div class="return-row"><span>Annualized Return</span><span class="return-value">n/a</span></div>') +
        '</div>' +
        '<div class="chart-container"><svg id="chart-' + inv.id + '"></svg></div>' +
        '<div style="margin-top:16px;">' +
        '<h4 style="font-size:14px; color:var(--text-muted); margin-bottom:8px;">Add Value Update</h4>' +
        '<form class="inv-update-form" data-inv-id="' + inv.id + '">' +
        '<div class="form-row">' +
        '<input type="date" class="inv-update-date" required />' +
        '<input type="number" step="0.01" min="0" class="inv-update-value" required placeholder="Value" />' +
        '<button type="submit" class="btn-primary" style="padding:0 16px;">Add</button>' +
        '</div>' +
        '</form>' +
        '</div>' +
        '<div class="investment-history">' +
        '<h4>History</h4>' +
        '<div id="hist-' + inv.id + '" class="history-list"></div>' +
        '</div>'
      card.querySelector('#del-' + inv.id).addEventListener('click', async () => {
        if (!(await confirmAction('Delete this investment and all its updates?'))) return
        showLoading(true)
        try {
          const { error } = await supabase.from('investments').delete().eq('id', inv.id)
          if (error) throw error
          showMessage('Investment deleted')
          load()
        } catch (err) { showMessage(err.message || 'Failed to delete', 'error') }
        finally { showLoading(false) }
      })

      const updateForm = card.querySelector('.inv-update-form')
      updateForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session.user.id
        const date = updateForm.querySelector('.inv-update-date').value
        const value = updateForm.querySelector('.inv-update-value').value
        if (!date) { showMessage('Please select a date', 'error'); return }
        if (!value || parseFloat(value) < 0) { showMessage('Please enter a valid value', 'error'); return }
        const selDate = new Date(date + 'T00:00:00')
        const startDate = new Date(inv.start_date + 'T00:00:00')
        const endDate = new Date(inv.end_date + 'T00:00:00')
        if (selDate < startDate || selDate > endDate) { showMessage('Update date must be within the investment period', 'error'); return }
        const btn = updateForm.querySelector('button[type="submit"]')
        btn.disabled = true; btn.textContent = 'Saving...'
        try {
          const { error } = await supabase.from('investment_updates').insert({
            user_id: uid, investment_id: inv.id, recorded_on: date, value: parseFloat(value), note: null,
          })
          if (error) throw error
          updateForm.reset()
          load()
        } catch (err) { showMessage(err.message || 'Failed to add update', 'error') }
        finally { btn.disabled = false; btn.textContent = 'Add' }
      })

      const histEl = card.querySelector('#hist-' + inv.id)
      if (updates.length === 0) {
        histEl.innerHTML = '<div class="history-empty">No updates yet. Add a value update above to start tracking returns.</div>'
      } else {
        histEl.innerHTML = ''
        updates.slice().sort((a, b) => new Date(a.recorded_on) - new Date(b.recorded_on)).forEach(u => {
          const uRetPct = returnPercent(Number(u.value), capital)
          histEl.appendChild(listItem({
            main: formatDate(u.recorded_on),
            sub: formatCurrency(Number(u.value)) + (u.note ? ' · ' + u.note : ''),
            amount: (uRetPct >= 0 ? '+' : '') + uRetPct.toFixed(2) + '%',
            amountColor: uRetPct >= 0 ? '#16a34a' : 'var(--danger)',
            onEdit: () => openUpdateForm(u),
            onDelete: async () => {
              if (!(await confirmAction('Delete this update?'))) return
              showLoading(true)
              try {
                const { error } = await supabase.from('investment_updates').delete().eq('id', u.id)
                if (error) throw error
                showMessage('Update deleted')
                load()
              } catch (err) { showMessage(err.message || 'Failed to delete', 'error') }
              finally { showLoading(false) }
            },
          }))
        })
        drawChart('chart-' + inv.id, updates, capital)
      }

      listEl.appendChild(card)
    })
  }
  function drawChart(elementId, updates, capital) {
    const svg = document.getElementById(elementId)
    if (!svg || updates.length === 0) return
    const width = svg.clientWidth || 300
    const height = 140
    const padding = 20
    const values = updates.map(u => returnPercent(Number(u.value), capital))
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1
    const xStep = (width - 2 * padding) / Math.max(updates.length - 1, 1)
    let path = ''
    updates.forEach((_, i) => {
      const x = padding + i * xStep
      const y = height - padding - ((values[i] - minVal) / range) * (height - 2 * padding)
      path += (i === 0 ? 'M ' + x + ' ' + y : ' L ' + x + ' ' + y)
    })
    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
    svg.innerHTML = '<polyline points="' + path + '" fill="none" stroke="var(--primary)" stroke-width="2" />' +
      updates.map((_, i) => {
        const x = padding + i * xStep
        const y = height - padding - ((values[i] - minVal) / range) * (height - 2 * padding)
        return '<circle cx="' + x + '" cy="' + y + '" r="3" fill="var(--primary)" />'
      }).join('')
  }

  function openForm() {
    editingId = null
    formTitle.textContent = 'Add Investment'
    form.reset()
    document.getElementById('inv-id').value = ''
    document.getElementById('inv-name').value = ''
    document.getElementById('inv-capital').value = ''
    document.getElementById('inv-start-date').value = todayISO()
    document.getElementById('inv-end-date').value = todayISO()
    formSheet.classList.remove('hidden')
    document.getElementById('inv-name').focus()
  }

  function closeForm() { formSheet.classList.add('hidden'); editingId = null }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session.user.id
    const name = document.getElementById('inv-name').value.trim()
    const capital = document.getElementById('inv-capital').value
    const startDate = document.getElementById('inv-start-date').value
    const endDate = document.getElementById('inv-end-date').value
    if (!name) { showMessage('Please enter a name', 'error'); return }
    if (!capital || parseFloat(capital) <= 0) { showMessage('Capital must be greater than 0', 'error'); return }
    if (!startDate || !endDate) { showMessage('Please select both dates', 'error'); return }
    if (new Date(endDate) < new Date(startDate)) { showMessage('End date must be after start date', 'error'); return }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { user_id: uid, name, capital: parseFloat(capital), start_date: startDate, end_date: endDate }
      const { error } = await supabase.from('investments').insert(payload)
      if (error) throw error
      showMessage('Investment added')
      closeForm(); load()
    } catch (err) { showMessage(err.message || 'Failed to save investment', 'error') }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Save' }
  })

  cancelBtn.addEventListener('click', closeForm)
  addBtn.addEventListener('click', openForm)
  load()
  return () => {}
}