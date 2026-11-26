/**
 * Pure calculation functions for Rana finance app.
 * All functions are side-effect free and can be unit tested.
 */

/**
 * Get today's date as YYYY-MM-DD using local timezone.
 * Never use toISOString() which shifts dates for UTC+ timezones.
 */
export function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Get the month key (YYYY-MM) from a Date object or the current date.
 */
export function monthKey(date) {
  const d = date || new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get the first day of a month as YYYY-MM-DD (inclusive).
 */
export function monthStart(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`
}

/**
 * Get the first day of the NEXT month as YYYY-MM-DD (exclusive upper bound).
 */
export function monthEndExclusive(year, month) {
  const d = new Date(year, month + 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Parse a YYYY-MM-DD string to a local midnight Date.
 * Appends T00:00:00 to prevent timezone shifting.
 */
export function parseLocalDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
}

/**
 * Days between two date strings (YYYY-MM-DD).
 * Uses Math.round to avoid DST off-by-one errors.
 */
export function daysBetween(startStr, endStr) {
  const a = parseLocalDate(startStr)
  const b = parseLocalDate(endStr)
  return Math.round((b - a) / 86400000)
}

/**
 * Return % = (value - capital) / capital * 100
 * Returns 0 if capital <= 0.
 */
export function returnPercent(value, capital) {
  const v = Number(value)
  const c = Number(capital)
  if (!c || c <= 0) return 0
  return ((v - c) / c) * 100
}

/**
 * Profit/Loss = value - capital
 */
export function profitLoss(value, capital) {
  return Number(value) - Number(capital)
}

/**
 * Annualized return = ((value / capital) ^ (365 / days) - 1) * 100
 * Returns null when days <= 0 or capital <= 0 (shows "n/a").
 */
export function annualizedReturn(value, capital, days) {
  const v = Number(value)
  const c = Number(capital)
  const d = Number(days)
  if (!d || d <= 0 || !c || c <= 0) return null
  return (Math.pow(v / c, 365 / d) - 1) * 100
}

/**
 * Calculate total income for a given month (YYYY-MM),
 * including recurring income that started on or before this month.
 * Recurring income counts in every month from its start month onward.
 * Non-recurring income counts only in the month of received_on.
 */
export function incomeForMonth(incomes, year, month) {
  const mk = monthKey(new Date(year, month, 1))
  let total = 0

  for (const inc of incomes) {
    const amt = Number(inc.amount)
    const incMk = inc.received_on.substring(0, 7) // YYYY-MM

    if (inc.is_recurring) {
      // Recurring: count if the income started on or before this month
      if (incMk <= mk) {
        total += amt
      }
    } else {
      // One-time: count only if it falls in this exact month
      if (incMk === mk) {
        total += amt
      }
    }
  }
  return total
}

/**
 * Format a number as Indonesian Rupiah: Rp 1.250.000
 */
export function formatCurrency(amount) {
  const num = Math.abs(Number(amount || 0))
  const parts = num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${parts}`
}

/**
 * Format a date string (YYYY-MM-DD) as "26 Nov 2026".
 * Parses manually to avoid timezone issues.
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const parts = dateStr.split('-')
  const y = parts[0]
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  return `${d} ${months[m]} ${y}`
}

/**
 * Strip thousand separators (dots) from a formatted Rp string and return a number.
 * E.g. "1.250.000" -> 1250000
 */
export function parseFormattedNumber(str) {
  if (!str) return NaN
  return Number(String(str).replace(/\./g, '').replace(/,/g, '.'))
}
