import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { Button, Field, Icon, Input, Modal } from '../ui';

export function BackInStockModal({ open, onClose, product, variant }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const registerMutation = useMutation({
    mutationFn: (body) => api.registerBackInStock(product._id, body),
    onSuccess: (data) => {
      toast.success(data.message || 'Alert registered! We will notify you when restocked.', { icon: '🔔' });
      setEmail('');
      setPhone('');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Could not register alert. Please check your email.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    registerMutation.mutate({
      email,
      phone,
      variantId: variant?._id,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Back in Stock Alert" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
          <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <Icon name="notifications_active" className="text-[24px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-label-md font-bold text-on-surface truncate">{product?.name}</p>
            {variant?.name && (
              <p className="text-[12px] text-outline">Selected variant: {variant.name}</p>
            )}
          </div>
        </div>

        <p className="text-body-sm text-on-surface-variant">
          This piece is currently handcrafted in limited batches. Enter your details to get an instant email alert the moment it returns to stock.
        </p>

        <Field label="Email Address" required>
          <Input
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="Phone (Optional for SMS / WhatsApp)">
          <Input
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="tonal" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon="notifications"
            loading={registerMutation.isPending}
          >
            Notify Me
          </Button>
        </div>
      </form>
    </Modal>
  );
}
