import React, { useRef, useEffect, useState } from 'react';
import { Product, StoreSettings } from '../../../types';
import {
  SocialAspectRatio,
  SocialGraphicTemplate,
} from '../../../types/socialMarketing';
import {
  renderSocialMarketingGraphic,
  getCanvasDimensions,
} from '../../../utils/socialMarketingHelpers';
import { useShop } from '../../../context/ShopContext';
import { Download, RefreshCw, Sparkles, Layers, Maximize2 } from 'lucide-react';

interface SocialImageCanvasProps {
  product: Product;
  settings?: StoreSettings;
  aspectRatio: SocialAspectRatio;
  template: SocialGraphicTemplate;
  headlineOverride?: string;
  onImageGenerated?: (dataUrl: string) => void;
  lang?: 'en' | 'ar';
}

export const SocialImageCanvas: React.FC<SocialImageCanvasProps> = ({
  product,
  settings,
  aspectRatio,
  template,
  headlineOverride,
  onImageGenerated,
  lang = 'en',
}) => {
  const { storeSettings } = useShop();
  const effectiveSettings = settings || storeSettings;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const drawGraphic = async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    setError(null);
    try {
      const generated = await renderSocialMarketingGraphic(
        canvasRef.current,
        product,
        effectiveSettings,
        {
          aspectRatio,
          template,
        }
      );
      setDataUrl(generated);
      if (onImageGenerated) {
        onImageGenerated(generated);
      }
    } catch (err) {
      console.error('Failed to render social graphic:', err);
      setError('Failed to generate high-resolution image preview.');
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    drawGraphic();
  }, [product.id, product.price, product.originalPrice, aspectRatio, template]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    const cleanBrand = (product.brand || 'product').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const cleanRatio = aspectRatio.replace(':', 'x');
    a.download = `arnaout-${cleanBrand}-${cleanRatio}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const { width, height, label } = getCanvasDimensions(aspectRatio);

  return (
    <div className="space-y-4">
      {/* Canvas Container */}
      <div className="relative rounded-2xl border border-[#DCE5F0] bg-[#0A0F1D] overflow-hidden shadow-md flex items-center justify-center p-3 sm:p-6 min-h-[340px]">
        {rendering && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-2 text-white text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#007AFF]" />
            <span>{lang === 'ar' ? 'جاري توليد التصميم بدقة عالية...' : 'Rendering high-resolution creative...'}</span>
          </div>
        )}

        {/* Hidden or scaled canvas */}
        <div
          className="relative max-w-full flex items-center justify-center transition-all duration-300"
          style={{
            aspectRatio: aspectRatio === '1:1' ? '1 / 1' : aspectRatio === '9:16' ? '9 / 16' : '16 / 9',
            maxHeight: aspectRatio === '9:16' ? '460px' : '360px',
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain rounded-xl shadow-2xl border border-white/10"
            style={{ maxHeight: aspectRatio === '9:16' ? '460px' : '360px' }}
          />
        </div>

        {/* Overlay Ratio Badge */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-white border border-white/10 flex items-center gap-1.5 z-10">
          <Layers className="w-3 h-3 text-[#007AFF]" />
          <span>{label}</span>
          <span className="text-[#64748B]">({width}×{height}px)</span>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs">
          {error}
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
          <span>
            {lang === 'ar'
              ? 'تصميم تسويقي أصلي جاهز للنشر الفوري'
              : 'Production-ready branded graphic with verified warranty badge'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={drawGraphic}
            disabled={rendering}
            className="p-2 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#172033] hover:text-[#007AFF] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Re-render graphic"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rendering ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{lang === 'ar' ? 'إعادة توليد' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl || rendering}
            className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تحميل الصورة عالية الدقة' : 'Download Creative PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
