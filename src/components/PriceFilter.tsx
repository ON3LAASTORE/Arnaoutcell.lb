import React from 'react';
import { BUDGET_TIERS, BudgetTier } from '../utils/priceFilterHelpers';
import { DollarSign, RotateCcw } from 'lucide-react';

interface PriceFilterProps {
  priceMin: number;
  setPriceMin: (val: number) => void;
  priceMax: number;
  setPriceMax: (val: number) => void;
  selectedBudgetTiers: string[];
  toggleBudgetTier: (tierId: string) => void;
  tierCounts: Record<string, number>;
  lang: 'en' | 'ar';
  compact?: boolean;
}

export const PriceFilter: React.FC<PriceFilterProps> = ({
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  selectedBudgetTiers,
  toggleBudgetTier,
  tierCounts,
  lang,
  compact = false,
}) => {
  const isCustomRange = priceMin > 0 || priceMax < 3000;
  const hasActivePriceFilters = isCustomRange || selectedBudgetTiers.length > 0;

  const handleReset = () => {
    setPriceMin(0);
    setPriceMax(3000);
    if (selectedBudgetTiers.length > 0) {
      selectedBudgetTiers.forEach((id) => toggleBudgetTier(id));
    }
  };

  const handleQuickPreset = (max: number) => {
    setPriceMin(0);
    setPriceMax(max);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-1.5 uppercase tracking-wider">
          <DollarSign className="w-3.5 h-3.5 text-[#007AFF]" />
          <span>{lang === 'ar' ? 'السعر والميزانية' : 'Price & Budget'}</span>
        </span>
        {hasActivePriceFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#DC2626] hover:text-red-700 transition-colors cursor-pointer"
            title={lang === 'ar' ? 'إعادة تعيين السعر' : 'Reset price filters'}
          >
            <RotateCcw className="w-3 h-3" />
            <span>{lang === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        )}
      </div>

      {/* Interactive Range Slider & Display */}
      <div className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#64748B] dark:text-slate-400">
            {lang === 'ar' ? 'الحد الأقصى للميزانية:' : 'Budget Ceiling:'}
          </span>
          <span className="text-[#007AFF] bg-[#EAF3FF] dark:bg-[#007AFF]/20 px-2 py-0.5 rounded-md font-mono text-xs">
            ${priceMin} — ${priceMax}
          </span>
        </div>

        {/* Range Slider */}
        <div className="relative py-1">
          <input
            type="range"
            min="0"
            max="3000"
            step="25"
            value={priceMax}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPriceMax(Math.max(val, priceMin + 25));
            }}
            aria-label={lang === 'ar' ? 'الحد الأقصى للسعر' : 'Maximum price limit'}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#007AFF] focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono mt-1">
            <span>$0</span>
            <span>$750</span>
            <span>$1,500</span>
            <span>$3,000+</span>
          </div>
        </div>

        {/* Min / Max Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 block mb-1">
              {lang === 'ar' ? 'الحد الأدنى ($)' : 'Min ($)'}
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                type="number"
                min="0"
                max={priceMax - 10}
                value={priceMin === 0 ? '' : priceMin}
                placeholder="0"
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setPriceMin(Math.min(val, priceMax - 10));
                }}
                className="w-full pl-6 pr-2 py-1.5 text-xs bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] rounded-lg font-mono text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 block mb-1">
              {lang === 'ar' ? 'الحد الأقصى ($)' : 'Max ($)'}
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
              <input
                type="number"
                min={priceMin + 10}
                max="5000"
                value={priceMax === 3000 ? '' : priceMax}
                placeholder="3000"
                onChange={(e) => {
                  const val = Number(e.target.value) || 3000;
                  setPriceMax(Math.max(val, priceMin + 10));
                }}
                className="w-full pl-6 pr-2 py-1.5 text-xs bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] rounded-lg font-mono text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
              />
            </div>
          </div>
        </div>

        {/* Quick Budget Chips */}
        <div className="pt-2 border-t border-[#DCE5F0]/60 dark:border-[#1E293B] flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => handleQuickPreset(100)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              priceMax === 100 && priceMin === 0
                ? 'bg-[#007AFF] text-white'
                : 'bg-white dark:bg-[#0A0F1D] text-[#64748B] dark:text-slate-300 border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]'
            }`}
          >
            &lt; $100
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(400)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              priceMax === 400 && priceMin === 0
                ? 'bg-[#007AFF] text-white'
                : 'bg-white dark:bg-[#0A0F1D] text-[#64748B] dark:text-slate-300 border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]'
            }`}
          >
            &lt; $400
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(800)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              priceMax === 800 && priceMin === 0
                ? 'bg-[#007AFF] text-white'
                : 'bg-white dark:bg-[#0A0F1D] text-[#64748B] dark:text-slate-300 border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]'
            }`}
          >
            &lt; $800
          </button>
          <button
            type="button"
            onClick={() => handleQuickPreset(1500)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              priceMax === 1500 && priceMin === 0
                ? 'bg-[#007AFF] text-white'
                : 'bg-white dark:bg-[#0A0F1D] text-[#64748B] dark:text-slate-300 border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]'
            }`}
          >
            &lt; $1.5k
          </button>
        </div>
      </div>

      {/* Specific Budget Range Checkboxes */}
      <div className="pt-2">
        <span className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider block mb-2">
          {lang === 'ar' ? 'فئات الميزانية المحددة' : 'Budget Ranges'}
        </span>
        <div className={`space-y-1.5 ${compact ? 'max-h-48' : 'max-h-56'} overflow-y-auto pr-0.5`}>
          {BUDGET_TIERS.map((tier: BudgetTier) => {
            const isSelected = selectedBudgetTiers.includes(tier.id);
            const count = tierCounts[tier.id] || 0;

            return (
              <label
                key={tier.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none text-xs ${
                  isSelected
                    ? 'bg-[#EAF3FF] dark:bg-[#007AFF]/15 border-[#007AFF] text-[#007AFF] font-bold shadow-xs'
                    : 'bg-white dark:bg-[#0A0F1D] hover:bg-slate-50 dark:hover:bg-[#1E293B]/40 border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBudgetTier(tier.id)}
                    className="w-4 h-4 rounded border-slate-300 text-[#007AFF] accent-[#007AFF] focus:ring-[#007AFF] cursor-pointer"
                  />
                  <span>{lang === 'ar' ? tier.labelAr : tier.labelEn}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
