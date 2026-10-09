import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '../ui';
import { cn } from '../../lib/format';

export default function ScrollToTopFab() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();
  const isProductDetail = pathname.startsWith('/product/');

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 280);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top of page"
      className={cn(
        'fixed z-40 w-9 h-9 rounded-full bg-surface-container-lowest border border-surface-container-high text-on-surface shadow-lift flex items-center justify-center active:scale-90 select-none animate-fade-in right-3 md:right-6 md:bottom-6',
        isProductDetail ? 'bottom-20' : 'bottom-[4.5rem]'
      )}
    >
      <Icon name="keyboard_arrow_up" className="text-[22px]" />
    </button>
  );
}
