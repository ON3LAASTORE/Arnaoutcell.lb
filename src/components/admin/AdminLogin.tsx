import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { AdminRole } from '../../types';
import { ShieldCheck, Lock, User, Key, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { StoreLogo } from '../StoreLogo';

export const AdminLogin: React.FC = () => {
  const { login, loginWithGoogle } = useAdmin();
  const { lang, setCurrentView } = useShop();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError(lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your administrator password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password, role);
      if (!success) {
        setError(
          lang === 'ar'
            ? 'بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور.'
            : 'Invalid credentials. Please verify your username and password.'
        );
      }
    } catch {
      setError(
        lang === 'ar'
          ? 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.'
          : 'Authentication error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full py-16 bg-[#F5F8FC] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#007AFF]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-100/60 blur-[90px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => setCurrentView('home')}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#007AFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{lang === 'ar' ? 'العودة للمتجر الرئيسي' : 'Back to Storefront'}</span>
        </button>

        <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,122,255,0.08)] space-y-6">
          <div className="text-center space-y-3 flex flex-col items-center">
            <StoreLogo size="lg" adminMode={true} showTagline={false} />
            <p className="text-xs text-[#64748B]">
              {lang === 'ar'
                ? 'بوابة الإدارة المركزية والتحكم الآمن بالمتجر'
                : 'Central Management & Secure Control Portal'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                {lang === 'ar' ? 'اسم المستخدم' : 'Username'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                {lang === 'ar' ? 'الصلاحية / الدور الإداري' : 'Administrative Role'}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 cursor-pointer"
              >
                <option value="super_admin">Super Admin (Full Access)</option>
                <option value="product_manager">Product Manager (Products & Offers)</option>
                <option value="order_manager">Order Manager (Orders & Fulfillment)</option>
                <option value="inventory_manager">Inventory Manager (Stock & Restock)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {loading
                  ? (lang === 'ar' ? 'جاري التحقق...' : 'Authenticating...')
                  : (lang === 'ar' ? 'تسجيل الدخول الآمن' : 'Authorize & Sign In')}
              </span>
            </button>

            {/* Divider */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DCE5F0]" />
              </div>
              <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-[#64748B]">
                {lang === 'ar' ? 'أو عبر' : 'Or via'}
              </span>
            </div>

            {/* Google Firebase Auth Sign In */}
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError('');
                const ok = await loginWithGoogle();
                if (!ok) {
                  setError(
                    lang === 'ar'
                      ? 'تعذر تسجيل الدخول عبر Google'
                      : 'Google Sign-In was cancelled or failed.'
                  );
                }
                setLoading(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{lang === 'ar' ? 'تسجيل الدخول عبر Google' : 'Sign in with Google (Firebase)'}</span>
            </button>
          </form>

          {/* Secure Encrypted Session Footer */}
          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>{lang === 'ar' ? 'جلسة مشفرة ومحمية بتقنية SHA-256' : 'SHA-256 Encrypted & Protected Session'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
