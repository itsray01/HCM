/** Budget/cost helpers used by BudgetSummary and DayBucket */

export function dayCostTotal(day) {
  if (!day?.stops) return 0;
  return day.stops.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
}

export function tripTotal(days) {
  if (!days) return 0;
  return days.reduce((sum, d) => sum + dayCostTotal(d), 0);
}

export function formatCurrency(num) {
  const n = Number(num) || 0;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
