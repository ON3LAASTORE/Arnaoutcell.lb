import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { MarketingVideo } from '../types';
import { Video, Play, ShoppingCart, X, Eye } from 'lucide-react';

export const VideosPage: React.FC = () => {
  const { lang, marketingVideos, products, viewProductDetail, storeSettings } = useShop();
  const [activeVideo, setActiveVideo] = useState<MarketingVideo | null>(null);

  const publishedVideos = marketingVideos.filter((v) => v.isPublished);

  return (
    <div className="py-12 md:py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
            <Video className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'فيديوهات تقنية ومعاينات' : 'MARKETING & UNBOXING VIDEOS'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#172033]">
            {lang === 'ar' ? 'فيديوهات وتجارب المنتجات الحية' : 'Product Reviews & Demos'}
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm">
            {lang === 'ar'
              ? `شاهد اختبارات الأداء المباشرة والمواصفات الواقعية للأجهزة المتوفرة في فرع ${storeSettings.storeNameAr || 'أرناؤوط ستور'} صيدا.`
              : `Watch real performance tests, unboxings, and hands-on demos from ${storeSettings.storeName} Saida.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {publishedVideos.map((video) => {
            const linkedProduct = products.find((p) => video.linkedProductIds.includes(p.id));

            return (
              <div
                key={video.id}
                className="group rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] overflow-hidden shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all flex flex-col justify-between"
              >
                <div
                  onClick={() => setActiveVideo(video)}
                  className="relative h-60 bg-[#F5F8FC] cursor-pointer overflow-hidden group"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#007AFF] group-hover:bg-[#0066D6] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                      <Play className="w-6 h-6 fill-current ml-0.5 text-white" />
                    </div>
                  </div>

                  {video.views && (
                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-white flex items-center gap-1 border border-white/10">
                      <Eye className="w-3.5 h-3.5 text-[#BAE6FD]" />
                      <span>{video.views.toLocaleString()} {lang === 'ar' ? 'مشاهدة' : 'views'}</span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#172033] text-base group-hover:text-[#007AFF] transition-colors line-clamp-2">
                      {lang === 'ar' ? video.titleAr || video.title : video.title}
                    </h3>
                    <p className="text-xs text-[#64748B] line-clamp-2 mt-2 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#DCE5F0]">
                    {linkedProduct ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={linkedProduct.images[0]}
                            alt={linkedProduct.name}
                            className="w-10 h-10 object-cover rounded-lg bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                          />
                          <div className="truncate">
                            <span className="text-[10px] text-[#64748B] block font-semibold">{linkedProduct.brand}</span>
                            <span className="text-xs font-bold text-[#172033] block">
                              ${linkedProduct.price}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => viewProductDetail(linkedProduct.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'شراء' : 'Shop'}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveVideo(video)}
                        className="w-full py-2.5 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-[#DCE5F0] transition-colors"
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

      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl bg-white border border-[#DCE5F0] rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#DCE5F0] bg-[#F5F8FC]">
              <div className="flex items-center gap-2 text-sm font-bold text-[#172033]">
                <Video className="w-4 h-4 text-[#007AFF]" />
                <span className="line-clamp-1">{activeVideo.title}</span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1.5 rounded-xl hover:bg-black/5 text-[#64748B] hover:text-[#172033]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              <video src={activeVideo.videoUrl} controls autoPlay className="w-full h-full object-contain">
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
