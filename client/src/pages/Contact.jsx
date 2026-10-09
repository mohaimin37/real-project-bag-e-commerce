import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useConfig, useUser } from '../hooks/useStore';
import { Button, Field, Icon, Input, Select, Textarea } from '../components/ui';
import { applyServerErrors } from './Auth';
import Seo from '../components/Seo';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.email('Enter a valid email'),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().min(3, 'Choose a topic'),
  orderId: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(3000),
});

const TOPICS = ['Order status & delivery', 'Returns & exchanges', 'Damaged or defective item', 'Product question', 'Partnerships & press', 'Something else'];

/**
 * Registered office and Grievance Officer, as the Consumer Protection (E-Commerce) Rules, 2020 require.
 * Filled from Admin → Settings → Store details; each card stays hidden until its details are set.
 */
function OfficeCards({ config }) {
  const address = config?.businessAddress?.trim() || 'A 370 Amar Puri Nabi Karim, Paharganj, New Delhi-110055';
  const companyName = config?.companyName || 'WILDTANE PRIVATE LIMITED';
  const gstin = config?.gstin || '07AAECW3767F1Z4';
  const phone = config?.supportPhone || '8920550465';
  const officer = config?.grievanceOfficer;
  return (
    <div className="grid gap-3">
      <section aria-labelledby="office-title" className="card p-space-md flex flex-col gap-2">
        <h2 id="office-title" className="flex items-center gap-2 text-label-lg uppercase tracking-wider text-outline">
          <Icon name="apartment" className="text-[20px] text-secondary" /> Registered Office
        </h2>
        <h3 className="text-body-lg font-bold text-on-surface uppercase">{companyName}</h3>
        <address className="not-italic text-body-md text-on-surface-variant whitespace-pre-line">{address}</address>
        <h4 className="text-body-sm font-semibold text-on-surface flex items-center gap-2 mt-1">
          GSTIN: <span className="font-mono font-bold text-secondary">{gstin}</span>
        </h4>
        <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
          Phone: <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold text-secondary hover:underline">{phone}</a>
        </p>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="btn-tonal btn-sm self-start mt-1">
          <Icon name="map" className="text-[18px]" /> Open in Maps
        </a>
      </section>
      {officer?.name && (
        <section aria-labelledby="grievance-title" className="card p-space-md flex flex-col gap-1.5">
          <h2 id="grievance-title" className="flex items-center gap-2 text-label-lg uppercase tracking-wider text-outline">
            <Icon name="gavel" className="text-[20px] text-secondary" /> Grievance Officer
          </h2>
          <h3 className="text-body-md font-semibold text-on-surface">{officer.name}{officer.designation ? <span className="font-normal text-on-surface-variant">, {officer.designation}</span> : null}</h3>
          {officer.email && <a href={`mailto:${officer.email}`} className="text-body-md hover:text-secondary inline-flex items-center gap-1.5 w-fit"><Icon name="mail" className="text-[18px]" /> {officer.email}</a>}
          {officer.phone && <a href={`tel:${officer.phone.replace(/\s/g, '')}`} className="text-body-md hover:text-secondary inline-flex items-center gap-1.5 w-fit"><Icon name="call" className="text-[18px]" /> {officer.phone}</a>}
          <p className="text-body-sm text-on-surface-variant">Complaints are acknowledged within 48 hours and resolved within 7 working days.</p>
        </section>
      )}
    </div>
  );
}

export default function Contact() {
  const user = useUser();
  const { data: config } = useConfig();
  const [done, setDone] = useState(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name || '', email: user?.email || '', phone: user?.phone?.number ? `${user.phone.dialCode} ${user.phone.number}` : '', subject: '' },
  });
  const onSubmit = async (values) => {
    try {
      const res = await api.contact(values);
      setDone(res.message);
      reset();
    } catch (err) {
      applyServerErrors(err, setError);
      setError('root', { message: err.message });
    }
  };

  return (
    <div className="container-x py-space-xl">
      <Seo title="Contact Customer Care" description="Questions about an order, a return or a WILDTANE product? Email, call or message our care team — we usually reply within 24–48 working hours." canonical="/contact" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Customer care</span>
            <h1 className="text-headline-xl-mobile md:text-headline-xl">We're here to help.</h1>
            <p className="text-body-md text-on-surface-variant">Questions about an order, a return or a product? Our team usually replies within 24–48 working hours.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/help" className="btn-tonal btn-sm"><Icon name="help" className="text-[18px]" /> Help Centre</Link>
            <Link to="/faq" className="btn-tonal btn-sm"><Icon name="quiz" className="text-[18px]" /> FAQs</Link>
          </div>
          {[
            ['mail', 'Email', config?.supportEmail || 'info@wildtane.com', `mailto:${config?.supportEmail || 'info@wildtane.com'}`],
            ['call', 'Phone', config?.supportPhone || '8920550465', `tel:${(config?.supportPhone || '8920550465').replace(/\s/g, '')}`],
            ['schedule', 'Customer care hours', config?.supportHours || 'Monday to Saturday, 10:00 am – 6:00 pm'],
            ['schedule', 'Response time', '24–48 working hours. Please share your Order ID, registered email or mobile number, and a clear description of the issue.'],
            ['inventory_2', 'Damaged item?', 'Record an unboxing video and tell us within 24 hours of delivery — choose "Damaged or defective item" below.'],
          ].filter(Boolean).map(([icon, k, v, href]) => (
            <div key={k} className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} /></span>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline">{k}</p>
                {href ? <a href={href} className="text-body-md hover:text-secondary">{v}</a> : <p className="text-body-md">{v}</p>}
              </div>
            </div>
          ))}
          <OfficeCards config={config} />
        </div>
        <div className="lg:col-span-7">
          {done ? (
            <div className="card p-space-xl flex flex-col items-center text-center gap-space-sm" role="status">
              <span className="w-16 h-16 rounded-full bg-secondary text-on-secondary flex items-center justify-center"><Icon name="mark_email_read" className="text-[32px]" /></span>
              <h2 className="text-headline-md">Message received</h2>
              <p className="text-body-md text-on-surface-variant">{done}</p>
              <Button variant="tonal" onClick={() => setDone(null)}>Send another message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="card p-space-lg md:p-space-xl grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
              {errors.root && <p className="md:col-span-2 p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm" role="alert">{errors.root.message}</p>}
              <Field label="Name" error={errors.name?.message} required><Input error={errors.name} {...register('name')} /></Field>
              <Field label="Email" error={errors.email?.message} required><Input type="email" error={errors.email} {...register('email')} /></Field>
              <Field label="Phone"><Input type="tel" {...register('phone')} /></Field>
              <Field label="Order ID" hint="If this is about an order"><Input placeholder="WT26-000123" {...register('orderId')} /></Field>
              <Field label="Topic" error={errors.subject?.message} required className="md:col-span-2">
                <Select error={errors.subject} {...register('subject')}>
                  <option value="">Choose a topic</option>
                  {TOPICS.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Message" error={errors.message?.message} required className="md:col-span-2">
                <Textarea rows={6} error={errors.message} {...register('message')} />
              </Field>
              <Button type="submit" loading={isSubmitting} icon="send" className="md:col-span-2 md:justify-self-end">Send message</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
