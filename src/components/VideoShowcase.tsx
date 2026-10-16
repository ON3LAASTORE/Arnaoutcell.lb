import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { MarketingVideo } from '../types';
import { Play, Video, ShoppingCart, X, Eye } from 'lucide-react';

export const VideoShowcase: React.FC = () => {
  const { lang, marketingVideos, products, viewProductDetail } = useShop();
  const [activeVideo, setActiveVideo] = useState<MarketingVideo | null>(null);

  const publishedVideos = marketingVideos.filter((v) => v.isPublished);

  if (publishedVideos.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#DCE5F0] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
              <Video className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'معاينات مرئية حية' : 'PRODUCT VIDEO REVIEWS'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight">
              {lang === 'ar' ? 'فيديوهات وتجارب المنتجات' : 'Watch & Shop Video Demos'}
            </h2>
            <p className="text-[#64748B] text-sm sm:text-base mt-1">
              {lang === 'ar'
                ? 'شاهد اختبارات الأداء المباشرة والمواصفات الواقعية للأجهزة المتوفرة في فرع صيدا.'
                : 'Experience hands-on demos, real testing, and live unboxings from our Saida showroom.'}
            </p>
          </div>
        </div>

        {/* Video Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {publishedVideos.map((video) => {
            const linkedProduct = products.find((p) => video.linkedProductIds.includes(p.id));

            return (
              <div
                key={video.id}
                className="group rounded-2xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] overflow-hidden shadow-xs hover:shadow-[0_8px_24px_-4px_rgba(0,122,255,0.12)] transition-all flex flex-col justify-between"
              >
                {/* Thumbnail with Play Trigger */}
                <div
                  onClick={() => setActiveVideo(video)}
                  className="relative h-56 bg-slate-900 cursor-pointer overflow-hidden group"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#007AFF] group-hover:bg-[#0066D6] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Views count */}
                  {video.views && (
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1 border border-white/10">
                      <Eye className="w-3.5 h-3.5 text-blue-300" />
                      <span>{video.views.toLocaleString()} {lang === 'ar' ? 'مشاهدة' : 'views'}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#172033] text-base group-hover:text-[#007AFF] transition-colors line-clamp-2">
                      {lang === 'ar' ? video.titleAr || video.title : video.title}
                    </h3>
                    <p className="text-xs text-[#64748B] line-clamp-2 mt-1.5 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  {/* Tagged Product Box */}
                  <div className="mt-4 pt-3 border-t border-[#DCE5F0]">
                    {linkedProduct ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={linkedProduct.images[0]}
                            alt={linkedProduct.name}
                            className="w-10 h-10 object-cover rounded-lg bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-[10px] text-[#64748B] block font-semibold">{linkedProduct.brand}</span>
                            <span className="text-xs font-bold text-[#172033] truncate block">
                              ${linkedProduct.price}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => viewProductDetail(linkedProduct.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'شراء المنتج' : 'Shop Product'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveVideo(video)}
                        className="w-full py-2 rounded-lg bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#172033] text-xs font-semibold flex items-center justify-center gap-2 border border-[#DCE5F0] cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>{lang === 'ar' ? 'تشغيل الفيديو' : 'Watch Video'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Playback Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white border border-[#DCE5F0] rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5F0] bg-[#F5F8FC]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
                <Video className="w-4 h-4 text-[#007AFF]" />
                <span className="line-clamp-1">{activeVideo.title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-[#64748B] hover:text-[#172033] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black">
              <video
                src={activeVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#F5F8FC] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[#64748B] line-clamp-2 max-w-xl">
                {activeVideo.description}
              </p>
              {activeVideo.linkedProductIds.length > 0 && (
                <button
                  onClick={() => {
                    const prodId = activeVideo.linkedProductIds[0];
                    setActiveVideo(null);
                    viewProductDetail(prodId);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'عرض تفاصيل وشراء المنتج' : 'View & Buy Product'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
