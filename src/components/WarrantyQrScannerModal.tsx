import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  RefreshCw,
  Upload,
  Zap,
  AlertTriangle,
  Loader2,
  QrCode,
  SwitchCamera,
} from 'lucide-react';
import { CameraErrorFeedback, mapCameraErrorToMessage } from '../utils/qrPayloadParser';

interface WarrantyQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (rawCode: string) => void;
  lang: 'en' | 'ar';
}

interface NativeBarcodeResult {
  rawValue?: string;
}

interface NativeBarcodeDetector {
  detect: (source: ImageBitmapSource) => Promise<NativeBarcodeResult[]>;
}

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): NativeBarcodeDetector;
}

export const WarrantyQrScannerModal: React.FC<WarrantyQrScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  lang,
}) => {
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
          // ignore track stop error
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
    onClose();
  }, [stopCamera, onClose]);

  const emitDecodedValue = useCallback(
    (rawValue: string) => {
      if (hasDecodedRef.current) return;
      const trimmed = rawValue.trim();
      if (!trimmed) return;
      hasDecodedRef.current = true;
      stopCamera();
      onDetected(trimmed);
    },
    [onDetected, stopCamera]
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  // Initialize camera stream & continuous QR scan loop when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    hasDecodedRef.current = false;
    setCameraStatus('starting');
    setCameraError(null);
    setImageScanNotice(null);

    // Lazily create native BarcodeDetector if supported (supports QR + 1D serial barcodes on Chrome/Android)
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
        // Fallback if specific facingMode constraint is rejected on desktop webcams
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
        // Some browsers delay play() resolution until the first frame arrives
      });

      if (cancelled) return;

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
            // Downscale large streams slightly for responsive real-time decoding
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
              emitDecodedValue(qrResult.data);
              return;
            }

            // Secondary native BarcodeDetector pass for 1D product serial stickers
            if (nativeDetectorRef.current && !isNativeDetectingRef.current) {
              isNativeDetectingRef.current = true;
              nativeDetectorRef.current
                .detect(canvas)
                .then((codes) => {
                  const firstMatch = codes.find((c) => typeof c.rawValue === 'string' && c.rawValue.trim());
                  if (!cancelled && firstMatch?.rawValue) {
                    emitDecodedValue(firstMatch.rawValue);
                  }
                })
                .catch(() => {
                  // Ignore frame-level native detector errors
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
  }, [isOpen, facingMode, retryTick, lang, stopCamera, emitDecodedValue]);

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

  const handleStickerPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        el.onerror = () => reject(new Error('Failed to load sticker image'));
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
        emitDecodedValue(decoded.data);
        return;
      }

      if (nativeDetectorRef.current) {
        const nativeCodes = await nativeDetectorRef.current.detect(canvas);
        const match = nativeCodes.find((c) => typeof c.rawValue === 'string' && c.rawValue.trim());
        if (match?.rawValue) {
          emitDecodedValue(match.rawValue);
          return;
        }
      }

      setImageScanNotice(
        lang === 'ar'
          ? 'لم يتم العثور على رمز QR أو باركود واضح في هذه الصورة. يرجى التقريب على الملصق بإضاءة جيدة والمحاولة مجدداً.'
          : 'No clear QR code or barcode was detected in that photo. Try framing the sticker closer under good lighting.'
      );
    } catch {
      setImageScanNotice(
        lang === 'ar'
          ? 'تعذر قراءة ملف الصورة المختار. يرجى اختيار صورة بصيغة JPG أو PNG.'
          : 'Unable to read the selected image file. Please try another JPG or PNG sticker photo.'
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsProcessingImage(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-scanner-modal-title"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#172540] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="qr-scanner-modal-title"
                className="text-sm sm:text-base font-black text-[#172033] dark:text-[#F8FAFC] truncate"
              >
                {lang === 'ar' ? 'ماسح رمز QR والرقم التسلسلي' : 'Scan Warranty QR Sticker'}
              </h3>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                {lang === 'ar'
                  ? 'وجّه الكاميرا نحو ملصق الجهاز أو الفاتورة'
                  : 'Align product sticker QR or barcode inside frame'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label={lang === 'ar' ? 'إغلاق الماسح الضوئي' : 'Close QR scanner'}
            className="w-10 h-10 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] text-[#475569] dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera / Viewfinder Stage */}
        <div className="p-5 space-y-4">
          <div className="relative w-full aspect-[4/3] max-h-[340px] rounded-2xl bg-slate-950 border border-[#DCE5F0]/40 dark:border-[#1E293B] overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
            />
            <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

            {/* Viewfinder Frame Overlay when camera active */}
            {cameraStatus === 'active' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                  <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-[#38BDF8] rounded-tl-xl" />
                  <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-[#38BDF8] rounded-tr-xl" />
                  <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-[#38BDF8] rounded-bl-xl" />
                  <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-[#38BDF8] rounded-br-xl" />
                </div>
                <span className="mt-4 px-3 py-1 rounded-full bg-slate-950/75 text-white text-[11px] font-semibold">
                  {lang === 'ar' ? 'جاري البحث التلقائي عن الرمز...' : 'Scanning automatically for QR or barcode...'}
                </span>
              </div>
            )}

            {/* Starting State */}
            {cameraStatus === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6 text-center text-white">
                <Loader2 className="w-7 h-7 animate-spin text-[#38BDF8]" />
                <p className="text-xs sm:text-sm font-semibold">
                  {lang === 'ar' ? 'جاري تشغيل الكاميرا...' : 'Starting device camera...'}
                </p>
                <p className="text-[11px] text-slate-300 max-w-xs">
                  {lang === 'ar'
                    ? 'يرجى قبول إذن استخدام الكاميرا إذا طلب المتصفح ذلك.'
                    : 'Please allow camera permission if prompted by your browser.'}
                </p>
              </div>
            )}

            {/* Error State */}
            {cameraStatus === 'error' && cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-900 text-white">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">{cameraError.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetryTick((t) => t + 1)}
                  className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إعادة تشغيل الكاميرا' : 'Retry Camera'}</span>
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

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-3.5 py-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <SwitchCamera className="w-4 h-4 text-[#007AFF]" />
                <span>
                  {facingMode === 'environment'
                    ? lang === 'ar'
                      ? 'الكاميرا الأمامية'
                      : 'Front Camera'
                    : lang === 'ar'
                    ? 'الكاميرا الخلفية'
                    : 'Rear Camera'}
                </span>
              </button>

              {supportsTorch && cameraStatus === 'active' && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  aria-pressed={torchOn}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    torchOn
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                      : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'الإضاءة' : 'Flashlight'}</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleStickerPhotoUpload}
                className="hidden"
                aria-label={lang === 'ar' ? 'رفع صورة ملصق QR' : 'Upload QR sticker image'}
              />
              <button
                type="button"
                disabled={isProcessingImage}
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {isProcessingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#007AFF]" />
                ) : (
                  <Upload className="w-4 h-4 text-[#007AFF]" />
                )}
                <span>{lang === 'ar' ? 'رفع صورة ملصق' : 'Upload Sticker Photo'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#172033] dark:text-[#F8FAFC] text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إغلاق' : 'Cancel'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
