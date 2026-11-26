import { supabase } from '../supabase.js'
import { todayLocal, formatCurrency, formatDate, daysBetween, returnPercent, profitLoss, annualizedReturn } from '../lib/calc.js'
import { showToast, confirmAction, emptyState, listItem, skeletonList, openSheet, closeSheet } from './components.js'

export function renderInvestments(container) {
  let editingInvId = null
  let editingUpdateId = null
  let editingUpdateInvId = null

  container.innerHTML = `
    <h2 class="section-title">Investments</h2>

    <div id="inv-port" class="port-grid"></div>
    <div id="inv-list">${skeletonList(2)}</div>

    <button class="fab" id="inv-fab" aria-label="Add Investment"><i class="ti ti-plus"></i></button>
    <div class="sheet-backdrop" id="inv-backdrop"></div>
    <div class="bottom-sheet" id="inv-sheet">
      <div class="sheet-handle"></div>
      <h3 id="inv-form-title" style="font-size:16px;margin-bottom:12px;">Add Investment</h3>
      <form id="inv-form" class="form-grid">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="inv-name" required placeholder="e.g. Tech Stocks" />
        </div>
        <div class="form-group">
          <label>Initial Capital (Rp)</label>
          <input type="text" id="inv-capital" inputmode="numeric" required placeholder="0" autocomplete="off" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input type="date" id="inv-start" required />
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="date" id="inv-end" required />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="inv-cancel">Cancel</button>
          <button type="submit" class="btn-primary" id="inv-save">Save</button>
        </div>
      </form>
    </div>
  `

  const listEl = document.getElementById('inv-list')
  const portEl = document.getElementById('inv-port')
  const sheet = document.getElementById('inv-sheet')
  const backdrop = document.getElementById('inv-backdrop')
  const form = document.getElementById('inv-form')
  const formTitle = document.getElementById('inv-form-title')
  const saveBtn = document.getElementById('inv-save')
  const capitalInput = document.getElementById('inv-capital')

  // Format capital input
  capitalInput.addEventListener('input', () => {
    let raw = capitalInput.value.replace(/[^\d]/g, '')
    if (raw) capitalInput.value = Number(raw).toLocaleString('id-ID')
  })

  document.getElementById('inv-fab').addEventListener('click', () => openForm())
  document.getElementById('inv-cancel').addEventListener('click', () => closeForm())
  backdrop.addEventListener('click', () => closeForm())

  function openForm(inv) {
    editingInvId = inv ? inv.id : null
    formTitle.textContent = inv ? 'Edit Investment' : 'Add Investment'
    form.reset()
    if (inv) {
      document.getElementById('inv-name').value = inv.name
      capitalInput.value = Number(inv.capital).toLocaleString('id-ID')
      document.getElementById('inv-start').value = inv.start_date
      document.getElementById('inv-end').value = inv.end_date
    } else {
      document.getElementById('inv-start').value = todayLocal()
      document.getElementById('inv-end').value = todayLocal()
    }
    openSheet(sheet, backdrop)
  }

  function closeForm() {
    closeSheet(sheet, backdrop)
    editingInvId = null
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.getElementById('inv-name').value.trim()
    if (!name) { showToast('Please enter a name', 'error'); return }

    const rawCap = capitalInput.value.replace(/\./g, '').replace(/,/g, '')
    const capital = Number(rawCap)
    if (isNaN(capital) || capital <= 0) { showToast('Capital must be greater than 0', 'error'); return }

    const startDate = document.getElementById('inv-start').value
    const endDate = document.getElementById('inv-end').value
    if (!startDate || !endDate) { showToast('Please select both dates', 'error'); return }
    if (endDate < startDate) { showToast('End date must be on or after start date', 'error'); return }

    saveBtn.disabled = true; saveBtn.textContent = 'Saving...'
    try {
      const payload = { name, capital, start_date: startDate, end_date: endDate }
      if (editingInvId) {
        const { error } = await supabase.from('investments').update(payload).eq('id', editingInvId)
        if (error) { console.error('[investments.update]', error); showToast(error.message, 'error'); return }
        showToast('Investment updated', 'success')
      } else {
        const { error } = await supabase.from('investments').insert(payload)
        if (error) { console.error('[investments.insert]', error); showToast(error.message, 'error'); return }
        showToast('Investment added', 'success')
      }
      closeForm()
      load()
    } catch (err) {
      console.error('[investments.submit]', err)
      showToast('Failed to save investment', 'error')
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Save'
    }
  })

  async function load() {
    try {
      const [invRes, updRes] = await Promise.all([
        supabase.from('investments').select('*').order('created_at', { ascending: false }),
        supabase.from('investment_updates').select('*').order('recorded_on', { ascending: true }),
      ])
      if (invRes.error) { console.error('[investments.select]', invRes.error); showToast(invRes.error.message, 'error'); return }
      if (updRes.error) { console.error('[updates.select]', updRes.error); showToast(updRes.error.message, 'error'); return }

      const investments = invRes.data || []
      const allUpdates = updRes.data || []

      const updatesByInv = {}
      allUpdates.forEach(u => {
        if (!updatesByInv[u.investment_id]) updatesByInv[u.investment_id] = []
        updatesByInv[u.investment_id].push(u)
      })

      renderPortfolio(investments, updatesByInv)
      renderList(investments, updatesByInv)
    } catch (err) {
      console.error('[investments.load]', err)
      showToast('Failed to load investments', 'error')
    }
  }

  function renderPortfolio(investments, updatesByInv) {
    if (investments.length === 0) {
      portEl.innerHTML = ''
      return
    }
    let totalCap = 0, totalVal = 0
    investments.forEach(inv => {
      const cap = Number(inv.capital)
      totalCap += cap
      const upd = updatesByInv[inv.id] || []
      totalVal += upd.length > 0 ? Number(upd[upd.length - 1].value) : cap
    })
    const pl = totalVal - totalCap
    const ret = totalCap > 0 ? (pl / totalCap * 100) : 0

    portEl.innerHTML = `
      <div class="port-item"><div class="port-val">${formatCurrency(totalCap)}</div><div class="port-label">Total Capital</div></div>
      <div class="port-item"><div class="port-val">${formatCurrency(totalVal)}</div><div class="port-label">Total Value</div></div>
      <div class="port-item ${pl >= 0 ? 'positive' : 'negative'}"><div class="port-val">${pl >= 0 ? '+' : '-'}${formatCurrency(Math.abs(pl))}</div><div class="port-label">Profit/Loss</div></div>
      <div class="port-item ${ret >= 0 ? 'positive' : 'negative'}"><div class="port-val">${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%</div><div class="port-label">Return %</div></div>
    `
  }

  function renderList(investments, updatesByInv) {
    listEl.innerHTML = ''
    if (investments.length === 0) {
      listEl.appendChild(emptyState('ti ti-trending-up', 'No investments yet', 'Tap + to start tracking your portfolio.'))
      return
    }

    investments.forEach(inv => {
      const updates = updatesByInv[inv.id] || []
      const capital = Number(inv.capital)
      const latest = updates.length > 0 ? updates[updates.length - 1] : null
      const latestValue = latest ? Number(latest.value) : capital
      const retPct = returnPercent(latestValue, capital)
      const pl = profitLoss(latestValue, capital)
      const totalDays = daysBetween(inv.start_date, inv.end_date)
      const daysElapsed = latest ? daysBetween(inv.start_date, latest.recorded_on) : 0
      const daysRemain = Math.max(totalDays - daysElapsed, 0)
      const ann = latest ? annualizedReturn(latestValue, capital, daysElapsed) : null
      const progressPct = totalDays > 0 ? Math.min((daysElapsed / totalDays) * 100, 100) : 0

      const card = document.createElement('div')
      card.className = 'inv-card'
      card.innerHTML = `
        <div class="inv-card-header">
          <div>
            <h3>${inv.name}</h3>
            <div style="font-size:12px;color:var(--text-muted);">${formatDate(inv.start_date)} – ${formatDate(inv.end_date)} · ${totalDays} days</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button class="btn-icon" data-action="edit-inv" aria-label="Edit Investment"><i class="ti ti-pencil"></i></button>
            <button class="btn-icon btn-delete" data-action="delete-inv" aria-label="Delete Investment"><i class="ti ti-trash"></i></button>
          </div>
        </div>

        <div class="inv-progress"><div class="inv-progress-fill" style="width:${progressPct}%"></div></div>

        <div class="inv-meta">
          <div class="meta-item"><span class="meta-val">${formatCurrency(capital)}</span>Capital</div>
          <div class="meta-item"><span class="meta-val">${formatCurrency(latestValue)}</span>Latest Value</div>
          <div class="meta-item"><span class="meta-val">${daysElapsed} of ${totalDays}</span>Days Elapsed</div>
          <div class="meta-item"><span class="meta-val">${daysRemain}</span>Days Left</div>
        </div>

        <div class="inv-returns">
          <div class="inv-big-return ${retPct >= 0 ? 'positive' : 'negative'}">
            <i class="ti ${retPct >= 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right'}"></i>
            ${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%
          </div>
          <div class="inv-return-row"><span>Profit/Loss</span><span class="inv-return-val ${pl >= 0 ? 'positive' : 'negative'}">${pl >= 0 ? '+' : '-'}${formatCurrency(Math.abs(pl))}</span></div>
          <div class="inv-return-row"><span>Annualized Return</span><span class="inv-return-val ${ann !== null && ann >= 0 ? 'positive' : ann !== null ? 'negative' : ''}">${ann !== null ? (ann >= 0 ? '+' : '') + ann.toFixed(2) + '%' : 'n/a'}</span></div>
        </div>

        <div class="chart-wrap"><svg id="chart-${inv.id}"></svg></div>

        <details style="margin-top:12px;">
          <summary style="cursor:pointer;font-size:14px;font-weight:500;color:var(--purple);padding:8px 0;">Add Value Update</summary>
          <form class="update-form form-grid" style="margin-top:8px;" data-inv-id="${inv.id}">
            <div class="form-row">
              <div class="form-group"><label>Date</label><input type="date" class="upd-date" required min="${inv.start_date}" max="${inv.end_date}" /></div>
              <div class="form-group"><label>Value (Rp)</label><input type="text" class="upd-value" inputmode="numeric" required placeholder="0" autocomplete="off" /></div>
            </div>
            <button type="submit" class="btn-primary upd-save">Add Update</button>
          </form>
        </details>

        <div style="margin-top:16px;">
          <h4 style="font-size:14px;color:var(--text-muted);margin-bottom:8px;">History</h4>
          <div class="history-list"></div>
        </div>
      `

      // Event: delete investment
      card.querySelector('[data-action="delete-inv"]').addEventListener('click', async () => {
        if (!(await confirmAction('Delete this investment and all its updates?'))) return
        try {
          const { error } = await supabase.from('investments').delete().eq('id', inv.id)
          if (error) { console.error('[investments.delete]', error); showToast(error.message, 'error'); return }
          showToast('Investment deleted', 'success')
          load()
        } catch (err) { showToast('Failed to delete investment', 'error') }
      })

      // Event: edit investment
      card.querySelector('[data-action="edit-inv"]').addEventListener('click', () => openForm(inv))

      // Event: update form
      const updateForm = card.querySelector('.update-form')
      const updValueInput = updateForm.querySelector('.upd-value')
      updValueInput.addEventListener('input', () => {
        let raw = updValueInput.value.replace(/[^\d]/g, '')
        if (raw) updValueInput.value = Number(raw).toLocaleString('id-ID')
      })

      updateForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const date = updateForm.querySelector('.upd-date').value
        if (!date) { showToast('Please select a date', 'error'); return }
        if (date < inv.start_date || date > inv.end_date) { showToast('Date must be within investment period', 'error'); return }

        const rawVal = updValueInput.value.replace(/\./g, '').replace(/,/g, '')
        const value = Number(rawVal)
        if (isNaN(value) || value < 0) { showToast('Please enter a valid value', 'error'); return }

        const btn = updateForm.querySelector('.upd-save')
        btn.disabled = true; btn.textContent = 'Saving...'
        try {
          const { error } = await supabase.from('investment_updates').insert({
            investment_id: inv.id, recorded_on: date, value, note: null
          })
          if (error) {
            const msg = error.message || ''
            if (msg.includes('unique') || msg.includes('duplicate')) {
              showToast('You already have an update for this date', 'error')
            } else {
              console.error('[updates.insert]', error)
              showToast(error.message, 'error')
            }
            return
          }
          showToast('Update added', 'success')
          updateForm.reset()
          load()
        } catch (err) {
          console.error('[updates.insert]', err)
          showToast('Failed to add update', 'error')
        } finally {
          btn.disabled = false; btn.textContent = 'Add Update'
        }
      })

      // History list
      const histEl = card.querySelector('.history-list')
      if (updates.length === 0) {
        histEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px;">No updates yet. Add a value update above to start tracking returns.</div>`
      } else {
        updates.forEach(u => {
          const uRet = returnPercent(Number(u.value), capital)
          const uPl = profitLoss(Number(u.value), capital)
          const uDays = daysBetween(inv.start_date, u.recorded_on)

          histEl.appendChild(listItem({
            main: formatDate(u.recorded_on),
            sub: `${formatCurrency(Number(u.value))} · Day ${uDays}`,
            amount: `${uRet >= 0 ? '+' : ''}${uRet.toFixed(2)}%`,
            amountColor: uRet >= 0 ? 'var(--success)' : 'var(--danger)',
            onEdit: () => editUpdate(inv, u),
            onDelete: async () => {
              if (!(await confirmAction('Delete this update?'))) return
              try {
                const { error } = await supabase.from('investment_updates').delete().eq('id', u.id)
                if (error) { console.error('[updates.delete]', error); showToast(error.message, 'error'); return }
                showToast('Update deleted', 'success')
                load()
              } catch (err) { showToast('Failed to delete', 'error') }
            },
          }))
        })
      }

      listEl.appendChild(card)

      // Draw chart after element is in DOM
      requestAnimationFrame(() => drawChart(`chart-${inv.id}`, updates, capital))
    })
  }

  function editUpdate(inv, u) {
    // Find the update form in the card and pre-fill it
    const form = document.querySelector(`[data-inv-id="${inv.id}"]`)
    if (!form) return
    form.closest('details').open = true
    form.querySelector('.upd-date').value = u.recorded_on
    const valInput = form.querySelector('.upd-value')
    valInput.value = Number(u.value).toLocaleString('id-ID')
    const btn = form.querySelector('.upd-save')
    btn.textContent = 'Save Update'

    // Replace submit handler temporarily
    const newHandler = async (e) => {
      e.preventDefault()
      const date = form.querySelector('.upd-date').value
      if (!date) { showToast('Please select a date', 'error'); return }
      const rawVal = valInput.value.replace(/\./g, '').replace(/,/g, '')
      const value = Number(rawVal)
      if (isNaN(value) || value < 0) { showToast('Please enter a valid value', 'error'); return }

      btn.disabled = true; btn.textContent = 'Saving...'
      try {
        const { error } = await supabase.from('investment_updates').update({
          recorded_on: date, value, note: null
        }).eq('id', u.id)
        if (error) { console.error('[updates.update]', error); showToast(error.message, 'error'); return }
        showToast('Update saved', 'success')
        form.reset()
        load()
      } catch (err) {
        showToast('Failed to save update', 'error')
      } finally {
        btn.disabled = false; btn.textContent = 'Add Update'
        form.removeEventListener('submit', newHandler)
      }
    }
    // Remove old submit listener by cloning
    const newForm = form.cloneNode(true)
    form.parentNode.replaceChild(newForm, form)
    // Re-attach format handler
    const newValInput = newForm.querySelector('.upd-value')
    newValInput.value = Number(u.value).toLocaleString('id-ID')
    newForm.querySelector('.upd-date').value = u.recorded_on
    newValInput.addEventListener('input', () => {
      let raw = newValInput.value.replace(/[^\d]/g, '')
      if (raw) newValInput.value = Number(raw).toLocaleString('id-ID')
    })
    newForm.querySelector('.upd-save').textContent = 'Save Update'
    newForm.addEventListener('submit', newHandler)
  }

  /**
   * Draw an SVG line chart of Return % over time.
   * Handles 0, 1, and many data points.
   */
  function drawChart(elementId, updates, capital) {
    const svg = document.getElementById(elementId)
    if (!svg || updates.length === 0) {
      if (svg) svg.parentElement.style.display = 'none'
      return
    }

    const width = svg.parentElement.clientWidth || 300
    const height = 160
    const pad = { top: 20, right: 16, bottom: 24, left: 40 }
    const chartW = width - pad.left - pad.right
    const chartH = height - pad.top - pad.bottom

    const values = updates.map(u => returnPercent(Number(u.value), capital))
    const labels = updates.map(u => {
      const parts = u.recorded_on.split('-')
      return `${parseInt(parts[2])}/${parseInt(parts[1])}`
    })

    const minVal = Math.min(0, ...values)
    const maxVal = Math.max(0, ...values)
    const range = maxVal - minVal || 1

    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    if (updates.length === 1) {
      // Single point
      const x = pad.left + chartW / 2
      const y = pad.top + chartH / 2
      svg.innerHTML = `
        <circle cx="${x}" cy="${y}" r="4" fill="var(--purple)" />
        <text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" fill="var(--text-muted)">${values[0].toFixed(1)}%</text>
      `
      return
    }

    const xStep = chartW / (updates.length - 1)
    const points = values.map((v, i) => {
      const x = pad.left + i * xStep
      const y = pad.top + chartH - ((v - minVal) / range) * chartH
      return { x, y }
    })

    // Area fill path
    const areaPath = `M ${points[0].x} ${pad.top + chartH} ` +
      points.map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${points[points.length - 1].x} ${pad.top + chartH} Z`

    // Line path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

    // Zero line
    const zeroY = pad.top + chartH - ((0 - minVal) / range) * chartH

    // Axis labels (first and last date, and 0% line)
    svg.innerHTML = `
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--purple)" stop-opacity="0.15" />
          <stop offset="100%" stop-color="var(--purple)" stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <line x1="${pad.left}" y1="${zeroY}" x2="${width - pad.right}" y2="${zeroY}" stroke="var(--purple-line)" stroke-width="1" stroke-dasharray="4 2" />
      <text x="${pad.left - 4}" y="${zeroY + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">0%</text>
      <path d="${areaPath}" fill="var(--purple-soft)" />
      <path d="${linePath}" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${points.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--purple)" />`).join('')}
      <text x="${points[0].x}" y="${height - 4}" text-anchor="start" font-size="11" fill="var(--text-muted)">${labels[0]}</text>
      <text x="${points[points.length - 1].x}" y="${height - 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${labels[labels.length - 1]}</text>
    `
  }

  load()
}
