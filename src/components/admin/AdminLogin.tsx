import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { AdminRole } from '../../types';
import {
  confirmAdminPasswordReset,
  evaluatePasswordStrength,
  extractResetTokenFromLocation,
  requestAdminPasswordReset,
  verifyAdminResetToken,
} from '../../services/authService';
import { resolvePortalDirectoryUser } from '../../utils/adminPermissionHelpers';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  User,
  X,
} from 'lucide-react';
import { StoreLogo } from '../StoreLogo';

type AdminAuthViewMode = 'login' | 'forgot' | 'reset';

export const AdminLogin: React.FC = () => {
  const { login, loginWithGoogle, logoutReason, dismissLogoutReason } = useAdmin();
  const { lang, setCurrentView } = useShop();
  const isAr = lang === 'ar';

  const [initialUrlToken] = useState<string | null>(() => extractResetTokenFromLocation());
  const [mode, setMode] = useState<AdminAuthViewMode>(() =>
    initialUrlToken ? 'reset' : 'login'
  );

  // Sign-In state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password / Recovery state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetToken, setResetToken] = useState(() => initialUrlToken || '');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showResetNew, setShowResetNew] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tokenStatusWarning, setTokenStatusWarning] = useState('');

  const resetStrength = evaluatePasswordStrength(newResetPassword);

  useEffect(() => {
    if (!initialUrlToken) return;
    let active = true;
    verifyAdminResetToken(initialUrlToken).then((res) => {
      if (!active || res.valid) return;
      if (res.reason === 'expired') {
        setTokenStatusWarning(
          isAr
            ? 'انتهت صلاحية رابط الاستعادة هذا. يرجى طلب رابط جديد.'
            : 'This recovery link has expired. Please request a new reset email.'
        );
      } else if (res.reason === 'already_used' || res.reason === 'invalidated') {
        setTokenStatusWarning(
          isAr
            ? 'تم استخدام رابط الاستعادة هذا مسبقاً أو استبداله برابط أحدث.'
            : 'This recovery link has already been used or superseded.'
        );
      } else {
        setTokenStatusWarning(
          isAr
            ? 'رمز الاستعادة غير صالح. يرجى طلب رابط استعادة جديد.'
            : 'This recovery link is invalid. Please request a new reset email.'
        );
      }
    });
    return () => {
      active = false;
    };
  }, [initialUrlToken, isAr]);

  const switchMode = (nextMode: AdminAuthViewMode, preserveNotices = false) => {
    setMode(nextMode);
    if (!preserveNotices) {
      setError('');
      setSuccessNotice('');
      setTokenStatusWarning('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');
    dismissLogoutReason();

    if (!password) {
      setError(isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter your administrator password.');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password, role);
      if (!success) {
        setError(
          isAr
            ? 'بيانات الدخول غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور.'
            : 'Invalid credentials. Please verify your username and password.'
        );
      }
    } catch {
      setError(
        isAr
          ? 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.'
          : 'Authentication error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');
    setTokenStatusWarning('');

    if (!recoveryEmail.trim()) {
      setError(
        isAr
          ? 'يرجى إدخال البريد الإلكتروني الخاص بالمدير.'
          : 'Please enter the administrator recovery email address.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await requestAdminPasswordReset(recoveryEmail, isAr ? 'ar' : 'en');
      if (!res.success) {
        setError(isAr ? res.messageAr : res.messageEn);
        return;
      }
      setSuccessNotice(isAr ? res.messageAr : res.messageEn);
      setMode('reset');
    } catch {
      setError(
        isAr
          ? 'تعذر إرسال طلب استعادة كلمة المرور. يرجى المحاولة لاحقاً.'
          : 'Unable to submit recovery request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessNotice('');

    if (!resetToken.trim()) {
      setError(
        isAr
          ? 'يرجى إدخال رمز الاستعادة المرسل لبريدك.'
          : 'Please enter the one-time recovery token from your email.'
      );
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      setError(
        isAr
          ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.'
          : 'New password and confirmation do not match.'
      );
      return;
    }

    if (newResetPassword.length < 8) {
      setError(
        isAr
          ? 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.'
          : 'New password must contain at least 8 characters.'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await confirmAdminPasswordReset(
        resetToken,
        newResetPassword,
        confirmResetPassword
      );
      if (!res.success) {
        setError(isAr ? res.messageAr : res.messageEn);
        return;
      }

      // Clean any ?adminResetToken URL query param cleanly without reloading
      if (typeof window !== 'undefined' && window.location.search.includes('adminResetToken')) {
        const cleanedUrl = new URL(window.location.href);
        cleanedUrl.searchParams.delete('adminResetToken');
        window.history.replaceState({}, '', cleanedUrl.pathname + cleanedUrl.search + cleanedUrl.hash);
      }

      setResetToken('');
      setNewResetPassword('');
      setConfirmResetPassword('');
      setPassword('');
      setTokenStatusWarning('');
      setSuccessNotice(isAr ? res.messageAr : res.messageEn);
      setMode('login');
    } catch {
      setError(
        isAr
          ? 'حدث خطأ أثناء إعادة تعيين كلمة المرور.'
          : 'An unexpected error occurred while resetting your password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full py-16 bg-[#F5F8FC] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle Background Ambient Gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#007AFF]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-100/60 blur-[90px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <button
          type="button"
          onClick={() => setCurrentView('home')}
          className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[#64748B] hover:text-[#007AFF] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{isAr ? 'العودة للمتجر الرئيسي' : 'Back to Storefront'}</span>
        </button>

        <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_-5px_rgba(0,122,255,0.08)] space-y-6">
          <div className="text-center space-y-3 flex flex-col items-center">
            <StoreLogo size="lg" adminMode={true} showTagline={false} />
            <p className="text-xs text-[#64748B]">
              {mode === 'login' &&
                (isAr
                  ? 'بوابة الإدارة المركزية والتحكم الآمن بالمتجر'
                  : 'Central Management & Secure Control Portal')}
              {mode === 'forgot' &&
                (isAr
                  ? 'استعادة الوصول إلى حساب المدير عبر البريد الإلكتروني'
                  : 'Administrator Password Recovery via Email')}
              {mode === 'reset' &&
                (isAr
                  ? 'تعيين كلمة مرور جديدة باستخدام الرمز المؤقت لمرة واحدة'
                  : 'Set New Password via One-Time Recovery Token')}
            </p>
          </div>

          {logoutReason === 'inactivity' && mode === 'login' && (
            <div
              role="status"
              data-testid="session-timeout-notice"
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[#92400E] text-xs font-medium flex items-start justify-between gap-2.5"
            >
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
                <span>
                  {isAr
                    ? 'تم تسجيل خروجك تلقائياً بعد 15 دقيقة من عدم النشاط لحماية حساب المدير. يرجى تسجيل الدخول للمتابعة.'
                    : 'Your administrator session timed out after 15 minutes of inactivity. Please sign in again to continue.'}
                </span>
              </div>
              <button
                type="button"
                onClick={dismissLogoutReason}
                aria-label={isAr ? 'إغلاق التنبيه' : 'Dismiss timeout notice'}
                className="text-[#B45309] hover:text-[#78350F] shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-medium flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {tokenStatusWarning && mode === 'reset' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] text-xs font-medium">
              {tokenStatusWarning}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs text-center font-medium"
            >
              {error}
            </div>
          )}

          {/* ==================== MODE 1: SIGN IN ==================== */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-username"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'اسم المستخدم' : 'Username'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setUsername(nextVal);
                      const matched = resolvePortalDirectoryUser(nextVal);
                      if (matched) {
                        setRole(matched.role);
                      }
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition-all"
                    placeholder="admin or Alaa"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="admin-login-password"
                    className="text-xs text-[#172033] font-semibold"
                  >
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-[#007AFF] hover:text-[#0066D6] hover:underline cursor-pointer"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-login-password"
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-login-role"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'الصلاحية / الدور الإداري' : 'Administrative Role'}
                </label>
                <select
                  id="admin-login-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as AdminRole)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 cursor-pointer"
                >
                  <option value="super_admin">Super Admin (Full Access &amp; Full Stock)</option>
                  <option value="product_manager">Product Manager (Products &amp; Offers)</option>
                  <option value="order_manager">Order Manager (Orders &amp; Fulfillment)</option>
                  <option value="inventory_manager">Inventory Manager (Stock &amp; Restock)</option>
                </select>
                {(username.trim().toLowerCase() === 'alaa' ||
                  username.trim().toLowerCase() === 'admin') && (
                  <p
                    data-testid="login-super-admin-role-hint"
                    className="mt-1.5 text-[11px] font-semibold text-[#007AFF] flex items-center gap-1.5"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {username.trim().toLowerCase() === 'alaa'
                        ? isAr
                          ? 'حساب Alaa: صلاحية المدير العام (Super Admin) + إدارة المخزون الكاملة (Full Stock)'
                          : 'Alaa Profile: Super Admin • Full Stock & Complete Portal Permissions'
                        : isAr
                        ? 'حساب admin: صلاحية المدير العام (Super Admin) + إدارة المخزون الكاملة (Full Stock)'
                        : 'admin Profile: Super Admin • Full Stock & Complete Portal Permissions'}
                    </span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {loading
                    ? isAr
                      ? 'جاري التحقق...'
                      : 'Authenticating...'
                    : isAr
                    ? 'تسجيل الدخول الآمن'
                    : 'Authorize & Sign In'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DCE5F0]" />
                </div>
                <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-[#64748B]">
                  {isAr ? 'أو عبر' : 'Or via'}
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
                      isAr
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
                <span>
                  {isAr ? 'تسجيل الدخول عبر Google' : 'Sign in with Google (Firebase)'}
                </span>
              </button>
            </form>
          )}

          {/* ==================== MODE 2: REQUEST RECOVERY EMAIL ==================== */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestResetSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="admin-recovery-email"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'البريد الإلكتروني للمدير' : 'Administrator Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-recovery-email"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="optimatech.lb@gmail.com"
                    autoComplete="email"
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
                  {isAr
                    ? 'سنرسل رابطاً مشفراً لمرة واحدة ورمز تحقق مؤقت (صالح لمدة 15 دقيقة) عبر Resend.'
                    : 'We will dispatch a single-use recovery link and 15-minute verification token via Resend.'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>
                  {loading
                    ? isAr
                      ? 'جاري الإرسال...'
                      : 'Sending Recovery Email...'
                    : isAr
                    ? 'إرسال رابط الاستعادة'
                    : 'Send Recovery Link'}
                </span>
              </button>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="font-semibold text-[#007AFF] hover:underline cursor-pointer"
                >
                  {isAr ? 'لديّ رمز استعادة بالفعل' : 'Already have a reset token?'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-[#64748B] hover:text-[#172033] cursor-pointer"
                >
                  {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* ==================== MODE 3: VERIFY TOKEN & SET NEW PASSWORD ==================== */}
          {mode === 'reset' && (
            <form onSubmit={handleConfirmResetSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="admin-reset-token"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'رمز الاستعادة المؤقت (One-Time Token)' : 'One-Time Recovery Token'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder={isAr ? 'الصق رمز الاستعادة هنا' : 'Paste your recovery token'}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-reset-new-password"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-reset-new-password"
                    type={showResetNew ? 'text' : 'password'}
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetNew(!showResetNew)}
                    aria-label={showResetNew ? 'Hide new password' : 'Show new password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                  >
                    {showResetNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {newResetPassword && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#64748B] font-medium">
                        {isAr ? 'قوة كلمة المرور:' : 'Strength:'}
                      </span>
                      <span className="font-bold" style={{ color: resetStrength.color }}>
                        {isAr ? resetStrength.labelAr : resetStrength.labelEn}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <span
                        className={`flex items-center gap-1 ${
                          resetStrength.hasMinLength ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                        }`}
                      >
                        {resetStrength.hasMinLength ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400" />
                        )}
                        {isAr ? '8 أحرف على الأقل' : '8+ characters'}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          resetStrength.hasUpper ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                        }`}
                      >
                        {resetStrength.hasUpper ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400" />
                        )}
                        {isAr ? 'حرف كبير (A-Z)' : 'Uppercase (A-Z)'}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          resetStrength.hasLower ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                        }`}
                      >
                        {resetStrength.hasLower ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400" />
                        )}
                        {isAr ? 'حرف صغير (a-z)' : 'Lowercase (a-z)'}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          resetStrength.hasNumber ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                        }`}
                      >
                        {resetStrength.hasNumber ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400" />
                        )}
                        {isAr ? 'رقم (0-9)' : 'Number (0-9)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-reset-confirm-password"
                  className="text-xs text-[#172033] font-semibold block mb-1.5"
                >
                  {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
                  <input
                    id="admin-reset-confirm-password"
                    type={showResetConfirm ? 'text' : 'password'}
                    required
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(!showResetConfirm)}
                    aria-label={showResetConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                  >
                    {showResetConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {loading
                    ? isAr
                      ? 'جاري التحديث...'
                      : 'Resetting Password...'
                    : isAr
                    ? 'تعيين كلمة المرور الجديدة'
                    : 'Reset Password'}
                </span>
              </button>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="font-semibold text-[#007AFF] hover:underline cursor-pointer"
                >
                  {isAr ? 'إعادة إرسال رمز جديد' : 'Request New Token'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-[#64748B] hover:text-[#172033] cursor-pointer"
                >
                  {isAr ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* Secure Encrypted Session Footer */}
          <div className="pt-4 border-t border-[#DCE5F0] flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
            <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>
              {isAr
                ? 'جلسة مشفرة ومحمية بتقنية bcrypt'
                : 'bcrypt Encrypted & Protected Session'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
