import { useState } from 'react';
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

const TOPICS = ['Order status & delivery', 'Returns & exchanges', 'Lifetime repair claim', 'Product question', 'Partnerships & press', 'Something else'];

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
      <Seo title="Contact Customer Care" description="Questions about an order, a repair or a WILDTANE product? Email, call or message our care team — we reply within one business day." canonical="/contact" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Customer care</span>
            <h1 className="text-headline-xl-mobile md:text-headline-xl">We're here to help.</h1>
            <p className="text-body-md text-on-surface-variant">Questions about an order, a repair or a product? Our team replies within one business day.</p>
          </div>
          {[
            ['mail', 'Email', config?.supportEmail, config?.supportEmail && `mailto:${config.supportEmail}`],
            ['call', 'Phone', config?.supportPhone, config?.supportPhone && `tel:${config.supportPhone.replace(/\s/g, '')}`],
            ['schedule', 'Hours', 'Mon–Sat, 10:00–19:00 IST'],
            ['handyman', 'Repairs', 'Lifetime repair claims are free — choose "Lifetime repair claim" below.'],
          ].map(([icon, k, v, href]) => (
            <div key={k} className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-fixed flex items-center justify-center shrink-0"><Icon name={icon} /></span>
              <div>
                <p className="text-label-sm uppercase tracking-wider text-outline">{k}</p>
                {href ? <a href={href} className="text-body-md hover:text-secondary">{v}</a> : <p className="text-body-md">{v}</p>}
              </div>
            </div>
          ))}
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
