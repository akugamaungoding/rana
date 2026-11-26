import './styles.css'
import { supabase } from './supabase.js'
import { renderHome } from './ui/home.js'
import { renderExpenses } from './ui/expenses.js'
import { renderIncome } from './ui/income.js'
import { renderCalendar } from './ui/calendar.js'
import { renderInvestments } from './ui/investments.js'

const app = document.getElementById('app')

// Tab config
const TABS = [
  { hash: '#home',     icon: 'ti-home',        label: 'Home',     render: renderHome },
  { hash: '#expenses', icon: 'ti-credit-card',  label: 'Expenses', render: renderExpenses },
  { hash: '#income',   icon: 'ti-coins',        label: 'Income',   render: renderIncome },
  { hash: '#calendar', icon: 'ti-calendar',     label: 'Calendar', render: renderCalendar },
  { hash: '#invest',   icon: 'ti-trending-up',  label: 'Invest',   render: renderInvestments },
]

let currentTab = null

function getHash() {
  return location.hash || '#home'
}

function buildShell() {
  const appBar = document.createElement('header')
  appBar.className = 'app-bar'
  appBar.innerHTML = `<div class="app-bar-inner"><span class="brand">Rana</span><span class="brand-sub">Personal finance</span></div>`

  // Top nav (desktop)
  const topNav = document.createElement('nav')
  topNav.className = 'top-nav'
  topNav.innerHTML = `<div class="pill-menu"><span class="brand">Rana</span>${
    TABS.map(t => `<button class="pill-item" data-hash="${t.hash}"><i class="ti ${t.icon}"></i>${t.label}</button>`).join('')
  }</div>`

  // Page container
  const pageContainer = document.createElement('main')
  pageContainer.id = 'page-container'

  // Bottom nav (mobile)
  const bottomNav = document.createElement('nav')
  bottomNav.className = 'bottom-nav'
  bottomNav.innerHTML = TABS.map(t =>
    `<button class="nav-item" data-hash="${t.hash}" aria-label="${t.label}">
      <i class="ti ${t.icon}"></i><span>${t.label}</span>
    </button>`
  ).join('')

  app.innerHTML = ''
  app.appendChild(appBar)
  app.appendChild(topNav)
  app.appendChild(pageContainer)
  app.appendChild(bottomNav)

  // Event delegation for nav clicks
  const handleNav = (e) => {
    const btn = e.target.closest('[data-hash]')
    if (btn) {
      location.hash = btn.dataset.hash
    }
  }
  topNav.addEventListener('click', handleNav)
  bottomNav.addEventListener('click', handleNav)
}

function updateActiveNav(hash) {
  // Update bottom nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash)
  })
  // Update top nav
  document.querySelectorAll('.pill-item').forEach(el => {
    el.classList.toggle('active', el.dataset.hash === hash)
  })
}

function navigate() {
  const hash = getHash()
  const tab = TABS.find(t => t.hash === hash) || TABS[0]

  // Don't re-render same tab
  if (currentTab === tab.hash) return
  currentTab = tab.hash

  updateActiveNav(tab.hash)

  const container = document.getElementById('page-container')
  // Create page div
  container.innerHTML = ''
  const page = document.createElement('div')
  page.className = 'page'
  container.appendChild(page)

  // Render the tab content
  tab.render(page)

  // Animate in
  requestAnimationFrame(() => {
    page.classList.add('active')
  })
}

// Init
buildShell()
navigate()
window.addEventListener('hashchange', () => {
  currentTab = null // force re-render on hash change
  navigate()
})
