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
      img: '/uploads/seed/catalog/backpack-hudson.jpg',
      badge: 'BAGS',
      subcategories: [
        { name: 'All Men Bags', slug: 'men-bags', icon: 'backpack', img: '/uploads/seed/catalog/backpack-hudson.jpg' },
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
      id: 'work',
      name: 'Work & Office',
      slug: 'women-laptop-office-bags',
      icon: 'business_center',
      img: '/uploads/seed/catalog/laptop-sterling.jpg',
      badge: 'WORK',
      subcategories: [
        { name: 'Fashion Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/catalog/backpack-hudson.jpg', badge: 'POPULAR' },
        { name: 'Office Laptop Bags', slug: 'women-laptop-office-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'Work Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg' },
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
      id: 'work',
      name: 'Work & Office',
      slug: 'office-bags',
      icon: 'business_center',
      img: '/uploads/seed/briefcase-oxford.jpg',
      badge: 'WORK',
      subcategories: [
        { name: 'Laptop Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/catalog/backpack-hudson.jpg', badge: 'TECH' },
        { name: 'Executive Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg', badge: 'EXECUTIVE' },
        { name: 'Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg' },
        { name: 'Messenger Bags', slug: 'messenger-bags', icon: 'work', img: '/uploads/seed/catalog/messenger-dalton.jpg' },
        { name: 'Laptop Sleeves', slug: 'laptop-sleeves', icon: 'laptop', img: '/uploads/seed/catalog/sleeve-saddle-tan.jpg' },
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
      id: 'travel-bags',
      name: 'Travel & Luggage',
      slug: 'travel-bags',
      icon: 'flight_takeoff',
      img: '/uploads/seed/cabin-aluminium.jpg',
      badge: 'TRAVEL',
      subcategories: [
        { name: 'All Travel Carry', slug: 'travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Cabin Trolley Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Travel Backpacks', slug: 'backpacks', icon: 'flight_takeoff', img: '/uploads/seed/apex-navy.jpg' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'fitness_center', img: '/uploads/seed/catalog/duffle-highway.jpg' },
        { name: 'Weekender Bags', slug: 'weekender-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Travel Organizers', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
        { name: 'Toiletry Dopp Kits', slug: 'toiletry-kits', icon: 'sanitizer', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg' },
      ],
    },
    {
      id: 'casual',
      name: 'Daily & Casual',
      slug: 'crossbody-bags',
      icon: 'work',
      img: '/uploads/seed/catalog/crossbody-cloud.jpg',
      badge: 'CASUAL',
      subcategories: [
        { name: 'Everyday Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'College Backpacks', slug: 'daypacks', icon: 'school', img: '/uploads/seed/daypack-navy.jpg' },
        { name: 'Minimalist Daypacks', slug: 'daypacks', icon: 'hiking', img: '/uploads/seed/daypack-grey.jpg' },
        { name: 'Sling & Crossbody', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Belt & Waist Bags', slug: 'belt-bags', icon: 'backpack', img: '/uploads/seed/catalog/beltbag-grey.jpg' },
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
      id: 'commute',
      name: 'Commute & Office',
      slug: 'laptop-bags',
      icon: 'business_center',
      img: '/uploads/seed/catalog/laptop-sterling.jpg',
      badge: 'COMMUTE',
      subcategories: [
        { name: 'Ergonomic Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
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
 * Grand Atelier - All Collections (Categories in Circles, Subcategories Below)
 * For the main shop, all products, and universal browsing.
 */
export const CLOTHING_ALL_MENU = {
  key: 'all',
  title: 'All Collections',
  subtitle: 'Luxury Bags, Apparel, Leather & Fragrance',
  tag: 'Full-Grain Italian Leather & 1680D Ballistic',
  categories: [
    {
      id: 'all',
      name: 'All Store',
      slug: '',
      icon: 'apps',
      img: '/uploads/seed/terminal-traveler.jpg',
      badge: 'ALL',
      subcategories: [
        { name: 'Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Luxury Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg', badge: 'LUXE' },
        { name: 'Office Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'T-Shirts & Tops', slug: 'clothing-t-shirts', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-stack.jpg', badge: 'HOT' },
        { name: 'Executive Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg', badge: 'WORK' },
        { name: 'Cabin Trolley Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Bifold Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg', badge: 'BESTSELLER' },
        { name: 'Dresses & Sundresses', slug: 'clothing-dresses', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'NEW' },
        { name: 'Perfumes & Fragrances', slug: 'fragrance', icon: 'local_florist', img: '/uploads/seed/catalog/pf-oils-amber-green.jpg' },
        { name: 'Crossbody & Slings', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
      ],
    },
    {
      id: 'bags',
      name: 'Bags & Packs',
      slug: 'backpacks',
      icon: 'backpack',
      img: '/uploads/seed/catalog/backpack-hudson.jpg',
      badge: 'BAGS',
      subcategories: [
        { name: 'All Bags', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/catalog/backpack-hudson.jpg' },
        { name: 'Laptop Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg', badge: 'POPULAR' },
        { name: 'Handbags & Totes', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-sienna.jpg', badge: 'LUXE' },
        { name: 'Office Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'Executive Briefcases', slug: 'office-bags', icon: 'business_center', img: '/uploads/seed/briefcase-oxford.jpg' },
        { name: 'Crossbody & Slings', slug: 'crossbody-bags', icon: 'work', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
      ],
    },
    {
      id: 'men',
      name: "Men's Atelier",
      slug: 'men-bags',
      icon: 'man',
      img: '/uploads/seed/briefcase-black.jpg',
      badge: 'MEN',
      subcategories: [
        { name: 'All Men Bags', slug: 'men-bags', icon: 'backpack', img: '/uploads/seed/catalog/backpack-hudson.jpg' },
        { name: 'Office Laptop Bags', slug: 'laptop-bags', icon: 'laptop_mac', img: '/uploads/seed/catalog/laptop-sterling.jpg', badge: 'TECH' },
        { name: 'T-Shirts & Tees', slug: 'clothing-t-shirts', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-stack.jpg', badge: 'HOT' },
        { name: 'Jackets & Blazers', slug: 'clothing-jackets', icon: 'styler', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Bifold Wallets', slug: 'wallets', icon: 'wallet', img: '/uploads/seed/catalog/wallet-woodland.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
      ],
    },
    {
      id: 'women',
      name: "Women's Atelier",
      slug: 'women-handbags-purses',
      icon: 'woman',
      img: '/uploads/seed/handbag-rose.jpg',
      badge: 'WOMEN',
      subcategories: [
        { name: 'Luxury Handbags', slug: 'handbags', icon: 'shopping_bag', img: '/uploads/seed/handbag-rose.jpg', badge: 'POPULAR' },
        { name: 'Dresses & Sundresses', slug: 'clothing-dresses', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'HOT' },
        { name: 'Work Totes', slug: 'tote-bags', icon: 'shopping_basket', img: '/uploads/seed/tote-ochre.jpg' },
        { name: 'Crossbody Bags', slug: 'crossbody-bags', icon: 'backpack', img: '/uploads/seed/catalog/crossbody-cloud.jpg' },
        { name: 'Evening Clutches', slug: 'clutches', icon: 'account_balance_wallet', img: '/uploads/seed/clutch-espresso.jpg' },
        { name: 'Fashion Backpacks', slug: 'backpacks', icon: 'backpack', img: '/uploads/seed/backpack-terracotta.jpg' },
      ],
    },
    {
      id: 'clothing',
      name: 'Clothing & Apparel',
      slug: 'clothing',
      icon: 'checkroom',
      img: '/uploads/seed/catalog/cl-tees-rail.jpg',
      badge: 'APPAREL',
      subcategories: [
        { name: 'All Clothing', slug: 'clothing', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'T-Shirts & Tops', slug: 'clothing-t-shirts', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-stack.jpg', badge: 'HOT' },
        { name: 'Dresses & Sundresses', slug: 'clothing-dresses', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg', badge: 'NEW' },
        { name: 'Shirts & Blouses', slug: 'clothing-shirts', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Jackets & Outerwear', slug: 'clothing-jackets', icon: 'styler', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
        { name: 'Knitwear & Hoodies', slug: 'clothing-knitwear', icon: 'checkroom', img: '/uploads/seed/catalog/cl-tees-stack.jpg' },
        { name: 'Jeans & Denim', slug: 'clothing-jeans', icon: 'apparel', img: '/uploads/seed/catalog/cl-tees-rail.jpg' },
      ],
    },
    {
      id: 'travel',
      name: 'Travel & Luggage',
      slug: 'travel-bags',
      icon: 'flight_takeoff',
      img: '/uploads/seed/cabin-aluminium.jpg',
      badge: 'TRAVEL',
      subcategories: [
        { name: 'All Travel Carry', slug: 'travel-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Cabin Trolley Luggage', slug: 'cabin-luggage', icon: 'luggage', img: '/uploads/seed/cabin-aluminium.jpg', badge: 'AIRPORT' },
        { name: 'Travel Backpacks', slug: 'backpacks', icon: 'flight_takeoff', img: '/uploads/seed/apex-navy.jpg' },
        { name: 'Travel Duffels', slug: 'duffle-bags', icon: 'fitness_center', img: '/uploads/seed/catalog/duffle-highway.jpg' },
        { name: 'Weekender Bags', slug: 'weekender-bags', icon: 'flight_takeoff', img: '/uploads/seed/duffle-tan.jpg' },
        { name: 'Packing Organizers', slug: 'travel-organisers', icon: 'inventory_2', img: '/uploads/seed/packing-cube.jpg' },
      ],
    },
    {
      id: 'wallets',
      name: 'Wallets & Leather',
      slug: 'wallets',
      icon: 'account_balance_wallet',
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
        { name: 'Attars & Perfume Oils', slug: 'perfumes-attars', icon: 'water_drop', badge: 'PURE' },
        { name: 'Travel Minis', slug: 'perfumes-minis', icon: 'luggage' },
      ],
    },
    {
      id: 'accessories',
      name: 'Accessories & EDC',
      slug: 'accessories',
      icon: 'watch',
      img: '/uploads/seed/catalog/keyset-onyx.jpg',
      badge: 'EDC',
      subcategories: [
        { name: 'All Accessories', slug: 'accessories', icon: 'watch', img: '/uploads/seed/catalog/keyset-onyx.jpg' },
        { name: 'Leather Belts', slug: 'belts', icon: 'styler', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
        { name: 'Keychains & Charms', slug: 'accessories', icon: 'vpn_key', img: '/uploads/seed/catalog/keyfob-brown.jpg' },
        { name: 'Tech & Toiletry Kits', slug: 'travel-utility', icon: 'inventory_2', img: '/uploads/seed/catalog/dopp-heritage-brown.jpg' },
      ],
    },
  ],
};

const DEPARTMENT_THEMES = {
  all: {
    accentGradient: 'from-rose-600 via-amber-600 to-indigo-600',
    ringActive: 'from-rose-500 via-amber-500 to-indigo-500',
    headerBadge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    pulseColor: 'bg-rose-500',
    activeCircleRing: 'ring-rose-500',
    activeSubBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
    labelAccent: 'text-rose-600 dark:text-rose-400',
    categoryTag: "Grand Atelier",
  },
  men: {
    accentGradient: 'from-amber-500 via-rose-500 to-indigo-600',
    ringActive: 'from-amber-500 via-orange-500 to-rose-600',
    headerBadge: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    pulseColor: 'bg-amber-500',
    activeCircleRing: 'ring-amber-500',
    activeSubBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    labelAccent: 'text-amber-700 dark:text-amber-400',
    categoryTag: "Men's Atelier",
  },
  women: {
    accentGradient: 'from-rose-500 via-pink-500 to-purple-600',
    ringActive: 'from-rose-500 via-pink-400 to-purple-500',
    headerBadge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    pulseColor: 'bg-rose-500',
    activeCircleRing: 'ring-rose-500',
    activeSubBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
    labelAccent: 'text-rose-600 dark:text-rose-400',
    categoryTag: "Women's Atelier",
  },
  bags: {
    accentGradient: 'from-amber-600 via-orange-500 to-rose-600',
    ringActive: 'from-amber-600 via-orange-500 to-rose-500',
    headerBadge: 'bg-amber-600/15 text-amber-700 dark:text-amber-300 border-amber-600/30',
    pulseColor: 'bg-amber-600',
    activeCircleRing: 'ring-amber-600',
    activeSubBadge: 'bg-amber-600/20 text-amber-800 dark:text-amber-200',
    labelAccent: 'text-amber-700 dark:text-amber-300',
    categoryTag: "Bag Atelier",
  },
  universal: {
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    ringActive: 'from-emerald-500 via-teal-400 to-cyan-500',
    headerBadge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    pulseColor: 'bg-emerald-500',
    activeCircleRing: 'ring-emerald-500',
    activeSubBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    labelAccent: 'text-emerald-600 dark:text-emerald-400',
    categoryTag: "Universal Atelier",
  },
};

/**
 * Top-of-page Category & Subcategory Navigation System for Bags, Men, and Women.
 * SPECIFICATION:
 * - UPPER PORTION IN CIRCLES: Categories ONLY.
 * - BELOW CIRCLES: Their Subcategories.
 */
export default function ClothingCategoryMenu({
  preset = 'all',
  selectedCategory = '',
  onSelectCategory,
  totalProductsCount = null,
}) {
  const normalizedPreset =
    preset === 'unisex'
      ? 'universal'
      : preset === 'new' || preset === 'bestsellers' || !preset
      ? 'all'
      : preset;
  const menuConfig =
    normalizedPreset === 'women'
      ? CLOTHING_WOMEN_MENU
      : normalizedPreset === 'bags'
      ? CLOTHING_BAGS_MENU
      : normalizedPreset === 'universal'
      ? CLOTHING_UNIVERSAL_MENU
      : normalizedPreset === 'men'
      ? CLOTHING_MEN_MENU
      : CLOTHING_ALL_MENU;

  const theme = DEPARTMENT_THEMES[normalizedPreset] || DEPARTMENT_THEMES.all;

  const circlesRef = useRef(null);
  const subcatsRef = useRef(null);

  // Active Category: match exact category slug or any child subcategory slug
  const [activeCatId, setActiveCatId] = useState(() => {
    if (!selectedCategory) return 'all';
    for (const cat of menuConfig.categories) {
      if (cat.id !== 'all' && cat.slug && cat.slug === selectedCategory) return cat.id;
    }
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

  const scrollCircles = (dir) => {
    circlesRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  const scrollSubcats = (dir) => {
    subcatsRef.current?.scrollBy({ left: dir * 260, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-surface-container-lowest border-b border-surface-container-high/70 shadow-2xs relative">
      {/* ── 1. COMPACT DEPARTMENT HEADER BANNER (Laptop-Friendly & Sharp) ── */}
      <div className="max-w-[1536px] mx-auto px-3 sm:px-6 py-1.5 sm:py-2 border-b border-surface-container-high/60 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('w-2 h-2 rounded-full', theme.pulseColor)} />
            <span className={cn('px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border', theme.headerBadge)}>
              {theme.categoryTag}
            </span>
          </div>

          <h2 className="text-[13px] sm:text-[14px] font-black uppercase tracking-wide text-on-surface truncate">
            {menuConfig.title}
            <span className="hidden sm:inline text-on-surface-variant font-medium text-[12px]"> &bull; {menuConfig.subtitle}</span>
          </h2>

          <span className="hidden xl:inline-block w-px h-3 bg-outline-variant/60 shrink-0" />
          <span className="hidden xl:inline-block text-[11px] font-medium text-on-surface-variant truncate">
            {menuConfig.tag}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalProductsCount != null && (
            <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold border border-outline-variant/30">
              {totalProductsCount} pieces
            </span>
          )}
          {selectedCategory && (
            <button
              type="button"
              onClick={() => onSelectCategory?.('')}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/30 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <span>Clear Filter</span>
              <Icon name="close" className="text-[12px]" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. UPPER PORTION: CATEGORIES IN CIRCLES (Compact, Laptop-Friendly & Crisp) ── */}
      <div className="max-w-[1536px] mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-1.5 select-none">
        <div className="flex items-center justify-between pb-1 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-on-surface">
              {normalizedPreset === 'men' ? "Men's Collections" : normalizedPreset === 'women' ? "Women's Collections" : normalizedPreset === 'bags' ? "Bag Collections" : normalizedPreset === 'universal' ? "Universal Collections" : "All Collections"}
            </span>
            <span className="text-[8.5px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30">
              Categories
            </span>
          </div>
          <span className="text-[10.5px] text-outline hidden md:inline">
            Click any category circle to filter subcategories below
          </span>
        </div>

        {/* Carousel Container with Chevrons */}
        <div className="relative group/circles">
          {/* Left Arrow on Desktop */}
          <button
            type="button"
            onClick={() => scrollCircles(-1)}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/50 items-center justify-center text-on-surface hover:text-secondary hover:bg-surface-container active:scale-95 transition-all cursor-pointer opacity-0 group-hover/circles:opacity-100"
            aria-label="Scroll categories left"
          >
            <Icon name="chevron_left" className="text-[18px]" />
          </button>

          {/* Right Arrow on Desktop */}
          <button
            type="button"
            onClick={() => scrollCircles(1)}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/50 items-center justify-center text-on-surface hover:text-secondary hover:bg-surface-container active:scale-95 transition-all cursor-pointer opacity-0 group-hover/circles:opacity-100"
            aria-label="Scroll categories right"
          >
            <Icon name="chevron_right" className="text-[18px]" />
          </button>

          {/* Category Circles Carousel */}
          <div
            ref={circlesRef}
            className="flex items-start gap-2.5 sm:gap-3.5 md:gap-4 overflow-x-auto scrollbar-none py-1 px-0.5 snap-x snap-mandatory touch-pan-x overscroll-x-contain"
          >
            {menuConfig.categories.map((cat) => {
              const isCircleActive = activeCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryCircleClick(cat)}
                  className="group snap-start flex flex-col items-center gap-1.5 shrink-0 w-[58px] sm:w-[64px] md:w-[70px] lg:w-[74px] active:scale-95 transition-all text-center cursor-pointer relative"
                  title={`View ${cat.name}`}
                >
                  {/* The Category Circle Frame */}
                  <div
                    className={cn(
                      'relative p-[2px] rounded-full transition-all duration-200 shadow-2xs',
                      isCircleActive
                        ? 'ring-2 ring-secondary ring-offset-2 ring-offset-surface-container-lowest shadow-sm'
                        : 'ring-1 ring-outline-variant/50 hover:ring-secondary/70 bg-surface-container'
                    )}
                  >
                    {/* Inner Circular Photo */}
                    <div className="w-[46px] h-[46px] sm:w-[52px] sm:h-[52px] md:w-[56px] md:h-[56px] lg:w-[60px] lg:h-[60px] rounded-full overflow-hidden bg-surface-container-lowest p-[1.5px] flex items-center justify-center relative shadow-inner">
                      {cat.img ? (
                        <img
                          src={imgUrl(cat.img, 140)}
                          alt={cat.name}
                          loading="lazy"
                          className="w-full h-full rounded-full object-cover transition-opacity duration-300"
                        />
                      ) : (
                        <span className="w-full h-full rounded-full bg-surface-container flex items-center justify-center text-secondary">
                          <Icon name={cat.icon} className="text-[20px]" />
                        </span>
                      )}
                    </div>

                    {/* Micro-Badge Pill */}
                    {cat.badge && (
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 px-1 py-0.2 rounded-full text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider shadow-2xs ring-1 ring-surface',
                          isCircleActive
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-surface-container-highest text-on-surface'
                        )}
                      >
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  {/* Category Circle Label & Indicator */}
                  <div className="flex flex-col items-center gap-0.5 min-h-[26px]">
                    <span
                      className={cn(
                        'text-[10.5px] sm:text-[11px] leading-tight transition-colors line-clamp-2 px-0.5',
                        isCircleActive
                          ? 'font-black text-secondary'
                          : 'font-semibold text-on-surface-variant group-hover:text-on-surface'
                      )}
                    >
                      {cat.name}
                    </span>

                    {/* Active Indicator Underline */}
                    {isCircleActive && (
                      <span className="w-3.5 h-0.5 rounded-full bg-secondary mt-0.5 shadow-2xs" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. BELOW PORTION: SUBCATEGORIES FOR THE ACTIVE CATEGORY (Compact & Laptop-Friendly) ── */}
      {subcategoriesBelow.length > 0 && (
        <div className="bg-surface-container-low/40 border-t border-surface-container-high/60 py-1.5 sm:py-2 relative">
          <div className="max-w-[1536px] mx-auto px-3 sm:px-6">
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <span className="text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wide text-secondary flex items-center gap-1">
                <Icon name="subdirectory_arrow_right" className="text-[13px]" />
                <span className="text-on-surface font-black">{activeCategory.name}</span>
                <span className="text-outline font-medium">&bull; Subcategories</span>
              </span>
              <span className="text-[10px] sm:text-[10.5px] text-outline hidden xs:inline">
                {subcategoriesBelow.length} styles available &bull; 1-click filter
              </span>
            </div>

            {/* Horizontal Subcategory Ribbon with Desktop Chevrons */}
            <div className="relative group/subcats">
              {/* Left Arrow on Desktop */}
              <button
                type="button"
                onClick={() => scrollSubcats(-1)}
                className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/50 items-center justify-center text-on-surface hover:text-secondary hover:bg-surface-container active:scale-95 transition-all cursor-pointer opacity-0 group-hover/subcats:opacity-100"
                aria-label="Scroll subcategories left"
              >
                <Icon name="chevron_left" className="text-[15px]" />
              </button>

              {/* Right Arrow on Desktop */}
              <button
                type="button"
                onClick={() => scrollSubcats(1)}
                className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-30 w-6 h-6 rounded-full bg-surface-container-lowest shadow-md border border-outline-variant/50 items-center justify-center text-on-surface hover:text-secondary hover:bg-surface-container active:scale-95 transition-all cursor-pointer opacity-0 group-hover/subcats:opacity-100"
                aria-label="Scroll subcategories right"
              >
                <Icon name="chevron_right" className="text-[15px]" />
              </button>

              {/* Scrollable Subcategories Track */}
              <div
                ref={subcatsRef}
                className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 pt-0.5 px-0.5 snap-x snap-mandatory overscroll-x-contain touch-pan-x"
              >
                {/* "All [Category]" Quick Action Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeCategory.slug) onSelectCategory?.(activeCategory.slug);
                    else onSelectCategory?.('');
                  }}
                  className={cn(
                    'snap-start px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border transition-colors cursor-pointer flex items-center gap-1 shadow-2xs',
                    selectedCategory === activeCategory.slug || (!selectedCategory && activeCategory.id === 'all')
                      ? 'bg-secondary text-on-secondary border-secondary shadow-xs ring-1 ring-secondary/40'
                      : 'bg-surface-container-lowest hover:bg-surface-container border-outline-variant/35 text-on-surface'
                  )}
                >
                  <Icon name="grid_view" className="text-[13px]" />
                  <span>All {activeCategory.name}</span>
                </button>

                {/* Individual Subcategory Pills */}
                {subcategoriesBelow.map((sub, idx) => {
                  const isSelected = selectedCategory === sub.slug;
                  return (
                    <button
                      key={`${sub.slug}-${idx}`}
                      type="button"
                      onClick={() => handleSubcategoryClick(sub.slug)}
                      className={cn(
                        'group snap-start flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full border transition-colors shrink-0 text-left active:scale-95 cursor-pointer shadow-2xs',
                        isSelected
                          ? 'bg-secondary text-on-secondary border-secondary shadow-xs ring-1 ring-secondary/40'
                          : 'bg-surface-container-lowest hover:bg-surface-container border-outline-variant/35 text-on-surface hover:border-secondary/50'
                      )}
                    >
                      {/* Round Subcategory Avatar Thumb */}
                      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-surface-container-high flex items-center justify-center ring-1 ring-surface shadow-2xs">
                        {sub.img ? (
                          <img src={imgUrl(sub.img, 48)} alt={sub.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name={sub.icon || 'category'} className="text-[12px] text-on-surface-variant" />
                        )}
                      </div>

                      <span className={cn('text-[11px] sm:text-[11.5px] font-semibold truncate', isSelected ? 'text-on-secondary font-bold' : 'text-on-surface')}>
                        {sub.name}
                      </span>

                      {sub.badge && (
                        <span className={cn('px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider', isSelected ? 'bg-on-secondary text-secondary' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400')}>
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
        </div>
      )}
    </div>
  );
}

