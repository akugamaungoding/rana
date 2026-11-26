/**
 * Smoke test for Rana personal finance app.
 * Run: node scripts/smoke-test.js
 * Requires: npm install dotenv (or use --env-file=.env with Node 20+)
 *
 * Tests all CRUD flows against the real Supabase database,
 * and unit-tests the pure calculation functions.
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// --- Import calc functions (ESM relative path) ---
import {
  todayLocal,
  monthKey,
  daysBetween,
  returnPercent,
  profitLoss,
  annualizedReturn,
  incomeForMonth,
  formatCurrency,
  formatDate,
  parseFormattedNumber,
} from '../src/lib/calc.js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env'); process.exit(1) }

const supabase = createClient(url, key)

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS  ${label}`)
    passed++
  } else {
    console.log(`  FAIL  ${label}`)
    failed++
  }
}

// ============================================================
// UNIT TESTS – pure functions
// ============================================================
console.log('\n=== Unit Tests: calc.js ===\n')

// todayLocal
const today = todayLocal()
assert(/^\d{4}-\d{2}-\d{2}$/.test(today), 'todayLocal returns YYYY-MM-DD')
const parts = today.split('-')
const jsDate = new Date()
assert(parseInt(parts[0]) === jsDate.getFullYear(), 'todayLocal correct year')
assert(parseInt(parts[1]) === jsDate.getMonth() + 1, 'todayLocal correct month')
assert(parseInt(parts[2]) === jsDate.getDate(), 'todayLocal correct day')

// daysBetween
assert(daysBetween('2026-01-01', '2026-01-01') === 0, 'daysBetween same day = 0')
assert(daysBetween('2026-01-01', '2026-01-02') === 1, 'daysBetween 1 day')
assert(daysBetween('2026-01-01', '2026-12-31') === 364, 'daysBetween year span')
assert(daysBetween('2024-02-28', '2024-02-29') === 1, 'daysBetween leap day')
assert(daysBetween('2026-11-01', '2026-11-30') === 29, 'daysBetween November')

// returnPercent
assert(returnPercent(1100, 1000) === 10, 'returnPercent 10%')
assert(returnPercent(900, 1000) === -10, 'returnPercent -10%')
assert(returnPercent(1000, 1000) === 0, 'returnPercent 0%')
assert(returnPercent(100, 0) === 0, 'returnPercent capital=0 returns 0')

// profitLoss
assert(profitLoss(1500, 1000) === 500, 'profitLoss +500')
assert(profitLoss(800, 1000) === -200, 'profitLoss -200')

// annualizedReturn
assert(annualizedReturn(1100, 1000, 0) === null, 'annualized 0 days = null')
assert(annualizedReturn(1100, 1000, 365) !== null, 'annualized 365 days != null')
const ann365 = annualizedReturn(1100, 1000, 365)
assert(Math.abs(ann365 - 10) < 0.01, 'annualized 10% over 365 days ≈ 10%')
assert(annualizedReturn(1100, 0, 100) === null, 'annualized capital=0 = null')

// incomeForMonth
const testIncomes = [
  { amount: 5000000, received_on: '2026-11-01', is_recurring: false },
  { amount: 1000000, received_on: '2026-10-15', is_recurring: true },
  { amount: 2000000, received_on: '2026-12-01', is_recurring: false },
  { amount: 500000,  received_on: '2026-09-01', is_recurring: true },
]
// November 2026
const novIncome = incomeForMonth(testIncomes, 2026, 10) // month is 0-indexed
assert(novIncome === 5000000 + 1000000 + 500000, 'incomeForMonth Nov includes recurring from Sep and Oct + one-time Nov')
// October 2026
const octIncome = incomeForMonth(testIncomes, 2026, 9)
assert(octIncome === 1000000 + 500000, 'incomeForMonth Oct includes recurring from Sep and Oct')
// September 2026
const sepIncome = incomeForMonth(testIncomes, 2026, 8)
assert(sepIncome === 500000, 'incomeForMonth Sep includes only recurring from Sep')
// August 2026 – recurring from Sep should NOT count
const augIncome = incomeForMonth(testIncomes, 2026, 7)
assert(augIncome === 0, 'incomeForMonth Aug = 0 (no recurring started yet)')

// formatCurrency
assert(formatCurrency(1250000) === 'Rp 1.250.000', 'formatCurrency 1.25M')
assert(formatCurrency(0) === 'Rp 0', 'formatCurrency 0')

// formatDate
assert(formatDate('2026-11-26') === '26 Nov 2026', 'formatDate 26 Nov 2026')
assert(formatDate('2026-01-01') === '1 Jan 2026', 'formatDate 1 Jan 2026')

// parseFormattedNumber
assert(parseFormattedNumber('1.250.000') === 1250000, 'parseFormattedNumber 1.250.000')

// monthKey
assert(monthKey(new Date(2026, 0, 1)) === '2026-01', 'monthKey Jan')
assert(monthKey(new Date(2026, 11, 31)) === '2026-12', 'monthKey Dec')

// ============================================================
// DATABASE TESTS – CRUD flows
// ============================================================
console.log('\n=== Database Tests ===\n')

async function dbTests() {
  // --- EXPENSES ---
  console.log('-- Expenses --')
  const { data: e1, error: e1err } = await supabase.from('expenses').insert({ amount: 50000, category: 'Food', spent_on: '2026-11-26', note: 'test lunch' }).select().single()
  assert(!e1err && e1, 'Insert expense 1')
  if (e1err) console.error(e1err)

  const { data: e2, error: e2err } = await supabase.from('expenses').insert({ amount: 25000, category: 'Transport', spent_on: '2026-11-25', note: null }).select().single()
  assert(!e2err && e2, 'Insert expense 2')

  const { data: selExp, error: selErr } = await supabase.from('expenses').select('*').in('id', [e1?.id, e2?.id].filter(Boolean))
  assert(!selErr && selExp?.length === 2, 'Select expenses')

  if (e1) {
    const { error: updErr } = await supabase.from('expenses').update({ note: 'updated' }).eq('id', e1.id)
    assert(!updErr, 'Update expense')
    const { error: delErr } = await supabase.from('expenses').delete().eq('id', e1.id)
    assert(!delErr, 'Delete expense 1')
  }
  if (e2) {
    const { error: delErr } = await supabase.from('expenses').delete().eq('id', e2.id)
    assert(!delErr, 'Delete expense 2')
  }

  // --- INCOMES ---
  console.log('-- Incomes --')
  const { data: i1, error: i1err } = await supabase.from('incomes').insert({ source: 'Salary', amount: 5000000, received_on: '2026-11-01', is_recurring: true }).select().single()
  assert(!i1err && i1, 'Insert income (recurring)')
  if (i1err) console.error(i1err)

  const { data: i2, error: i2err } = await supabase.from('incomes').insert({ source: 'Bonus', amount: 1000000, received_on: '2026-11-15', is_recurring: false }).select().single()
  assert(!i2err && i2, 'Insert income (one-time)')

  if (i1) {
    const { error: updErr } = await supabase.from('incomes').update({ amount: 5500000 }).eq('id', i1.id)
    assert(!updErr, 'Update income')
    const { error: delErr } = await supabase.from('incomes').delete().eq('id', i1.id)
    assert(!delErr, 'Delete income 1')
  }
  if (i2) {
    const { error: delErr } = await supabase.from('incomes').delete().eq('id', i2.id)
    assert(!delErr, 'Delete income 2')
  }

  // --- INVESTMENTS + UPDATES ---
  console.log('-- Investments --')
  const { data: inv, error: invErr } = await supabase.from('investments').insert({
    name: 'Test Fund', capital: 1000000, start_date: '2026-01-01', end_date: '2026-12-31'
  }).select().single()
  assert(!invErr && inv, 'Insert investment')
  if (invErr) console.error(invErr)

  if (inv) {
    // Add 3 updates
    const { error: u1err } = await supabase.from('investment_updates').insert({ investment_id: inv.id, recorded_on: '2026-03-01', value: 1050000 })
    assert(!u1err, 'Insert update 1')
    const { error: u2err } = await supabase.from('investment_updates').insert({ investment_id: inv.id, recorded_on: '2026-06-01', value: 1100000 })
    assert(!u2err, 'Insert update 2')
    const { error: u3err } = await supabase.from('investment_updates').insert({ investment_id: inv.id, recorded_on: '2026-09-01', value: 1150000 })
    assert(!u3err, 'Insert update 3')

    // Read sorted
    const { data: upds, error: updsErr } = await supabase.from('investment_updates').select('*').eq('investment_id', inv.id).order('recorded_on', { ascending: true })
    assert(!updsErr && upds?.length === 3, 'Select updates (3 rows)')
    if (upds && upds.length === 3) {
      assert(upds[0].recorded_on === '2026-03-01', 'Updates sorted: first = March')
      assert(upds[2].recorded_on === '2026-09-01', 'Updates sorted: last = September')
    }

    // Test duplicate date conflict
    const { error: dupErr } = await supabase.from('investment_updates').insert({ investment_id: inv.id, recorded_on: '2026-03-01', value: 999999 })
    assert(!!dupErr, 'Duplicate date conflict detected')

    // Delete investment (cascade deletes updates)
    const { error: delInvErr } = await supabase.from('investments').delete().eq('id', inv.id)
    assert(!delInvErr, 'Delete investment')

    // Verify cascade
    const { data: orphans } = await supabase.from('investment_updates').select('id').eq('investment_id', inv.id)
    assert(orphans?.length === 0, 'Cascade delete: updates removed')
  }

  // --- Verify clean state ---
  console.log('-- Cleanup verification --')
  const { data: remExp } = await supabase.from('expenses').select('id').like('note', 'test%')
  const { data: remInc } = await supabase.from('incomes').select('id').eq('source', 'Salary')
  const { data: remInv } = await supabase.from('investments').select('id').eq('name', 'Test Fund')
  assert((remExp?.length || 0) === 0, 'No leftover test expenses')
  assert((remInc?.length || 0) === 0, 'No leftover test incomes')
  assert((remInv?.length || 0) === 0, 'No leftover test investments')
}

await dbTests()

// ============================================================
// Summary
// ============================================================
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
