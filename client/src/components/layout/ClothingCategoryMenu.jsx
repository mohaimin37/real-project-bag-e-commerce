import { useState, useMemo, useRef, useEffect } from 'react';
import { cn, imgUrl } from '../../lib/format';
import { Icon } from '../ui';

/**
 * High-Fashion Men's Categories & Subcategories.
 * In the circles: Men Categories ONLY.
 * Below the circles: Their Subcategories.
 */
export const CLOTHING_MEN_MENU = {
  key: 'men',
  title: "Men's Atelier",
  subtitle: "Architectural Carry & Apparel",
  tag: "1680D & Italian Leather",
  categories: [
    {
      id: 'all',
      name: 'All Men',
      slug: '',
      icon: 'apps',
      img: '/uploads/seed/briefcase-black.jpg',
      badge: 'ALL',
      subcategories: [
        { name: 'Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Office Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
        { name: 'T-Shirts & Tees', slug: 'clothing-t-shirts', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-stack.jpg', badge: 'HOT' },
        { name: 'Jackets & Blazers', slug: 'clothing-jackets', icon: 'styler', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'NEW' },
        { name: 'Bifold Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
        { name: 'Cabin Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
        { name: 'Perfumes & Oils', slug: 'fragrance', icon: 'local_florist', img: '/uploads/seed/catalog/pf-oils-amber-green.jpg' },
      ],
    },
    {
      id: 'bags',
      name: 'Bags & Packs',
      slug: 'men-bags',
      icon: 'backpack',
      img: '/uploads/seed/backpack-black.jpg',
      badge: 'BAGS',
      subcategories: [
        { name: 'All Men Bags', slug: 'men-bags', icon: 'backpack', img: '/uploads/seed/backpack-black.jpg' },
        { name: 'Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
        { name: 'Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg', badge: 'EXECUTIVE' },
        { name: 'Messenger Bags', slug: 'messenger-bags', icon: 'work', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
        { name: 'Duffels & Gym', slug: 'duffle-bags', icon: 'fitness_center', img: '/uploads/seed/catalog/duffle-highway.jpg' },
        { name: 'Travel Duffels', slug: 'travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Everyday Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/catalog/tote-cotton.jpg' },
      ],
    },
    {
      id: 'clothing',
      name: 'Clothing & Apparel',
      slug: 'clothing',
      icon: 'checkroom',
      img: '/uploads/seed/catalog/cl-tees-rail.jpg',
      badge: 'FASHION',
      subcategories: [
        { name: 'All Clothing', slug: 'clothing', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'T-Shirts & Tees', slug: 'clothing-t-shirts', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-stack.jpg', badge: 'HOT' },
        { name: 'Shirts', slug: 'clothing-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Jackets & Blazers', slug: 'clothing-jackets', icon: 'styler', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'NEW' },
        { name: 'Knitwear & Hoodies', slug: 'clothing-knitwear', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-stack.jpg' },
        { name: 'Jeans & Denim', slug: 'clothing-jeans', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
      ],
    },
    {
      id: 'wallets',
      name: 'Wallets & Leather',
      slug: 'men-wallets',
      icon: 'account_balance_wallet',
      img: '/uploads/seed/catalog/wallet-woodland.jpg',
      badge: 'LEATHER',
      subcategories: [
        { name: 'All Wallets', slug: 'men-wallets', icon: 'account_balance_wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
        { name: 'Bifold Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg', badge: 'BESTSELLER' },
        { name: 'Slim Wallets', slug: 'wallets', icon: 'account_balance_wallet', img: '/uploads/seed/cardholder-tan.jpg' },
        { name: 'Card Holders', slug: 'accessories', icon: 'credit_card', img: '/uploads/seed/cardholder-tan.jpg' },
        { name: 'Travel Wallets', slug: 'travel-wallets', icon: 'badge', img: '/uploads/seed/catalog/passport-atlas.jpg' },
      ],
    },
    {
      id: 'belts',
      name: 'Belts',
      slug: 'belts',
      icon: 'styler',
      img: '/uploads/seed/catalog/keyfob-brown.jpg',
      badge: 'BELTS',
      subcategories: [
        { name: 'All Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg', badge: 'PURE LEATHER' },
        { name: 'Belt Bags & Chest Packs', slug: 'belt-bags', icon: 'backpack', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
      ],
    },
    {
      id: 'accessories',
      name: 'Accessories & EDC',
      slug: 'men-accessories',
      icon: 'watch',
      img: '/uploads/seed/catalog/keyset-onyx.jpg',
      badge: 'EDC',
      subcategories: [
        { name: 'All Accessories', slug: 'men-accessories', icon: 'watch', img: '/uploads/seed/catalog/keyset-onyx.jpg' },
        { name: 'Keychains & Charms', slug: 'accessories', icon: 'vpn_key', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
        { name: 'Tech & Toiletry Kits', slug: 'travel-utility', icon: 'inventory_2', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg' },
        { name: 'Passport Holders', slug: 'accessories', icon: 'badge', img: '/uploads/seed/catalog/passport-atlas.jpg' },
      ],
    },
    {
      id: 'fragrance',
      name: 'Perfumes & Scents',
      slug: 'fragrance',
      icon: 'local_florist',
      img: '/uploads/seed/catalog/pf-oils-amber-green.jpg',
      badge: 'SCENTS',
      subcategories: [
        { name: 'All Perfumes', slug: 'fragrance', icon: 'local_florist', img: '/uploads/seed/catalog/pf-oils-amber-green.jpg' },
        { name: 'Eau de Parfum', slug: 'perfumes-eau-de-parfum', icon: 'local_florist', badge: 'SIGNATURE' },
        { name: 'Attars & Perfume Oils', slug: 'perfumes-attars', icon: 'water_drop', badge: 'ALCOHOL FREE' },
        { name: 'Travel Minis', slug: 'perfumes-minis', icon: 'luggage' },
      ],
    },
    {
      id: 'travel',
      name: 'Travel & Luggage',
      slug: 'travel-utility',
      icon: 'flight_takeoff',
      img: '/uploads/seed/cabin-hardshell.jpg',
      badge: 'TRAVEL',
      subcategories: [
        { name: 'All Travel', slug: 'travel-utility', icon: 'flight_takeoff', img: '/uploads/seed/cabin-hardshell.jpg' },
        { name: 'Cabin Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'TSA' },
        { name: 'Weekenders', slug: 'duffle-bags', icon: 'work', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Packing Organizers', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
      ],
    },
  ],
};

/**
 * High-Fashion Women's Categories & Subcategories.
 * In the circles: Women Categories ONLY.
 * Below the circles: Their Subcategories.
 */
export const CLOTHING_WOMEN_MENU = {
  key: 'women',
  title: "Women's Atelier",
  subtitle: "Sculptural Luxury Handbags & Ready-To-Wear",
  tag: "Italian Saffiano & Emerald Grain",
  categories: [
    {
      id: 'all',
      name: 'All Women',
      slug: '',
      icon: 'apps',
      img: '/uploads/seed/handbag-rose.jpg',
      badge: 'ALL',
      subcategories: [
        { name: 'Luxury Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg', badge: 'POPULAR' },
        { name: 'Dresses & Sundresses', slug: 'clothing-dresses', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'HOT' },
        { name: 'Work Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg' },
        { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: 'backpack', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Evening Clutches', slug: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg', badge: 'PARTY' },
        { name: 'Fashion Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
        { name: 'Wallets & Purses', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
        { name: 'Perfumes & Oils', slug: 'fragrance', icon: 'local_florist', img: '/uploads/seed/catalog/bottle-lilac.jpg' },
      ],
    },
    {
      id: 'handbags',
      name: 'Handbags & Purses',
      slug: 'women-handbags-purses',
      icon: 'shopping_bag',
      img: '/uploads/seed/handbag-sienna.jpg',
      badge: 'LUXE',
      subcategories: [
        { name: 'All Handbags', slug: 'women-handbags-purses', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg' },
        { name: 'Luxury Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg', badge: 'POPULAR' },
        { name: 'Work Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg', badge: 'DAILY' },
        { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: 'backpack', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Shoulder Bags', slug: 'shoulder-bags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg' },
        { name: 'Beach & Straw Bags', slug: 'beach-straw-bags', icon: 'beach_access', img: '/uploads/seed/catalog/straw-riviera.jpg' },
      ],
    },
    {
      id: 'clothing',
      name: 'Clothing & Dresses',
      slug: 'clothing',
      icon: 'checkroom',
      img: '/uploads/seed/catalog/cl-tees-rail.jpg',
      badge: 'DRESSES',
      subcategories: [
        { name: 'All Clothing', slug: 'clothing', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Dresses & Sundresses', slug: 'clothing-dresses', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'MUST HAVE' },
        { name: 'T-Shirts & Tops', slug: 'clothing-t-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-stack.jpg' },
        { name: 'Shirts & Blouses', slug: 'clothing-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Jackets & Outerwear', slug: 'clothing-jackets', icon: 'styler', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Knitwear & Sweaters', slug: 'clothing-knitwear', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-stack.jpg' },
        { name: 'Jeans & Pants', slug: 'clothing-jeans', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
      ],
    },
    {
      id: 'clutches',
      name: 'Clutches & Evening',
      slug: 'clutches',
      icon: 'account_balance_wallet',
      img: '/uploads/seed/clutch-espresso.jpg',
      badge: 'PARTY',
      subcategories: [
        { name: 'All Clutches', slug: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
        { name: 'Party Clutches', slug: 'clutches', icon: 'account_balance_wallet', badge: 'GLAM' },
        { name: 'Wedding Clutches', slug: 'clutches', icon: 'account_balance_wallet' },
        { name: 'Evening Pouches', slug: 'clutches', icon: 'inventory_2' },
      ],
    },
    {
      id: 'backpacks',
      name: 'Backpacks & Office',
      slug: 'women-backpacks',
      icon: 'backpack',
      img: '/uploads/seed/backpack-terracotta.jpg',
      badge: 'PACKS',
      subcategories: [
        { name: 'All Backpacks', slug: 'women-backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
        { name: 'Fashion Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-black.jpg' },
        { name: 'Laptop & Office Bags', slug: 'women-laptop-office-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'Mini Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
      ],
    },
    {
      id: 'wallets',
      name: 'Wallets & Small Leather',
      slug: 'women-wallets',
      icon: 'account_balance_wallet',
      img: '/uploads/seed/catalog/wallet-zip.jpg',
      badge: 'WALLETS',
      subcategories: [
        { name: 'All Wallets', slug: 'women-wallets', icon: 'account_balance_wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
        { name: 'Compact Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
        { name: 'Card Holders', slug: 'card-holders', icon: 'credit_card', img: '/uploads/seed/cardholder-tan.jpg' },
        { name: 'Coin Purses', slug: 'coin-purses', icon: 'savings', img: '/uploads/seed/catalog/raffia-tassel.jpg' },
      ],
    },
    {
      id: 'fragrance',
      name: 'Perfumes & Scents',
      slug: 'fragrance',
      icon: 'local_florist',
      img: '/uploads/seed/catalog/bottle-lilac.jpg',
      badge: 'SIGNATURE',
      subcategories: [
        { name: 'All Fragrances', slug: 'fragrance', icon: 'local_florist', img: '/uploads/seed/catalog/bottle-lilac.jpg' },
        { name: 'Eau de Parfum', slug: 'perfumes-eau-de-parfum', icon: 'local_florist', badge: 'FLORAL' },
        { name: 'Perfume Oils & Attars', slug: 'perfumes-attars', icon: 'water_drop' },
        { name: 'Travel Minis', slug: 'perfumes-minis', icon: 'luggage' },
      ],
    },
    {
      id: 'accessories',
      name: 'Accessories',
      slug: 'women-accessories',
      icon: 'watch',
      img: '/uploads/seed/catalog/raffia-tassel.jpg',
      badge: 'EDC',
      subcategories: [
        { name: 'All Accessories', slug: 'women-accessories', icon: 'watch', img: '/uploads/seed/catalog/raffia-tassel.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
        { name: 'Cosmetic & Jewelry Bags', slug: 'cosmetic-bags', icon: 'inventory_2', img: '/uploads/seed/cable-pouch.jpg' },
        { name: 'Keychains & Charms', slug: 'accessories', icon: 'vpn_key', img: '/uploads/seed/catalog/raffia-tassel.jpg' },
      ],
    },
    {
      id: 'travel',
      name: 'Travel Bags',
      slug: 'women-travel-bags',
      icon: 'flight_takeoff',
      img: '/uploads/seed/duffle-tan.jpg',
      badge: 'TRAVEL',
      subcategories: [
        { name: 'All Travel', slug: 'women-travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Weekender Bags', slug: 'duffle-bags', icon: 'work', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Cabin Bags', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
        { name: 'Travel Organizers', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
      ],
    },
  ],
};

/**
 * Bags Category & Subcategory Menu.
 * - Upper circles: Bag Categories ONLY.
 * - Below circles: Their Subcategories.
 */
export const CLOTHING_BAGS_MENU = {
  key: 'bags',
  title: 'Bags Atelier',
  subtitle: 'Luxury Bags, Backpacks & Travel Carry',
  tag: 'Full-Grain Leather & 1680D Ballistic Nylon',
  categories: [
    {
      id: 'all',
      name: 'All Bags',
      slug: '',
      icon: 'apps',
      img: '/uploads/seed/terminal-traveler.jpg',
      badge: 'ALL',
      subcategories: [
        { name: 'Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Handbags & Totes', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg', badge: 'LUXURY' },
        { name: 'Laptop & Office Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'Executive Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg', badge: 'WORK' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Cabin Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Sling & Crossbody', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Clutches & Evening', slug: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
        { name: 'Wallets & Organizers', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
      ],
    },
    {
      id: 'backpacks',
      name: 'Backpacks & Packs',
      slug: 'backpacks',
      icon: 'backpack',
      img: '/uploads/seed/backpack-black.jpg',
      badge: 'PACKS',
      subcategories: [
        { name: 'All Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-black.jpg' },
        { name: 'Laptop Backpacks', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'Everyday Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Travel Backpacks', slug: 'travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/apex-navy.jpg' },
        { name: 'College Backpacks', slug: 'daypacks', icon: 'school', img: '/uploads/seed/daypack-navy.jpg' },
        { name: 'Minimalist Daypacks', slug: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-grey.jpg' },
      ],
    },
    {
      id: 'handbags',
      name: 'Handbags & Totes',
      slug: 'handbags',
      icon: 'shopping_bag',
      img: '/uploads/seed/handbag-sienna.jpg',
      badge: 'TOTES',
      subcategories: [
        { name: 'All Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg' },
        { name: 'Everyday Work Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg', badge: 'BESTSELLER' },
        { name: 'Shoulder Bags', slug: 'shoulder-bags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg' },
        { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Luxury Structured Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-teal.jpg' },
        { name: 'Beach & Straw Totes', slug: 'beach-straw-bags', icon: 'beach_access', img: '/uploads/seed/catalog/straw-riviera.jpg' },
      ],
    },
    {
      id: 'laptop-bags',
      name: 'Laptop & Office',
      slug: 'laptop-bags',
      icon: 'laptop_mac',
      img: '/uploads/seed/catalog/laptop-sterling.jpg',
      badge: 'OFFICE',
      subcategories: [
        { name: 'All Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
        { name: 'Executive Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg', badge: 'EXECUTIVE' },
        { name: 'Messenger Bags', slug: 'messenger-bags', icon: 'work', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
        { name: 'Laptop Sleeves', slug: 'laptop-sleeves', icon: 'laptop', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' },
        { name: 'Tech Briefcases', slug: 'tech-briefcases', icon: 'business_center', img: '/uploads/seed/briefcase-black.jpg' },
      ],
    },
    {
      id: 'travel-bags',
      name: 'Travel & Luggage',
      slug: 'travel-bags',
      icon: 'flight_takeoff',
      img: '/uploads/seed/cabin-aluminium.jpg',
      badge: 'TRAVEL',
      subcategories: [
        { name: 'All Travel Carry', slug: 'travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Cabin Trolley Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'fitness_center', img: '/uploads/seed/catalog/duffle-highway.jpg' },
        { name: 'Weekender Bags', slug: 'weekender-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Travel Organizers', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
        { name: 'Toiletry Dopp Kits', slug: 'toiletry-kits', icon: 'sanitizer', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg' },
      ],
    },
    {
      id: 'slings',
      name: 'Slings & Crossbody',
      slug: 'crossbody-bags',
      icon: 'work',
      img: '/uploads/seed/catalog/crossbody-cloud.jpg',
      badge: 'EDC',
      subcategories: [
        { name: 'All Slings & Crossbody', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Messenger Bags', slug: 'messenger-bags', icon: 'work', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
        { name: 'Belt & Waist Bags', slug: 'belt-bags', icon: 'backpack', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
        { name: 'Compact Slings', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/crossbody-camera.jpg' },
      ],
    },
    {
      id: 'clutches',
      name: 'Clutches & Evening',
      slug: 'clutches',
      icon: 'account_balance_wallet',
      img: '/uploads/seed/clutch-espresso.jpg',
      badge: 'GLAM',
      subcategories: [
        { name: 'All Clutches', slug: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
        { name: 'Party Clutches', slug: 'clutches', icon: 'account_balance_wallet', badge: 'GLAM' },
        { name: 'Evening Pouches', slug: 'clutches', icon: 'inventory_2' },
      ],
    },
    {
      id: 'wallets',
      name: 'Wallets & Small Carry',
      slug: 'wallets',
      icon: 'wallet',
      img: '/uploads/seed/catalog/wallet-woodland.jpg',
      badge: 'LEATHER',
      subcategories: [
        { name: 'All Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
        { name: 'Bifold Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg', badge: 'BESTSELLER' },
        { name: 'Card Holders', slug: 'card-holders', icon: 'credit_card', img: '/uploads/seed/cardholder-tan.jpg' },
        { name: 'Zip Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-zip.jpg' },
        { name: 'Passport Holders', slug: 'passport-holders', icon: 'badge', img: '/uploads/seed/catalog/passport-atlas.jpg' },
      ],
    },
  ],
};

/**
 * Universal Category & Subcategory Menu.
 */
export const CLOTHING_UNIVERSAL_MENU = {
  key: 'universal',
  title: 'Universal Atelier',
  subtitle: 'Ergonomic Bags, Backpacks & Luggage for Everyone',
  tag: 'Hinomoto Silent Wheels & Water-Resistant Commuters',
  categories: [
    {
      id: 'all',
      name: 'All Universal',
      slug: '',
      icon: 'apps',
      img: '/uploads/seed/apex-navy.jpg',
      badge: 'ALL',
      subcategories: [
        { name: 'Ergonomic Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'HOT' },
        { name: 'Cabin Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Laptop Sleeves', slug: 'laptop-sleeves', icon: 'laptop', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' },
        { name: 'Daypacks', slug: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-navy.jpg' },
        { name: 'Accessories & Tech', slug: 'accessories', icon: 'watch', img: '/uploads/seed/cable-pouch.jpg' },
      ],
    },
    {
      id: 'backpacks',
      name: 'Backpacks',
      slug: 'backpacks',
      icon: 'backpack',
      img: '/uploads/seed/backpack-terracotta.jpg',
      badge: 'PACKS',
      subcategories: [
        { name: 'All Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
        { name: 'Airport Clamshell', slug: 'backpacks', icon: 'flight_takeoff', img: '/uploads/seed/apex-navy.jpg', badge: '180°' },
        { name: 'Laptop Packs', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
        { name: 'Daypacks', slug: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-navy.jpg' },
      ],
    },
    {
      id: 'luggage',
      name: 'Cabin Luggage',
      slug: 'cabin-luggage',
      icon: 'luggage',
      img: '/uploads/seed/cabin-aluminium.jpg',
      badge: 'SPINNERS',
      subcategories: [
        { name: 'All Cabin Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg' },
        { name: 'Aluminium Frame', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'PREMIUM' },
        { name: 'Polycarbonate Shell', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-hardshell.jpg' },
      ],
    },
    {
      id: 'duffle-bags',
      name: 'Travel Duffels',
      slug: 'duffle-bags',
      icon: 'flight_takeoff',
      img: '/uploads/seed/duffle-tan.jpg',
      badge: 'DUFFLES',
      subcategories: [
        { name: 'All Duffels', slug: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Weekender Bags', slug: 'weekender-bags', icon: 'work', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Gym & Sports Duffels', slug: 'duffle-bags', icon: 'fitness_center', img: '/uploads/seed/catalog/duffle-highway.jpg' },
      ],
    },
    {
      id: 'accessories',
      name: 'Accessories & EDC',
      slug: 'accessories',
      icon: 'watch',
      img: '/uploads/seed/cable-pouch.jpg',
      badge: 'TECH',
      subcategories: [
        { name: 'All Accessories', slug: 'accessories', icon: 'watch', img: '/uploads/seed/cable-pouch.jpg' },
        { name: 'Cable & Tech Pouches', slug: 'travel-utility', icon: 'cable', img: '/uploads/seed/cable-pouch.jpg' },
        { name: 'Packing Cubes', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
      ],
    },
  ],
};

/**
 * Top-of-page Category & Subcategory Navigation System for Bags, Men, and Women.
 * SPECIFICATION:
 * - IN CIRCLES: Categories ONLY.
 * - BELOW CIRCLES: Their Subcategories.
 */
export default function ClothingCategoryMenu({
  preset = 'men',
  selectedCategory = '',
  onSelectCategory,
  totalProductsCount = null,
}) {
  const menuConfig =
    preset === 'women'
      ? CLOTHING_WOMEN_MENU
      : preset === 'bags'
      ? CLOTHING_BAGS_MENU
      : preset === 'universal' || preset === 'unisex'
      ? CLOTHING_UNIVERSAL_MENU
      : CLOTHING_MEN_MENU;
  const scrollRef = useRef(null);

  // Active Category: match exact category slug or any child subcategory slug (specific categories take precedence over 'all')
  const [activeCatId, setActiveCatId] = useState(() => {
    if (!selectedCategory) return 'all';
    // 1. Check specific categories by slug
    for (const cat of menuConfig.categories) {
      if (cat.id !== 'all' && cat.slug && cat.slug === selectedCategory) return cat.id;
    }
    // 2. Check specific categories by their child subcategories
    for (const cat of menuConfig.categories) {
      if (cat.id !== 'all' && cat.subcategories?.some((s) => s.slug === selectedCategory)) return cat.id;
    }
    return 'all';
  });

  // Sync when selectedCategory or department changes
  useEffect(() => {
    if (!selectedCategory) {
      setActiveCatId('all');
      return;
    }
    for (const cat of menuConfig.categories) {
      if (cat.id !== 'all' && cat.slug && cat.slug === selectedCategory) {
        setActiveCatId(cat.id);
        return;
      }
    }
    for (const cat of menuConfig.categories) {
      if (cat.id !== 'all' && cat.subcategories?.some((s) => s.slug === selectedCategory)) {
        setActiveCatId(cat.id);
        return;
      }
    }
    setActiveCatId('all');
  }, [selectedCategory, menuConfig]);

  const activeCategory = useMemo(() => {
    return menuConfig.categories.find((c) => c.id === activeCatId) || menuConfig.categories[0];
  }, [menuConfig, activeCatId]);

  // Subcategories to show directly BELOW the circles
  const subcategoriesBelow = useMemo(() => {
    return activeCategory.subcategories || [];
  }, [activeCategory]);

  const handleCategoryCircleClick = (cat) => {
    setActiveCatId(cat.id);
    if (cat.id === 'all') {
      onSelectCategory?.('');
    } else if (cat.slug) {
      onSelectCategory?.(cat.slug);
    }
  };

  const handleSubcategoryClick = (subSlug) => {
    if (subSlug === selectedCategory) {
      // Toggle off: fall back to parent category slug if present, or all
      onSelectCategory?.(activeCategory.slug || '');
    } else {
      onSelectCategory?.(subSlug);
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest border-b border-surface-container-high shadow-xs">
      {/* ── 1. DEPARTMENT HEADER BANNER ── */}
      <div className="container-x py-2.5 border-b border-surface-container-high/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
          <h2 className="text-[13px] sm:text-[14px] font-black uppercase tracking-widest text-on-surface truncate">
            {menuConfig.title} &bull; {menuConfig.subtitle}
          </h2>
          <span className="hidden md:inline-block w-px h-3.5 bg-outline-variant/60 shrink-0" />
          <span className="hidden md:inline-block text-[11.5px] font-medium text-on-surface-variant truncate">
            {menuConfig.tag}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalProductsCount != null && (
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold border border-outline-variant/30">
              {totalProductsCount} items
            </span>
          )}
          {selectedCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory?.('')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Clear Filter</span>
              <Icon name="close" className="text-[12px]" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. IN CIRCLES: MEN / WOMEN CATEGORIES ONLY ── */}
      <div className="container-x pt-3.5 pb-2.5 select-none">
        <div className="flex items-baseline justify-between pb-2 mb-1 px-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-[11.5px] font-black uppercase tracking-[0.16em] text-on-surface">
              {preset === 'men' ? "Men's Categories" : preset === 'women' ? "Women's Categories" : preset === 'bags' ? "Bag Categories" : "Universal Categories"}
            </span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-secondary/15 text-secondary">
              Categories
            </span>
          </div>
          <span className="text-[10.5px] text-outline hidden xs:inline">
            Tap a category circle to view its subcategories below
          </span>
        </div>

        {/* Category Circles Carousel */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-x-auto scrollbar-none py-1.5 px-0.5 snap-x snap-mandatory touch-pan-x overscroll-x-contain">
          {menuConfig.categories.map((cat) => {
            const isCircleActive = activeCatId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryCircleClick(cat)}
                className="group snap-start flex flex-col items-center gap-1.5 shrink-0 w-[68px] sm:w-[76px] md:w-[84px] active:scale-95 transition-all text-center cursor-pointer"
                title={`View ${cat.name}`}
              >
                {/* The Category Circle */}
                <div
                  className={cn(
                    'relative p-[2.5px] rounded-full transition-all duration-300 shadow-sm',
                    isCircleActive
                      ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 scale-108 ring-2 ring-secondary ring-offset-2 ring-offset-surface shadow-md'
                      : 'bg-gradient-to-tr from-outline-variant/40 via-surface-container-high to-outline-variant/40 group-hover:from-rose-400 group-hover:to-indigo-500 group-hover:scale-105 opacity-90 group-hover:opacity-100'
                  )}
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-[68px] md:h-[68px] rounded-full overflow-hidden bg-surface-container-lowest p-[2px] flex items-center justify-center">
                    {cat.img ? (
                      <img
                        src={imgUrl(cat.img, 140)}
                        alt={cat.name}
                        loading="lazy"
                        className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <span className="w-full h-full rounded-full bg-surface-container flex items-center justify-center text-rose-600">
                        <Icon name={cat.icon} className="text-[22px]" />
                      </span>
                    )}
                  </div>

                  {cat.badge && (
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 px-1.5 py-0.2 rounded-full text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shadow-sm ring-1 ring-surface',
                        isCircleActive ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface'
                      )}
                    >
                      {cat.badge}
                    </span>
                  )}
                </div>

                {/* Category Circle Label */}
                <span
                  className={cn(
                    'text-[11px] sm:text-[11.5px] leading-tight transition-colors line-clamp-2 px-0.5',
                    isCircleActive ? 'font-black text-secondary' : 'font-semibold text-on-surface-variant group-hover:text-on-surface'
                  )}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. REST BELOW: SUBCATEGORIES FOR THE ACTIVE CATEGORY ── */}
      {subcategoriesBelow.length > 0 && (
        <div className="bg-surface-container-low/55 border-t border-surface-container-high/70 py-2.5">
          <div className="container-x">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Icon name="subdirectory_arrow_right" className="text-[14px]" />
                {activeCategory.name} &bull; Subcategories
              </span>
              <span className="text-[10.5px] text-outline hidden xs:inline">
                {subcategoriesBelow.length} subcategories &bull; Tap to filter
              </span>
            </div>

            {/* Horizontal Subcategory Ribbon */}
            <div
              ref={scrollRef}
              className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto scrollbar-none pb-1 pt-0.5 -mx-1 px-1 snap-x snap-mandatory overscroll-x-contain"
            >
              {/* "All [Category]" Quick Action */}
              <button
                type="button"
                onClick={() => {
                  if (activeCategory.slug) onSelectCategory?.(activeCategory.slug);
                  else onSelectCategory?.('');
                }}
                className={cn(
                  'snap-start px-3 py-1.5 rounded-full text-[11.5px] font-bold shrink-0 border transition-all cursor-pointer flex items-center gap-1.5',
                  selectedCategory === activeCategory.slug || (!selectedCategory && activeCategory.id === 'all')
                    ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102 ring-1 ring-secondary'
                    : 'bg-surface-container-lowest hover:bg-surface-container border-outline-variant/35 text-on-surface'
                )}
              >
                <Icon name="grid_view" className="text-[13px]" />
                <span>All {activeCategory.name}</span>
              </button>

              {/* Subcategories list */}
              {subcategoriesBelow.map((sub, idx) => {
                const isSelected = selectedCategory === sub.slug;
                return (
                  <button
                    key={`${sub.slug}-${idx}`}
                    type="button"
                    onClick={() => handleSubcategoryClick(sub.slug)}
                    className={cn(
                      'group snap-start flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200 shrink-0 text-left active:scale-95 cursor-pointer',
                      isSelected
                        ? 'bg-secondary text-on-secondary border-secondary shadow-xs scale-102 ring-1 ring-secondary'
                        : 'bg-surface-container-lowest hover:bg-surface-container border-outline-variant/35 text-on-surface hover:border-secondary/50'
                    )}
                  >
                    {/* Small Subcategory Thumb */}
                    <div className="w-5.5 h-5.5 rounded-full overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center">
                      {sub.img ? (
                        <img src={imgUrl(sub.img, 48)} alt={sub.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name={sub.icon || 'category'} className="text-[13px] text-on-surface-variant" />
                      )}
                    </div>

                    <span className={cn('text-[11.5px] font-semibold truncate', isSelected ? 'text-on-secondary font-bold' : 'text-on-surface')}>
                      {sub.name}
                    </span>

                    {sub.badge && (
                      <span className={cn('px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider', isSelected ? 'bg-on-secondary text-secondary' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400')}>
                        {sub.badge}
                      </span>
                    )}

                    {isSelected && <Icon name="check" className="text-[12px] text-on-secondary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
