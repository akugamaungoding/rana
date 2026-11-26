import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Show a full-screen message if Supabase is not configured
if (!supabaseUrl || !supabaseAnonKey) {
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:Inter,sans-serif;text-align:center;">
      <div>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h1 style="font-size:20px;margin-bottom:8px;color:#1F1633;">Supabase is not configured</h1>
        <p style="font-size:14px;color:#6B5A85;max-width:400px;">
          Create a <code>.env</code> file from <code>.env.example</code> and add your
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.<br/>
          See <strong>SUPABASE_SETUP.md</strong> for details.
        </p>
      </div>
    </div>
  `
  throw new Error('Supabase env vars are missing. See SUPABASE_SETUP.md.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
