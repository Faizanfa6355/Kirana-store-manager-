import React, { useEffect, useRef } from 'react';

interface BannerAdProps {
  className?: string;
  adSlot?: string;
  adClient?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
}

export const BannerAd: React.FC<BannerAdProps> = ({
  className = '',
  adSlot = '8249910087',
  adClient = 'ca-pub-9299132994586276',
  format = 'auto',
  responsive = true,
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
      console.debug('AdSense banner initialized or blocked by client:', err);
    }
  }, []);

  return (
    <div
      id="banner-ad-wrapper"
      className={`w-full overflow-hidden flex flex-col items-center justify-center my-3 transition-all ${className}`}
    >
      <div className="w-full bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 min-h-[70px] flex flex-col items-center justify-center relative shadow-xs">
        <div className="w-full flex justify-between items-center mb-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-1">
          <span>Sponsored Advertisement</span>
          <span>Google Ad</span>
        </div>

        {/* Google AdSense / AdMob Banner */}
        <ins
          ref={adRef}
          className="adsbygoogle block w-full text-center min-h-[50px]"
          style={{ display: 'block', minHeight: '50px' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};

export default BannerAd;
