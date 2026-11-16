import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { isChunkLoadError } from '../utils/lazyImportHelpers';

interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
  /** When true, suppresses fallback UI and renders null on error (ideal for decorative overlays) */
  silent?: boolean;
  /** Optional custom fallback element */
  fallback?: React.ReactNode;
  /** Optional reset key that automatically clears any captured error when changed (e.g. currentView or activeTab) */
  resetKey?: string | number;
  /** Optional accessible section label for context */
  label?: string;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: unknown;
  retryAttempt: number;
}

export class ChunkErrorBoundary extends React.Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryAttempt: 0,
    };
  }

  static getDerivedStateFromError(error: unknown): Partial<ChunkErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ChunkErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[ChunkErrorBoundary${this.props.label ? `:${this.props.label}` : ''}] caught error:`,
        error,
        info.componentStack
      );
    }
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryAttempt: prev.retryAttempt + 1,
    }));
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return <React.Fragment key={this.state.retryAttempt}>{this.props.children}</React.Fragment>;
    }

    if (this.props.silent) {
      return null;
    }

    if (this.props.fallback !== undefined) {
      return <>{this.props.fallback}</>;
    }

    const isArabic =
      typeof document !== 'undefined' && document.documentElement.lang === 'ar';
    const isChunk = isChunkLoadError(this.state.error);

    return (
      <div
        role="alert"
        className="w-full max-w-lg mx-auto my-10 p-6 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-4 shadow-xs"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#EAF3FF] dark:bg-[#172540] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm sm:text-base font-bold text-[#172033] dark:text-[#F8FAFC]">
            {isArabic
              ? isChunk
                ? 'تعذر تحميل هذا القسم مؤقتاً'
                : 'حدث خطأ غير متوقع أثناء العرض'
              : isChunk
              ? 'Section failed to load temporarily'
              : 'Something went wrong loading this view'}
          </h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
            {isArabic
              ? 'قد يكون السبب انقطاعاً لحظياً في الاتصال أو تحديثاً جارياً. يمكنك إعادة المحاولة فوراً.'
              : 'This may be due to a brief connection interruption or an active app update. You can retry immediately.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isArabic ? 'إعادة المحاولة' : 'Try Again'}</span>
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="px-4 py-2 rounded-xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold transition-colors cursor-pointer"
          >
            {isArabic ? 'تحديث الصفحة' : 'Reload Page'}
          </button>
        </div>
      </div>
    );
  }
}
