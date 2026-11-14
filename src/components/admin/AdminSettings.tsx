import React, { useState, useRef, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { saveStoreSettings } from '../../services/storageService';
import { evaluatePasswordStrength } from '../../services/authService';
import { StoreOpeningSchedule, StoreSettings } from '../../types';
import { calculateScheduleDuration, checkStoreOpenStatus } from '../../utils/storeSchedule';
import { DEFAULT_STORE_PROFILE_PICTURE, resolveStoreLogoUrl } from '../../utils/storeSettingsHelpers';
import { optimizeUploadedImage } from '../../utils/imageCompression';
import { StoreLogo } from '../StoreLogo';
import {
  Settings,
  Truck,
  Phone,
  Clock,
  CheckCircle2,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  RefreshCw,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Building2,
  Sparkles,
  Save,
  Globe,
  Download,
} from 'lucide-react';

/**
 * Validates and sanitizes SVG text to prevent XSS and security vulnerabilities.
 */
function sanitizeSvg(svgContent: string): { safe: boolean; error?: string } {
  const forbiddenPatterns = [
    /<script\b/i,
    /<\/script>/i,
    /\bon\w+\s*=/i, // onload=, onerror=, etc.
    /javascript:/i,
    /data:\s*text\/html/i,
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<foreignObject\b/i,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(svgContent)) {
      return {
        safe: false,
        error: 'SVG contains prohibited scripts or active elements and was blocked for security.',
      };
    }
  }

  if (!/<svg\b[^>]*>/i.test(svgContent)) {
    return { safe: false, error: 'File does not contain a valid SVG root element.' };
  }

  return { safe: true };
}

export const AdminSettings: React.FC = () => {
  const { lang, storeSettings, refreshData } = useShop();
  const { user, changePassword, hasRole } = useAdmin();

  // Sub-tabs: 'branding' (Store Information & Branding), 'security' (Security -> Change Password), 'delivery' (Delivery Zones)
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'security' | 'delivery'>('branding');

  // ==================== STORE INFORMATION & BRANDING STATE ====================
  const [storeName, setStoreName] = useState(storeSettings.storeName || 'ON AlAA STORE');
  const [storeNameAr, setStoreNameAr] = useState(storeSettings.storeNameAr || 'ON AlAA STORE');
  const [tagline, setTagline] = useState(storeSettings.tagline || 'Your Home in Electronics 🏠');
  const [taglineAr, setTaglineAr] = useState(storeSettings.taglineAr || 'بيتك في عالم الإلكترونيات 🏠');

  // Logo upload & management (defaults to saved Full HD profile emblem)
  const [logoUrl, setLogoUrl] = useState<string>(() => resolveStoreLogoUrl(storeSettings.logoUrl));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [logoError, setLogoError] = useState<string>('');
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store Schedule & Opening Hours
  const initialSchedule: StoreOpeningSchedule = storeSettings.openingSchedule || {
    openTime: '10:00',
    closeTime: '01:00',
    daysOpenEn: 'Monday – Sunday',
    daysOpenAr: 'الإثنين – الأحد',
    displayHours: true,
    customMessageEn: 'OPEN EVERY DAY — 15 HOURS DAILY',
    customMessageAr: 'مفتوح يومياً — 15 ساعة يومياً',
    timezone: 'Asia/Beirut',
  };

  const [openTime, setOpenTime] = useState(initialSchedule.openTime || '10:00');
  const [closeTime, setCloseTime] = useState(initialSchedule.closeTime || '01:00');
  const [daysOpenEn, setDaysOpenEn] = useState(initialSchedule.daysOpenEn || 'Monday – Sunday');
  const [daysOpenAr, setDaysOpenAr] = useState(initialSchedule.daysOpenAr || 'الإثنين – الأحد');
  const [displayHours, setDisplayHours] = useState(initialSchedule.displayHours ?? true);
  const [customMessageEn, setCustomMessageEn] = useState(initialSchedule.customMessageEn || 'OPEN EVERY DAY (10:00 AM – 1:00 AM)');
  const [customMessageAr, setCustomMessageAr] = useState(initialSchedule.customMessageAr || 'مفتوح يومياً (10:00 ص – 1:00 ص)');
  const [timezone, setTimezone] = useState(initialSchedule.timezone || 'Asia/Beirut');

  // General Store Info State
  const [phone, setPhone] = useState(storeSettings.phone || '03 986 718');
  const [whatsapp, setWhatsapp] = useState(storeSettings.whatsapp || '9613986718');
  const [locationEn, setLocationEn] = useState(storeSettings.locationEn || '');
  const [locationAr, setLocationAr] = useState(storeSettings.locationAr || '');
  const [zones, setZones] = useState(storeSettings.deliveryZones || []);
  const [storeFeedback, setStoreFeedback] = useState('');

  // ==================== SECURITY STATE ====================
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');

  const strength = evaluatePasswordStrength(newPassword);

  // Live calculation of operating schedule
  const scheduleDuration = calculateScheduleDuration(openTime, closeTime);
  const liveStatus = checkStoreOpenStatus({
    openTime,
    closeTime,
    daysOpenEn,
    daysOpenAr,
    timezone,
  });

  // Handle Logo File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg)$/i)) {
      setLogoError(
        lang === 'ar'
          ? 'نوع الملف غير مدعوم. يرجى اختيار ملف PNG، JPG، WebP، أو SVG.'
          : 'Unsupported file format. Please upload a PNG, JPG/JPEG, WebP, or SVG image.'
      );
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setLogoError(
        lang === 'ar'
          ? 'حجم الملف يتجاوز الحد المسموح به (5 ميجابايت).'
          : 'File size exceeds maximum limit of 5MB.'
      );
      return;
    }

    setLogoFile(file);
    setUploadProgress(15);

    // If SVG, perform deep sanitization
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        const check = sanitizeSvg(text);
        if (!check.safe) {
          setLogoError(check.error || 'Invalid or unsafe SVG file.');
          setUploadProgress(null);
          return;
        }
        setUploadProgress(70);
        const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(text)}`;
        setLogoUrl(encoded);
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(null), 600);
      };
      reader.onerror = () => {
        setLogoError('Failed to read SVG file.');
        setUploadProgress(null);
      };
      reader.readAsText(file);
    } else {
      // Normal raster formats: PNG, JPG, WebP — automatically optimize to keep browser storage fast & quota-safe
      setUploadProgress(45);
      optimizeUploadedImage(file, {
        maxDimension: 512,
        maxDataUrlLength: 220_000,
        initialQuality: 0.88,
        preferPng: true,
      })
        .then((optimizedDataUrl) => {
          setLogoUrl(optimizedDataUrl);
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(null), 600);
        })
        .catch(() => {
          setLogoError(
            lang === 'ar' ? 'تعذر قراءة ملف الصورة.' : 'Failed to process image file.'
          );
          setUploadProgress(null);
        });
    }
  };

  const handleResetOfficialLogo = () => {
    setLogoUrl(DEFAULT_STORE_PROFILE_PICTURE);
    setLogoFile(null);
    setLogoError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpdateZoneFee = (zoneId: string, newFee: number) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, fee: Number(newFee) } : z))
    );
  };

  // Save Store Settings (Branding, Logo, Schedule & Info)
  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedEn = `${daysOpenEn.trim()}: ${liveStatus.formattedHoursEn.split(': ').slice(1).join(': ')}`;
    const formattedAr = `${daysOpenAr.trim()}: ${liveStatus.formattedHoursAr.split(': ').slice(1).join(': ')}`;

    const newOpeningSchedule: StoreOpeningSchedule = {
      openTime: openTime.trim(),
      closeTime: closeTime.trim(),
      daysOpenEn: daysOpenEn.trim(),
      daysOpenAr: daysOpenAr.trim(),
      displayHours,
      customMessageEn: customMessageEn.trim(),
      customMessageAr: customMessageAr.trim(),
      timezone,
    };

    const updated: StoreSettings = {
      ...storeSettings,
      storeName: storeName.trim() || 'ON AlAA STORE',
      storeNameAr: storeNameAr.trim() || 'ON AlAA STORE',
      tagline: tagline.trim() || 'Your Home in Electronics 🏠',
      taglineAr: taglineAr.trim() || 'بيتك في عالم الإلكترونيات 🏠',
      logoUrl: resolveStoreLogoUrl(logoUrl),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      locationEn: locationEn.trim(),
      locationAr: locationAr.trim(),
      openingHoursEn: formattedEn || 'Monday – Sunday: 10:00 AM – 1:00 AM',
      openingHoursAr: formattedAr || 'الإثنين – الأحد: 10:00 ص – 1:00 ص',
      openingSchedule: newOpeningSchedule,
      deliveryZones: zones,
    };

    const saveResult = saveStoreSettings(updated);
    refreshData();

    // Immediately update browser tab title
    document.title = `${updated.storeName} | ${updated.tagline}`;

    // Immediately synchronize favicon & apple-touch-icon with saved logo
    if (typeof document !== 'undefined' && updated.logoUrl) {
      const isDefaultOfficial = updated.logoUrl === DEFAULT_STORE_PROFILE_PICTURE;
      const faviconHref = isDefaultOfficial ? '/favicon.png' : updated.logoUrl;
      const appleHref = isDefaultOfficial ? '/apple-touch-icon.png' : updated.logoUrl;

      document.querySelectorAll("link[rel*='icon']").forEach((el) => {
        if (el instanceof HTMLLinkElement && el.rel !== 'apple-touch-icon' && el.getAttribute('href') !== '/favicon.ico') {
          if (!isDefaultOfficial || el.getAttribute('sizes') === '64x64' || !el.getAttribute('sizes')) {
            el.href = faviconHref;
          }
        }
      });

      const appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (appleIcon) {
        appleIcon.href = appleHref;
      }
    }

    if (!saveResult.ok) {
      setStoreFeedback(
        lang === 'ar'
          ? 'تم تطبيق الإعدادات للجلسة الحالية (مساحة التخزين المحلية ممتلئة).'
          : 'Settings applied for the current session (browser storage quota was full).'
      );
    } else if (saveResult.recovered) {
      setStoreFeedback(
        lang === 'ar'
          ? 'تم حفظ إعدادات المتجر بنجاح بعد تحسين مساحة التخزين!'
          : 'Store settings saved cleanly after freeing local storage space!'
      );
    } else {
      setStoreFeedback(
        lang === 'ar'
          ? 'تم حفظ إعدادات المتجر والهوية البصرية وساعات العمل بنجاح!'
          : 'Store information, branding, logo, and opening schedule saved successfully!'
      );
    }
    setTimeout(() => setStoreFeedback(''), 5000);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!currentPassword) {
      setSecurityError(
        lang === 'ar'
          ? 'يرجى إدخال كلمة المرور الحالية للتحقق من هويتك'
          : 'Please enter your current password to verify authorization.'
      );
      return;
    }

    if (!newPassword) {
      setSecurityError(
        lang === 'ar' ? 'يرجى إدخال كلمة المرور الجديدة' : 'Please enter your new password.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError(
        lang === 'ar'
          ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين'
          : 'The new password and confirmation do not match.'
      );
      return;
    }

    if (newPassword.length < 8) {
      setSecurityError(
        lang === 'ar'
          ? 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل'
          : 'New password must contain at least 8 characters.'
      );
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setSecuritySuccess(lang === 'ar' ? res.messageAr : res.messageEn);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSecurityError(lang === 'ar' ? res.messageAr : res.messageEn);
      }
    } catch {
      setSecurityError(
        lang === 'ar'
          ? 'حدث خطأ غير متوقع أثناء معالجة كلمة المرور.'
          : 'An unexpected error occurred while updating password.'
      );
    } finally {
      setSecurityLoading(false);
    }
  };

  const canManageSecurity = hasRole(['super_admin']);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-6 border-b border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
            <span>{lang === 'ar' ? 'الإعدادات' : 'Settings'}</span>
            <span>/</span>
            <span className="text-[#007AFF] font-bold">
              {activeSubTab === 'branding' &&
                (lang === 'ar' ? 'معلومات المتجر والهوية البصرية' : 'Store Information & Branding')}
              {activeSubTab === 'security' &&
                (lang === 'ar' ? 'الأمان → تغيير كلمة المرور' : 'Security → Change Password')}
              {activeSubTab === 'delivery' &&
                (lang === 'ar' ? 'رسوم التوصيل والمحافظات' : 'Lebanon Delivery Zones')}
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#007AFF]" />
            <span>{lang === 'ar' ? 'إعدادات المتجر والهوية المركزية' : 'Store Information & Branding Settings'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'إدارة شعار المحل، الاسم الرسمي، أوقات العمل اليومية (10:00 ص – 1:00 ص)، وكلمات المرور المشفرة.'
              : 'Upload and manage your store logo, official display name, daily opening schedule (10:00 AM – 1:00 AM), and security.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('branding')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'branding'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'معلومات المتجر والهوية' : 'Store & Branding'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'security'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الأمان وكلمة المرور' : 'Security & Password'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('delivery')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'delivery'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'رسوم التوصيل' : 'Delivery Zones'}</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: SETTINGS → STORE INFORMATION & BRANDING ===================== */}
      {activeSubTab === 'branding' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-8 max-w-4xl">
          {/* Dedicated Section Breadcrumb Banner */}
          <div className="p-4 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#007AFF] font-bold">
              <Building2 className="w-4 h-4" />
              <span>Settings → Store Information & Branding</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-bold text-[#007AFF] border border-[#BAE6FD]">
                {storeName} | {tagline}
              </span>
            </div>
          </div>

          {storeFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{storeFeedback}</span>
            </div>
          )}

          {/* 1. STORE LOGO MANAGEMENT AREA */}
          <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-[#DCE5F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#172033] text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'إدارة شعار المتجر وصورة الملف الشخصي (Store Logo Management)' : 'Store Logo Management'}</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {lang === 'ar'
                    ? 'الشعار وصورة الملف الشخصي الرسمية بدقة Full HD مطبقة على كافة أجزاء الموقع (الهيدر، الفوتر، لوحة التحكم، وأيقونة المتصفح).'
                    : 'Official Full HD website logo and profile picture applied across Website Header, Footer, Store Locator, Admin Portal, Social Previews, and Browser Favicon.'}
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#007AFF] bg-[#EAF3FF] px-2.5 py-1 rounded-full self-start sm:self-auto border border-[#BAE6FD]">
                {logoUrl === DEFAULT_STORE_PROFILE_PICTURE
                  ? (lang === 'ar' ? 'صورة الملف الشخصي الرسمية (Full HD)' : 'Official Full HD Profile Logo')
                  : (lang === 'ar' ? 'شعار مخصص' : 'Custom Uploaded Logo')}
              </span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            {/* Error Message */}
            {logoError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{logoError}</span>
              </div>
            )}

            {/* Upload Progress Bar */}
            {uploadProgress !== null && (
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0]">
                <div className="flex items-center justify-between text-xs font-semibold text-[#007AFF]">
                  <span>{lang === 'ar' ? 'جاري معالجة الشعار...' : 'Uploading & Processing Logo...'}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#DCE5F0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#007AFF] h-full transition-all duration-200 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* PREVIEW LOGO AREA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Official Full HD Profile Emblem & Desktop Header Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#172033]">
                  <span>{lang === 'ar' ? 'معاينة الشعار وصورة الملف الشخصي (Full HD)' : 'Website Logo & Profile Picture Preview'}</span>
                  <button
                    type="button"
                    onClick={() => setShowCheckerboard(!showCheckerboard)}
                    className="text-[10px] text-[#007AFF] hover:underline cursor-pointer"
                  >
                    {showCheckerboard ? 'Hide Grid' : 'Check Transparency Grid'}
                  </button>
                </div>
                <div
                  className={`p-6 rounded-2xl border border-[#DCE5F0] flex flex-col items-center justify-center min-h-[160px] transition-all relative overflow-hidden gap-3 ${
                    showCheckerboard
                      ? 'bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] bg-white'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-[#000000] p-[2px] border border-[#1E3A5F] ring-1 ring-[#007AFF]/35 shadow-[0_0_16px_rgba(0,122,255,0.28)] shrink-0 flex items-center justify-center">
                      <img
                        src={resolveStoreLogoUrl(logoUrl)}
                        alt={storeName}
                        className="w-full h-full rounded-full object-contain object-center"
                      />
                    </div>
                    <div>
                      <span className="font-black text-lg text-[#172033] tracking-tight block">
                        {storeName}
                      </span>
                      <span className="text-xs text-[#64748B] block">{tagline}</span>
                      <span className="text-[10px] text-[#007AFF] font-mono mt-1 block">
                        1254 × 1254 Full HD • Circular Profile Emblem
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Header & Live Navbar Preview */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#172033] block">
                  {lang === 'ar' ? 'معاينة الشعار في الهيدر والفوتر (Header & Mobile Preview)' : 'Header & Mobile Navigation Preview'}
                </span>
                <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex items-center justify-between max-w-sm mx-auto shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#000000] p-[1.5px] border border-[#1E3A5F] ring-1 ring-[#007AFF]/30 shadow-[0_0_10px_rgba(0,122,255,0.22)] shrink-0 flex items-center justify-center">
                      <img
                        src={resolveStoreLogoUrl(logoUrl)}
                        alt="Mobile Logo"
                        className="w-full h-full rounded-full object-contain object-center"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="font-black text-xs text-[#172033] block truncate">
                        {storeName}
                      </span>
                      <span className="text-[9px] text-[#64748B] block truncate">
                        {tagline}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#64748B] bg-white px-2 py-0.5 rounded-md border border-[#DCE5F0] shrink-0">
                    Header / Mobile
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed pt-1">
                  {lang === 'ar'
                    ? 'يتم تطبيق الصورة تلقائياً كصورة الملف الشخصي وشعار الموقع في الهيدر، الفوتر، لوحة التحكم، صفحة الدخول، وأيقونة المتصفح (Favicon).'
                    : 'Active across Website Header, Footer, Store Locator, Admin Dashboard, Login Page, Social Previews, and Browser Favicon.'}
                </p>
              </div>
            </div>

            {/* LOGO ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#DCE5F0]">
              <button
                type="button"
                onClick={handleTriggerUpload}
                className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-sm shadow-[#007AFF]/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{lang === 'ar' ? 'رفع / استبدال الشعار' : 'Upload / Replace Logo'}</span>
              </button>

              {logoUrl !== DEFAULT_STORE_PROFILE_PICTURE && (
                <button
                  type="button"
                  onClick={handleResetOfficialLogo}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#007AFF] border border-[#BAE6FD] font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'استعادة الشعار الرسمي' : 'Reset to Official Profile Emblem'}</span>
                </button>
              )}

              <a
                href={resolveStoreLogoUrl(logoUrl)}
                download="on-alaa-store-profile-fullhd.png"
                className="px-5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                title="Download Full HD Store Profile Picture (PNG)"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تحميل صورة الملف الشخصي (Full HD PNG)' : 'Download Full HD Profile (PNG)'}</span>
              </a>

              <span className="text-[11px] text-[#64748B] ml-auto">
                PNG, JPG, WebP, SVG • Max 5MB
              </span>
            </div>
          </div>

          {/* 2. OFFICIAL STORE NAME & DISPLAY BRANDING */}
          <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="border-b border-[#DCE5F0] pb-4">
              <h3 className="font-bold text-[#172033] text-base flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'اسم المتجر والشعار اللفظي (Store Name & Tagline)' : 'Store Name & Official Tagline'}</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {lang === 'ar'
                  ? 'الاسم الرسمي المعتمد: ON AlAA STORE | متجر إلكتروني - الشوف، التوصيل لجميع لبنان'
                  : 'Official Display Name: ON AlAA STORE | Online Store — Chouf, Delivery to All Lebanon'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Default Store Name (English)
                  <span className="text-[#007AFF] font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] font-bold focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  placeholder="ON AlAA STORE"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Default: ON AlAA STORE
                </span>
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  اسم المتجر (بالعربية)
                  <span className="text-[#007AFF] font-bold ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={storeNameAr}
                  onChange={(e) => setStoreNameAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] font-bold focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                  placeholder="ON AlAA STORE"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  الافتراضي: ON AlAA STORE
                </span>
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Default Tagline (English)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="Your Home in Electronics 🏠"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  الشعار اللفظي (بالعربية)
                </label>
                <input
                  type="text"
                  value={taglineAr}
                  onChange={(e) => setTaglineAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="بيتك في عالم الإلكترونيات 🏠"
                />
              </div>
            </div>
          </div>

          {/* 3. STORE OPENING HOURS & SCHEDULE CONFIGURATION */}
          <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-[#DCE5F0] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#172033] text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'ساعات العمل والجدول الزمني (Store Opening Hours)' : 'Store Opening Schedule (10:00 AM – 1:00 AM)'}</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {lang === 'ar'
                    ? 'جدول العمل: الإثنين – الأحد من 10:00 صباحاً حتى 1:00 فجراً (15 ساعة متواصلة يومياً مع دعم منتصف الليل).'
                    : 'Configured schedule: Monday – Sunday: 10:00 AM – 1:00 AM (15 continuous daily operating hours).'}
                </p>
              </div>

              {/* Live Badge */}
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 self-start sm:self-auto ${
                  liveStatus.isOpen
                    ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveStatus.isOpen ? 'bg-[#16A34A] animate-pulse' : 'bg-amber-600'
                  }`}
                />
                <span>{lang === 'ar' ? liveStatus.statusBadgeAr : liveStatus.statusBadgeEn}</span>
              </div>
            </div>

            {/* Duration calculation banner */}
            <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-[#172033] block">
                  {lang === 'ar' ? 'مدة العمل اليومية المحسوبة بدقة:' : 'Continuous Daily Operating Duration:'}
                </span>
                <span className="text-[#007AFF] font-extrabold text-sm">
                  {scheduleDuration.durationHours} {lang === 'ar' ? 'ساعة يومياً' : 'Hours Daily'}
                </span>
                {scheduleDuration.spansMidnight && (
                  <p className="text-[11px] text-[#64748B]">
                    {lang === 'ar'
                      ? '✓ يمتد بعد منتصف الليل (من 10:00 صباحاً حتى 1:00 فجر اليوم التالي). لا يتم اعتبار المتجر مغلقاً عند منتصف الليل.'
                      : '✓ Spans past midnight (10:00 AM to 1:00 AM following calendar day). Correctly handled.'}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#64748B] bg-white px-2.5 py-1 rounded-lg border border-[#DCE5F0]">
                Timezone: {timezone}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opening Time */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  {lang === 'ar' ? 'وقت الفتح (Opening Time)' : 'Opening Time (e.g. 10:00 = 10:00 AM)'}
                  <span className="text-[#007AFF] ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono font-bold focus:outline-none focus:border-[#007AFF]"
                  placeholder="10:00"
                />
              </div>

              {/* Closing Time */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  {lang === 'ar' ? 'وقت الإغلاق (Closing Time)' : 'Closing Time (e.g. 01:00 = 1:00 AM next day)'}
                  <span className="text-[#007AFF] ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] font-mono font-bold focus:outline-none focus:border-[#007AFF]"
                  placeholder="01:00"
                />
              </div>

              {/* Days Open (English) */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Days Open (English)
                </label>
                <input
                  type="text"
                  value={daysOpenEn}
                  onChange={(e) => setDaysOpenEn(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="Monday – Sunday"
                />
              </div>

              {/* Days Open (Arabic) */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  أيام العمل (بالعربية)
                </label>
                <input
                  type="text"
                  value={daysOpenAr}
                  onChange={(e) => setDaysOpenAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="الإثنين – الأحد"
                />
              </div>

              {/* Custom Opening Hours Message (English) */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Custom Opening Hours Message (English)
                </label>
                <input
                  type="text"
                  value={customMessageEn}
                  onChange={(e) => setCustomMessageEn(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="OPEN EVERY DAY (10:00 AM – 1:00 AM)"
                />
              </div>

              {/* Custom Opening Hours Message (Arabic) */}
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  رسالة ساعات العمل المخصصة (بالعربية)
                </label>
                <input
                  type="text"
                  value={customMessageAr}
                  onChange={(e) => setCustomMessageAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="مفتوح يومياً (10:00 ص – 1:00 ص)"
                />
              </div>
            </div>

            {/* Display toggle & Timezone selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#DCE5F0]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displayHours}
                  onChange={(e) => setDisplayHours(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007AFF] focus:ring-[#007AFF]"
                />
                <span className="text-xs font-bold text-[#172033]">
                  {lang === 'ar' ? 'عرض ساعات العمل في واجهة المتجر (Display Opening Hours)' : 'Display Opening Hours toggle'}
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#64748B] font-semibold">Store Timezone:</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="bg-white border border-[#DCE5F0] rounded-lg px-2.5 py-1 text-xs text-[#172033] font-semibold focus:outline-none focus:border-[#007AFF]"
                >
                  <option value="Asia/Beirut">Asia/Beirut (Lebanon Standard Time GMT+2/3)</option>
                  <option value="UTC">UTC / GMT</option>
                  <option value="Europe/Athens">Europe/Athens</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. CONTACT & PHYSICAL LOCATION */}
          <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h3 className="font-bold text-[#172033] text-sm pb-2 border-b border-[#DCE5F0] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'معلومات الاتصال والموقع الجغرافي' : 'Store Contact & Location'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Store Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono font-bold"
                  placeholder="03 986 718"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  WhatsApp Number (wa.me format)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono font-bold"
                  placeholder="9613986718"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Store Location (English)
                </label>
                <input
                  type="text"
                  value={locationEn}
                  onChange={(e) => setLocationEn(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="Online Store — Chouf, Delivery Available to All Lebanon"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  مقر المتجر (بالعربية)
                </label>
                <input
                  type="text"
                  value={locationAr}
                  onChange={(e) => setLocationAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  placeholder="متجر إلكتروني — الشوف، التوصيل متاح لجميع مناطق لبنان"
                />
              </div>
            </div>
          </div>

          {/* SAVE CHANGES BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'ar' ? 'حفظ كافة التغييرات' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ===================== TAB 2: SECURITY → CHANGE PASSWORD ===================== */}
      {activeSubTab === 'security' && (
        <div className="space-y-6 max-w-4xl">
          {/* Breadcrumb banner */}
          <div className="p-4 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#007AFF] font-bold">
              <Lock className="w-4 h-4" />
              <span>Settings → Security → Change Password</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-semibold text-[#007AFF] border border-[#BAE6FD]">
              SHA-256 Web Crypto
            </span>
          </div>

          {!canManageSecurity ? (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium space-y-2">
              <h4 className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                {lang === 'ar' ? 'صلاحية غير كافية' : 'Restricted Access'}
              </h4>
              <p>
                {lang === 'ar'
                  ? 'يتطلب تعديل كلمة مرور النظام رتبة المدير العام (Super Admin).'
                  : 'Only administrators with the Super Admin role are authorized to modify administrator security credentials.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-start justify-between border-b border-[#DCE5F0] pb-4">
                <div>
                  <h3 className="font-bold text-[#172033] text-base flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#007AFF]" />
                    <span>{lang === 'ar' ? 'تغيير كلمة مرور المدير' : 'Change Administrator Password'}</span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {lang === 'ar'
                      ? 'قم بتعيين كلمة مرور قوية جديدة. يتم تشفير كلمة المرور فوراً باستخدام خوارزمية SHA-256 مع ملح عشوائي.'
                      : 'Set a new strong password. Your password is immediately encrypted with salted SHA-256.'}
                  </p>
                </div>
              </div>

              {securitySuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              {securityError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{securityError}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-5 max-w-2xl">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                    {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-3 pr-10 rtl:pl-10 rtl:pr-3 py-2.5 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                      title={showCurrent ? 'Hide password' : 'Show password'}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                    {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-3 pr-10 rtl:pl-10 rtl:pr-3 py-2.5 text-xs text-[#172033] font-mono focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                      title={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#64748B] font-medium">
                          {lang === 'ar' ? 'مستوى قوة كلمة المرور:' : 'Password Strength:'}
                        </span>
                        <span
                          className="font-bold text-xs px-2 py-0.5 rounded-full"
                          style={{ color: strength.color, backgroundColor: `${strength.color}15` }}
                        >
                          {lang === 'ar' ? strength.labelAr : strength.labelEn}
                        </span>
                      </div>

                      <div className="w-full bg-[#DCE5F0] h-2 rounded-full overflow-hidden flex gap-1 p-0.5">
                        {[0, 1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-full flex-1 rounded-full transition-all duration-300 ${
                              strength.score > step ? '' : 'opacity-20'
                            }`}
                            style={{
                              backgroundColor: strength.score > step ? strength.color : '#94A3B8',
                            }}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 ${
                            strength.hasMinLength ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                          }`}
                        >
                          {strength.hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          <span>8+ {lang === 'ar' ? 'أحرف كحد أدنى' : 'characters minimum'}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            strength.hasUpper ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                          }`}
                        >
                          {strength.hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{lang === 'ar' ? 'حرف كبير (A-Z)' : 'Uppercase letter (A-Z)'}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            strength.hasLower ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                          }`}
                        >
                          {strength.hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{lang === 'ar' ? 'حرف صغير (a-z)' : 'Lowercase letter (a-z)'}</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            strength.hasNumber ? 'text-[#16A34A] font-semibold' : 'text-[#64748B]'
                          }`}
                        >
                          {strength.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{lang === 'ar' ? 'رقم على الأقل (0-9)' : 'Number (0-9)'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                    {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-[#FFFFFF] border rounded-xl pl-3 pr-10 rtl:pl-10 rtl:pr-3 py-2.5 text-xs text-[#172033] font-mono focus:outline-none transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/15'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-[#16A34A] focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/15'
                          : 'border-[#DCE5F0] focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15'
                      }`}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rtl:right-auto rtl:left-3 text-[#64748B] hover:text-[#007AFF] cursor-pointer"
                      title={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={securityLoading}
                    className="px-6 py-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-[#007AFF]/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {securityLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {securityLoading
                        ? (lang === 'ar' ? 'جاري التشفير والحفظ...' : 'Encrypting & Saving...')
                        : (lang === 'ar' ? 'حفظ كلمة المرور الجديدة' : 'Save New Password')}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: LEBANESE DELIVERY ZONES & FEES ===================== */}
      {activeSubTab === 'delivery' && (
        <form onSubmit={handleSaveStoreSettings} className="space-y-6 max-w-4xl">
          {storeFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{storeFeedback}</span>
            </div>
          )}

          <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-sm space-y-4">
            <h3 className="font-bold text-[#172033] text-sm pb-2 border-b border-[#DCE5F0] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'رسوم التوصيل للمناطق والمحافظات اللبنانية' : 'Lebanese Delivery Zones & Shipping Fees (USD)'}</span>
            </h3>

            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-3.5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-[#172033]">{zone.nameEn}</h4>
                    <p className="text-[11px] text-[#007AFF] font-medium">{zone.nameAr}</p>
                    <span className="text-[10px] text-[#64748B]">Estimated: {zone.estimatedDays}</span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[#64748B] font-semibold">Fee ($):</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={zone.fee}
                      onChange={(e) => handleUpdateZoneFee(zone.id, Number(e.target.value))}
                      className="w-20 bg-white border border-[#DCE5F0] rounded-lg px-2.5 py-1 text-xs text-[#172033] font-bold font-mono focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="px-8 py-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/20 cursor-pointer"
          >
            {lang === 'ar' ? 'حفظ رسوم التوصيل' : 'Save Delivery Fees'}
          </button>
        </form>
      )}
    </div>
  );
};
