import { translations } from '../locales/translations';
import { Language } from '../types';

export type ProductCollectionPreset = 'all' | 'new' | 'bestseller';

export interface HamburgerMenuItem {
  id:
    | 'special-offers'
    | 'new-arrivals'
    | 'best-sellers'
    | 'brands'
    | 'product-videos'
    | 'services-support'
    | 'track-order'
    | 'contact-us';
  label: string;
  view: string;
  filterPreset?: ProductCollectionPreset;
  iconType?: 'flame' | 'video';
  isHighlighted?: boolean;
}

export function getHamburgerMenuItems(lang: Language): HamburgerMenuItem[] {
  const t = translations[lang] || translations.en;

  return [
    {
      id: 'special-offers',
      label: t.specialOffers,
      view: 'offers',
      iconType: 'flame',
      isHighlighted: true,
    },
    {
      id: 'new-arrivals',
      label: t.newArrivals,
      view: 'products',
      filterPreset: 'new',
    },
    {
      id: 'best-sellers',
      label: t.bestSellers,
      view: 'products',
      filterPreset: 'bestseller',
    },
    {
      id: 'brands',
      label: t.brands,
      view: 'brands',
    },
    {
      id: 'product-videos',
      label: t.marketingVideos,
      view: 'videos',
      iconType: 'video',
    },
    {
      id: 'services-support',
      label: t.storeServices,
      view: 'services',
    },
    {
      id: 'track-order',
      label: t.trackOrder,
      view: 'track-order',
    },
    {
      id: 'contact-us',
      label: t.contactUs,
      view: 'contact',
    },
  ];
}

export function isHamburgerMenuItemActive(
  item: HamburgerMenuItem,
  currentView: string,
  activePreset: ProductCollectionPreset = 'all'
): boolean {
  if (item.view === 'products') {
    if (currentView !== 'products') return false;
    return item.filterPreset ? activePreset === item.filterPreset : activePreset === 'all';
  }
  return currentView === item.view;
}
