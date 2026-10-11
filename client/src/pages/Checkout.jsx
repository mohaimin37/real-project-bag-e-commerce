import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { cn } from '../lib/format';
import { countryName } from '../lib/countries';
import { useCart } from '../hooks/useCart';
import { useConfig, useMoney, useUser } from '../hooks/useStore';
import { AddressCard, AddressForm, emptyAddress } from '../components/AddressForm';
import { Button, CountrySelect, EmptyState, Field, Icon, Img, Input, PageLoader, PhoneInput, Textarea } from '../components/ui';
import { CouponBox, SummaryRows } from './Cart';
import Seo from '../components/Seo';
import { UseCoinsCard } from '../components/coins';
import { LogoMark } from '../components/Brand';

const STEPS = ['Your details', 'Delivery address', 'How to pay', 'Check & order'];

function loadRazorpayScript() {
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

function CheckoutHeader() {
  const { data: config } = useConfig();
  return (
    <div className="w-full bg-surface-container-lowest shadow-sm">
      <Seo title="Secure Checkout" noindex />
      <div className="container-x py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-space-md">
          <Link to="/" className="flex items-center gap-2.5" aria-label="WILDTANE home">
            <LogoMark className="w-8 h-8 md:w-9 md:h-9 shrink-0" />
            <h1 className="font-serif tracking-widest font-black text-xl md:text-2xl text-on-surface uppercase select-none">
              WILDTANE
            </h1>
          </Link>
          <span className="h-4 w-px bg-surface-container-highest" />
          <span className="flex items-center gap-1.5 text-secondary text-label-sm uppercase tracking-wider bg-secondary/10 px-2.5 py-1 rounded-full">
            <Icon name="lock" className="text-[16px]" /> SSL encrypted
          </span>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant text-label-md">
          <span className="flex items-center gap-2">
            <Icon name="support_agent" className="text-secondary text-[18px]" /> Need help?
            <a href={`tel:${(config?.supportPhone || '8920550465').replace(/\s/g, '')}`} className="text-on-surface hover:text-secondary font-medium">
              {config?.supportPhone || '8920550465'}
            </a>
          </span>
          <Link to="/cart" className="inline-flex items-center gap-1 hover:text-secondary text-label-md font-medium"><Icon name="arrow_back" className="text-[16px]" /> Back to bag</Link>
          <Link to="/" className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface"><Icon name="home" className="text-[16px]" /> Home</Link>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step, setStep }) {
  return (
    <section className="w-full bg-surface-container-low py-5 shadow-sm">
      <ol className="container-x grid grid-cols-2 md:grid-cols-4 gap-4">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label}>
              <button type="button" disabled={!done} onClick={() => setStep(i)} className={cn('flex items-center gap-3 text-left w-full', !done && !current && 'opacity-60', done && 'hover:opacity-80')} aria-current={current ? 'step' : undefined}>
                <span className={cn('w-8 h-8 rounded-full flex items-center justify-center text-label-md shrink-0 shadow-sm', done ? 'bg-secondary text-on-secondary' : current ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant')}>
                  {done ? <Icon name="check" className="text-[18px]" /> : i + 1}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className={cn('text-label-sm uppercase tracking-wider', current || done ? 'text-secondary' : 'text-outline')}>{current ? 'Current' : `Step 0${i + 1}`}</span>
                  <span className="text-label-lg md:text-headline-sm truncate">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email'),
  phone: z.object({ dialCode: z.string(), number: z.string().trim().regex(/^[0-9\s-]{5,16}$/, 'Enter a valid phone number') }),
  country: z.string().length(2, 'Select your country'),
  nationality: z.string().length(2, 'Select your nationality'),
});

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary" />
        <h2 className="text-headline-md">{children}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useUser();
  const money = useMoney();
  const { items, summary, isLoading, hasIssues, setShipping, setUseCoins } = useCart();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [addressChoice, setAddressChoice] = useState(null); // { addressId } | { address, saveAddress }
  const [adding, setAdding] = useState(false);
  const [payment, setPayment] = useState('razorpay');
  const [note, setNote] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardPin, setGiftCardPin] = useState('');
  const [giftCardData, setGiftCardData] = useState(null); // verified gift card info
  const [giftCardVerifying, setGiftCardVerifying] = useState(false);

  const addresses = useQuery({ queryKey: ['addresses'], queryFn: api.addresses, select: (d) => d.addresses });
  const methods = useQuery({ queryKey: ['payment-methods', summary?.grandTotal], queryFn: api.paymentMethods, select: (d) => d.methods, enabled: Boolean(summary) });

  const customerForm = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: { dialCode: user?.phone?.dialCode || '+91', number: user?.phone?.number || '' },
      country: user?.country || 'IN',
      nationality: user?.nationality || 'IN',
    },
  });

  useEffect(() => {
    if (user) {
      customerForm.reset({
        name: user.name || '',
        email: user.email || '',
        phone: { dialCode: user.phone?.dialCode || '+91', number: user.phone?.number || '' },
        country: user.country || 'IN',
        nationality: user.nationality || 'IN',
      });
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (methods.data?.length) {
      const currentMethod = methods.data.find((m) => m.code === payment);
      if (!currentMethod || !currentMethod.available) {
        const firstAvail = methods.data.find((m) => m.available);
        if (firstAvail) setPayment(firstAvail.code);
      }
    }
  }, [methods.data, payment]);

  useEffect(() => {
    if (addresses.data && !addressChoice) {
      const def = addresses.data.find((a) => a.isDefault) || addresses.data[0];
      if (def) {
        setAddressChoice({ addressId: def._id });
        // Returning shoppers with complete details and a saved address go straight to the
        // final check: one button to order, with "Change" links if anything needs editing.
        const details = customerForm.getValues();
        if (customerSchema.safeParse(details).success) {
          setCustomer(details);
          setStep(3);
        }
      } else setAdding(true);
    }
  }, [addresses.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const [submitting, setSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (submitting) return;
    const formVals = customerForm.getValues();
    const resolvedCustomer = customer || {
      name: formVals.name || user?.name || '',
      email: formVals.email || user?.email || '',
      phone: {
        dialCode: formVals.phone?.dialCode || user?.phone?.dialCode || '+91',
        number: formVals.phone?.number || user?.phone?.number || '',
      },
      country: formVals.country || user?.country || 'IN',
      nationality: formVals.nationality || user?.nationality || 'IN',
    };

    if (!resolvedCustomer.name || !resolvedCustomer.email || !resolvedCustomer.phone?.number) {
      toast.error('Please enter customer contact details before placing order');
      setStep(0);
      return;
    }

    if (!selectedAddress) {
      toast.error('Please select or add a delivery address');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      if (payment === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error('Unable to load Razorpay payment gateway. Please check your connection.');
          setSubmitting(false);
          return;
        }

        // 1. Create gateway payment session without creating an order in database
        const initRes = await api.initiateOnlinePayment({
          shippingMethod: summary?.shippingMethod?.code || 'standard',
        });

        const options = {
          key: initRes.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: initRes.gatewayOrder.amount,
          currency: initRes.gatewayOrder.currency || 'INR',
          name: 'WILDTANE',
          description: 'Secure Order Payment',
          image: '/brandlogo.jpeg',
          order_id: initRes.gatewayOrder.id,
          handler: async (response) => {
            // Payment succeeded! Only now do we create and record the order in the database!
            try {
              const orderRes = await api.placeOrder({
                customer: resolvedCustomer,
                ...addressChoice,
                shippingMethod: summary?.shippingMethod?.code || 'standard',
                paymentMethod: 'razorpay',
                customerNote: note,
                paymentDetails: {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
              });

              qc.invalidateQueries({ queryKey: ['cart'] });
              qc.invalidateQueries({ queryKey: ['addresses'] });
              qc.invalidateQueries({ queryKey: ['orders'] });
              qc.invalidateQueries({ queryKey: ['my-coins'] });

              toast.success('Payment verified & order placed successfully!');
              navigate(`/order/${orderRes.order.orderId}/success`, { replace: true });
            } catch (err) {
              toast.error(err.message || 'Payment received but failed to record order. Please contact support.');
              setSubmitting(false);
            }
          },
          prefill: {
            name: resolvedCustomer.name,
            email: resolvedCustomer.email,
            contact: `${resolvedCustomer.phone?.dialCode || '+91'}${resolvedCustomer.phone?.number || ''}`,
          },
          theme: {
            color: '#0f172a',
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              toast('Payment window closed. Your items remain safe in your bag — retry online payment or choose Cash on Delivery.', { icon: '🛍️' });
            },
            escape: true,
            backdropclose: true,
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          setSubmitting(false);
          toast.error(response.error?.description || 'Payment was declined or failed. Please try again.');
        });
        rzp.open();
      } else if (payment === 'giftcard') {
        // Gift Card: validate code first, then place order
        if (!giftCardData) {
          toast.error('Please verify your gift card code first.');
          setSubmitting(false);
          return;
        }
        const orderRes = await api.placeOrder({
          customer: resolvedCustomer,
          ...addressChoice,
          shippingMethod: summary?.shippingMethod?.code || 'standard',
          paymentMethod: 'giftcard',
          customerNote: note,
          giftCard: { code: giftCardData.code, pin: giftCardPin },
        });
        qc.invalidateQueries({ queryKey: ['cart'] });
        qc.invalidateQueries({ queryKey: ['addresses'] });
        qc.invalidateQueries({ queryKey: ['orders'] });
        qc.invalidateQueries({ queryKey: ['my-coins'] });
        toast.success('Order placed with gift card!');
        navigate(`/order/${orderRes.order.orderId}/success`, { replace: true });
      } else {
        // COD: Place order directly
        const orderRes = await api.placeOrder({
          customer: resolvedCustomer,
          ...addressChoice,
          shippingMethod: summary?.shippingMethod?.code || 'standard',
          paymentMethod: payment,
          customerNote: note,
        });

        qc.invalidateQueries({ queryKey: ['cart'] });
        qc.invalidateQueries({ queryKey: ['addresses'] });
        qc.invalidateQueries({ queryKey: ['orders'] });
        qc.invalidateQueries({ queryKey: ['my-coins'] });

        toast.success('Order placed successfully!');
        navigate(`/order/${orderRes.order.orderId}/success`, { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order. Please try again.');
      qc.invalidateQueries({ queryKey: ['cart'] });
      setSubmitting(false);
    }
  };

  if (isLoading || addresses.isLoading) return <><CheckoutHeader /><PageLoader /></>;
  if (!items.length && !submitting) {
    return (
      <>
        <CheckoutHeader />
        <EmptyState className="py-24" icon="shopping_bag" title="Your bag is empty" description="Add something to your bag to check out." action={<Link to="/shop" className="btn-primary">Shop the collection</Link>} />
      </>
    );
  }

  const selectedAddress = addressChoice?.addressId
    ? addresses.data?.find((a) => a._id === addressChoice.addressId)
    : (addressChoice?.address || (addresses.data?.length ? addresses.data[0] : null));
  const currentCustomer = customer || customerForm.getValues();
  const selectedPayment = methods.data?.find((m) => m.code === payment);

  return (
    <div className="min-h-screen bg-surface">
      <CheckoutHeader />
      <Stepper step={step} setStep={setStep} />
      <div className="container-x py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
          <div className="lg:col-span-7 flex flex-col gap-space-xl">
            <div className="card p-space-lg flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name="verified_user" /></div>
                <p className="text-body-sm text-on-surface-variant truncate">Signed in as <strong className="text-on-surface">{user?.email}</strong></p>
              </div>
            </div>

            {/* Step 1: customer */}
            {step === 0 && (
              <section className="card p-space-lg md:p-space-xl flex flex-col gap-space-lg">
                <SectionTitle>Customer information</SectionTitle>
                <form
                  className="grid grid-cols-1 md:grid-cols-2 gap-space-md"
                  onSubmit={customerForm.handleSubmit((v) => {
                    setCustomer(v);
                    setStep(1);
                  })}
                  noValidate
                >
                  <Field label="Full name" error={customerForm.formState.errors.name?.message} required htmlFor="c-name">
                    <Input id="c-name" autoComplete="name" error={customerForm.formState.errors.name} {...customerForm.register('name')} />
                  </Field>
                  <Field label="Email for dispatch notices" error={customerForm.formState.errors.email?.message} required htmlFor="c-email">
                    <Input id="c-email" type="email" autoComplete="email" error={customerForm.formState.errors.email} {...customerForm.register('email')} />
                  </Field>
                  <Field label="Mobile number" error={customerForm.formState.errors.phone?.number?.message} required className="md:col-span-2">
                    <PhoneInput dialProps={customerForm.register('phone.dialCode')} numberProps={customerForm.register('phone.number')} error={customerForm.formState.errors.phone?.number} />
                  </Field>
                  <Field label="Country of residence" error={customerForm.formState.errors.country?.message} required>
                    <CountrySelect error={customerForm.formState.errors.country} {...customerForm.register('country')} />
                  </Field>
                  <Field label="Nationality" error={customerForm.formState.errors.nationality?.message} required>
                    <CountrySelect error={customerForm.formState.errors.nationality} {...customerForm.register('nationality')} />
                  </Field>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" iconRight="arrow_forward">Continue to shipping</Button>
                  </div>
                </form>
              </section>
            )}

            {/* Step 2: address + shipping method */}
            {step === 1 && (
              <>
                <section className="flex flex-col gap-space-md">
                  <SectionTitle
                    action={
                      !adding && (
                        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-label-md text-secondary hover:underline">
                          <Icon name="add_circle" className="text-[16px]" /> Add new address
                        </button>
                      )
                    }
                  >
                    Shipping destination
                  </SectionTitle>
                  {addresses.data?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                      {addresses.data.map((a) => (
                        <AddressCard
                          key={a._id}
                          address={a}
                          selected={addressChoice?.addressId === a._id}
                          onSelect={() => {
                            setAddressChoice({ addressId: a._id });
                            setAdding(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {adding && (
                    <div className="card p-space-lg md:p-space-xl flex flex-col gap-space-lg">
                      <h3 className="text-headline-sm">Recipient & dispatch information</h3>
                      <AddressForm
                        defaultValues={addressChoice?.address || emptyAddress({ ...user, ...customer })}
                        submitLabel="Use this address"
                        showDefault={false}
                        onCancel={addresses.data?.length ? () => setAdding(false) : undefined}
                        onSubmit={async (values) => {
                          const saved = await api.addAddress(values);
                          qc.setQueryData(['addresses'], { addresses: saved.addresses });
                          setAddressChoice({ addressId: saved.address._id });
                          setAdding(false);
                          toast.success('Address saved to your account');
                        }}
                      />
                    </div>
                  )}
                </section>

                <section className="flex flex-col gap-space-md">
                  <SectionTitle>Delivery speed</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {summary?.shippingMethods?.map((m) => (
                      <label key={m.code} className={cn('flex items-start gap-3 p-space-md rounded-2xl cursor-pointer transition-all', summary.shippingMethod.code === m.code ? 'bg-surface-container-lowest shadow-lift ring-2 ring-secondary' : 'bg-surface-container-low hover:bg-surface-container-lowest')}>
                        <input type="radio" name="shipping" className="mt-1 accent-primary" checked={summary.shippingMethod.code === m.code} onChange={() => setShipping.mutate(m.code)} />
                        <span className="flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-headline-sm">{m.label}</span>
                            <span className="text-label-lg">{m.price ? money(m.price) : <span className="text-secondary">Free</span>}</span>
                          </span>
                          <span className="block text-body-sm text-on-surface-variant">{m.description}</span>
                          <span className="block text-label-sm text-secondary mt-1">{m.eta}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
                <div className="flex justify-between">
                  <Button variant="tonal" icon="arrow_back" onClick={() => setStep(0)}>Back</Button>
                  <Button iconRight="arrow_forward" disabled={!addressChoice || adding} onClick={() => setStep(2)}>Continue to payment</Button>
                </div>
              </>
            )}

            {/* Step 3: payment */}
            {step === 2 && (
              <section className="flex flex-col gap-space-md">
                <SectionTitle>Payment method</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {methods.data?.map((m) => (
                    <label key={m.code} className={cn('flex flex-col gap-2 p-space-md rounded-2xl transition-all', m.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', payment === m.code ? 'bg-surface-container-lowest shadow-lift ring-2 ring-secondary' : 'bg-surface-container-low')}>
                      <span className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <input type="radio" name="payment" className="accent-primary" disabled={!m.available} checked={payment === m.code} onChange={() => setPayment(m.code)} />
                          <Icon name={m.icon} className="text-secondary" />
                          <span className="text-label-lg">{m.label}</span>
                        </span>
                        {!m.available && <span className="text-label-sm px-2 py-0.5 rounded bg-surface-container-highest">{m.reason === 'Coming soon' ? 'Soon' : 'N/A'}</span>}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">{m.available ? m.description : m.reason}</span>
                    </label>
                  ))}
                </div>
                {selectedPayment?.code === 'cod' && (
                  <div className="p-space-md rounded-2xl bg-secondary-container/30 flex items-start gap-3 text-body-sm">
                    <Icon name="info" className="text-secondary" />
                    <p>Pay {money.inr(summary.grandTotal)} in cash or by UPI to the courier at delivery. No card details are collected or stored.</p>
                  </div>
                )}
                {selectedPayment?.code === 'razorpay' && (
                  <div className="p-space-md rounded-2xl bg-secondary-container/30 flex items-start gap-3 text-body-sm">
                    <Icon name="verified_user" className="text-secondary" />
                    <p>Pay securely via UPI (Google Pay, PhonePe, Paytm), Credit / Debit Cards, Net Banking or Wallets through Razorpay with 256-bit encryption.</p>
                  </div>
                )}
                {selectedPayment?.code === 'giftcard' && (
                  <div className="flex flex-col gap-3">
                    <div className="p-space-md rounded-2xl bg-secondary-container/30 flex items-start gap-3 text-body-sm">
                      <Icon name="card_giftcard" className="text-secondary" />
                      <p>Enter your WILDTANE gift card code to check available balance and pay.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Field label="Gift Card Code" htmlFor="gc-code">
                        <div className="flex gap-2">
                          <Input
                            id="gc-code"
                            placeholder="e.g. GIFT-XXXX-XXXX"
                            value={giftCardCode}
                            onChange={(e) => { setGiftCardCode(e.target.value.toUpperCase()); setGiftCardData(null); }}
                            className="flex-1"
                          />
                          <button
                            type="button"
                            disabled={!giftCardCode.trim() || giftCardVerifying}
                            onClick={async () => {
                              setGiftCardVerifying(true);
                              try {
                                const res = await api.verifyGiftCard({ code: giftCardCode.trim(), pin: giftCardPin });
                                setGiftCardData(res.giftCard);
                                toast.success(res.message || 'Gift card verified!');
                              } catch (err) {
                                setGiftCardData(null);
                                toast.error(err.message || 'Invalid gift card code');
                              } finally {
                                setGiftCardVerifying(false);
                              }
                            }}
                            className="btn-primary px-4 h-11 rounded-xl text-[13px] font-bold shrink-0 disabled:opacity-50"
                          >
                            {giftCardVerifying ? 'Checking…' : 'Verify'}
                          </button>
                        </div>
                      </Field>
                      <Field label="PIN (if set)" htmlFor="gc-pin">
                        <Input
                          id="gc-pin"
                          type="password"
                          placeholder="4-digit PIN (optional)"
                          value={giftCardPin}
                          onChange={(e) => { setGiftCardPin(e.target.value); setGiftCardData(null); }}
                          maxLength={6}
                        />
                      </Field>
                      {giftCardData && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                          <Icon name="check_circle" className="text-[22px] text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-bold text-[13px] text-emerald-900 dark:text-emerald-200">Gift Card Verified ✓</p>
                            <p className="text-[12px] text-on-surface-variant mt-0.5">Available balance: <strong className="text-emerald-700 dark:text-emerald-300">₹{giftCardData.balance?.toLocaleString('en-IN')}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Field label="Order note (optional)" htmlFor="note">

                  <Textarea id="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Delivery instructions, gift message…" />
                </Field>
                <div className="flex justify-between">
                  <Button variant="tonal" icon="arrow_back" onClick={() => setStep(1)}>Back</Button>
                  <Button iconRight="arrow_forward" disabled={!selectedPayment?.available} onClick={() => setStep(3)}>Review order</Button>
                </div>
              </section>
            )}

            {/* Step 4: review */}
            {step === 3 && (
              <section className="flex flex-col gap-space-md">
                <SectionTitle>Check & place your order</SectionTitle>
                <p className="text-body-md text-on-surface-variant -mt-2">Everything look right? Tap the big button below to order. You can change anything first.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {[
                    ['person', 'Your details', 0, [(currentCustomer?.name || user?.name || 'Customer'), `${currentCustomer?.phone?.dialCode || user?.phone?.dialCode || '+91'} ${currentCustomer?.phone?.number || user?.phone?.number || ''}`, (currentCustomer?.email || user?.email || '')]],
                    ['home', 'We deliver to', 1, selectedAddress ? [selectedAddress.fullName, selectedAddress.addressLine1, selectedAddress.addressLine2, `${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`, countryName(selectedAddress.country)] : ['No address selected']],
                    ['payments', 'Payment & delivery', 2, [selectedPayment?.label, `${summary?.shippingMethod?.label || 'Standard'} · ${summary?.shippingMethod?.eta || ''}`]],
                  ].map(([icon, title, s, lines]) => (
                    <div key={title} className="card p-space-md flex flex-col gap-1 min-w-0 break-words [overflow-wrap:anywhere]">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="flex items-center gap-1.5 min-w-0 text-label-sm uppercase tracking-wider text-outline"><Icon name={icon} className="text-[18px] text-secondary shrink-0" /> {title}</span>
                        <button type="button" onClick={() => setStep(s)} className="shrink-0 whitespace-nowrap text-label-md text-secondary hover:underline px-2 py-1 -mr-2 -mt-1">Change</button>
                      </div>
                      {lines.filter(Boolean).map((l) => <span key={l} className="text-body-sm text-on-surface-variant first:text-on-surface first:font-semibold">{l}</span>)}
                    </div>
                  ))}
                </div>
                {payment === 'cod' && selectedPayment?.available && (
                  <p className="flex items-center gap-2 p-space-md rounded-xl bg-secondary-container/40 text-body-sm">
                    <Icon name="payments" className="text-secondary" /> Pay <strong>{money(summary.grandTotal)}</strong> in cash when your bag arrives. Nothing to pay now.
                  </p>
                )}
                {payment === 'razorpay' && selectedPayment?.available && (
                  <p className="flex items-center gap-2 p-space-md rounded-xl bg-secondary-container/40 text-body-sm">
                    <Icon name="lock" className="text-secondary" /> You will be redirected to the secure Razorpay popup to pay <strong>{money(summary.grandTotal)}</strong> via UPI, Card or Net Banking.
                  </p>
                )}
                {selectedPayment && !selectedPayment.available && (
                  <p className="p-space-md rounded-xl bg-error-container text-on-error-container text-body-sm" role="alert">
                    {selectedPayment.label} isn't available for this order. <button type="button" className="underline font-semibold" onClick={() => setStep(2)}>Choose another way to pay</button>
                  </p>
                )}
                {hasIssues && <p className="p-space-md rounded-xl bg-error-container text-on-error-container text-body-sm" role="alert">Some items in your bag changed. <Link to="/cart" className="underline">Review your bag</Link> before ordering.</p>}
                <Button variant="secondary" className="w-full h-14 text-body-md" icon={payment === 'razorpay' ? 'lock' : 'check_circle'} loading={submitting} disabled={hasIssues || submitting || (selectedPayment && !selectedPayment.available)} onClick={handlePlaceOrder}>
                  {payment === 'razorpay' ? `Pay online · ${money(summary.grandTotal)}` : `Place my order · ${money(summary.grandTotal)}`}
                </Button>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button variant="tonal" icon="arrow_back" onClick={() => setStep(2)}>
                    Back to payment
                  </Button>
                  <Link to="/cart" className="btn btn-tonal text-label-md flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface">
                    <Icon name="shopping_bag" className="text-[17px] text-secondary" /> Return to bag
                  </Link>
                </div>
                <p className="text-label-sm font-normal text-outline text-center">You'll get an order number straight away and can track it from your account.</p>
              </section>
            )}
          </div>

          {/* Order summary */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 card p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm">Order summary</h2>
              <Link to="/cart" className="text-label-md text-secondary hover:underline">Edit bag</Link>
            </div>
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {items.map((l) => (
                <div key={l._id} className="flex gap-3 items-center">
                  <div className="relative shrink-0">
                    <Img src={l.image} alt="" className="w-16 h-16 rounded-lg" />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-inverse-surface text-inverse-on-surface text-[10px] font-bold flex items-center justify-center">{l.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-lg truncate">{l.name}</p>
                    <p className="text-label-sm font-normal text-outline">{l.variant?.name}</p>
                    {l.issue && <p className="text-label-sm text-error">{l.issue}</p>}
                  </div>
                  <span className="text-label-lg">{money(l.lineTotal)}</span>
                </div>
              ))}
            </div>
            <CouponBox />
            <UseCoinsCard summary={summary} busy={setUseCoins.isPending} onToggle={(use) => setUseCoins.mutate(use)} />
            <SummaryRows summary={summary} />
            {step === 3 ? (
              <Button variant="secondary" className="w-full h-12" icon="lock" loading={submitting} disabled={hasIssues || submitting || (selectedPayment && !selectedPayment.available)} onClick={handlePlaceOrder}>
                {payment === 'razorpay' ? 'Pay now' : 'Place order'}
              </Button>
            ) : (
              <p className="text-label-sm font-normal text-outline text-center">Complete the steps to place your order.</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center text-label-sm font-normal text-on-surface-variant">
              {[['lock', 'Secure checkout'], ['published_with_changes', '7-day returns'], ['local_shipping', 'Tracked delivery']].map(([icon, label]) => (
                <div key={label} className="p-2 rounded-lg bg-surface-container-low flex flex-col items-center gap-1"><Icon name={icon} className="text-secondary text-[18px]" />{label}</div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
