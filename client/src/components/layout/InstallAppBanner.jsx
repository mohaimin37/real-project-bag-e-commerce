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
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
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
      toast('Tap the browser menu ⋮ and select "Install app" or "Add to Home screen"', {
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
      className="md:hidden bg-surface-container-lowest border-b border-surface-container-high px-3 py-1.5 flex items-center justify-between gap-2.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/logo-192.png"
          alt="WILDTANE App"
          className="w-8 h-8 rounded-lg shrink-0 object-cover"
        />
        <div className="flex flex-col min-w-0 leading-tight">
          <span className="text-xs font-bold text-on-surface truncate">WILDTANE App</span>
          <span className="text-[10px] text-on-surface-variant truncate">Fast, full-screen shopping experience</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="h-7 px-3 rounded-full bg-on-surface text-surface-container-lowest text-[12px] font-semibold active:opacity-70"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="w-7 h-7 rounded-md flex items-center justify-center text-outline hover:text-on-surface active:bg-surface-container-low transition-colors"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </aside>
  );
}
