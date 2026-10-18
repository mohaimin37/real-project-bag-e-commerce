import { useEffect, useState } from 'react';
import { Icon } from '../ui';
import toast from 'react-hot-toast';

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    if (sessionStorage.getItem('wt_install_dismissed')) return;

    // Check if already in standalone app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    if (isIosDevice) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    // Android / Chrome PWA install event
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    const openHandler = () => setShow(true);
    window.addEventListener('wt-open-install-app', openHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('wt-open-install-app', openHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      toast('Tap the Share button ⎋ at the bottom of Safari, then tap "Add to Home Screen"', {
        duration: 6000,
        icon: '📲',
      });
      return;
    }

    if (!deferredPrompt) {
      toast('Tap browser menu ⋮ -> "Install app" or tap "Download .APK"', {
        duration: 5000,
        icon: '📲',
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Installing WILDTANE App...');
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('wt_install_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <aside
      aria-label="Install WILDTANE App"
      className="md:hidden fixed inset-x-2 bottom-[calc(4.1rem+env(safe-area-inset-bottom))] z-40 rounded-2xl bg-surface-container-lowest/98 backdrop-blur-md border border-outline-variant/40 shadow-lift px-3 py-2 flex items-center justify-between gap-2 animate-fade-in max-w-[calc(100vw-16px)] mx-auto box-border"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <img
          src="/logo-192.png"
          alt="WILDTANE App"
          className="w-8 h-8 rounded-lg shrink-0 object-cover shadow-2xs border border-outline-variant/30"
        />
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-[12px] font-bold text-on-surface truncate flex items-center gap-1">
            WILDTANE App
            <span className="text-[8.5px] font-black px-1 rounded bg-secondary/15 text-secondary">PRO</span>
          </span>
          <span className="text-[10px] text-on-surface-variant truncate">Fast 1-tap checkout</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="h-7 px-2.5 rounded-lg bg-secondary text-on-secondary text-[11px] font-bold active:scale-95 transition-transform shadow-2xs"
        >
          Install
        </button>
        <a
          href="/wildtane.apk"
          download="wildtane.apk"
          className="h-7 px-2.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface text-[11px] font-bold active:scale-95 transition-transform flex items-center gap-1 shadow-2xs"
          title="Download APK"
        >
          <Icon name="download" className="text-[13px] text-secondary" />
          <span>APK</span>
        </a>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface active:bg-surface-container-low transition-colors"
        >
          <Icon name="close" className="text-[16px]" />
        </button>
      </div>
    </aside>
  );
}
