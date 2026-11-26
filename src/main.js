import { supabase } from './supabase.js'
import { renderAuth } from './ui/auth.js'
import { renderHome } from './ui/home.js'
import { renderExpenses } from './ui/expenses.js'
import { renderIncome } from './ui/income.js'
import { renderCalendar } from './ui/calendar.js'
import { renderInvestments } from './ui/investments.js'

const app = document.getElementById('app')

// Route map: hash -> render function
const routes = {
  '#home': renderHome,
  '#expenses': renderExpenses,
  '#income': renderIncome,
  '#calendar': renderCalendar,
  '#invest': renderInvestments,
}

let currentCleanup = null

// Show a message banner (temporary)
export function showMessage(text, type = 'info') {
  // Remove existing banner
  const existing = document.getElementById('message-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'message-banner'
  banner.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    font-family: Inter, sans-serif;
    z-index: 1000;
    box-sizing: border-box;
    max-width: 90%;
    text-align: center;
    opacity: 0;
    transition: opacity 150ms ease;
  `
  if (type === 'error') {
    banner.style.background = '#7F3DD0'
    banner.style.color = '#ffffff'
  } else if (type === 'success') {
    banner.style.background = '#7F3DD0'
    banner.style.color = '#ffffff'
  } else {
    banner.style.background = '#7F3DD0'
    banner.style.color = '#ffffff'
  }
  banner.textContent = text
  document.body.appendChild(banner)

  // Trigger reflow
  banner.offsetHeight
  banner.style.opacity = '1'

  setTimeout(() => {
    banner.style.opacity = '0'
    setTimeout(() => banner.remove(), 150)
  }, 3000)
}

// Show a loading overlay
export function showLoading(show) {
  let overlay = document.getElementById('loading-overlay')
  if (show) {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.id = 'loading-overlay'
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: Inter, sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: #7F3DD0;
    `
    overlay.textContent = 'Loading...'
    document.body.appendChild(overlay)
  } else {
    if (overlay) overlay.remove()
  }
}

// Confirm dialog
export function confirmAction(message) {
  return new Promise((resolve) => {
    const dlg = document.createElement('div')
    dlg.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `
    const card = document.createElement('div')
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid #E4D6F5;
      border-radius: 16px;
      padding: 24px;
      max-width: 300px;
      width: 88%;
      font-family: Inter, sans-serif;
      box-sizing: border-box;
    `
    card.innerHTML = `
      <p style="margin:0 0 16px; font-size:15px; color:#1a1a1a;">${message}</p>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="cancel-btn" style="background:#ffffff;border:1px solid #E4D6F5;border-radius:8px;padding:10px 16px;font:500 14px Inter;cursor:pointer;color:#1a1a1a;">Cancel</button>
        <button id="confirm-btn" style="background:#7F3DD0;border:none;border-radius:8px;padding:10px 16px;font:500 14px Inter;cursor:pointer;color:#ffffff;">Delete</button>
      </div>
    `
    dlg.appendChild(card)
    document.body.appendChild(dlg)

    const resolveResult = (val) => {
      dlg.remove()
      resolve(val)
    }
    card.querySelector('#cancel-btn').onclick = () => resolveResult(false)
    card.querySelector('#confirm-btn').onclick = () => resolveResult(true)
  })
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

async function renderRoute() {
  const hash = window.location.hash || '#home'

  // Public routes: auth page only
  if (hash === '#auth' || hash === '') {
    app.innerHTML = ''
    renderAuth(app)
    return
  }

  // Protected routes: require auth
  const authenticated = await checkAuth()
  if (!authenticated) {
    window.location.hash = '#auth'
    renderAuth(app)
    return
  }

  const render = routes[hash]
  if (render) {
    app.innerHTML = ''
    currentCleanup = render(app)
  } else {
    window.location.hash = '#home'
  }
}

function init() {
  // Listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    // If session is cleared (logout), go to auth page
    if (event === 'SIGNED_OUT') {
      window.location.hash = '#auth'
    }
    renderRoute()
  })

  // Listen for hash changes
  window.addEventListener('hashchange', renderRoute)

  // Initial render
  renderRoute()
}

init()