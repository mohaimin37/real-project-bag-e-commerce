import { Link } from 'react-router-dom';
import { Icon } from '../ui';
import { cn } from '../../lib/format';

/**
 * Breadcrumbs navigation component.
 * @param {Array<{ label: string, to?: string }>} items
 * @param {string} className
 */
export default function Breadcrumbs({ items = [], className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-xs text-on-surface-variant py-2 overflow-x-auto scrollbar-none', className)}>
      <ol className="flex items-center space-x-1.5 whitespace-nowrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <Icon name="chevron_right" className="text-[14px] text-outline mx-1 flex-shrink-0" />
              )}
              {index === 0 && (
                <Icon name="home" className="text-[14px] mr-1 text-outline flex-shrink-0" />
              )}
              {isLast || !item.to ? (
                <span className="font-semibold text-on-surface truncate max-w-[200px] sm:max-w-[320px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="hover:text-secondary transition-colors truncate max-w-[150px] sm:max-w-[200px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
