import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useUser } from '../hooks/useStore';
import { Button, CountrySelect, Field, Icon, Img, Input, Select, Textarea } from '../components/ui';
import { applyServerErrors } from './Auth';
import Seo from '../components/Seo';

const schema = z.object({
  company: z.string().trim().min(2, 'Enter the company name'),
  contactPerson: z.string().trim().min(2, 'Enter a contact name'),
  email: z.email('Enter a valid email'),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{6,20}$/, 'Enter a valid phone number'),
  country: z.string().length(2, 'Select a country'),
  address: z.string().trim().max(400).optional(),
  productType: z.string().min(2, 'Choose a product type'),
  quantity: z.coerce.number({ message: 'Enter a quantity' }).int().min(10, 'Bulk orders start at 10 units'),
  customization: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(2000).optional(),
});

const TYPES = ['Backpacks', 'Laptop Bags', 'Office Bags & Briefcases', 'Travel & Duffle Bags', 'Tote Bags', 'Sling Bags', 'Wallets & Accessories', 'Mixed gifting kits'];

export default function Corporate() {
  const user = useUser();
  const fileRef = useRef(null);
  const [logo, setLogo] = useState(null);
  const [done, setDone] = useState(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { contactPerson: user?.name || '', email: user?.email || '', country: user?.country || 'IN', quantity: 50 },
  });

  const onSubmit = async (values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => v !== undefined && fd.append(k, String(v)));
    if (logo) fd.append('logo', logo);
    try {
      const res = await api.corporate(fd);
      setDone(res.message);
      reset();
      setLogo(null);
    } catch (err) {
      applyServerErrors(err, setError);
      setError('root', { message: err.message });
    }
  };

  return (
    <>
      <Seo title="Corporate Gifting & Bulk Bag Orders" description="Custom-branded backpacks, laptop bags and leather gifts for teams and clients. Volume pricing from 10 units, debossed logos and pan-India dispatch." canonical="/corporate" image="/uploads/seed/briefcase-black.jpg" />
      <section className="relative bg-ink text-on-ink overflow-hidden">
        <Img src="/uploads/seed/briefcase-black.jpg" alt="" className="absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/90 to-transparent" />
        <div className="relative container-x py-space-xl lg:py-24 max-w-3xl mr-auto">
          <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Corporate bulk & gifting</span>
          <h1 className="text-headline-xl-mobile md:text-display-hero mt-2">Carry your brand, everywhere.</h1>
          <p className="text-body-xl text-on-ink/75 mt-space-md">Volume pricing from 10 units, custom debossing and woven labels, and dedicated account managers for onboarding kits, events and client gifting.</p>
        </div>
      </section>
      <div className="container-x py-space-xl grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          {[
            ['sell', 'Tiered volume pricing', 'Savings scale automatically from 10, 50 and 250 units.'],
            ['brush', 'Custom branding', 'Leather debossing, woven labels, metal plates and custom linings.'],
            ['inventory', 'Kitting & dispatch', 'Individually packed and shipped to every employee address.'],
            ['support_agent', 'Dedicated manager', 'Quotes within 48 hours and a single point of contact.'],
          ].map(([icon, t, d]) => (
            <div key={t} className="card p-space-md flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} /></span>
              <div><p className="text-label-lg">{t}</p><p className="text-body-sm text-on-surface-variant">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-8">
          {done ? (
            <div className="card p-space-xl flex flex-col items-center text-center gap-space-sm" role="status">
              <span className="w-16 h-16 rounded-full bg-secondary text-on-secondary flex items-center justify-center"><Icon name="task_alt" className="text-[32px]" /></span>
              <h2 className="text-headline-md">Enquiry received</h2>
              <p className="text-body-md text-on-surface-variant">{done}</p>
              <Button variant="tonal" onClick={() => setDone(null)}>Submit another enquiry</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="card p-space-lg md:p-space-xl grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
              <h2 className="md:col-span-2 text-headline-md">Request a quote</h2>
              {errors.root && <p className="md:col-span-2 p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm" role="alert">{errors.root.message}</p>}
              <Field label="Company" error={errors.company?.message} required><Input error={errors.company} {...register('company')} /></Field>
              <Field label="Contact person" error={errors.contactPerson?.message} required><Input error={errors.contactPerson} {...register('contactPerson')} /></Field>
              <Field label="Work email" error={errors.email?.message} required><Input type="email" error={errors.email} {...register('email')} /></Field>
              <Field label="Phone" error={errors.phone?.message} required><Input type="tel" placeholder="+91 98765 43210" error={errors.phone} {...register('phone')} /></Field>
              <Field label="Country" error={errors.country?.message} required><CountrySelect error={errors.country} {...register('country')} /></Field>
              <Field label="Company address"><Input {...register('address')} /></Field>
              <Field label="Product type" error={errors.productType?.message} required>
                <Select error={errors.productType} {...register('productType')}>
                  <option value="">Choose a product type</option>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Quantity" error={errors.quantity?.message} required><Input type="number" min={10} error={errors.quantity} {...register('quantity')} /></Field>
              <Field label="Customisation requirements" className="md:col-span-2"><Textarea rows={3} placeholder="Debossed logo on front panel, custom lining colour…" {...register('customization')} /></Field>
              <Field label="Logo (optional)" hint="PNG, JPG, SVG or PDF up to 5 MB" className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <Button type="button" variant="tonal" icon="upload" onClick={() => fileRef.current?.click()}>{logo ? 'Change file' : 'Upload logo'}</Button>
                  {logo && (
                    <span className="flex items-center gap-2 text-body-sm">
                      <Icon name="attach_file" className="text-[18px]" /> {logo.name}
                      <button type="button" className="text-error" onClick={() => setLogo(null)} aria-label="Remove file"><Icon name="close" className="text-[18px]" /></button>
                    </span>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && f.size > 5 * 1024 * 1024) setError('root', { message: 'Logo must be under 5 MB' });
                      else setLogo(f || null);
                      e.target.value = '';
                    }}
                  />
                </div>
              </Field>
              <Field label="Message" className="md:col-span-2"><Textarea rows={4} {...register('message')} /></Field>
              <Button type="submit" loading={isSubmitting} icon="send" className="md:col-span-2 md:justify-self-end">Submit enquiry</Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
