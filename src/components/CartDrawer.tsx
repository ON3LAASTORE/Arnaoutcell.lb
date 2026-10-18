import React from 'react';
import { useShop } from '../context/ShopContext';
import { X, Trash2, ShoppingBag, ArrowRight, MessageSquare, ShieldCheck } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    lang,
    t,
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    cartCount,
    setCurrentView,
    generateWhatsAppOrderUrl,
  } = useShop();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setCurrentView('checkout');
  };

  const handleWhatsAppQuickOrder = () => {
    const url = generateWhatsAppOrderUrl({ items: cart, total: cartSubtotal });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 max-w-full flex pl-10 rtl:pl-0 rtl:pr-10">
        <div className="w-screen max-w-md bg-white dark:bg-[#0E1726] border-l rtl:border-l-0 rtl:border-r border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between bg-[#F5F8FC] dark:bg-[#111A2E]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAF3FF] dark:bg-[#1E293B] flex items-center justify-center text-[#007AFF] dark:text-[#38BDF8]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#172033] dark:text-[#F8FAFC]">
                {lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'} ({cartCount})
              </h2>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#DCE5F0] dark:divide-[#1E293B] space-y-4">
            {cart.length > 0 ? (
              cart.map((item, idx) => {
                const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.product.stock;

                return (
                  <div key={idx} className="pt-4 first:pt-0 flex gap-4 items-center">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-xl bg-[#F5F8FC] dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] line-clamp-1">
                        {lang === 'ar' ? item.product.nameAr || item.product.name : item.product.name}
                      </h4>
                      {item.selectedColor && (
                        <span className="text-[10px] text-[#007AFF] dark:text-[#38BDF8] font-semibold block">
                          {item.selectedColor}
                        </span>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-black text-[#007AFF] dark:text-[#38BDF8]">
                          ${itemPrice * item.quantity}
                        </span>

                        {/* Quantity controls */}
                        <div className="flex items-center bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item.product.id,
                                item.quantity - 1,
                                item.selectedColor,
                                item.selectedVariant?.id
                              )
                            }
                            className="px-2 py-0.5 text-xs text-[#172033] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 py-0.5 text-xs font-bold text-[#172033] dark:text-[#F8FAFC] min-w-[1.5rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item.product.id,
                                Math.min(maxStock, item.quantity + 1),
                                item.selectedColor,
                                item.selectedVariant?.id
                              )
                            }
                            className="px-2 py-0.5 text-xs text-[#172033] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        removeFromCart(item.product.id, item.selectedColor, item.selectedVariant?.id)
                      }
                      className="p-1.5 text-[#64748B] dark:text-slate-400 hover:text-[#DC2626] dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center mx-auto text-[#64748B] dark:text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-[#172033] dark:text-[#F8FAFC] text-base">{t.emptyCart}</h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-xs mx-auto">{t.emptyCartSub}</p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCurrentView('products');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] transition-colors cursor-pointer"
                >
                  {t.continueShopping}
                </button>
              </div>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#111A2E] space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B] dark:text-slate-400 font-medium">{t.subtotal}</span>
                <span className="text-xl font-black text-[#007AFF] dark:text-[#38BDF8]">${cartSubtotal} USD</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#007AFF]/25 transition-all cursor-pointer"
                >
                  <span>{t.checkout}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCurrentView('cart');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-[#0E1726] hover:bg-[#F5F8FC] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#38BDF8]" />
                  <span>{lang === 'ar' ? 'عرض تفاصيل السلة والكوبونات' : 'View Full Cart & Apply Promo'}</span>
                </button>

                <button
                  onClick={handleWhatsAppQuickOrder}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-[#16A34A] dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'طلب فوري عبر واتساب 03 099 889' : 'Instant WhatsApp Order'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#64748B] dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'توصيل معتمد لكافة مناطق لبنان' : 'Fast delivery across all Lebanon'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
