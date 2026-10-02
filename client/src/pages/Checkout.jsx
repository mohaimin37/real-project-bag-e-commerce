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

const STEPS = ['Your details', 'Delivery address', 'How to pay', 'Check & order'];

function CheckoutHeader() {
  const { data: config } = useConfig();
  return (
    <div className="w-full bg-surface-container-lowest shadow-sm">
      <Seo title="Secure Checkout" noindex />
      <div className="container-x py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-space-md">
          <Link to="/" className="text-headline-md uppercase tracking-tight">WILDTANE</Link>
          <span className="h-4 w-px bg-surface-container-highest" />
          <span className="flex items-center gap-1.5 text-secondary text-label-sm uppercase tracking-wider bg-secondary/10 px-2.5 py-1 rounded-full">
            <Icon name="lock" className="text-[16px]" /> SSL encrypted
          </span>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant text-label-md">
          <span className="flex items-center gap-2">
            <Icon name="support_agent" className="text-secondary text-[18px]" /> Need help?
            {config?.supportPhone && <a href={`tel:${config.supportPhone.replace(/\s/g, '')}`} className="text-on-surface hover:text-secondary">{config.supportPhone}</a>}
          </span>
          <Link to="/cart" className="hidden sm:inline-flex items-center gap-1 hover:text-secondary"><Icon name="arrow_back" className="text-[16px]" /> Back to bag</Link>
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
  const user = useUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const money = useMoney();
  const { items, summary, isLoading, hasIssues, setShipping } = useCart();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState(null);
  const [addressChoice, setAddressChoice] = useState(null); // { addressId } | { address, saveAddress }
  const [adding, setAdding] = useState(false);
  const [payment, setPayment] = useState('cod');
  const [note, setNote] = useState('');

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

  const place = useMutation({
    mutationFn: () =>
      api.placeOrder({
        customer,
        ...addressChoice,
        shippingMethod: summary.shippingMethod.code,
        paymentMethod: payment,
        customerNote: note,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['addresses'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/order/${res.order.orderId}/success`, { replace: true });
    },
    onError: (err) => {
      toast.error(err.message, { duration: 6000 });
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  if (isLoading || addresses.isLoading) return <><CheckoutHeader /><PageLoader /></>;
  if (!items.length && !place.isPending) {
    return (
      <>
        <CheckoutHeader />
        <EmptyState className="py-24" icon="shopping_bag" title="Your bag is empty" description="Add something to your bag to check out." action={<Link to="/shop" className="btn-primary">Shop the collection</Link>} />
      </>
    );
  }

  const selectedAddress = addressChoice?.addressId ? addresses.data?.find((a) => a._id === addressChoice.addressId) : addressChoice?.address;
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
                <p className="text-body-sm text-on-surface-variant truncate">Signed in as <strong className="text-on-surface">{user.email}</strong></p>
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
            {step === 3 && customer && selectedAddress && (
              <section className="flex flex-col gap-space-md">
                <SectionTitle>Check & place your order</SectionTitle>
                <p className="text-body-md text-on-surface-variant -mt-2">Everything look right? Tap the big button below to order. You can change anything first.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {[
                    ['person', 'Your details', 0, [customer.name, `${customer.phone.dialCode} ${customer.phone.number}`, customer.email]],
                    ['home', 'We deliver to', 1, [selectedAddress.fullName, selectedAddress.addressLine1, selectedAddress.addressLine2, `${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`, countryName(selectedAddress.country)]],
                    ['payments', 'Payment & delivery', 2, [selectedPayment?.label, `${summary.shippingMethod.label} · ${summary.shippingMethod.eta}`]],
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
                {selectedPayment && !selectedPayment.available && (
                  <p className="p-space-md rounded-xl bg-error-container text-on-error-container text-body-sm" role="alert">
                    {selectedPayment.label} isn't available for this order. <button type="button" className="underline font-semibold" onClick={() => setStep(2)}>Choose another way to pay</button>
                  </p>
                )}
                {hasIssues && <p className="p-space-md rounded-xl bg-error-container text-on-error-container text-body-sm" role="alert">Some items in your bag changed. <Link to="/cart" className="underline">Review your bag</Link> before ordering.</p>}
                <Button variant="secondary" className="w-full h-14 text-body-md" icon="check_circle" loading={place.isPending} disabled={hasIssues || (selectedPayment && !selectedPayment.available)} onClick={() => place.mutate()}>
                  Place my order · {money(summary.grandTotal)}
                </Button>
                <p className="text-label-sm font-normal text-outline text-center -mt-2">You'll get an order number straight away and can track it from your account.</p>
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
            <SummaryRows summary={summary} />
            {step === 3 ? (
              <Button variant="secondary" className="w-full h-12" icon="lock" loading={place.isPending} disabled={hasIssues} onClick={() => place.mutate()}>
                Place order
              </Button>
            ) : (
              <p className="text-label-sm font-normal text-outline text-center">Complete the steps to place your order.</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center text-label-sm font-normal text-on-surface-variant">
              {[['verified_user', 'Lifetime warranty'], ['published_with_changes', '30-day returns'], ['co2', 'Carbon neutral']].map(([icon, label]) => (
                <div key={label} className="p-2 rounded-lg bg-surface-container-low flex flex-col items-center gap-1"><Icon name={icon} className="text-secondary text-[18px]" />{label}</div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
