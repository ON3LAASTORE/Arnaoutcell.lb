import React, { useState, useEffect } from 'react';
import { SocialAccountConfig, SocialPlatform } from '../../../types/socialMarketing';
import {
  fetchBackendSocialAccounts,
  saveBackendSocialAccount,
  verifyBackendSocialAccount,
  disconnectBackendSocialAccount,
} from '../../../services/socialMarketingService';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit2,
  ExternalLink,
  Save,
  X,
  Send,
  Eye,
  EyeOff,
  Zap,
  HelpCircle,
  RefreshCw,
  Trash2,
  KeyRound,
  Check,
} from 'lucide-react';

interface SocialAccountsManagerProps {
  lang?: 'en' | 'ar';
}

export const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({ lang = 'en' }) => {
  const isArabic = lang === 'ar';
  const [accounts, setAccounts] = useState<SocialAccountConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<SocialAccountConfig | null>(null);

  // Form Fields
  const [formHandle, setFormHandle] = useState('');
  const [formPageId, setFormPageId] = useState('');
  const [formPageAccessToken, setFormPageAccessToken] = useState('');
  const [formInstagramId, setFormInstagramId] = useState('');
  const [formTelegramBotToken, setFormTelegramBotToken] = useState('');
  const [formTelegramChannelId, setFormTelegramChannelId] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [directEnabled, setDirectEnabled] = useState(true);

  // Action status states
  const [testingStatus, setTestingStatus] = useState<string | null>(null);
  const [testingError, setTestingError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await fetchBackendSocialAccounts();
    setAccounts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openEdit = (acc: SocialAccountConfig) => {
    setEditingAccount(acc);
    setFormHandle(acc.accountHandle || '');
    setFormPageId((acc as any).pageId || acc.channelId || '');
    setFormPageAccessToken(acc.hasApiKey ? '••••••••••••••••' : '');
    setFormInstagramId((acc as any).instagramAccountId || '');
    setFormTelegramBotToken(acc.hasApiKey ? '••••••••••••••••' : '');
    setFormTelegramChannelId((acc as any).telegramChannelId || acc.channelId || '');
    setDirectEnabled(acc.directPublishEnabled);
    setShowKey(false);
    setTestingStatus(null);
    setTestingError(null);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const payload: any = {
      platform: editingAccount.platform,
      displayName: editingAccount.displayName,
      accountHandle: formHandle.trim(),
      directPublishEnabled: directEnabled,
    };

    if (editingAccount.platform === 'facebook') {
      payload.pageId = formPageId.trim();
      if (formPageAccessToken && !formPageAccessToken.includes('••••')) {
        payload.pageAccessToken = formPageAccessToken.trim();
      }
    } else if (editingAccount.platform === 'instagram') {
      payload.instagramAccountId = formInstagramId.trim();
      if (formPageAccessToken && !formPageAccessToken.includes('••••')) {
        payload.pageAccessToken = formPageAccessToken.trim();
      }
    } else if (editingAccount.platform === 'telegram') {
      payload.telegramChannelId = formTelegramChannelId.trim();
      if (formTelegramBotToken && !formTelegramBotToken.includes('••••')) {
        payload.telegramBotToken = formTelegramBotToken.trim();
      }
    }

    const res = await saveBackendSocialAccount(payload);
    if (res.success) {
      setFeedback(
        isArabic
          ? `تم حفظ وتشفير بيانات اعتماد ${editingAccount.displayName} بنجاح.`
          : `Successfully saved secure credentials for ${editingAccount.displayName}.`
      );
      await loadAccounts();
      setEditingAccount(null);
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setTestingError(res.error || 'Failed to save account credentials');
    }
  };

  const handleTestConnection = async () => {
    if (!editingAccount) return;
    setTestingStatus(isArabic ? 'جاري فحص الاتصال وتصاريح النشر...' : 'Testing live credentials & Meta Graph API permissions...');
    setTestingError(null);

    const res = await verifyBackendSocialAccount(editingAccount.platform);
    if (res.success) {
      setTestingStatus(
        isArabic
          ? `✅ تم التحقق بنجاح! ${res.message || 'الاتصال جاهز للنشر الفوري.'}`
          : `✅ Verified successfully! ${res.message || 'Direct publishing is ready.'}`
      );
      await loadAccounts();
    } else {
      setTestingStatus(null);
      setTestingError(res.error || 'Connection verification failed');
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    if (window.confirm(isArabic ? 'هل أنت متأكد من فصل هذا الحساب وإزالة مفاتيح النشر؟' : 'Disconnect this channel and clear stored tokens?')) {
      await disconnectBackendSocialAccount(platform);
      await loadAccounts();
      setEditingAccount(null);
    }
  };

  const getPlatformIconColor = (p: SocialPlatform) => {
    switch (p) {
      case 'whatsapp':
      case 'whatsapp_status':
        return 'bg-[#25D366] text-white';
      case 'telegram':
        return 'bg-[#2AABEE] text-white';
      case 'facebook':
        return 'bg-[#1877F2] text-white';
      case 'instagram':
        return 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white';
      case 'x':
        return 'bg-black text-white';
      case 'tiktok':
        return 'bg-slate-900 text-white';
      default:
        return 'bg-[#007AFF] text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#007AFF]" />
            <h2 className="text-base sm:text-lg font-black text-[#172033]">
              {isArabic ? 'ربط الحسابات وتصاريح Meta Graph API' : 'Social Media Accounts & Meta Graph API'}
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            {isArabic
              ? 'إدارة حسابات المتجر الرسمية على Facebook Pages و Instagram Business و Telegram. يتم تخزين المفاتيح والتصاريح على الخادم حصراً دون تعريضها للواجهة الأمامية.'
              : 'Directly publish products to authorized Facebook Pages, Instagram Professional accounts, and Telegram. API credentials and access tokens are stored securely on the backend.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#EAF3FF] hover:bg-[#DCE5F0] text-[#007AFF] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isArabic ? 'دليل إعداد Meta API' : 'Meta API Setup Guide'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>{isArabic ? 'تشفير تام' : 'Backend Protected'}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id || acc.platform}
            className="rounded-3xl border border-[#DCE5F0] bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${getPlatformIconColor(
                      acc.platform
                    )}`}
                  >
                    {acc.platform === 'whatsapp' || acc.platform === 'whatsapp_status'
                      ? 'WA'
                      : acc.platform === 'telegram'
                      ? 'TG'
                      : acc.platform === 'instagram'
                      ? 'IG'
                      : acc.platform === 'facebook'
                      ? 'FB'
                      : acc.platform === 'x'
                      ? 'X'
                      : 'TT'}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[#172033] line-clamp-1">{acc.displayName}</h3>
                    <div className="text-[10px] text-[#64748B] font-mono">
                      {acc.accountHandle || (acc.isConnected ? 'Connected' : 'Not Connected')}
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                    acc.isConnected
                      ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{acc.isConnected ? (isArabic ? 'متصل' : 'Connected') : (isArabic ? 'غير متصل' : 'Setup')}</span>
                </span>
              </div>

              <p className="text-[11px] text-[#64748B] leading-relaxed line-clamp-2">
                {isArabic ? acc.instructionsAr : acc.instructionsEn}
              </p>

              {acc.platform === 'facebook' && (
                <div className="text-[10px] bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Page ID:</span>
                    <span className="font-mono font-bold text-[#172033]">{(acc as any).pageId || 'Configured via .env'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Meta Graph API:</span>
                    <span className="font-bold text-emerald-600">v21.0 Active</span>
                  </div>
                </div>
              )}

              {acc.platform === 'instagram' && (
                <div className="text-[10px] bg-purple-50/60 border border-purple-200/70 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Account:</span>
                    <a
                      href="https://www.instagram.com/m.arnaoutcell/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-purple-700 hover:underline flex items-center gap-1"
                    >
                      <span>@m.arnaoutcell</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>IG Account ID:</span>
                    <span className="font-mono font-bold text-[#172033]">{(acc as any).instagramAccountId || 'Configured via backend'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#64748B]">
                    <span>Official API:</span>
                    <span className="font-bold text-[#007AFF]">Meta Container Flow v21.0</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#DCE5F0] flex items-center justify-between text-xs">
              <span className="text-[10px] text-[#64748B] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#007AFF]" />
                {acc.directPublishSupported ? 'Direct Official API' : '1-Click Intent'}
              </span>

              <button
                onClick={() => openEdit(acc)}
                className="px-3 py-1.5 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isArabic ? 'إعداد الحساب' : 'Configure'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Configuration Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${getPlatformIconColor(
                    editingAccount.platform
                  )}`}
                >
                  {editingAccount.platform.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#172033]">{editingAccount.displayName}</h3>
                  <span className="text-[11px] text-[#007AFF] font-medium">
                    {editingAccount.directPublishSupported ? 'Official Direct Publishing API' : 'Web Intent Publishing'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingAccount(null)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F5F8FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  {isArabic ? 'اسم أو معرّف الحساب (Handle / Username):' : 'Account Handle / Public Username:'}
                </label>
                <input
                  type="text"
                  placeholder="@arnaoutstore or ARNAOUT STORE Saida"
                  value={formHandle}
                  onChange={(e) => setFormHandle(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              {/* Facebook Page Specific Fields */}
              {editingAccount.platform === 'facebook' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-1">
                      {isArabic ? 'معرّف صفحة فيسبوك (Facebook Page ID):' : 'Facebook Page ID:'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 102938475610293"
                      value={formPageId}
                      onChange={(e) => setFormPageId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Found in your Facebook Page About section or Meta Business Suite.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#172033] flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>{isArabic ? 'رمز وصول الصفحة (Page Access Token):' : 'Page Access Token:'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-1"
                      >
                        {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showKey ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="EAABwz..."
                      value={formPageAccessToken}
                      onChange={(e) => setFormPageAccessToken(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Requires <code className="font-mono text-[#007AFF]">pages_manage_posts</code> and <code className="font-mono text-[#007AFF]">pages_read_engagement</code> permissions.
                    </p>
                  </div>
                </>
              )}

              {/* Instagram Professional Specific Fields */}
              {editingAccount.platform === 'instagram' && (
                <>
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-xs space-y-1">
                    <div className="font-bold text-purple-900 flex items-center justify-between">
                      <span>{isArabic ? 'الحساب المستهدف المعتمد:' : 'Official Connected Target Account:'}</span>
                      <a
                        href="https://www.instagram.com/m.arnaoutcell/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>@m.arnaoutcell</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[11px] text-purple-800">
                      {isArabic
                        ? 'مخصص حصرياً للنشر المباشر على صفحة https://www.instagram.com/m.arnaoutcell/'
                        : 'Configured exclusively for direct publishing to https://www.instagram.com/m.arnaoutcell/'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-1">
                      {isArabic ? 'معرّف حساب إنستغرام للأعمال (Instagram Business Account ID):' : 'Instagram Business Account ID:'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 17841400000000000"
                      value={formInstagramId}
                      onChange={(e) => setFormInstagramId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">
                      {isArabic
                        ? 'يتم الحصول عليه عبر استعلام Meta Graph API: /{page-id}?fields=instagram_business_account'
                        : 'Obtained via Meta Graph API from the Facebook Page linked to @m.arnaoutcell (GET /{page-id}?fields=instagram_business_account).'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#172033]">
                        {isArabic ? 'رمز وصول إنستغرام (Meta Page Access Token):' : 'Meta Page Access Token (with Instagram Scopes):'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-1"
                      >
                        {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showKey ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="EAABwz..."
                      value={formPageAccessToken}
                      onChange={(e) => setFormPageAccessToken(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <p className="text-[10px] text-[#64748B] mt-1">
                      Requires <code className="font-mono text-[#007AFF]">instagram_content_publish</code> and <code className="font-mono text-[#007AFF]">instagram_basic</code> permissions. Stored securely on backend.
                    </p>
                  </div>
                </>
              )}

              {/* Telegram Specific Fields */}
              {editingAccount.platform === 'telegram' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-1">
                      {isArabic ? 'معرّف القناة أو المجموعة (Telegram Channel ID):' : 'Telegram Channel ID / Username:'}
                    </label>
                    <input
                      type="text"
                      placeholder="@arnaoutstore_lb or -100123456789"
                      value={formTelegramChannelId}
                      onChange={(e) => setFormTelegramChannelId(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#172033] block mb-1">
                      {isArabic ? 'رمز بوت تيليجرام (Bot Token from @BotFather):' : 'Telegram Bot Token:'}
                    </label>
                    <input
                      type="password"
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={formTelegramBotToken}
                      onChange={(e) => setFormTelegramBotToken(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                </>
              )}

              {/* Direct Publishing Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE5F0]">
                <div>
                  <span className="text-xs font-bold text-[#172033] block">
                    {isArabic ? 'تفعيل النشر التلقائي المباشر' : 'Enable Direct API Publishing'}
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    {isArabic ? 'يسمح بنشر المنتجات بنقرة واحدة بدون تحميل يدوي' : 'Enables 1-click publishing without manual file transfers'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={directEnabled}
                  onChange={(e) => setDirectEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#007AFF] cursor-pointer"
                />
              </div>

              {/* Testing Status & Live Results */}
              {testingStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  {testingStatus}
                </div>
              )}
              {testingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span>{testingError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#DCE5F0] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'فحص الاتصال والتصاريح' : 'Test & Verify API'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {editingAccount.isConnected && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(editingAccount.platform)}
                      className="px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'فصل الحساب' : 'Disconnect'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#007AFF]/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'حفظ الإعدادات' : 'Save Credentials'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meta API Setup Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#007AFF]" />
                <h3 className="font-black text-sm sm:text-base text-[#172033]">
                  {isArabic ? 'دليل إعداد Meta Graph API للنشر الفوري' : 'Meta Graph API Setup Guide (Facebook & Instagram)'}
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#172033] hover:bg-[#F5F8FC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#172033] leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <div className="p-3.5 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] space-y-1.5">
                <span className="font-bold text-[#007AFF] block">
                  {isArabic ? 'المتطلبات الأساسية للنشر الرسمي:' : 'Required Meta API Permissions:'}
                </span>
                <ul className="list-disc list-inside space-y-1 text-[#64748B]">
                  <li><code className="font-mono text-[#007AFF]">pages_manage_posts</code>: Allows direct photo and feed publishing to your Facebook Page.</li>
                  <li><code className="font-mono text-[#007AFF]">pages_read_engagement</code>: Verifies Page identity and publication engagement.</li>
                  <li><code className="font-mono text-[#007AFF]">instagram_basic</code>: Accesses the connected Instagram Professional Account ID.</li>
                  <li><code className="font-mono text-[#007AFF]">instagram_content_publish</code>: Allows creating media containers and publishing feed photos to Instagram.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B]">
                  {isArabic ? 'خطوات الإعداد على developers.facebook.com:' : 'Step-by-Step Setup Instructions:'}
                </h4>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Create a Meta Developer App</strong>: Sign in to <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-[#007AFF] underline">developers.facebook.com</a> and click <em>Create App</em> (Select "Business" or "Other").
                  </li>
                  <li>
                    <strong>Add Permissions</strong>: In Graph API Explorer, select your App, then request the 4 permissions above (<code className="font-mono">pages_manage_posts</code>, <code className="font-mono">instagram_content_publish</code>, etc.).
                  </li>
                  <li>
                    <strong>Generate Page Access Token</strong>: Click <em>Generate Access Token</em>, grant authorization to your Facebook Page, and copy the Page Token.
                  </li>
                  <li>
                    <strong>Instagram Professional Account</strong>: In your Facebook Page settings, link your Instagram Business Account under <em>Linked Accounts</em>.
                  </li>
                  <li>
                    <strong>Save & Test</strong>: Paste your Page ID and Page Access Token into this dashboard and click <em>Test & Verify API</em>!
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DCE5F0] flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold hover:bg-[#0066D6] cursor-pointer"
              >
                {isArabic ? 'فهمت، إغلاق الدليل' : 'Got it, Close Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
