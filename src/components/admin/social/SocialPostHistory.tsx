import React, { useState } from 'react';
import { MarketingPost, SocialPlatform } from '../../../types/socialMarketing';
import {
  getSavedMarketingPosts,
  deleteMarketingPost,
  persistMarketingPost,
  publishDirectViaBackend,
} from '../../../services/socialMarketingService';
import {
  Search,
  Trash2,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit2,
  Layers,
  AlertTriangle,
  RotateCw,
  Info,
  Check,
  X,
  Send,
} from 'lucide-react';
import { LazyImage } from '../../LazyImage';

interface SocialPostHistoryProps {
  onEditPost: (post: MarketingPost) => void;
  lang?: 'en' | 'ar';
}

export const SocialPostHistory: React.FC<SocialPostHistoryProps> = ({ onEditPost, lang = 'en' }) => {
  const isArabic = lang === 'ar';
  const [posts, setPosts] = useState<MarketingPost[]>(getSavedMarketingPosts());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'failed'>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [activeErrorModal, setActiveErrorModal] = useState<{ title: string; details: string; platform: string } | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(isArabic ? `حذف المنشور "${name}" من سجل النشر؟` : `Delete post for "${name}" from post history?`)) {
      await deleteMarketingPost(id);
      setPosts(getSavedMarketingPosts());
    }
  };

  const handleRetryPlatform = async (post: MarketingPost, platform: SocialPlatform) => {
    setRetryingId(`${post.id}-${platform}`);
    try {
      const res = await publishDirectViaBackend({
        postId: post.id,
        productId: post.productId,
        productName: post.productName,
        platforms: [platform],
        caption: post.captionEn || post.captionAr,
        fallbackImageUrl: post.productImage,
        productUrl: `https://onalaastore.com/?product=${encodeURIComponent(post.productId)}`,
      });

      const updatedResults = { ...(post.platformResults || {}), ...res.results };
      const hasAnySuccess = Object.values(updatedResults).some((r: any) => r.success);

      const updatedPost: MarketingPost = {
        ...post,
        platformResults: updatedResults,
        status: hasAnySuccess ? 'published' : 'draft',
        publishedAt: hasAnySuccess ? new Date().toISOString() : post.publishedAt,
      };

      await persistMarketingPost(updatedPost);
      setPosts(getSavedMarketingPosts());
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetryingId(null);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const hasFailures = Object.values(p.platformResults || {}).some((r: any) => !r.success);
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'failed'
        ? hasFailures
        : p.status === statusFilter;

    const matchSearch =
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.productBrand.toLowerCase().includes(search.toLowerCase()) ||
      (p.captionEn && p.captionEn.toLowerCase().includes(search.toLowerCase())) ||
      (p.captionAr && p.captionAr.includes(search));
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            placeholder={isArabic ? 'بحث في المنشورات والحملات...' : 'Search past posts, products, or captions...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-[#DCE5F0] rounded-2xl shadow-xs self-start sm:self-auto">
          {(['all', 'published', 'draft', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#007AFF]'
              }`}
            >
              {tab === 'all'
                ? isArabic ? 'الكل' : 'All'
                : tab === 'published'
                ? isArabic ? 'تم النشر' : 'Published'
                : tab === 'draft'
                ? isArabic ? 'مسودات' : 'Drafts'
                : isArabic ? 'بحاجة إعادة محاولة' : 'Failed / Retry'}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#DCE5F0] space-y-2">
          <p className="font-bold text-sm text-[#172033]">
            {isArabic ? 'لا توجد منشورات تطابق البحث' : 'No marketing posts match your filter.'}
          </p>
          <p className="text-xs text-[#64748B]">
            {isArabic
              ? 'قم بإنشاء ونشر منشور تسويقي جديد من تبويب "إنشاء ونشر منشور".'
              : 'Create a new campaign post using the "Create & Publish Post" studio.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-3xl border border-[#DCE5F0] overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="p-4 sm:p-5 space-y-3">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                      post.status === 'published'
                        ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        : 'bg-[#F5F8FC] text-[#64748B] border border-[#DCE5F0]'
                    }`}
                  >
                    {post.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{post.status}</span>
                  </span>

                  <span className="text-[10px] text-[#64748B] font-mono">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Product Info & Thumbnail */}
                <div className="flex items-start gap-3">
                  <LazyImage
                    src={post.productImage || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'}
                    alt={post.productName}
                    width={56}
                    height={56}
                    priority={false}
                    wrapperClassName="w-14 h-14 rounded-xl overflow-hidden border border-[#DCE5F0] bg-[#F5F8FC] flex-shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-[#172033] line-clamp-1">{post.productName}</h4>
                    <div className="text-[10px] text-[#007AFF] font-bold mt-0.5">
                      ${post.productPrice} USD
                      {post.originalPrice && post.originalPrice > post.productPrice && (
                        <span className="text-[#DC2626] ml-1">(-{post.discountPercentage}%)</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                      Ratio: {post.aspectRatio || '1:1'} • {post.templateStyle || 'modern_dark'}
                    </div>
                  </div>
                </div>

                {/* Caption Snippet */}
                <p className="text-[11px] text-[#475569] line-clamp-3 leading-relaxed bg-[#F8FAFC] p-2.5 rounded-xl border border-[#EDF2F7]">
                  {post.captionEn || post.captionAr}
                </p>

                {/* Platform Publishing Results Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
                    {isArabic ? 'حالة النشر لكل منصة:' : 'Platform Publishing Status:'}
                  </span>

                  <div className="space-y-1">
                    {(post.selectedPlatforms || []).map((plt) => {
                      const res = post.platformResults?.[plt];
                      const isRetrying = retryingId === `${post.id}-${plt}`;

                      if (!res) {
                        return (
                          <div
                            key={plt}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px]"
                          >
                            <span className="font-bold text-[#64748B] uppercase">{plt}</span>
                            <span className="text-[#64748B]">Pending / Draft</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={plt}
                          className={`flex items-center justify-between p-1.5 rounded-lg border text-[10px] ${
                            res.success
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50/70 border-rose-200 text-rose-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {res.success ? (
                              <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                            )}
                            <span className="font-black uppercase truncate">{plt}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {res.success && res.postUrl && (
                              <a
                                href={res.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-[#007AFF] hover:underline flex items-center gap-0.5 font-bold"
                              >
                                <span>{isArabic ? 'فتح البوست' : 'View'}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}

                            {!res.success && (
                              <>
                                <button
                                  onClick={() =>
                                    setActiveErrorModal({
                                      title: `Publish error on ${plt}`,
                                      details: res.errorDetails || res.message,
                                      platform: plt,
                                    })
                                  }
                                  className="text-[10px] text-rose-700 hover:underline flex items-center gap-0.5"
                                  title="View error details"
                                >
                                  <Info className="w-2.5 h-2.5" />
                                  <span>{isArabic ? 'التفاصيل' : 'Error'}</span>
                                </button>

                                <button
                                  onClick={() => handleRetryPlatform(post, plt)}
                                  disabled={isRetrying}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                                >
                                  <RotateCw className={`w-2.5 h-2.5 ${isRetrying ? 'animate-spin' : ''}`} />
                                  <span>{isRetrying ? '...' : (isArabic ? 'إعادة' : 'Retry')}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-[#F5F8FC] border-t border-[#DCE5F0] flex items-center justify-between text-xs">
                <button
                  onClick={() => onEditPost(post)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تعديل ونشر' : 'Load into Studio'}</span>
                </button>

                <button
                  onClick={() => handleDelete(post.id, post.productName)}
                  className="p-1.5 rounded-xl hover:bg-red-50 text-[#64748B] hover:text-[#DC2626] transition-colors"
                  title="Delete post from history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Details Modal */}
      {activeErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white border border-[#DCE5F0] rounded-3xl p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-black text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{activeErrorModal.title}</span>
              </div>
              <button
                onClick={() => setActiveErrorModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-mono break-words leading-relaxed max-h-48 overflow-y-auto">
              {activeErrorModal.details}
            </div>

            <div className="text-xs text-[#64748B] space-y-1">
              <p className="font-bold text-[#172033]">Common Fixes:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Check that the Page Access Token has not expired.</li>
                <li>Ensure permissions <code>pages_manage_posts</code> and <code>instagram_content_publish</code> are granted.</li>
                <li>Verify your Facebook Page is linked to your Instagram Professional Account.</li>
              </ul>
            </div>

            <div className="pt-2 border-t border-[#DCE5F0] flex justify-end">
              <button
                onClick={() => setActiveErrorModal(null)}
                className="px-4 py-2 rounded-xl bg-[#172033] text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
