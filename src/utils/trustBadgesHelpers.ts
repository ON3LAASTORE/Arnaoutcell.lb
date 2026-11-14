export type PaymentBadgeId = 'omt' | 'whish' | 'western_union' | 'cod';

export interface TrustPaymentBadge {
  id: PaymentBadgeId;
  name: string;
  label: string;
  description: string;
}

export interface TrustBadgesSectionContent {
  heading: string;
  subheading: string;
  assuranceItems: string[];
  badges: TrustPaymentBadge[];
}

export function getFooterTrustBadges(lang: 'en' | 'ar'): TrustBadgesSectionContent {
  const isArabic = lang === 'ar';

  if (isArabic) {
    return {
      heading: 'وسائل دفع موثوقة وآمنة',
      subheading:
        'أتمم طلبك بثقة مع فاتورة رسمية من ON AlAA STORE وخيارات دفع مرنة ومعتمدة في كافة مناطق لبنان.',
      assuranceItems: [
        'فواتير رسمية معتمدة',
        'فحص الجهاز عند الاستلام',
        'كفالة حقيقية لمدة 12–24 شهراً',
      ],
      badges: [
        {
          id: 'omt',
          name: 'OMT',
          label: 'تحويل عبر OMT',
          description: 'تحويل مالي محلي معتمد',
        },
        {
          id: 'whish',
          name: 'Whish Money',
          label: 'ويش موني (Whish)',
          description: 'تحويل فوري عبر المحفظة',
        },
        {
          id: 'western_union',
          name: 'Western Union',
          label: 'ويسترن يونيون',
          description: 'حوالات محلية ودولية',
        },
        {
          id: 'cod',
          name: 'Cash on Delivery',
          label: 'الدفع عند الاستلام',
          description: 'دولار أو ليرة عند الباب',
        },
      ],
    };
  }

  return {
    heading: 'Trusted & Secure Payments',
    subheading:
      'Shop with confidence at ON AlAA STORE with official store invoices and verified Lebanese payment methods.',
    assuranceItems: [
      'Official store invoice',
      'Inspect before payment',
      '12–24 month warranty',
    ],
    badges: [
      {
        id: 'omt',
        name: 'OMT',
        label: 'OMT Transfer',
        description: 'Local money transfer',
      },
      {
        id: 'whish',
        name: 'Whish Money',
        label: 'Whish Money',
        description: 'Instant wallet transfer',
      },
      {
        id: 'western_union',
        name: 'Western Union',
        label: 'Western Union',
        description: 'Local & global payouts',
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        label: 'Cash on Delivery',
        description: 'USD or LBP at arrival',
      },
    ],
  };
}
