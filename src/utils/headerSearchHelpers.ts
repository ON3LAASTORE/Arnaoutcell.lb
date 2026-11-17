import { Category, Language, Product } from '../types';
import { ProductCollectionPreset } from './navbarMenuHelpers';

export interface SubNavLinkItem {
  id: string;
  label: string;
  view: string;
  filterPreset?: ProductCollectionPreset;
  hasCategoriesDropdown?: boolean;
  isAccent?: boolean;
}

export function getHeaderSubNavLinks(lang: Language): SubNavLinkItem[] {
  const isAr = lang === 'ar';

  return [
    {
      id: 'home',
      label: isAr ? 'الرئيسية' : 'Home',
      view: 'home',
    },
    {
      id: 'categories',
      label: isAr ? 'الأقسام' : 'Categories',
      view: 'categories',
      hasCategoriesDropdown: true,
    },
    {
      id: 'hot-deals',
      label: isAr ? 'أقوى العروض' : 'Hot Deals',
      view: 'offers',
      isAccent: true,
    },
    {
      id: 'shop',
      label: isAr ? 'المتجر' : 'Shop',
      view: 'products',
      filterPreset: 'all',
    },
    {
      id: 'brands',
      label: isAr ? 'الماركات' : 'Brands',
      view: 'brands',
    },
    {
      id: 'track-order',
      label: isAr ? 'تتبع الطلب' : 'Track Order',
      view: 'track-order',
    },
    {
      id: 'contact',
      label: isAr ? 'تواصل معنا' : 'Contact Us',
      view: 'contact',
    },
  ];
}

export function isHeaderSubNavActive(
  item: SubNavLinkItem,
  currentView: string,
  activePreset: ProductCollectionPreset = 'all'
): boolean {
  if (item.view === 'products') {
    if (currentView !== 'products') return false;
    return item.filterPreset ? activePreset === item.filterPreset : activePreset === 'all';
  }
  return currentView === item.view;
}

export function filterHeaderSearchProducts(
  products: Product[],
  categories: Category[],
  query: string,
  selectedCategorySlug: string = 'all'
): Product[] {
  const trimmed = query.trim().toLowerCase();

  let pool = products;
  if (selectedCategorySlug && selectedCategorySlug !== 'all') {
    const matchedCat = categories.find((c) => c.slug === selectedCategorySlug);
    if (matchedCat) {
      const catNameLower = matchedCat.name.toLowerCase();
      const catSlugLower = matchedCat.slug.toLowerCase();
      pool = products.filter(
        (p) =>
          p.category.toLowerCase() === catNameLower ||
          p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === catSlugLower
      );
    }
  }

  if (!trimmed) {
    return pool;
  }

  return pool.filter((p) => {
    const fields = [
      p.name,
      p.nameAr || '',
      p.brand,
      p.category,
      p.subcategory || '',
      p.sku || '',
      p.description || '',
    ];
    return fields.some((field) => field.toLowerCase().includes(trimmed));
  });
}
