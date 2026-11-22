import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import {
  QrCode,
  X,
  Camera,
  SwitchCamera,
  Zap,
  Upload,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  Search,
  ScanLine,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { LazyImage } from './LazyImage';
import { CameraErrorFeedback, mapCameraErrorToMessage } from '../utils/qrPayloadParser';
import { findProductByQrPayload, ProductQrLookupResult } from '../utils/productQrLookupHelpers';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE, resolveFullResolutionImageUrl } from '../utils/imageResolutionHelpers';
import { getProductColorOptions } from '../utils/colorVariantHelpers';
import { Product } from '../types';

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<NativeBarcodeResult[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
}

export const ProductQrScannerModal: React.FC = () => {
  const {
    lang,
    products,
    isQrScannerOpen,
    setIsQrScannerOpen,
    viewProductDetail,
    addToCart,
    setSearchQuery,
    setCurrentView,
  } = useShop();

  const isArabic = lang === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasDecodedRef = useRef(false);
  const lastDecodeAtRef = useRef(0);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const isNativeDetectingRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [retryTick, setRetryTick] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [cameraError, setCameraError] = useState<CameraErrorFeedback | null>(null);
  const [supportsTorch, setSupportsTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [imageScanNotice, setImageScanNotice] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [scannedRawCode, setScannedRawCode] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<ProductQrLookupResult | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setSupportsTorch(false);
    setTorchOn(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    setScannedRawCode(null);
    setLookupResult(null);
    setImageScanNotice(null);
    setManualCodeInput('');
    setIsQrScannerOpen(false);
  }, [stopCamera, setIsQrScannerOpen]);

  const handleResolvedPayload = useCallback(
    (rawPayload: string) => {
      const trimmed = rawPayload.trim();
      if (!trimmed) return;
      hasDecodedRef.current = true;
      stopCamera();
      setImageScanNotice(null);
      setScannedRawCode(trimmed);
      setLookupResult(findProductByQrPayload(trimmed, products));
    },
    [products, stopCamera]
  );

  const handleResetScan = useCallback(() => {
    hasDecodedRef.current = false;
    setScannedRawCode(null);
    setLookupResult(null);
    setImageScanNotice(null);
    setManualCodeInput('');
    setRetryTick((prev) => prev + 1);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isQrScannerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isQrScannerOpen, handleClose]);

  // Request camera permission & start continuous QR frame scanning
  useEffect(() => {
    if (!isQrScannerOpen || scannedRawCode !== null) {
      stopCamera();
      return;
    }

    let cancelled = false;
    hasDecodedRef.current = false;
    setCameraStatus('starting');
    setCameraError(null);
    setImageScanNotice(null);

    if (!nativeDetectorRef.current && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const DetectorCtor = (
          window as unknown as { BarcodeDetector: NativeBarcodeDetectorConstructor }
        ).BarcodeDetector;
        nativeDetectorRef.current = new DetectorCtor({
          formats: ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39'],
        });
      } catch {
        nativeDetectorRef.current = null;
      }
    }

    const startStream = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraStatus('error');
          setCameraError(mapCameraErrorToMessage(new Error('mediadevices unsupported'), lang));
        }
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (primaryErr) {
        const errName = primaryErr instanceof Error ? primaryErr.name : '';
        if (errName === 'OverconstrainedError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          } catch (fallbackErr) {
            if (!cancelled) {
              setCameraStatus('error');
              setCameraError(mapCameraErrorToMessage(fallbackErr, lang));
            }
            return;
          }
        } else {
          if (!cancelled) {
            setCameraStatus('error');
            setCameraError(mapCameraErrorToMessage(primaryErr, lang));
          }
          return;
        }
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const videoEl = videoRef.current;
      if (!videoEl) return;
      videoEl.muted = true;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.srcObject = stream;
      void videoEl.play().catch(() => {
        // Browsers may resolve play() once first video frame arrives
      });

      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        try {
          const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          setSupportsTorch(Boolean(caps.torch));
        } catch {
          setSupportsTorch(false);
        }
      }

      setCameraStatus('active');

      const scanFrame = (now: number) => {
        if (cancelled || hasDecodedRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (
          video &&
          canvas &&
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          now - lastDecodeAtRef.current >= 120
        ) {
          lastDecodeAtRef.current = now;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            const maxDim = 960;
            const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
            const targetW = Math.max(1, Math.round(video.videoWidth * scale));
            const targetH = Math.max(1, Math.round(video.videoHeight * scale));

            if (canvas.width !== targetW || canvas.height !== targetH) {
              canvas.width = targetW;
              canvas.height = targetH;
            }

            ctx.drawImage(video, 0, 0, targetW, targetH);
            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (qrResult?.data?.trim()) {
              handleResolvedPayload(qrResult.data);
              return;
            }

            if (nativeDetectorRef.current && !isNativeDetectingRef.current) {
              isNativeDetectingRef.current = true;
              nativeDetectorRef.current
                .detect(canvas)
                .then((codes) => {
                  const firstMatch = codes.find((c) => typeof c.rawValue === 'string' && c.rawValue.trim());
                  if (!cancelled && !hasDecodedRef.current && firstMatch?.rawValue) {
                    handleResolvedPayload(firstMatch.rawValue);
                  }
                })
                .catch(() => {
                  // Ignore frame detector miss
                })
                .finally(() => {
                  isNativeDetectingRef.current = false;
                });
            }
          }
        }

        rafRef.current = requestAnimationFrame(scanFrame);
      };

      rafRef.current = requestAnimationFrame(scanFrame);
    };

    startStream();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isQrScannerOpen, scannedRawCode, facingMode, retryTick, lang, stopCamera, handleResolvedPayload]);

  const handleToggleTorch = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const [track] = stream.getVideoTracks();
    if (!track) return;
    const nextTorch = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch {
      setSupportsTorch(false);
    }
  };

  const handleSwitchCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleQrPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsProcessingImage(true);
    setImageScanNotice(null);

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Failed to load QR photo'));
        el.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      const maxDim = 1400;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (decoded?.data?.trim()) {
        handleResolvedPayload(decoded.data);
        return;
      }

      if (nativeDetectorRef.current) {
        const nativeCodes = await nativeDetectorRef.current.detect(canvas);
        const match = nativeCodes.find((c) => typeof c.rawValue === 'string' && c.rawValue.trim());
        if (match?.rawValue) {
          handleResolvedPayload(match.rawValue);
          return;
        }
      }

      setImageScanNotice(
        isArabic
          ? 'لم يتم العثور على رمز QR أو باركود واضح في هذه الصورة. يرجى التقريب على الرمز بإضاءة جيدة والمحاولة مجدداً.'
          : 'No clear QR code or barcode was detected in that photo. Try framing the code closer under good lighting.'
      );
    } catch {
      setImageScanNotice(
        isArabic
          ? 'تعذر قراءة ملف الصورة المختار. يرجى اختيار صورة بصيغة JPG أو PNG.'
          : 'Unable to read the selected image file. Please choose a valid JPG or PNG QR image.'
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsProcessingImage(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    handleResolvedPayload(manualCodeInput.trim());
  };

  const handleOpenMatchedProduct = (product: Product) => {
    handleClose();
    viewProductDetail(product.id, false);
  };

  const handleQuickAddToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const firstColorOpt = getProductColorOptions(product)[0];
    const firstCapVariant = (product.variants || []).find(
      (v) => !v.id.startsWith('var-color-') && !v.color
    ) || product.variants?.[0];
    const isColorVariant = Boolean(firstCapVariant?.id.startsWith('var-color-'));
    addToCart(
      product,
      1,
      firstColorOpt?.name,
      firstCapVariant,
      firstColorOpt?.imageUrl || undefined,
      isColorVariant ? 0 : firstColorOpt?.priceAdjustment
    );
    handleClose();
  };

  const handleSearchCatalogForMissed = (code: string) => {
    handleClose();
    setSearchQuery(code);
    setCurrentView('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isQrScannerOpen || typeof document === 'undefined') return null;

  const matchedProduct = lookupResult?.matchedProduct ?? null;
  const resolvedCodeDisplay = lookupResult?.parsed?.lookupValue || scannedRawCode || '';

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs"
      role="presentation"
      data-testid="product-qr-scanner-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-qr-scanner-title"
        data-testid="product-qr-scanner-modal"
        dir={isArabic ? 'rtl' : 'ltr'}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#172540] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#0070F3] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="product-qr-scanner-title"
                className="text-sm sm:text-base font-black text-[#172033] dark:text-[#F8FAFC] truncate"
              >
                {isArabic ? 'ماسح رمز المنتج الفوري (QR)' : 'Scan Product QR Code'}
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                {isArabic
                  ? 'وجّه الكاميرا نحو رمز QR للوصول الفوري إلى تفاصيل المنتج والسعر'
                  : 'Point your camera at a store QR label or barcode for instant lookup'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            data-testid="product-qr-scanner-close"
            aria-label={isArabic ? 'إغلاق ماسح رمز QR' : 'Close product QR scanner'}
            className="w-10 h-10 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] text-[#475569] dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {scannedRawCode === null ? (
            <>
              {/* Camera Viewfinder */}
              <div className="relative w-full aspect-[4/3] max-h-[320px] rounded-2xl bg-slate-950 border border-[#DCE5F0]/40 dark:border-[#1E293B] overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
                />
                <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

                {cameraStatus === 'active' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    <div className="w-48 h-48 sm:w-52 sm:h-52 relative">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#00BAF2] rounded-tl-xl" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#00BAF2] rounded-tr-xl" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#00BAF2] rounded-bl-xl" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#00BAF2] rounded-br-xl" />
                      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-[2px] bg-[#00BAF2]/80 shadow-[0_0_10px_#00BAF2]" />
                    </div>
                    <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 text-white text-[11px] font-semibold">
                      <ScanLine className="w-3.5 h-3.5 text-[#00BAF2]" />
                      <span>
                        {isArabic ? 'جاري البحث التلقائي عن رمز المنتج...' : 'Align QR code or SKU barcode in frame'}
                      </span>
                    </span>
                  </div>
                )}

                {cameraStatus === 'starting' && (
                  <div
                    data-testid="product-qr-camera-starting"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6 text-center text-white"
                  >
                    <Loader2 className="w-7 h-7 animate-spin text-[#00BAF2]" />
                    <p className="text-xs sm:text-sm font-semibold">
                      {isArabic ? 'جاري طلب إذن الكاميرا...' : 'Requesting camera permission...'}
                    </p>
                    <p className="text-[11px] text-slate-300 max-w-xs leading-relaxed">
                      {isArabic
                        ? 'اسمح بالوصول إلى الكاميرا لمسح رمز QR الخاص بالمنتج فوراً.'
                        : 'Please allow camera access in your browser prompt to scan store product QR codes.'}
                    </p>
                  </div>
                )}

                {cameraStatus === 'error' && cameraError && (
                  <div
                    data-testid="product-qr-camera-error"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900 text-white"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h3 className="text-sm font-bold text-white">{cameraError.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{cameraError.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRetryTick((t) => t + 1)}
                      className="px-4 py-2 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'إعادة طلب الكاميرا' : 'Allow & Retry Camera'}</span>
                    </button>
                  </div>
                )}
              </div>

              {imageScanNotice && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>{imageScanNotice}</span>
                </div>
              )}

              {/* Camera Controls + Upload QR Photo Fallback */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="px-3 py-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#0070F3] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <SwitchCamera className="w-3.5 h-3.5 text-[#0070F3] dark:text-[#38BDF8]" />
                    <span>
                      {facingMode === 'environment'
                        ? isArabic
                          ? 'الأمامية'
                          : 'Front Cam'
                        : isArabic
                        ? 'الخلفية'
                        : 'Rear Cam'}
                    </span>
                  </button>

                  {supportsTorch && cameraStatus === 'active' && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      aria-pressed={torchOn}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        torchOn
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                          : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#0070F3]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'الفلاش' : 'Flash'}</span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrPhotoUpload}
                    className="hidden"
                    data-testid="product-qr-file-input"
                    aria-label={isArabic ? 'رفع صورة رمز QR' : 'Upload QR image'}
                  />
                  <button
                    type="button"
                    disabled={isProcessingImage}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="product-qr-upload-btn"
                    className="px-3 py-2 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#0070F3] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
                  >
                    {isProcessingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0070F3]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#0070F3] dark:text-[#38BDF8]" />
                    )}
                    <span>{isArabic ? 'رفع صورة QR' : 'Upload QR Image'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إغلاق' : 'Close'}</span>
                </button>
              </div>

              {/* Direct Manual SKU / Barcode / URL Fallback */}
              <form
                onSubmit={handleManualSubmit}
                className="pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B] space-y-2"
              >
                <label
                  htmlFor="product-qr-manual-input"
                  className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-400"
                >
                  {isArabic
                    ? 'أو أدخل رقم SKU / الباركود / رابط المنتج للبحث المباشر:'
                    : 'Or paste a product SKU, barcode, ID, or QR link for instant lookup:'}
                </label>
                <div className="flex items-stretch gap-2">
                  <input
                    id="product-qr-manual-input"
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    data-testid="product-qr-manual-input"
                    placeholder={
                      isArabic
                        ? 'مثال: APL-IP16PM-256 أو 195949038221'
                        : 'e.g. APL-IP16PM-256 or prod-iphone16promax'
                    }
                    className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-xs sm:text-sm text-[#172033] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:border-[#0070F3]"
                  />
                  <button
                    type="submit"
                    data-testid="product-qr-manual-submit"
                    className="px-4 py-2 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'بحث' : 'Lookup'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : matchedProduct ? (
            /* Matched Product Instant Result Card */
            <div data-testid="product-qr-match-result" className="space-y-4">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold min-w-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {isArabic ? 'تم العثور على المنتج فوراً' : 'Product Located Instantly'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[160px]">
                  {matchedProduct.sku}
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]">
                <div className="w-20 h-20 rounded-xl bg-white dark:bg-[#0A0F1D] border border-[#E2E8F0] dark:border-[#1E293B] p-2 shrink-0 flex items-center justify-center">
                  <LazyImage
                    priority={true}
                    src={resolveFullResolutionImageUrl(matchedProduct.images?.[0]) || DEFAULT_FULL_RES_FALLBACK_IMAGE}
                    alt={isArabic ? matchedProduct.nameAr || matchedProduct.name : matchedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0070F3] dark:text-[#38BDF8] truncate">
                    {matchedProduct.brand} · {matchedProduct.category}
                  </p>
                  <h3 className="text-sm sm:text-base font-extrabold text-[#172033] dark:text-[#F8FAFC] line-clamp-2">
                    {isArabic ? matchedProduct.nameAr || matchedProduct.name : matchedProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-baseline gap-2.5 pt-0.5">
                    <span className="text-base font-black text-[#0F172A] dark:text-white tabular-nums">
                      ${matchedProduct.price.toLocaleString()}
                    </span>
                    {matchedProduct.originalPrice > matchedProduct.price && (
                      <span className="text-xs text-slate-400 line-through tabular-nums">
                        ${matchedProduct.originalPrice.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-bold ${
                        matchedProduct.stock > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {matchedProduct.stock > 0
                        ? isArabic
                          ? `متوفر (${matchedProduct.stock})`
                          : `In Stock (${matchedProduct.stock})`
                        : isArabic
                        ? 'نفذت الكمية'
                        : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  data-testid="product-qr-view-product-btn"
                  onClick={() => handleOpenMatchedProduct(matchedProduct)}
                  className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{isArabic ? 'عرض صفحة المنتج' : 'Open Product Page'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>

                {matchedProduct.stock > 0 && (
                  <button
                    type="button"
                    data-testid="product-qr-add-cart-btn"
                    onClick={() => handleQuickAddToCart(matchedProduct)}
                    className="py-2.5 px-4 rounded-xl bg-[#172033] dark:bg-[#1E293B] hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{isArabic ? 'أضف للسلة' : 'Add to Cart'}</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="product-qr-scan-another-btn"
                  onClick={handleResetScan}
                  className="py-2.5 px-3.5 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'مسح جديد' : 'Scan Another'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unmatched Scanned Payload Feedback */
            <div data-testid="product-qr-no-match" className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {isArabic
                      ? 'لم يتم العثور على منتج مطابق لهذا الرمز'
                      : 'No matching store product found'}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 break-all">
                  {isArabic ? 'الرمز المقروء: ' : 'Scanned code: '}
                  <span className="font-mono font-bold">{resolvedCodeDisplay}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {resolvedCodeDisplay && (
                  <button
                    type="button"
                    onClick={() => handleSearchCatalogForMissed(resolvedCodeDisplay)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>{isArabic ? 'البحث في المتجر عن هذا الرمز' : 'Search Store Catalog'}</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="product-qr-retry-scan-btn"
                  onClick={handleResetScan}
                  className="py-2.5 px-4 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] text-[#172033] dark:text-[#F8FAFC] text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إعادة المسح' : 'Scan Again'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductQrScannerModal;
