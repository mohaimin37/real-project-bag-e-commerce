import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, imgUrl } from '../../lib/format';
import { Icon } from '../ui';
import { CLOTHING_MEN_MENU, CLOTHING_WOMEN_MENU, CLOTHING_BAGS_MENU } from './ClothingCategoryMenu';

/**
 * Fashion & Category Mega Menu for Men, Women and Bags in the Main Navbar.
 * Displays multi-column department structure (Bags, Clothing, Wallets, Accessories)
 * plus a featured visual lookbook card and quick links.
 */
export default function FashionMegaMenu({ dirKey = 'men', onClose }) {
  const isMen = dirKey === 'men';
  const isBags = dirKey === 'bags';
  const menu = isBags ? CLOTHING_BAGS_MENU : isMen ? CLOTHING_MEN_MENU : CLOTHING_WOMEN_MENU;
  const basePath = isBags ? '/bags' : isMen ? '/men' : '/women';
  const featuredImage = menu.featuredImage || (isBags ? '/uploads/seed/terminal-traveler.jpg' : isMen ? '/uploads/seed/briefcase-black.jpg' : '/uploads/seed/handbag-rose.jpg');

  const columns = menu.categories.filter((c) => c.id !== 'all');

  return (
    <div
      role="region"
      aria-label={`${menu.title} clothing and category menu`}
      className="absolute left-0 right-0 top-full z-50 bg-surface-container-lowest/98 backdrop-blur-xl border-y border-surface-container-high shadow-2xl animate-fade-in text-on-surface"
      onMouseLeave={onClose}
    >
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Top Header Strip inside Mega Menu */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-surface-container-high">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <h3 className="text-[14px] font-black uppercase tracking-[0.18em] text-on-surface">
              {menu.title} • {menu.subtitle}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
              {menu.badge}
            </span>
          </div>

          <Link
            to={basePath}
            onClick={onClose}
            className="text-[12.5px] font-bold text-secondary hover:underline flex items-center gap-1 group"
          >
            <span>View Complete {menu.title}</span>
            <Icon name="arrow_forward" className="text-[15px] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Multi-Column Clothing Menu Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Main 4 Category Columns */}
          {columns.slice(0, 4).map((col) => (
            <div key={col.id} className="min-w-0 flex flex-col">
              {/* Category Column Title */}
              <Link
                to={col.slug ? `${basePath}?category=${col.slug}` : basePath}
                onClick={onClose}
                className="group flex items-center gap-2 pb-2 border-b border-surface-container-high/80 mb-3"
              >
                <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                  <Icon name={col.icon} className="text-[16px]" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-black uppercase tracking-wider text-on-surface group-hover:text-secondary truncate">
                    {col.name}
                  </span>
                  {col.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-rose-500 text-white">
                      {col.badge}
                    </span>
                  )}
                </div>
              </Link>

              {/* Subcategories List */}
              <ul className="flex flex-col gap-1.5">
                {col.subcategories.map((sub) => (
                  <li key={sub.name}>
                    <Link
                      to={`${basePath}?category=${sub.slug}`}
                      onClick={onClose}
                      className="group flex items-center justify-between py-1 px-1.5 rounded-lg text-[12.5px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
                    >
                      <span className="truncate group-hover:translate-x-0.5 transition-transform flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-outline-variant group-hover:bg-rose-500 transition-colors" />
                        {sub.name}
                      </span>
                      {sub.badge ? (
                        <span className="px-1 py-0.2 rounded text-[8.5px] font-bold uppercase tracking-wider bg-surface-container text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          {sub.badge}
                        </span>
                      ) : (
                        <Icon name="chevron_right" className="text-[14px] opacity-0 group-hover:opacity-60 transition-opacity" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 5th Column: Curated Lookbook Showcase Card */}
          <div className="flex flex-col rounded-2xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high border border-outline-variant/30 p-3.5 shadow-sm">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-surface-container-highest">
              <img
                src={imgUrl(featuredImage, 360)}
                alt={menu.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/75 text-white backdrop-blur-sm">
                {menu.badge || 'ATELIER'}
              </span>
            </div>

            <h4 className="text-[13px] font-black uppercase tracking-wider text-on-surface mb-1">
              {menu.title} Lookbook
            </h4>
            <p className="text-[11.5px] text-on-surface-variant mb-3 line-clamp-2 leading-relaxed">
              {menu.subtitle}
            </p>

            {/* Quick Filter Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Link
                to={`${basePath}?newArrival=true&sort=newest`}
                onClick={onClose}
                className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-[10.5px] font-bold text-on-surface hover:bg-secondary hover:text-on-secondary border border-outline-variant/30 transition-all"
              >
                ✨ New Arrivals
              </Link>
              <Link
                to={`${basePath}?bestseller=true&sort=bestseller`}
                onClick={onClose}
                className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-[10.5px] font-bold text-on-surface hover:bg-secondary hover:text-on-secondary border border-outline-variant/30 transition-all"
              >
                🔥 Best Sellers
              </Link>
              <Link
                to={`${basePath}?onSale=true`}
                onClick={onClose}
                className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10.5px] font-bold hover:bg-rose-500/20 border border-rose-500/30 transition-all"
              >
                🏷️ On Sale
              </Link>
            </div>

            <Link
              to={basePath}
              onClick={onClose}
              className="mt-auto w-full py-2 px-3 rounded-xl bg-on-surface text-surface text-center text-[12px] font-bold hover:bg-secondary hover:text-on-secondary active:scale-95 transition-all shadow-xs"
            >
              Explore Collection
            </Link>
          </div>
        </div>

        {/* Bottom Storefront Perks Strip */}
        <div className="mt-5 pt-3 border-t border-surface-container-high/60 flex flex-wrap items-center justify-between text-[11px] text-on-surface-variant gap-2">
          <div className="flex items-center gap-1.5">
            <Icon name="local_shipping" className="text-[15px] text-emerald-600" />
            <span>Free Express Delivery on orders over ₹10,000</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="verified" className="text-[15px] text-sky-600" />
            <span>7-Day Doorstep Pickup & Exchanges</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="monetization_on" className="text-[15px] text-rose-600" />
            <span>Earn WILDTANE Coins on every purchase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
