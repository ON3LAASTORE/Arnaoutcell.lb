import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { saveAnnouncementBar, saveMarketingVideos } from '../../services/storageService';
import { MarketingVideo } from '../../types';
import { Bell, Video, Plus, Trash2 } from 'lucide-react';

export const AdminContent: React.FC = () => {
  const { lang, storeSettings, marketingVideos, products, refreshData } = useShop();

  const [activeSection, setActiveSection] = useState<'announcement' | 'videos'>('announcement');
  const [feedback, setFeedback] = useState('');

  const currentBar = storeSettings?.announcementBar || {
    enabled: true,
    textEn: '✨ Special discounts across all flagship smartphones in Saida',
    textAr: '✨ عروض وتخفيضات خاصة على كافة الهواتف واللابتوبات بفرع صيدا',
    bgColor: '#007AFF',
    textColor: '#FFFFFF',
  };

  // Announcement Bar state
  const [barEnabled, setBarEnabled] = useState(currentBar.enabled);
  const [barTextEn, setBarTextEn] = useState(currentBar.textEn);
  const [barTextAr, setBarTextAr] = useState(currentBar.textAr);
  const [barBgColor, setBarBgColor] = useState(currentBar.bgColor || '#007AFF');
  const [barTextColor, setBarTextColor] = useState(currentBar.textColor || '#FFFFFF');

  // Video state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoTitleAr, setVideoTitleAr] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [videoLinkedProductId, setVideoLinkedProductId] = useState('');

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentBar,
      enabled: barEnabled,
      textEn: barTextEn,
      textAr: barTextAr,
      bgColor: barBgColor,
      textColor: barTextColor,
    };
    saveAnnouncementBar(updated);
    refreshData();
    setFeedback('Announcement Bar settings saved successfully.');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim()) return;

    const newVideo: MarketingVideo = {
      id: `vid-${Date.now()}`,
      title: videoTitle.trim(),
      titleAr: videoTitleAr.trim() || videoTitle.trim(),
      videoUrl: videoUrl.trim(),
      thumbnail:
        videoThumbnail.trim() ||
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
      description: videoDesc.trim(),
      linkedProductIds: videoLinkedProductId ? [videoLinkedProductId] : [],
      isFeatured: true,
      isPublished: true,
      views: 120,
    };

    const updated = [newVideo, ...marketingVideos];
    saveMarketingVideos(updated);
    refreshData();
    setVideoTitle('');
    setVideoTitleAr('');
    setVideoUrl('');
    setVideoThumbnail('');
    setVideoDesc('');
    setVideoLinkedProductId('');
    setFeedback('Marketing video published successfully.');
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleDeleteVideo = (id: string) => {
    if (window.confirm('Delete this video?')) {
      const updated = marketingVideos.filter((v) => v.id !== id);
      saveMarketingVideos(updated);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033]">
            {lang === 'ar' ? 'إدارة محتوى المتجر والإعلانات' : 'Storefront Content & Media'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'تعديل شريط الإعلانات العلوي، بانرات الواجهة، وفيديوهات معاينات المنتجات.'
              : 'Customize top announcement bar, homepage sliders, and playable video reviews.'}
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl">
          <button
            onClick={() => setActiveSection('announcement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'announcement' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            Announcement Bar
          </button>
          <button
            onClick={() => setActiveSection('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'videos' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            Product Videos
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold">
          {feedback}
        </div>
      )}

      {activeSection === 'announcement' ? (
        <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] max-w-2xl space-y-5 shadow-xs">
          <h3 className="font-bold text-[#172033] text-base flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#007AFF]" />
            <span>Top Announcement Bar Settings</span>
          </h3>

          <form onSubmit={handleSaveAnnouncement} className="space-y-4">
            <label className="flex items-center gap-2.5 text-xs text-[#172033] cursor-pointer">
              <input
                type="checkbox"
                checked={barEnabled}
                onChange={(e) => setBarEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#007AFF] rounded"
              />
              <span className="font-semibold">Display Announcement Bar at top of website</span>
            </label>

            <div>
              <label className="text-xs text-[#172033] font-semibold block mb-1">
                Announcement Message (English)
              </label>
              <textarea
                rows={2}
                value={barTextEn}
                onChange={(e) => setBarTextEn(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div>
              <label className="text-xs text-[#172033] font-semibold block mb-1">
                نص الإعلان العلوي (بالعربية)
              </label>
              <textarea
                rows={2}
                value={barTextAr}
                onChange={(e) => setBarTextAr(e.target.value)}
                className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={barBgColor}
                    onChange={(e) => setBarBgColor(e.target.value)}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-[#64748B]">{barBgColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={barTextColor}
                    onChange={(e) => setBarTextColor(e.target.value)}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-xs font-mono text-[#64748B]">{barTextColor}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              Save Announcement
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Video Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
            <h3 className="font-bold text-[#172033] text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#007AFF]" />
              <span>Add Marketing Video</span>
            </h3>

            <form onSubmit={handleAddVideo} className="space-y-3">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">Video Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S25 Ultra Camera Zoom Test"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">العنوان بالعربية</label>
                <input
                  type="text"
                  placeholder="مثال: تجربة كاميرا وميزات سامسونج"
                  value={videoTitleAr}
                  onChange={(e) => setVideoTitleAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Video MP4 URL or Embed *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://...mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Thumbnail Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={videoThumbnail}
                  onChange={(e) => setVideoThumbnail(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Link to Store Product (for Shop Button)
                </label>
                <select
                  value={videoLinkedProductId}
                  onChange={(e) => setVideoLinkedProductId(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                >
                  <option value="">No product link</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short review overview..."
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs"
              >
                Publish Video
              </button>
            </form>
          </div>

          {/* Existing Videos List */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-bold text-[#172033] text-sm">
              Published Product Marketing Videos ({marketingVideos.length})
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {marketingVideos.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl bg-white border border-[#DCE5F0] flex items-center justify-between gap-4 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-16 h-12 object-cover rounded-xl bg-[#F5F8FC] border border-[#DCE5F0]"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#172033] truncate">{v.title}</h4>
                      <p className="text-[10px] text-[#64748B] truncate">{v.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteVideo(v.id)}
                    className="p-1.5 text-[#64748B] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
