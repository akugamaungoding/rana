import { supabase } from '../supabase.js'
import { formatCurrency, formatDate, monthKey, todayISO, emptyState, listItem, showMessage } from './components.js'

export function renderHome(container) {
  container.innerHTML = `
    <div class="two-col-grid">
      <div class="summary-card" style="grid-column: 1 / -1;">
        <h2>This Month Overview</h2>
        <div class="summary-grid">
          <div class="summary-item positive">
            <div class="value" id="home-income">Rp 0</div>
            <div class="label">Income this month</div>
          </div>
          <div class="summary-item negative">
            <div class="value" id="home-expenses">Rp 0</div>
            <div class="label">Expenses this month</div>
          </div>
          <div class="summary-item" id="home-balance">
            <div class="value" id="home-balance-value">Rp 0</div>
            <div class="label">Balance</div>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="home-progress-fill"></div>
        </div>
        <div style="margin-top:8px; font-size:12px; color:rgba(255,255,255,0.8);" id="home-progress-text">0% of income spent</div>
      </div>

      <div class="card">
        <h3>Today's Spending</h3>
        <div id="home-today" style="font-size:24px; font-weight:500;">Rp 0</div>
        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Expenses recorded today</p>
      </div>

      <div class="card">
        <h3>Recent Expenses</h3>
        <div id="home-expenses-list" class="list-group"></div>
      </div>

      <div class="card">
        <h3>Recent Income</h3>
        <div id="home-income-list" class="list-group"></div>
      </div>
    </div>
  `

  async function load() {
    showLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showLoading(false); return }
    const uid = session.user.id
    const today = todayISO()
    const mk = monthKey()

    try {
      const [expRes, incRes] = await Promise.all([
        supabase.from('expenses').select('*').eq('user_id', uid).order('spent_on', { ascending: false }),
        supabase.from('incomes').select('*').eq('user_id', uid).order('received_on', { ascending: false }),
      ])

      if (expRes.error) throw expRes.error
      if (incRes.error) throw incRes.error

      const expenses = expRes.data || []
      const incomes = incRes.data || []

      const monthExpenses = expenses.filter(e => e.spent_on.startsWith(mk))
      const monthIncomeRaw = incomes.filter(i => i.received_on.startsWith(mk))

      const now = new Date()
      const nowYear = now.getFullYear()
      const nowMonth = now.getMonth()

      let recurringTotal = 0
      for (const inc of incomes) {
        if (inc.is_recurring) {
          const start = new Date(inc.received_on + 'T00:00:00')
          const endOfThisMonth = new Date(nowYear, nowMonth + 1, 0)
          if (start <= endOfThisMonth) {
            recurringTotal += Number(inc.amount)
          }
        }
      }

      const monthIncome = monthIncomeRaw.reduce((sum, i) => sum + Number(i.amount), 0) + recurringTotal
      const monthExpensesTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      const balance = monthIncome - monthExpensesTotal

      const todayExpenses = expenses.filter(e => e.spent_on === today)
      const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

      document.getElementById('home-income').textContent = formatCurrency(monthIncome)
      document.getElementById('home-expenses').textContent = formatCurrency(monthExpensesTotal)
      const balanceEl = document.getElementById('home-balance-value')
      const balanceItem = document.getElementById('home-balance')
      balanceEl.textContent = formatCurrency(balance)
      balanceItem.className = `summary-item ${balance >= 0 ? 'positive' : 'negative'}`

      const pct = monthIncome > 0 ? Math.min((monthExpensesTotal / monthIncome) * 100, 100) : 0
      document.getElementById('home-progress-fill').style.width = `${pct}%`
      document.getElementById('home-progress-text').textContent = `${Math.round(pct)}% of income spent`

      document.getElementById('home-today').textContent = formatCurrency(todayTotal)

      const expList = document.getElementById('home-expenses-list')
      expList.innerHTML = ''
      const recentExp = expenses.slice(0, 5)
      if (recentExp.length === 0) {
        expList.appendChild(emptyState('ti ti-credit-card', 'No expenses yet', 'Your recent expenses will appear here.'))
      } else {
        recentExp.forEach(e => {
          expList.appendChild(listItem({
            main: e.category,
            sub: `${formatDate(e.spent_on)} ${e.note ? '· ' + e.note : ''}`,
            amount: `-${formatCurrency(e.amount)}`,
            amountColor: 'var(--danger)',
          }))
        })
      }

      const incList = document.getElementById('home-income-list')
      incList.innerHTML = ''
      const recentInc = incomes.slice(0, 5)
      if (recentInc.length === 0) {
        incList.appendChild(emptyState('ti ti-coins', 'No income yet', 'Your recent income will appear here.'))
      } else {
        recentInc.forEach(i => {
          const recurringBadge = i.is_recurring ? ' (recurring)' : ''
          incList.appendChild(listItem({
            main: i.source + recurringBadge,
            sub: formatDate(i.received_on),
            amount: `+${formatCurrency(i.amount)}`,
            amountColor: '#16a34a',
          }))
        })
      }

    } catch (err) {
      showMessage(err.message || 'Failed to load dashboard', 'error')
    } finally {
      showLoading(false)
    }
  }

  load()
  return () => {}
}