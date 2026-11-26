import { supabase } from '../supabase.js'
import { todayLocal, monthKey, formatCurrency, formatDate, incomeForMonth } from '../lib/calc.js'
import { showToast, emptyState, listItem, skeletonList, CATEGORY_ICONS } from './components.js'

export function renderHome(container) {
  container.innerHTML = `
    <div class="hero-card">
      <h2>Balance this month</h2>
      <div class="hero-number" id="h-balance">Rp 0</div>
      <div class="hero-chips">
        <div class="hero-chip"><i class="ti ti-arrow-down-right"></i> Income: <span id="h-income">Rp 0</span></div>
        <div class="hero-chip"><i class="ti ti-arrow-up-right"></i> Expenses: <span id="h-expense">Rp 0</span></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="h-progress"></div></div>
      <div class="progress-label" id="h-progress-label">0% of income spent</div>
    </div>

    <div class="two-col">
      <div class="card-soft">
        <div style="font-size:12px;color:var(--text-muted);">Income this month</div>
        <div class="value" id="h-inc-card" style="font-size:20px;font-weight:500;margin-top:4px;">Rp 0</div>
      </div>
      <div class="card-soft">
        <div style="font-size:12px;color:var(--text-muted);">Expenses this month</div>
        <div class="value" id="h-exp-card" style="font-size:20px;font-weight:500;margin-top:4px;">Rp 0</div>
      </div>
    </div>

    <div class="card mt-16">
      <div style="font-size:12px;color:var(--text-muted);">Invested – Portfolio Return</div>
      <div id="h-port-return" style="font-size:20px;font-weight:500;margin-top:4px;">0%</div>
    </div>

    <h3 class="section-title mt-16">Recent activity</h3>
    <div id="h-activity" class="list-group">${skeletonList(3)}</div>
  `

  load()

  async function load() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = todayLocal()
    const mk = monthKey(now)

    try {
      const [expRes, incRes, invRes, updRes] = await Promise.all([
        supabase.from('expenses').select('*').order('spent_on', { ascending: false }),
        supabase.from('incomes').select('*').order('received_on', { ascending: false }),
        supabase.from('investments').select('*'),
        supabase.from('investment_updates').select('*').order('recorded_on', { ascending: true }),
      ])

      if (expRes.error) { console.error('[home.expenses]', expRes.error); showToast(expRes.error.message, 'error'); return }
      if (incRes.error) { console.error('[home.incomes]', incRes.error); showToast(incRes.error.message, 'error'); return }
      if (invRes.error) { console.error('[home.investments]', invRes.error); showToast(invRes.error.message, 'error'); return }
      if (updRes.error) { console.error('[home.updates]', updRes.error); showToast(updRes.error.message, 'error'); return }

      const expenses = expRes.data || []
      const incomes = incRes.data || []
      const investments = invRes.data || []
      const updates = updRes.data || []

      // Month expenses
      const monthExpenses = expenses.filter(e => e.spent_on.startsWith(mk))
      const monthExpTotal = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)

      // Month income (with recurring logic)
      const monthIncTotal = incomeForMonth(incomes, year, month)

      // Balance
      const balance = monthIncTotal - monthExpTotal

      // Update DOM
      const balEl = document.getElementById('h-balance')
      if (balEl) {
        balEl.textContent = (balance < 0 ? '-' : '') + formatCurrency(Math.abs(balance))
        balEl.style.color = balance >= 0 ? '#ffffff' : '#FCA5A5'
      }
      const hIncome = document.getElementById('h-income')
      if (hIncome) hIncome.textContent = formatCurrency(monthIncTotal)
      const hExpense = document.getElementById('h-expense')
      if (hExpense) hExpense.textContent = formatCurrency(monthExpTotal)

      // Progress bar (avoid divide by zero)
      const pct = monthIncTotal > 0 ? Math.min((monthExpTotal / monthIncTotal) * 100, 100) : 0
      const progressEl = document.getElementById('h-progress')
      if (progressEl) progressEl.style.width = `${pct}%`
      const progressLabel = document.getElementById('h-progress-label')
      if (progressLabel) progressLabel.textContent = `${Math.round(pct)}% of income spent`

      // Side cards
      const hIncCard = document.getElementById('h-inc-card')
      if (hIncCard) hIncCard.textContent = formatCurrency(monthIncTotal)
      const hExpCard = document.getElementById('h-exp-card')
      if (hExpCard) hExpCard.textContent = formatCurrency(monthExpTotal)

      // Portfolio return
      let totalCapital = 0, totalLatest = 0
      const updatesByInv = {}
      updates.forEach(u => {
        if (!updatesByInv[u.investment_id]) updatesByInv[u.investment_id] = []
        updatesByInv[u.investment_id].push(u)
      })
      investments.forEach(inv => {
        totalCapital += Number(inv.capital)
        const invUpd = updatesByInv[inv.id] || []
        totalLatest += invUpd.length > 0 ? Number(invUpd[invUpd.length - 1].value) : Number(inv.capital)
      })
      const portReturn = totalCapital > 0 ? ((totalLatest - totalCapital) / totalCapital * 100) : 0
      const portEl = document.getElementById('h-port-return')
      if (portEl) {
        portEl.textContent = (portReturn >= 0 ? '+' : '') + portReturn.toFixed(2) + '%'
        portEl.style.color = portReturn >= 0 ? 'var(--success)' : 'var(--danger)'
      }

      // Recent activity (last 8 items combined)
      const activity = []
      expenses.slice(0, 5).forEach(e => activity.push({ type: 'expense', date: e.spent_on, data: e }))
      incomes.filter(i => !i.is_recurring).slice(0, 5).forEach(i => activity.push({ type: 'income', date: i.received_on, data: i }))
      activity.sort((a, b) => b.date.localeCompare(a.date))

      const activityEl = document.getElementById('h-activity')
      if (!activityEl) return
      activityEl.innerHTML = ''

      if (activity.length === 0) {
        activityEl.appendChild(emptyState('ti ti-activity', 'No activity yet', 'Your recent transactions will appear here.'))
        return
      }

      activity.slice(0, 8).forEach(a => {
        if (a.type === 'expense') {
          const e = a.data
          const catIcon = CATEGORY_ICONS[e.category] || 'ti-dots-circle-horizontal'
          activityEl.appendChild(listItem({
            icon: catIcon,
            iconBg: 'var(--purple-soft)',
            main: e.category,
            sub: `${formatDate(e.spent_on)}${e.note ? ' · ' + e.note : ''}`,
            amount: `-${formatCurrency(e.amount)}`,
            amountColor: 'var(--danger)',
          }))
        } else {
          const i = a.data
          activityEl.appendChild(listItem({
            icon: 'ti-coins',
            iconBg: '#E6F7EF',
            main: i.source,
            sub: formatDate(i.received_on),
            amount: `+${formatCurrency(i.amount)}`,
            amountColor: 'var(--success)',
          }))
        }
      })
    } catch (err) {
      console.error('[home]', err)
      showToast('Failed to load dashboard', 'error')
    }
  }
}
