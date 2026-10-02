import { cn, formatDateTime } from '../lib/format';
import { Icon } from './ui';

const FLOW = ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const ICONS = {
  Pending: 'receipt_long',
  Confirmed: 'task_alt',
  Processing: 'precision_manufacturing',
  Packed: 'inventory_2',
  Shipped: 'local_shipping',
  'Out for Delivery': 'two_wheeler',
  Delivered: 'home',
  Cancelled: 'cancel',
  Returned: 'assignment_return',
};

/** Vertical timeline: completed steps from history, remaining steps greyed out. */
export default function OrderTimeline({ order }) {
  const history = order.statusHistory || [];
  const terminal = ['Cancelled', 'Returned'].includes(order.orderStatus);
  const reachedIdx = FLOW.indexOf(order.orderStatus);
  const steps = terminal
    ? [...history.map((h) => h.status)]
    : FLOW;

  return (
    <ol className="relative flex flex-col">
      {steps.map((status, i) => {
        const entry = [...history].reverse().find((h) => h.status === status);
        const done = terminal ? true : i <= reachedIdx;
        const current = status === order.orderStatus;
        const last = i === steps.length - 1;
        const bad = ['Cancelled', 'Returned'].includes(status);
        return (
          <li key={`${status}-${i}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
                  bad ? 'bg-error-container text-on-error-container' : done ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-outline',
                  current && !bad && 'ring-4 ring-secondary/20'
                )}
              >
                <Icon name={ICONS[status] || 'radio_button_checked'} className="text-[18px]" />
              </span>
              {!last && <span className={cn('w-0.5 flex-1 min-h-[24px]', done && !bad ? 'bg-secondary' : 'bg-surface-container-high')} />}
            </div>
            <div className={cn('pb-space-md pt-1.5', !done && 'opacity-50')}>
              <p className="text-label-lg">{status}</p>
              {entry && <p className="text-label-sm font-normal text-outline">{formatDateTime(entry.at)}</p>}
              {entry?.note && <p className="text-body-sm text-on-surface-variant mt-0.5">{entry.note}</p>}
              {entry?.changedBy?.name && <p className="text-label-sm font-normal text-outline">by {entry.changedBy.name}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
