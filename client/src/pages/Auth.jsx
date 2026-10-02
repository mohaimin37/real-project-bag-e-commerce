import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthActions } from '../hooks/useAuth';
import { Button, CountrySelect, Field, Icon, Img, Input, PhoneInput } from '../components/ui';
import Seo from '../components/Seo';

const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

/** Maps server field errors (details[]) onto react-hook-form fields. */
export function applyServerErrors(err, setError) {
  (err.details || []).forEach((d) => d.field && setError(d.field, { message: d.message }));
}

function useNext() {
  const [params] = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') ? next : null;
}

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="container-x py-space-xl lg:py-16 grid lg:grid-cols-2 gap-gutter-lg items-center">
      <Seo title={title.replace(/\.$/, '')} noindex />
      <div className="hidden lg:block relative h-[620px] rounded-3xl overflow-hidden shadow-lift">
        <Img w={640} src="/uploads/seed/terminal-traveler.jpg" alt="" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white flex flex-col gap-3">
          <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Member benefits</span>
          <h2 className="text-headline-lg">Your gear, your journeys, one account.</h2>
          <ul className="flex flex-col gap-2 text-body-sm text-white/80">
            {['Saved addresses for faster checkout', 'Order tracking and one-tap reorders', 'Lifetime repair claims in a click', 'Early access to limited drops'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check_circle" className="text-[18px] text-secondary-fixed" /> {t}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="w-full max-w-md mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-1">
          <h1 className="text-headline-xl-mobile md:text-headline-lg">{title}</h1>
          {subtitle && <p className="text-body-md text-on-surface-variant">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className="text-body-sm text-on-surface-variant text-center">{footer}</div>}
      </div>
    </div>
  );
}

function PasswordInput({ error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} error={error} className="pr-11" {...props} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon w-8 h-8" aria-label={show ? 'Hide password' : 'Show password'}>
        <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[20px]" />
      </button>
    </div>
  );
}

export function Login() {
  const { login } = useAuthActions();
  const navigate = useNavigate();
  const next = useNext();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ email: z.email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })),
  });
  const onSubmit = async (values) => {
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate(next || (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      setError('root', { message: err.message });
    }
  };
  return (
    <AuthShell title="Welcome back." subtitle="Sign in to track orders, save addresses and check out faster. Store admins sign in here too." footer={<>New to WILDTANE? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-secondary font-semibold hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md" noValidate>
        {errors.root && <p className="p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-2" role="alert"><Icon name="error" /> {errors.root.message}</p>}
        <Field label="Email" error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message} htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" error={errors.password} {...register('password')} />
        </Field>
        <Link to="/forgot-password" className="text-label-md text-secondary hover:underline self-end -mt-2">Forgot password?</Link>
        <Button type="submit" loading={isSubmitting} className="h-12">Sign in</Button>
      </form>
    </AuthShell>
  );
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.email('Enter a valid email'),
    phone: z.object({ dialCode: z.string(), number: z.string().trim().regex(/^[0-9\s-]{5,16}$/, 'Enter a valid phone number') }),
    country: z.string().length(2, 'Select your country'),
    nationality: z.string().length(2, 'Select your nationality'),
    password: passwordRule,
    confirm: z.string(),
    terms: z.literal(true, { message: 'Please accept the terms' }),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export function Register() {
  const { register: signUp } = useAuthActions();
  const navigate = useNavigate();
  const next = useNext();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: { dialCode: '+91', number: '' }, country: 'IN', nationality: 'IN' },
  });
  const onSubmit = async ({ confirm, terms, ...values }) => {
    try {
      const user = await signUp(values);
      toast.success(`Welcome to WILDTANE, ${user.name.split(' ')[0]}`);
      navigate(next || '/account', { replace: true });
    } catch (err) {
      applyServerErrors(err, setError);
      setError('root', { message: err.message });
    }
  };
  return (
    <AuthShell title="Create your account." subtitle="It takes less than a minute." footer={<>Already a member? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-secondary font-semibold hover:underline">Sign in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md" noValidate>
        {errors.root && <p className="p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-2" role="alert"><Icon name="error" /> {errors.root.message}</p>}
        <Field label="Full name" error={errors.name?.message} htmlFor="name" required>
          <Input id="name" autoComplete="name" error={errors.name} {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message} htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        </Field>
        <Field label="Mobile number" error={errors.phone?.number?.message} required>
          <PhoneInput dialProps={register('phone.dialCode')} numberProps={register('phone.number')} error={errors.phone?.number} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-space-md">
          <Field label="Country of residence" error={errors.country?.message} required>
            <CountrySelect error={errors.country} {...register('country')} />
          </Field>
          <Field label="Nationality" error={errors.nationality?.message} required>
            <CountrySelect error={errors.nationality} {...register('nationality')} />
          </Field>
        </div>
        <Field label="Password" error={errors.password?.message} hint="8+ characters with a letter and a number" htmlFor="password" required>
          <PasswordInput id="password" autoComplete="new-password" error={errors.password} {...register('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message} htmlFor="confirm" required>
          <PasswordInput id="confirm" autoComplete="new-password" error={errors.confirm} {...register('confirm')} />
        </Field>
        <label className="flex items-start gap-2 text-body-sm text-on-surface-variant">
          <input type="checkbox" className="mt-1 accent-secondary" {...register('terms')} />
          <span>I agree to the <Link to="/pages/terms" className="text-secondary underline">Terms</Link> and <Link to="/pages/privacy" className="text-secondary underline">Privacy Policy</Link>.</span>
        </label>
        {errors.terms && <p className="text-label-md text-error -mt-2">{errors.terms.message}</p>}
        <Button type="submit" loading={isSubmitting} className="h-12">Create account</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(z.object({ email: z.email('Enter a valid email') })) });
  const onSubmit = async (values) => {
    try {
      await api.forgotPassword(values);
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <AuthShell title="Reset your password." subtitle="Enter your account email and we'll send you a secure reset link." footer={<Link to="/login" className="text-secondary font-semibold hover:underline">Back to sign in</Link>}>
      {sent ? (
        <div className="p-space-lg rounded-2xl bg-secondary-container/40 flex flex-col gap-2" role="status">
          <Icon name="mark_email_read" className="text-secondary text-[32px]" />
          <h2 className="text-headline-sm">Check your inbox</h2>
          <p className="text-body-sm text-on-surface-variant">If that email is registered, a reset link is on its way. It expires in 30 minutes.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md" noValidate>
          <Field label="Email" error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="h-12">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const { resetPassword } = useAuthActions();
  const navigate = useNavigate();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(z.object({ password: passwordRule, confirm: z.string() }).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })),
  });
  const onSubmit = async ({ password }) => {
    try {
      await resetPassword({ token, password });
      toast.success('Password updated — you are signed in.');
      navigate('/account', { replace: true });
    } catch (err) {
      setError('root', { message: err.message });
    }
  };
  return (
    <AuthShell title="Choose a new password." footer={<Link to="/forgot-password" className="text-secondary font-semibold hover:underline">Request a new link</Link>}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md" noValidate>
        {errors.root && <p className="p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm" role="alert">{errors.root.message}</p>}
        <Field label="New password" error={errors.password?.message} hint="8+ characters with a letter and a number" htmlFor="password">
          <PasswordInput id="password" autoComplete="new-password" error={errors.password} {...register('password')} />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message} htmlFor="confirm">
          <PasswordInput id="confirm" autoComplete="new-password" error={errors.confirm} {...register('confirm')} />
        </Field>
        <Button type="submit" loading={isSubmitting} className="h-12">Update password</Button>
      </form>
    </AuthShell>
  );
}
