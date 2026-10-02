import forms from '@tailwindcss/forms';

// Colour tokens come from the Stitch design system. Each maps to a CSS variable
// (see src/index.css) so light, dark and high-contrast themes share one class set.
const tokens = [
  'background', 'on-background', 'surface', 'surface-bright', 'surface-dim', 'surface-tint', 'surface-variant',
  'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest',
  'on-surface', 'on-surface-variant', 'inverse-surface', 'inverse-on-surface', 'inverse-primary',
  'outline', 'outline-variant',
  'primary', 'on-primary', 'primary-container', 'on-primary-container', 'primary-fixed', 'primary-fixed-dim',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'secondary-fixed', 'secondary-fixed-dim', 'on-secondary-fixed',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container', 'tertiary-fixed', 'tertiary-fixed-dim',
  'error', 'on-error', 'error-container', 'on-error-container',
  'ink', 'on-ink',
];

const type = (size, lineHeight, letterSpacing, fontWeight) => [size, { lineHeight, letterSpacing, fontWeight }];

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: Object.fromEntries(tokens.map((t) => [t, `rgb(var(--c-${t}) / <alpha-value>)`])),
      borderRadius: { DEFAULT: '0.125rem', lg: '0.25rem', xl: '0.5rem', '2xl': '0.75rem', '3xl': '1rem' },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'gutter-sm': '1rem',
        gutter: '1.5rem',
        'gutter-lg': '2rem',
        'margin-sm': '1rem',
        margin: '1.5rem',
        'margin-lg': '3rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-hero': type('56px', '64px', '-0.03em', '800'),
        'display-hero-mobile': type('36px', '44px', '-0.025em', '800'),
        'headline-xl': type('40px', '48px', '-0.02em', '700'),
        'headline-xl-mobile': type('28px', '36px', '-0.015em', '700'),
        'headline-lg': type('32px', '40px', '-0.015em', '700'),
        'headline-md': type('24px', '32px', '-0.01em', '600'),
        'headline-sm': type('20px', '28px', '-0.005em', '600'),
        'body-xl': type('18px', '28px', '0', '400'),
        'body-md': type('16px', '24px', '0', '400'),
        'body-sm': type('14px', '20px', '0.005em', '400'),
        'label-lg': type('14px', '20px', '0.02em', '600'),
        'label-md': type('12px', '16px', '0.04em', '600'),
        'label-sm': type('11px', '14px', '0.06em', '700'),
        'price-xl': type('28px', '32px', '-0.02em', '700'),
        'price-md': type('18px', '24px', '-0.01em', '700'),
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        lift: '0 20px 25px -5px rgba(16,24,40,0.12), 0 8px 10px -6px rgba(16,24,40,0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'pop-in': { from: { opacity: 0, transform: 'translateY(8px) scale(.98)' }, to: { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        bump: { '0%': { transform: 'scale(.5)' }, '60%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'slide-in-right': 'slide-in-right .3s cubic-bezier(.2,.8,.2,1)',
        'slide-in-left': 'slide-in-left .3s cubic-bezier(.2,.8,.2,1)',
        'pop-in': 'pop-in .25s cubic-bezier(.2,.8,.2,1)',
        shimmer: 'shimmer 1.4s infinite',
        bump: 'bump .35s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [forms({ strategy: 'class' })],
};
