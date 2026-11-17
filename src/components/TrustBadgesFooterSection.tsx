import React from 'react';
import { ShieldCheck, Lock, Banknote } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { getFooterTrustBadges, PaymentBadgeId } from '../utils/trustBadgesHelpers';

const PaymentBrandMark: React.FC<{ id: PaymentBadgeId }> = ({ id }) => {
  switch (id) {
    case 'whish':
      return (
        <div
          aria-hidden="true"
          dir="ltr"
          className="h-10 w-24 rounded-lg bg-[#E11D48] flex items-center justify-center px-2.5 flex-shrink-0 shadow-xs"
        >
          <svg
            viewBox="0 0 104 32"
            className="w-full h-6"
            style={{ direction: 'ltr' }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 10L11 22L16 13L21 22L26 10"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="33"
              y="21"
              textAnchor="start"
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="800"
              fontSize="14.5"
              letterSpacing="0.03em"
            >
              WHISH
            </text>
          </svg>
        </div>
      );

    case 'cod':
      return (
        <div
          aria-hidden="true"
          dir="ltr"
          className="h-10 w-24 rounded-lg bg-[#EAF3FF] dark:bg-[#172554]/60 border border-[#BFDBFE] dark:border-blue-500/30 flex items-center justify-center gap-1.5 px-2 flex-shrink-0 text-[#007AFF] dark:text-[#38BDF8]"
        >
          <Banknote className="w-5 h-5 flex-shrink-0" />
          <span className="font-mono font-bold text-xs tracking-wider">COD</span>
        </div>
      );
  }
};

export const TrustBadgesFooterSection: React.FC = () => {
  const { lang } = useShop();
  const isArabic = lang === 'ar';
  const content = getFooterTrustBadges(lang);

  return (
    <section
      id="footer-trust-badges"
      data-testid="footer-trust-badges"
      dir={isArabic ? 'rtl' : 'ltr'}
      aria-labelledby="footer-trust-badges-heading"
      className="py-8 border-t border-[#DCE5F0] dark:border-[#1E293B]"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#007AFF] dark:text-[#38BDF8] flex-shrink-0" />
            <h3
              id="footer-trust-badges-heading"
              className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] tracking-tight"
            >
              {content.heading}
            </h3>
          </div>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-2xl">
            {content.subheading}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-medium text-[#64748B] dark:text-slate-400">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          {content.assuranceItems.map((item, index) => (
            <React.Fragment key={item}>
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
              )}
              <span>{item}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {content.badges.map((badge) => (
          <li
            key={badge.id}
            data-testid={`trust-badge-${badge.id}`}
            className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#93C5FD] dark:hover:border-slate-700 transition-colors"
          >
            <PaymentBrandMark id={badge.id} />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] truncate">
                {badge.label}
              </div>
              <div className="text-[11px] text-[#64748B] dark:text-slate-400 leading-snug line-clamp-2">
                {badge.description}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
