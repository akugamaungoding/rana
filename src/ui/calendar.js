import { supabase } from '../supabase.js'
import { formatCurrency, formatDate, todayISO, emptyState, showMessage, showLoading, confirmAction } from './components.js'

export function renderCalendar(container) {
  container.innerHTML = `
    <div class="calendar-header">
      <h2 id="cal-month-title">Month</h2>
      <div>
        <button class="calendar-nav-btn" id="cal-prev"><i class="ti ti-chevron-left"></i></button>
        <button class="calendar-nav-btn" id="cal-next"><i class="ti ti-chevron-right"></i></button>
      </div>
    </div>

    <div class="calendar-grid" id="cal-grid"></div>

    <div id="cal-day-sheet" class="hidden">
      <div class="card">
        <h3 id="cal-day-title" style="margin-bottom:12px;">Day</h3>
        <div id="cal-day-content"></div>
      </div>
    </div>
  `

  let currentDate = new Date()
  let cleanup = null

  const grid = document.getElementById('cal-grid')
  const monthTitle = document.getElementById('cal-month-title')
  const prevBtn = document.getElementById('cal-prev')
  const nextBtn = document.getElementById('cal-next')
  const daySheet = document.getElementById('cal-day-sheet')
  const dayTitle = document.getElementById('cal-day-title')
  const dayContent = document.getElementById('cal-day-content')
  async function loadData(year, month) {
    showLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showLoading(false); return }
    const uid = session.user.id

    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

    try {
      const [expRes, incRes, updRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', uid).gte('spent_on', start).lte('spent_on', end),
        supabase.from('incomes').select('*').eq('user_id', uid).gte('received_on', start).lte('received_on', end),
        supabase.from('investment_updates').select('*, investments(name)').eq('user_id', uid).gte('recorded_on', start).lte('recorded_on', end),
      ])

      if (expRes.error) throw expRes.error
      if (incRes.error) throw incRes.error
      if (updRes.error) throw updRes.error

      renderCalendar(year, month, expRes.data || [], incRes.data || [], updRes.data || [])
    } catch (err) {
      showMessage(err.message || 'Failed to load calendar data', 'error')
    } finally {
      showLoading(false)
    }
  }
  function renderCalendar(year, month, expenses, incomes, updates) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const expByDate = {}
    expenses.forEach(e => { expByDate[e.spent_on] = (expByDate[e.spent_on] || 0) + 1 })
    const incByDate = {}
    incomes.forEach(i => { incByDate[i.received_on] = (incByDate[i.received_on] || 0) + 1 })
    const updByDate = {}
    updates.forEach(u => { updByDate[u.recorded_on] = (updByDate[u.recorded_on] || 0) + 1 })

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    monthTitle.textContent = `${monthNames[month]} ${year}`

    grid.innerHTML = ''

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    weekdays.forEach(w => {
      const el = document.createElement('div')
      el.className = 'calendar-weekday'
      el.textContent = w
      grid.appendChild(el)
    })

    for (let i = 0; i < startOffset; i++) {
      const el = document.createElement('div')
      el.className = 'calendar-day empty'
      grid.appendChild(el)
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const el = document.createElement('div')
      el.className = 'calendar-day'
      if (dateStr === todayStr) el.classList.add('today')

      const num = document.createElement('div')
      num.className = 'day-number'
      num.textContent = d
      el.appendChild(num)

      const indicator = document.createElement('div')
      indicator.className = 'event-indicator'

      const hasExp = expByDate[dateStr] > 0
      const hasInc = incByDate[dateStr] > 0
      const hasUpd = updByDate[dateStr] > 0

      if (hasExp) {
        const dot = document.createElement('div')
        dot.className = 'event-dot'
        indicator.appendChild(dot)
      }
      if (hasInc) {
        const dot = document.createElement('div')
        dot.className = 'event-dot outlined'
        indicator.appendChild(dot)
      }
      if (hasUpd) {
        const diamond = document.createElement('div')
        diamond.className = 'event-diamond'
        indicator.appendChild(diamond)
      }
  function openDaySheet(dateStr, expenses, incomes, updates) {
    const dayExpenses = expenses.filter(e => e.spent_on === dateStr)
    const dayIncomes = incomes.filter(i => i.received_on === dateStr)
    const dayUpdates = updates.filter(u => u.recorded_on === dateStr)

    const expTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const incTotal = dayIncomes.reduce((s, i) => s + Number(i.amount), 0)

    dayTitle.textContent = formatDate(dateStr)

    let html = ''

    if (dayExpenses.length > 0) {
      html += `<div class="section"><div class="section-title">Expenses (${formatCurrency(expTotal)})</div>`
      dayExpenses.forEach(e => {
        html += `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
          <span>${e.category} ${e.note ? '· ' + e.note : ''}</span>
          <span style="font-weight:500; color:var(--danger);">-${formatCurrency(e.amount)}</span>
        </div>`
      })
      html += `</div>`
    }

    if (dayIncomes.length > 0) {
      html += `<div class="section"><div class="section-title">Income (${formatCurrency(incTotal)})</div>`
      dayIncomes.forEach(i => {
        html += `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
          <span>${i.source}${i.is_recurring ? ' · recurring' : ''}</span>
          <span style="font-weight:500; color:#16a34a;">+${formatCurrency(i.amount)}</span>
        </div>`
      })
      html += `</div>`
    }

    if (dayUpdates.length > 0) {
      html += `<div class="section"><div class="section-title">Investment Updates</div>`
      dayUpdates.forEach(u => {
        html += `<div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
          <span>${u.investments ? u.investments.name : 'Investment'} · ${u.note || ''}</span>
          <span style="font-weight:500;">${formatCurrency(u.value)}</span>
        </div>`
      })
      html += `</div>`
    }

    if (!html) {
      html = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:14px;">No activity on this day</div>`
    }

    dayContent.innerHTML = html
    daySheet.classList.remove('hidden')
  }

  function closeDaySheet() {
    daySheet.classList.add('hidden')
  }

  daySheet.addEventListener('click', (e) => {
    if (e.target.id === 'cal-day-sheet') closeDaySheet()
  })

  prevBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    loadData(currentDate.getFullYear(), currentDate.getMonth())
  })

  nextBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    loadData(currentDate.getFullYear(), currentDate.getMonth())
  })

  loadData(currentDate.getFullYear(), currentDate.getMonth())

  cleanup = () => {}
  return cleanup
}

      if (hasExp || hasInc || hasUpd) {
        el.classList.add('has-events')
        el.appendChild(indicator)
      }

      el.addEventListener('click', () => openDaySheet(dateStr, expenses, incomes, updates))
      grid.appendChild(el)
    }
  }