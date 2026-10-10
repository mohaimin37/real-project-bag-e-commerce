import toast from 'react-hot-toast';
import { api } from './api';

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    const existing = document.getElementById('razorpay-checkout-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({ order, payment, customer, onSuccess, onDismiss, onFailure }) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error('Unable to load Razorpay payment gateway. Please check your internet connection.');
    if (onFailure) onFailure(new Error('Razorpay SDK failed to load'));
    return;
  }

  const options = {
    key: payment.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: payment.gatewayOrder.amount,
    currency: payment.gatewayOrder.currency || 'INR',
    name: 'WILDTANE',
    description: `Order #${order.orderId}`,
    image: '/brandlogo.jpeg',
    order_id: payment.gatewayOrder.id,
    handler: async (response) => {
      try {
        const verifyRes = await api.verifyPayment(order._id || order.id, {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        toast.success('Payment completed successfully!');
        if (onSuccess) onSuccess(verifyRes);
      } catch (err) {
        toast.error(err?.message || 'Payment verification failed');
        if (onFailure) onFailure(err);
      }
    },
    prefill: {
      name: customer?.name || order.customerName || '',
      email: customer?.email || order.email || '',
      contact: customer?.phone ? `${customer.phone.dialCode || '+91'}${customer.phone.number || ''}` : order.phone || '',
    },
    notes: {
      orderId: order.orderId,
    },
    theme: {
      color: '#0f172a',
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (response) => {
    toast.error(response.error?.description || 'Payment failed');
    if (onFailure) onFailure(response.error);
  });
  rzp.open();
}
