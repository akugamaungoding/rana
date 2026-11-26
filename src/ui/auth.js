import { supabase } from '../supabase.js'
import { showMessage, showLoading } from '../main.js'

export function renderAuth(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <h1 id="auth-title">Welcome to Rana</h1>
        <p id="auth-subtitle">Track your expenses, income, and investments</p>
        <form id="auth-form" class="auth-form">
          <div id="auth-fields">
            <label>
              <span>Email</span>
              <input type="email" id="auth-email" required placeholder="you@example.com" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" />
            </label>
          </div>
          <button type="submit" id="auth-btn" class="btn-primary">Continue</button>
        </form>
        <div class="auth-switch" id="auth-switch">
          <span id="auth-switch-text">Don't have an account?</span>
          <a href="#" id="auth-toggle">Sign up</a>
        </div>
      </div>
    </div>
  `

  let isSignup = false

  const title = container.querySelector('#auth-title')
  const subtitle = container.querySelector('#auth-subtitle')
  const btn = container.querySelector('#auth-btn')
  const toggle = container.querySelector('#auth-toggle')
  const toggleText = container.querySelector('#auth-switch-text')
  const form = container.querySelector('#auth-form')
  const passwordField = container.querySelector('#auth-password').parentElement

  function toggleMode() {
    isSignup = !isSignup
    if (isSignup) {
      title.textContent = 'Create Account'
      subtitle.textContent = 'Join Rana to start managing your finances'
      btn.textContent = 'Sign up'
      toggleText.textContent = 'Already have an account?'
      toggle.textContent = 'Sign in'
      passwordField.innerHTML = `
        <label>
          <span>Password</span>
          <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" />
        </label>
        <label style="margin-top:8px;">
          <span>Confirm Password</span>
          <input type="password" id="auth-confirm-password" required minlength="6" placeholder="••••••••" />
        </label>
      `
    } else {
      title.textContent = 'Welcome to Rana'
      subtitle.textContent = 'Track your expenses, income, and investments'
      btn.textContent = 'Continue'
      toggleText.textContent = "Don't have an account?"
      toggle.textContent = 'Sign up'
      passwordField.innerHTML = `
        <label>
          <span>Password</span>
          <input type="password" id="auth-password" required minlength="6" placeholder="••••••••" />
        </label>
      `
    }
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault()
    toggleMode()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = container.querySelector('#auth-email').value.trim()
    const password = container.querySelector('#auth-password').value

    btn.disabled = true
    btn.textContent = isSignup ? 'Creating account...' : 'Signing in...'

    try {
      if (isSignup) {
        const confirmPassword = container.querySelector('#auth-confirm-password').value
        if (password !== confirmPassword) {
          showMessage('Passwords do not match', 'error')
          btn.disabled = false
          btn.textContent = 'Sign up'
          return
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        showMessage('Account created! Please sign in.', 'success')
        toggleMode()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Redirect handled by onAuthStateChange in main.js
      }
    } catch (err) {
      showMessage(err.message || 'Something went wrong', 'error')
    } finally {
      btn.disabled = false
      btn.textContent = isSignup ? 'Sign up' : 'Continue'
    }
  })

  return () => {
    // Cleanup: remove event listeners if needed
  }
}