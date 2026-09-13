import React, { useEffect, useRef } from 'react';

interface NativeAdProps {
  className?: string;
  adSlot?: string;
  adClient?: string;
  layoutKey?: string;
  variant?: 'card' | 'in-feed' | 'compact';
}

export const NativeAd: React.FC<NativeAdProps> = ({
  className = '',
  adSlot = '2011804790',
  adClient = 'ca-pub-9299132994586276',
  layoutKey,
  variant = 'card',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (isLoadedRef.current) return;

    try {
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
        isLoadedRef.current = true;
      }
    } catch (err) {
      console.debug('Native ad initialized or filtered by client:', err);
    }
  }, []);

  return (
    <div
      id={`native-ad-${adSlot}`}
      className={`relative overflow-hidden transition-all ${
        variant === 'card'
          ? 'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs'
          : 'bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-3 border border-dashed border-slate-300 dark:border-slate-700'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            Promoted
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Sponsored
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Google Ads</span>
      </div>

      {/* Google Native Ad Unit */}
      <ins
        ref={adRef}
        className="adsbygoogle block w-full text-center min-h-[90px]"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="fluid"
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
      />
    </div>
  );
};

export default NativeAd;
