import { supabase } from '../supabase.js'
import { todayLocal, formatCurrency, formatDate } from '../lib/calc.js'
import { showToast, CATEGORY_ICONS } from './components.js'

export function renderCalendar(container) {
  const now = new Date()
  let viewYear = now.getFullYear()
  let viewMonth = now.getMonth()
  let selectedDate = null

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

  container.innerHTML = `
    <div class="calendar-header">
      <h2 id="cal-title">${MONTH_NAMES[viewMonth]} ${viewYear}</h2>
      <div class="calendar-nav">
        <button class="month-btn" id="cal-prev" aria-label="Previous month"><i class="ti ti-chevron-left"></i></button>
        <button class="month-btn" id="cal-next" aria-label="Next month"><i class="ti ti-chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-grid" id="cal-grid"></div>
    <div class="day-sheet" id="cal-day-sheet">
      <div class="day-sheet-header">
        <h3 id="cal-day-title">Day</h3>
        <button class="btn-icon" id="cal-close-sheet" aria-label="Close"><i class="ti ti-x"></i></button>
      </div>
      <div id="cal-day-content"></div>
    </div>
  `

  const grid = document.getElementById('cal-grid')
  const title = document.getElementById('cal-title')
  const daySheet = document.getElementById('cal-day-sheet')
  const dayTitle = document.getElementById('cal-day-title')
  const dayContent = document.getElementById('cal-day-content')

  document.getElementById('cal-prev').addEventListener('click', () => {
    viewMonth--
    if (viewMonth < 0) { viewMonth = 11; viewYear-- }
    closeDaySheet()
    loadMonth()
  })
  document.getElementById('cal-next').addEventListener('click', () => {
    viewMonth++
    if (viewMonth > 11) { viewMonth = 0; viewYear++ }
    closeDaySheet()
    loadMonth()
  })
  document.getElementById('cal-close-sheet').addEventListener('click', closeDaySheet)

  function closeDaySheet() {
    daySheet.classList.remove('open')
    selectedDate = null
    // Remove selected class from all days
    grid.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'))
  }

  async function loadMonth() {
    title.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`

    const mk = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
    const startDate = `${mk}-01`
    const nextM = viewMonth + 1 > 11 ? 0 : viewMonth + 1
    const nextY = viewMonth + 1 > 11 ? viewYear + 1 : viewYear
    const endDate = `${nextY}-${String(nextM + 1).padStart(2, '0')}-01`

    try {
      const [expRes, incRes, updRes] = await Promise.all([
        supabase.from('expenses').select('*').gte('spent_on', startDate).lt('spent_on', endDate),
        supabase.from('incomes').select('*').gte('received_on', startDate).lt('received_on', endDate),
        supabase.from('investment_updates').select('*, investments(name)').gte('recorded_on', startDate).lt('recorded_on', endDate),
      ])

      if (expRes.error) { console.error('[calendar.expenses]', expRes.error); showToast(expRes.error.message, 'error'); return }
      if (incRes.error) { console.error('[calendar.incomes]', incRes.error); showToast(incRes.error.message, 'error'); return }
      if (updRes.error) { console.error('[calendar.updates]', updRes.error); showToast(updRes.error.message, 'error'); return }

      const expenses = expRes.data || []
      const incomes = incRes.data || []
      const updates = updRes.data || []

      buildGrid(expenses, incomes, updates)
    } catch (err) {
      console.error('[calendar.load]', err)
      showToast('Failed to load calendar', 'error')
    }
  }

  function buildGrid(expenses, incomes, updates) {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startOffset = firstDay.getDay() // Sunday=0
    const totalDays = lastDay.getDate()
    const today = todayLocal()

    // Build lookup maps
    const expByDate = {}, incByDate = {}, updByDate = {}
    expenses.forEach(e => { expByDate[e.spent_on] = (expByDate[e.spent_on] || []).concat(e) })
    incomes.forEach(i => { incByDate[i.received_on] = (incByDate[i.received_on] || []).concat(i) })
    updates.forEach(u => { updByDate[u.recorded_on] = (updByDate[u.recorded_on] || []).concat(u) })

    grid.innerHTML = ''

    // Weekday headers
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    weekdays.forEach(w => {
      const el = document.createElement('div')
      el.className = 'calendar-weekday'
      el.textContent = w
      grid.appendChild(el)
    })

    // Empty cells
    for (let i = 0; i < startOffset; i++) {
      const el = document.createElement('div')
      el.className = 'calendar-day empty'
      grid.appendChild(el)
    }

    // Day cells
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const el = document.createElement('div')
      el.className = 'calendar-day'
      if (dateStr === today) el.classList.add('today')

      const num = document.createElement('div')
      num.className = 'day-number'
      num.textContent = d
      el.appendChild(num)

      const hasExp = !!expByDate[dateStr]
      const hasInc = !!incByDate[dateStr]
      const hasUpd = !!updByDate[dateStr]

      if (hasExp || hasInc || hasUpd) {
        const markers = document.createElement('div')
        markers.className = 'day-markers'
        if (hasExp) { const dot = document.createElement('div'); dot.className = 'marker-dot'; markers.appendChild(dot) }
        if (hasInc) { const dot = document.createElement('div'); dot.className = 'marker-dot outlined'; markers.appendChild(dot) }
        if (hasUpd) { const dia = document.createElement('div'); dia.className = 'marker-diamond'; markers.appendChild(dia) }
        el.appendChild(markers)
      }

      el.addEventListener('click', () => {
        // Remove previous selection
        grid.querySelectorAll('.calendar-day.selected').forEach(s => s.classList.remove('selected'))
        el.classList.add('selected')
        selectedDate = dateStr
        openDaySheet(dateStr, expByDate[dateStr] || [], incByDate[dateStr] || [], updByDate[dateStr] || [])
      })

      grid.appendChild(el)
    }
  }

  function openDaySheet(dateStr, dayExp, dayInc, dayUpd) {
    dayTitle.textContent = formatDate(dateStr)

    let html = ''

    if (dayExp.length > 0) {
      const total = dayExp.reduce((s, e) => s + Number(e.amount), 0)
      html += `<div class="day-section"><div class="day-section-title">Expenses (${formatCurrency(total)})</div>`
      dayExp.forEach(e => {
        html += `<div class="day-row"><span>${e.category}${e.note ? ' · ' + e.note : ''}</span><span style="color:var(--danger);font-weight:500;">-${formatCurrency(e.amount)}</span></div>`
      })
      html += `</div>`
    }

    if (dayInc.length > 0) {
      const total = dayInc.reduce((s, i) => s + Number(i.amount), 0)
      html += `<div class="day-section"><div class="day-section-title">Income (${formatCurrency(total)})</div>`
      dayInc.forEach(i => {
        html += `<div class="day-row"><span>${i.source}${i.is_recurring ? ' · recurring' : ''}</span><span style="color:var(--success);font-weight:500;">+${formatCurrency(i.amount)}</span></div>`
      })
      html += `</div>`
    }

    if (dayUpd.length > 0) {
      html += `<div class="day-section"><div class="day-section-title">Investment Updates</div>`
      dayUpd.forEach(u => {
        const name = u.investments ? u.investments.name : 'Investment'
        html += `<div class="day-row"><span>${name}</span><span style="font-weight:500;">${formatCurrency(u.value)}</span></div>`
      })
      html += `</div>`
    }

    if (!html) {
      html = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:14px;">No activity on this day</div>`
    }

    // Net total
    const expTotal = dayExp.reduce((s, e) => s + Number(e.amount), 0)
    const incTotal = dayInc.reduce((s, i) => s + Number(i.amount), 0)
    const net = incTotal - expTotal
    if (dayExp.length > 0 || dayInc.length > 0) {
      html += `<div class="day-total" style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'}">
        Net: ${net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(net))}
      </div>`
    }

    dayContent.innerHTML = html
    daySheet.classList.add('open')
  }

  loadMonth()
}
