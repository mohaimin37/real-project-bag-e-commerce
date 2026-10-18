import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Icon, Button } from '../components/ui';
import { LogoMark } from '../components/Brand';
import Seo from '../components/Seo';

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) setInstalled(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    if (installed) {
      toast.success('WILDTANE App is already installed on your device!', { icon: '✨' });
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Installing WILDTANE App...');
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      toast('Tap the browser menu ⋮ and select "Install app" or "Add to Home screen"', {
        duration: 5000,
        icon: '📲',
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface py-6 px-3.5 sm:px-6 max-w-2xl mx-auto flex flex-col gap-6">
      <Seo
        title="Download Official WILDTANE Android App — APK & PWA"
        description="Download the official WILDTANE Android mobile app (.apk) or install 1-tap PWA for high-speed luxury shopping, exclusive app deals, and instant order tracking."
        canonical="/download"
      />

      {/* Hero Header Card */}
      <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/35 shadow-lift text-center flex flex-col items-center gap-3.5 relative overflow-hidden">
        <div aria-hidden="true" className="absolute -top-12 -right-12 w-40 h-40 bg-secondary/15 rounded-full blur-2xl pointer-events-none" />
        <div aria-hidden="true" className="absolute -bottom-12 -left-12 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <LogoMark className="w-16 h-16 drop-shadow-md" />
          <span className="absolute -bottom-1 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
            v2.0
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-serif font-black tracking-wide uppercase text-on-surface">
            WILDTANE Android App
          </h1>
          <p className="text-[12.5px] sm:text-[13.5px] text-on-surface-variant max-w-md">
            Handcrafted luxury carry engineered for speed, convenience, and seamless 1-tap checkout.
          </p>
        </div>

        {/* Status Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Official Release • Android 8.0 to Android 15+
        </div>

        {/* Dual Download Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
          {/* Option 1: 1-Tap PWA Install */}
          <button
            type="button"
            onClick={handlePwaInstall}
            className="flex-1 h-12 rounded-2xl bg-secondary text-on-secondary font-bold text-[13px] flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all hover:brightness-105"
          >
            <Icon name="bolt" className="text-[18px]" />
            <span>1-Tap Instant Install</span>
          </button>

          {/* Option 2: Direct APK Download */}
          <a
            href="/wildtane.apk"
            download="wildtane.apk"
            className="flex-1 h-12 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/40 text-on-surface font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
          >
            <Icon name="download" className="text-[18px] text-secondary" />
            <span>Download WILDTANE .APK</span>
          </a>
        </div>
        <span className="text-[10.5px] text-outline">
          100% Virus-Free & Verified • Direct Fast CDN Download
        </span>
      </div>

      {/* Key App Features */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1 shadow-2xs">
          <span className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
            <Icon name="speed" className="text-[18px]" />
          </span>
          <span className="text-[12.5px] font-bold text-on-surface">3x Faster Shopping</span>
          <span className="text-[10.5px] text-outline">Instant page transitions with local app cache.</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1 shadow-2xs">
          <span className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
            <Icon name="local_fire_department" className="text-[18px]" />
          </span>
          <span className="text-[12.5px] font-bold text-on-surface">App Exclusive Steals</span>
          <span className="text-[10.5px] text-outline">Early access to flash sales & bonus coins.</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1 shadow-2xs">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <Icon name="notifications_active" className="text-[18px]" />
          </span>
          <span className="text-[12.5px] font-bold text-on-surface">Order Tracking</span>
          <span className="text-[10.5px] text-outline">Real-time delivery status & dispatch alerts.</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-1 shadow-2xs">
          <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Icon name="casino" className="text-[18px]" />
          </span>
          <span className="text-[12.5px] font-bold text-on-surface">Daily Spin & Win</span>
          <span className="text-[10.5px] text-outline">Win up to ₹150 discount codes every day.</span>
        </div>
      </div>

      {/* Simple 3-Step APK Install Guide */}
      <div className="p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-3">
        <h2 className="text-[13px] font-black uppercase tracking-wider text-outline flex items-center gap-1.5">
          <Icon name="help_outline" className="text-[16px] text-secondary" /> How to Install .APK File
        </h2>

        <div className="flex flex-col divide-y divide-outline-variant/20 text-[12px]">
          <div className="py-2 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">Download wildtane.apk</span>
              <span className="text-outline text-[11px]">Tap the "Download .APK" button above. The download will start automatically.</span>
            </div>
          </div>

          <div className="py-2 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">Open Downloaded File</span>
              <span className="text-outline text-[11px]">Swipe down your notification bar or open "My Files" / "Downloads" and tap <strong>wildtane.apk</strong>.</span>
            </div>
          </div>

          <div className="py-2 flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-secondary/15 text-secondary font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
            <div className="flex flex-col">
              <span className="font-bold text-on-surface">Allow & Install</span>
              <span className="text-outline text-[11px]">If prompted, turn on "Allow from this source" in settings, then tap <strong>Install</strong>. Done!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Return to Store */}
      <div className="text-center pt-2">
        <Link to="/" className="text-[12.5px] font-bold text-secondary hover:underline inline-flex items-center gap-1">
          ← Return to WILDTANE Storefront
        </Link>
      </div>
    </div>
  );
}
