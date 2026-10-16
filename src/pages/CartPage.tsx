import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck, Tag, MessageSquare } from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    lang,
    t,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartCount,
    setCurrentView,
    generateWhatsAppOrderUrl,
  } = useShop();

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    const code = couponCode.trim().toUpperCase();

    if (code === 'ARNAOUT10' || code === 'SAIDA10' || code === 'WELCOME10') {
      const discount = Math.round(cartSubtotal * 0.1); // 10% discount
      setCouponDiscount(discount);
      setCouponSuccess(lang === 'ar' ? 'تم تطبيق خصم 10% بنجاح!' : '10% Discount applied successfully!');
    } else if (code === 'FREESHIP') {
      setCouponDiscount(3);
      setCouponSuccess(lang === 'ar' ? 'تم خصم تكلفة التوصيل!' : 'Free shipping applied!');
    } else {
      setCouponError(lang === 'ar' ? 'كود الخصم غير صالح أو منتهي الصلاحية' : 'Invalid or expired coupon code');
    }
  };

  const finalTotal = Math.max(0, cartSubtotal - couponDiscount);

  if (cart.length === 0) {
    return (
      <div className="py-24 bg-[#F5F8FC] min-h-[70vh] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-3xl border border-[#DCE5F0] shadow-sm space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#F5F8FC] border border-[#DCE5F0] flex items-center justify-center mx-auto text-[#64748B]">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-[#172033]">{t.emptyCart}</h2>
          <p className="text-xs text-[#64748B]">{t.emptyCartSub}</p>
          <button
            onClick={() => setCurrentView('products')}
            className="px-6 py-3 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] transition-colors cursor-pointer shadow-sm"
          >
            {t.continueShopping}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#DCE5F0]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">{t.cart} ({cartCount})</h1>
            <p className="text-xs text-[#64748B] mt-1">
              {lang === 'ar' ? 'قم بمراجعة الأجهزة وتعديل الكميات قبل التثبيت.' : 'Review selected tech and proceed to Lebanon checkout.'}
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تفريغ السلة' : 'Clear Cart'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Table */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-[#DCE5F0] rounded-3xl overflow-hidden shadow-xs">
              <div className="divide-y divide-[#DCE5F0]">
                {cart.map((item, idx) => {
                  const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                  const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.product.stock;

                  return (
                    <div key={idx} className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#007AFF] uppercase tracking-wider block">
                            {item.product.brand}
                          </span>
                          <h3 className="font-bold text-[#172033] text-sm line-clamp-1">
                            {lang === 'ar' ? item.product.nameAr || item.product.name : item.product.name}
                          </h3>
                          {item.selectedColor && (
                            <span className="text-xs text-[#64748B] block mt-0.5">
                              {lang === 'ar' ? 'اللون:' : 'Color:'} {item.selectedColor}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-[#64748B] block mt-0.5">
                            ${itemPrice} USD
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Actions */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#DCE5F0]">
                        <div className="flex items-center bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl overflow-hidden">
                          <button
                            onClick={() =>
                              updateCartQuantity(
                                item.product.id,
                                item.quantity - 1,
                                item.selectedColor,
                                item.selectedVariant?.id
                              )
                            }
                            className="px-3 py-1.5 text-xs text-[#172033] hover:bg-slate-200 transition-colors"
                          >
                            -
                          </button>
                          <span className="px-3 py-1.5 text-xs font-bold text-[#172033] min-w-[2rem] text-center">
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
                            className="px-3 py-1.5 text-xs text-[#172033] hover:bg-slate-200 transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-base font-black text-[#007AFF] min-w-[4rem] text-right rtl:text-left">
                          ${itemPrice * item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            removeFromCart(item.product.id, item.selectedColor, item.selectedVariant?.id)
                          }
                          className="p-2 text-[#64748B] hover:text-[#DC2626] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coupon Code Box */}
            <div className="p-5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0]">
              <form onSubmit={applyCoupon} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'أدخل كود الخصم (مثال: ARNAOUT10 أو SAIDA10)' : 'Promo code (try ARNAOUT10)'}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full bg-white border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] uppercase tracking-wider focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] font-bold text-xs border border-[#DCE5F0] hover:border-[#007AFF] transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'تطبيق الكود' : 'Apply Coupon'}
                </button>
              </form>
              {couponSuccess && <p className="text-xs text-[#16A34A] font-semibold mt-2">{couponSuccess}</p>}
              {couponError && <p className="text-xs text-[#DC2626] font-semibold mt-2">{couponError}</p>}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-4">
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] space-y-5 sticky top-28 shadow-sm">
              <h2 className="text-base font-bold text-[#172033] pb-3 border-b border-[#DCE5F0]">
                {t.orderSummary}
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#172033]">
                  <span>{t.subtotal}</span>
                  <span className="font-bold">${cartSubtotal} USD</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-[#16A34A] font-bold">
                    <span>{lang === 'ar' ? 'قيمة الخصم:' : 'Discount Applied:'}</span>
                    <span>-${couponDiscount} USD</span>
                  </div>
                )}

                <div className="flex justify-between text-[#64748B]">
                  <span>{t.deliveryFee}</span>
                  <span className="text-[11px] font-semibold text-[#007AFF]">
                    {lang === 'ar' ? 'يُحسب عند اختيار المنطقة' : 'Calculated at Checkout'}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#DCE5F0] flex items-baseline justify-between">
                <span className="text-sm font-bold text-[#172033]">{t.total}</span>
                <span className="text-2xl font-black text-[#007AFF]">${finalTotal} USD</span>
              </div>

              {/* Checkout Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => setCurrentView('checkout')}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t.checkout}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>

                <button
                  onClick={() => {
                    const url = generateWhatsAppOrderUrl({ items: cart, total: finalTotal });
                    window.open(url, '_blank');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#16A34A] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'طلب فوري عبر واتساب 03 099 889' : 'Order via WhatsApp (03 099 889)'}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-[#DCE5F0] flex items-center gap-2 text-[11px] text-[#64748B]">
                <ShieldCheck className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>{lang === 'ar' ? 'توصيل معتمد مع إمكانية الدفع عند الاستلام' : 'Cash on Delivery or Saida pickup'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
