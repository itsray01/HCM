import { Wallet, Plane, Home } from 'lucide-react';
import { tripTotal, formatCurrency } from './budgetUtils.js';

export default function BudgetSummary({ days, groupLabel }) {
  const total = tripTotal(days);
  const stopCount = days.reduce((sum, d) => sum + d.stops.length, 0);

  // Surface known prefilled costs (flights + lodging) so users see what's locked in
  const flightTotal = days.reduce(
    (sum, d) => sum + d.stops.filter((s) => s.type === 'flight').reduce((a, s) => a + (Number(s.cost) || 0), 0),
    0,
  );
  const lodgingTotal = days.reduce(
    (sum, d) => sum + d.stops.filter((s) => s.type === 'airbnb' && s.cost).reduce((a, s) => a + (Number(s.cost) || 0), 0),
    0,
  );
  const fixedTotal = flightTotal + lodgingTotal;
  const variableTotal = total - fixedTotal;

  return (
    <div className="rounded-2xl border border-ink/10 bg-gradient-to-br from-ink to-ink/90 p-4 shadow-md text-cream">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream/10">
          <Wallet className="h-5 w-5 text-cream" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/55">
            Trip total · {groupLabel}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
            $ {formatCurrency(total)}
          </p>
          <p className="mt-0.5 text-xs text-cream/55">
            Across {days.length} days · {stopCount} stops
          </p>
        </div>
      </div>

      {fixedTotal > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-cream/10 pt-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Plane className="h-3 w-3 text-cream/60" />
            <div className="min-w-0">
              <div className="text-cream/55">Flights</div>
              <div className="font-semibold tabular-nums text-cream">
                ${formatCurrency(flightTotal)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Home className="h-3 w-3 text-cream/60" />
            <div className="min-w-0">
              <div className="text-cream/55">Lodging</div>
              <div className="font-semibold tabular-nums text-cream">
                ${formatCurrency(lodgingTotal)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3 w-3 text-cream/60" />
            <div className="min-w-0">
              <div className="text-cream/55">On the ground</div>
              <div className="font-semibold tabular-nums text-cream">
                ${formatCurrency(variableTotal)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
