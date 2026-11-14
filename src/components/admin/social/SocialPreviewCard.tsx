import React from 'react';
import { useShop } from '../../../context/ShopContext';
import { Product, StoreSettings } from '../../../types';
import { SocialPlatform, MarketingPost } from '../../../types/socialMarketing';
import { resolveStoreLogoUrl } from '../../../utils/storeSettingsHelpers';
import {
  MessageSquare,
  Instagram,
  Facebook,
  Send,
  Twitter,
  Music2,
  CheckCircle2,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
} from 'lucide-react';

interface SocialPreviewCardProps {
  platform: SocialPlatform;
  post?: Partial<MarketingPost>;
  product?: Product;
  previewImageUrl?: string;
  imageDataUrl?: string;
  settings?: StoreSettings;
  caption?: string;
  activeLang?: 'en' | 'ar' | 'bilingual';
}

export const SocialPreviewCard: React.FC<SocialPreviewCardProps> = ({
  platform,
  post = {},
  product,
  previewImageUrl,
  imageDataUrl,
  settings,
  caption: customCaption,
  activeLang = 'bilingual',
}) => {
  const { storeSettings } = useShop();
  const effectiveSettings = settings || storeSettings;
  const storeName = effectiveSettings.storeName || 'ON AlAA STORE';
  const storeLogoUrl = resolveStoreLogoUrl(effectiveSettings.logoUrl);
  const caption = customCaption || (activeLang === 'ar' ? post.captionAr : post.captionEn) || '';
  const image =
    imageDataUrl ||
    previewImageUrl ||
    post.productImage ||
    product?.images?.[0] ||
    'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800';

  if (platform === 'whatsapp') {
    return (
      <div className="bg-[#EFEAE2] rounded-3xl p-4 sm:p-5 border border-[#DCE5F0] shadow-md max-w-md mx-auto text-xs font-sans">
        {/* WhatsApp Chat Header */}
        <div className="bg-[#005E54] text-white p-3 rounded-2xl flex items-center justify-between mb-4 shadow-xs">
          <div className="flex items-center gap-2.5">
              <img
                src={storeLogoUrl}
                alt={storeName}
                className="w-8 h-8 rounded-full object-cover border border-white/25 bg-[#050811] shrink-0"
              />
              <div>
                <div className="font-bold flex items-center gap-1">
                  <span>{storeName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                </div>
                <div className="text-[10px] text-emerald-100">online • Chouf • Delivery to All Lebanon</div>
              </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-emerald-200" />
        </div>

        {/* Message Bubble */}
        <div className="bg-[#FFFFFF] rounded-2xl rounded-tl-xs p-3 shadow-sm border border-emerald-100/60 max-w-[92%] space-y-2.5">
          {image && (
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <img src={image} alt="WhatsApp preview" className="w-full h-48 object-cover" />
            </div>
          )}

          <div className="text-[#111B21] whitespace-pre-wrap text-[11px] leading-relaxed">
            {caption || '🔥 Product promotion message...'}
          </div>

          <div className="flex items-center justify-end gap-1 text-[9px] text-[#667781] pt-1">
            <span>Just now</span>
            <span className="text-[#53BDEB]">✓✓</span>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'whatsapp_status') {
    return (
      <div className="bg-[#0B141A] text-white rounded-3xl p-4 border border-slate-800 shadow-2xl max-w-xs mx-auto aspect-[9/16] flex flex-col justify-between relative overflow-hidden">
        {/* Story Progress Bar */}
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-3">
          <div className="w-2/3 h-full bg-white rounded-full" />
        </div>

        {/* Story Header */}
        <div className="flex items-center gap-2.5 z-10">
          <img
            src={storeLogoUrl}
            alt={storeName}
            className="w-8 h-8 rounded-full object-cover bg-[#050811] border border-white/30 shrink-0"
          />
          <div>
            <div className="font-bold text-xs">{storeName} Status</div>
            <div className="text-[10px] text-slate-400">Just now</div>
          </div>
        </div>

        {/* Story Main Image */}
        <div className="flex-1 my-3 rounded-2xl overflow-hidden relative flex items-center justify-center bg-black/40">
          {image && (
            <img src={image} alt="Status graphic" className="w-full h-full object-contain" />
          )}
        </div>

        {/* Status Bottom Reply Bar */}
        <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 flex items-center justify-between text-xs text-slate-300">
          <span>Reply to order via WhatsApp...</span>
          <Heart className="w-4 h-4 text-red-500" />
        </div>
      </div>
    );
  }

  if (platform === 'instagram') {
    return (
      <div className="bg-white rounded-3xl border border-[#DCE5F0] shadow-md max-w-md mx-auto overflow-hidden text-xs">
        {/* Instagram Post Header */}
        <div className="p-3.5 flex items-center justify-between border-b border-slate-100 bg-[#FBFDFF]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shrink-0">
              <img
                src={storeLogoUrl}
                alt={storeName}
                className="w-full h-full rounded-full object-cover bg-[#050811]"
              />
            </div>
            <div>
              <a
                href="https://www.instagram.com/onalaastore.lb/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#172033] flex items-center gap-1 hover:text-purple-600 transition-colors"
              >
                <span>onalaastore.lb</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF] fill-[#007AFF]" />
              </a>
              <div className="text-[10px] text-[#64748B]">ON AlAA STORE • Chouf • All Lebanon</div>
            </div>
          </div>
          <a
            href="https://www.instagram.com/onalaastore.lb/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full border border-purple-200 transition-colors"
          >
            Visit Profile
          </a>
        </div>

        {/* Post Image */}
        <div className="w-full aspect-square bg-[#0F172A] relative overflow-hidden flex items-center justify-center">
          {image && (
            <img src={image} alt="Instagram post" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-[#172033]">
              <Heart className="w-5 h-5 cursor-pointer hover:text-red-500 transition-colors" />
              <MessageCircle className="w-5 h-5 cursor-pointer hover:text-[#007AFF] transition-colors" />
              <Send className="w-5 h-5 cursor-pointer hover:text-[#007AFF] transition-colors" />
            </div>
            <Bookmark className="w-5 h-5 text-[#172033] cursor-pointer" />
          </div>

          <div className="font-bold text-[#172033] text-[11px]">3,180 likes</div>

          <div className="text-[#172033] text-[11px] leading-relaxed">
            <a
              href="https://www.instagram.com/onalaastore.lb/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold mr-1.5 hover:underline text-[#172033]"
            >
              onalaastore.lb
            </a>
            <span className="whitespace-pre-wrap">{caption || 'New arrival showcase at ON AlAA STORE!'}</span>
          </div>

          <div className="text-[10px] text-[#64748B] uppercase">View all comments • Just now</div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-[#64748B]">
            <span className="font-mono">Target: instagram.com/onalaastore.lb</span>
            <span className="text-purple-600 font-bold">Meta Graph API v21.0</span>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'facebook') {
    return (
      <div className="bg-white rounded-3xl border border-[#DCE5F0] shadow-md max-w-md mx-auto p-4 space-y-3 text-xs">
        {/* Facebook Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={storeLogoUrl}
              alt={storeName}
              className="w-9 h-9 rounded-full object-cover bg-[#050811] border border-slate-200 shrink-0"
            />
            <div>
              <div className="font-bold text-[#172033] flex items-center gap-1">
                <span>{storeName}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2]" />
              </div>
              <div className="text-[10px] text-[#64748B]">Just now • 🌍 Public • Chouf • All Lebanon</div>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-[#64748B]" />
        </div>

        {/* Text */}
        <div className="text-[#172033] text-[11px] whitespace-pre-wrap leading-relaxed">
          {caption || 'Latest flagship electronics available at official distributor prices.'}
        </div>

        {/* Creative Image */}
        {image && (
          <div className="rounded-2xl overflow-hidden border border-[#DCE5F0]">
            <img src={image} alt="Facebook post" className="w-full h-56 object-cover" />
          </div>
        )}

        {/* Post Link / WhatsApp Bar */}
        <div className="bg-[#F5F8FC] p-3 rounded-xl border border-[#DCE5F0] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#64748B] uppercase font-mono">ONALAASTORE.COM</div>
            <div className="font-bold text-[#172033] line-clamp-1">{post.productName}</div>
          </div>
          <button className="px-3 py-1.5 rounded-lg bg-[#1877F2] text-white font-bold text-[11px]">
            Send Message
          </button>
        </div>

        {/* Engagement Row */}
        <div className="pt-2 border-t border-[#DCE5F0] flex items-center justify-around text-[#64748B] font-semibold text-[11px]">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#1877F2]">
            <ThumbsUp className="w-4 h-4" />
            <span>Like</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#1877F2]">
            <MessageCircle className="w-4 h-4" />
            <span>Comment</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#1877F2]">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </div>
        </div>
      </div>
    );
  }

  if (platform === 'telegram') {
    return (
      <div className="bg-[#17212B] text-white rounded-3xl p-4 sm:p-5 border border-slate-700 shadow-md max-w-md mx-auto text-xs space-y-3 font-sans">
        {/* Telegram Header */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-700/60">
          <img
            src={storeLogoUrl}
            alt={storeName}
            className="w-8 h-8 rounded-full object-cover bg-[#050811] border border-sky-400/40 shrink-0"
          />
          <div>
            <div className="font-bold flex items-center gap-1">
              <span>ON AlAA STORE 🇱🇧</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#2AABEE]/20 text-[#2AABEE]">Channel</span>
            </div>
            <div className="text-[10px] text-slate-400">14,200 subscribers</div>
          </div>
        </div>

        {/* Message Container */}
        <div className="bg-[#242F3D] rounded-2xl p-3.5 space-y-3 border border-slate-700/40">
          {image && (
            <div className="rounded-xl overflow-hidden border border-slate-700">
              <img src={image} alt="Telegram preview" className="w-full h-48 object-cover" />
            </div>
          )}

          <div className="text-slate-100 whitespace-pre-wrap text-[11px] leading-relaxed">
            {caption || '💎 ON AlAA STORE Tech Drop...'}
          </div>

          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
            <span>👁 1,489 views</span>
            <span>14:25</span>
          </div>
        </div>

        {/* Inline Order Button */}
        <button className="w-full py-2 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
          <Send className="w-3.5 h-3.5" />
          <span>Order via WhatsApp (03 986 718)</span>
        </button>
      </div>
    );
  }

  if (platform === 'x') {
    return (
      <div className="bg-white rounded-3xl border border-[#DCE5F0] shadow-md max-w-md mx-auto p-4 sm:p-5 space-y-3 text-xs">
        <div className="flex items-start gap-3">
          <img
            src={storeLogoUrl}
            alt={storeName}
            className="w-10 h-10 rounded-full object-cover bg-[#050811] border border-slate-200 shrink-0"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-black text-[#172033]">{storeName}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#007AFF] fill-[#007AFF]" />
                <span className="text-[#64748B]">@OnAlaaStore</span>
                <span className="text-[#64748B]">· 12m</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#64748B]" />
            </div>

            <div className="text-[#172033] text-[11px] whitespace-pre-wrap leading-relaxed">
              {caption || 'Order online from Chouf with express delivery across all Lebanon!'}
            </div>

            {image && (
              <div className="rounded-2xl overflow-hidden border border-[#DCE5F0]">
                <img src={image} alt="Tweet media" className="w-full h-48 object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between text-[#64748B] pt-2 max-w-xs text-[11px]">
              <span className="hover:text-[#007AFF] cursor-pointer">💬 14</span>
              <span className="hover:text-emerald-500 cursor-pointer">🔄 38</span>
              <span className="hover:text-red-500 cursor-pointer">❤️ 192</span>
              <span className="hover:text-[#007AFF] cursor-pointer">📊 3.4K</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TikTok / Fallback
  return (
    <div className="bg-black text-white rounded-3xl p-4 border border-slate-800 shadow-md max-w-xs mx-auto aspect-[9/16] flex flex-col justify-between relative overflow-hidden">
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-[#007AFF]" />
          <span className="text-[11px] font-bold">Trending Tech Sound</span>
        </div>
        <Share2 className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 my-3 rounded-2xl overflow-hidden flex items-center justify-center bg-zinc-900">
        {image && <img src={image} alt="TikTok photo" className="w-full h-full object-contain" />}
      </div>

      <div className="space-y-1.5 z-10 text-xs">
        <div className="font-bold text-[#007AFF]">@onalaastore.lb</div>
        <p className="text-[11px] text-slate-200 line-clamp-3">
          {caption || 'Latest gadget unboxing — Delivery to all Lebanon!'}
        </p>
      </div>
    </div>
  );
};
