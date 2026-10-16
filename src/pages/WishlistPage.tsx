import React from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import { Heart } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { lang, t, wishlist, products, setCurrentView } = useShop();

  const favoritedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="py-12 md:py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#DCE5F0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033] flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-current" />
              <span>{t.wishlist} ({favoritedProducts.length})</span>
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              {lang === 'ar' ? 'الأجهزة والملحقات المفضلة لديك المحفوظة للرجوع إليها سريعاً.' : 'Your saved electronics and gadgets ready for one-click checkout.'}
            </p>
          </div>
        </div>

        {favoritedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favoritedProducts.map((product) => (
              <ProductCard key={product.id} product={product} layout="grid" />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-[#F5F8FC] rounded-3xl border border-[#DCE5F0] p-8 max-w-md mx-auto space-y-4">
            <Heart className="w-12 h-12 text-[#64748B] mx-auto opacity-50" />
            <h3 className="text-lg font-bold text-[#172033]">
              {lang === 'ar' ? 'قائمة المفضلة فارغة حالياً' : 'Your Wishlist is Empty'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {lang === 'ar' ? 'اضغط على أيقونة القلب على أي منتج لحفظه هنا.' : 'Click the heart icon on any electronic item to bookmark it here.'}
            </p>
            <button
              onClick={() => setCurrentView('products')}
              className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] transition-colors cursor-pointer shadow-xs"
            >
              {t.continueShopping}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
