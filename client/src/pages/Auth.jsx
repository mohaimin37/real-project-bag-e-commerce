import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuthActions } from '../hooks/useAuth';
import { Button, CountrySelect, Field, Icon, Img, Input, PhoneInput } from '../components/ui';
import { BrandLogo, BrandLogoFull } from '../components/Brand';
import { cn } from '../lib/format';
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
  const { pathname } = useLocation();
  const next = useNext();
  const isLogin = pathname.startsWith('/login');
  const isRegister = pathname.startsWith('/register');

  return (
    <div className="container-x py-4 sm:py-6 lg:py-16 grid grid-cols-1 lg:grid-cols-2 gap-gutter-lg items-center">
      <Seo title={title.replace(/\.$/, '')} noindex />
      {/* ── LAPTOP VIEW ONLY: Editorial Member Benefits Showcase ── */}
      <div className="hidden lg:block relative h-[620px] rounded-3xl overflow-hidden shadow-lift">
        <Img w={640} src="/uploads/seed/terminal-traveler.jpg" alt="" className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <Link to="/" aria-label="WILDTANE home" className="absolute top-8 left-8">
          <BrandLogoFull className="w-24 rounded-2xl shadow-lift" alt="WILDTANE" />
        </Link>
        <div className="absolute bottom-10 left-10 right-10 text-white flex flex-col gap-3">
          <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Member benefits</span>
          <h2 className="text-headline-lg">Your gear, your journeys, one account.</h2>
          <ul className="flex flex-col gap-2 text-body-sm text-white/80">
            {['Saved addresses for faster checkout', 'Order tracking and one-tap reorders', 'Easy returns and replacements', 'Early access to limited drops'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Icon name="check_circle" className="text-[18px] text-secondary-fixed" /> {t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── FORM CONTAINER: Sleek Card on Mobile, Classic on Laptop ── */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-4 bg-surface-container-lowest/90 lg:bg-transparent p-4.5 sm:p-6 lg:p-0 rounded-3xl lg:rounded-none border border-outline-variant/30 lg:border-0 shadow-lg lg:shadow-none backdrop-blur-xs">
        {/* Mobile Top Brand & Back Bar */}
        <div className="lg:hidden flex items-center justify-between w-full mb-1">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface active:scale-90 transition-transform"
            aria-label="Back to store"
          >
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
          <div className="flex flex-col items-center">
            <span className="font-serif tracking-wider font-bold text-[18px] text-on-surface uppercase">
              WILDTANE
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[8px] font-black uppercase tracking-tight">
              <Icon name="bolt" className="text-[9px]" /> Assured
            </span>
          </div>
          <div className="w-9 h-9 flex items-center justify-center text-secondary">
            <Icon name="lock" className="text-[18px]" />
          </div>
        </div>

        {/* Mobile Segment Switcher (Sign In vs Create Account) */}
        {(isLogin || isRegister) && (
          <div className="lg:hidden flex p-1 rounded-2xl bg-surface-container-low border border-outline-variant/30 mb-1">
            <Link
              to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}
              className={cn(
                'flex-1 py-2 text-center rounded-xl text-[12.5px] font-bold transition-all',
                isLogin
                  ? 'bg-secondary text-on-secondary shadow-xs scale-101'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              Sign In
            </Link>
            <Link
              to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}
              className={cn(
                'flex-1 py-2 text-center rounded-xl text-[12.5px] font-bold transition-all',
                isRegister
                  ? 'bg-secondary text-on-secondary shadow-xs scale-101'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              Create Account
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] sm:text-headline-xl-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">{title}</h1>
          {subtitle && <p className="text-[12.5px] sm:text-body-md text-on-surface-variant leading-relaxed">{subtitle}</p>}
        </div>

        {children}

        {footer && <div className="text-[12px] sm:text-body-sm text-on-surface-variant text-center pt-1">{footer}</div>}

        {/* Mobile Security & Trust Strip */}
        <div className="lg:hidden pt-3 border-t border-outline-variant/20 flex items-center justify-center gap-3 text-[10px] text-outline text-center">
          <span className="flex items-center gap-1"><Icon name="verified_user" className="text-[13px] text-emerald-600" /> 256-Bit SSL Encrypted</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Icon name="local_shipping" className="text-[13px] text-secondary" /> Fast Delivery</span>
        </div>
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
      toast.success(`Registration successful. Welcome to WILDTANE, ${user.name.split(' ')[0]}!`);
      navigate(next || '/', { replace: true });
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
          <span>I agree to the <Link to="/terms-and-conditions" className="text-secondary underline">Terms & Conditions</Link> and <Link to="/privacy-policy" className="text-secondary underline">Privacy Policy</Link>.</span>
        </label>
        {errors.terms && <p className="text-label-md text-error -mt-2">{errors.terms.message}</p>}
        <Button type="submit" loading={isSubmitting} className="h-12">Create account</Button>
      </form>
    </AuthShell>
  );
}


export function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(120); // 2 minutes (120 seconds)
  const { resetPasswordOtp } = useAuthActions();
  const navigate = useNavigate();

  // 30-second resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // 2-minute OTP validity timer
  useEffect(() => {
    if (step !== 2 || otpExpiresIn <= 0) return undefined;
    const t = setInterval(() => setOtpExpiresIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [step, otpExpiresIn]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return setError('Please enter a valid email address');
    }
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword({ email: cleanEmail });
      toast.success('Verification code sent to your email inbox!');
      setStep(2);
      setOtpExpiresIn(120); // 2 minutes timer
      setResendCooldown(30); // 30 seconds fast cooldown
    } catch (err) {
      setError(err.message || 'This email is not real and OTP cannot be sent. No account was found with this email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otpExpiresIn <= 0) {
      return setError('Verification code has expired. Please request a new code.');
    }
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      return setError('Please enter the complete 6-digit code');
    }
    setError('');
    setLoading(true);
    try {
      await api.verifyResetOtp({ email: email.trim().toLowerCase(), otp: cleanOtp });
      toast.success('Code verified! Now set your new password.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword({ email: email.trim().toLowerCase() });
      toast.success('New verification code sent to your email inbox!');
      setOtp('');
      setOtpExpiresIn(120); // Reset 2-minute timer
      setResendCooldown(30); // Reset 30-second cooldown
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      return setError('Password must be at least 8 characters long');
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return setError('Password must include at least one letter and one number');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setError('');
    setLoading(true);
    try {
      const user = await resetPasswordOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim().replace(/\D/g, ''),
        password,
      });
      toast.success(`Password updated! Welcome back, ${user.name.split(' ')[0]}`);
      navigate(user.role === 'admin' ? '/admin' : '/account', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    1: 'Reset your password.',
    2: 'Enter verification code.',
    3: 'Choose a new password.',
  };
  const subtitles = {
    1: 'Enter your account email to verify whether you have an account and receive a one-time verification code.',
    2: `We sent a 6-digit code to ${email}. Enter it below to verify your identity.`,
    3: 'Enter your new password below. Once saved, you will be automatically signed in.',
  };

  return (
    <AuthShell
      title={titles[step]}
      subtitle={subtitles[step]}
      footer={
        <div className="flex flex-col gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
                setOtp('');
              }}
              className="text-label-md text-outline hover:text-on-surface underline"
            >
              Start over with a different email
            </button>
          )}
          <p>
            Remembered your password?{' '}
            <Link to="/login" className="text-secondary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      }
    >
      {/* Progress pill steps */}
      <div className="flex items-center justify-between gap-2 px-1 mb-2">
        {[
          { num: 1, label: 'Email' },
          { num: 2, label: 'Verify Code' },
          { num: 3, label: 'New Password' },
        ].map((s) => (
          <div key={s.num} className="flex-1 flex flex-col gap-1">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all',
                step >= s.num ? 'bg-secondary' : 'bg-surface-container-high'
              )}
            />
            <span className={cn('text-[11px] font-medium text-center', step === s.num ? 'text-on-surface font-semibold' : 'text-outline')}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <p className="p-space-sm rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-2" role="alert">
          <Icon name="error" className="shrink-0" /> {error}
        </p>
      )}

      {/* Step 1: Email Form */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-space-md" noValidate>
          <Field label="Account Email" htmlFor="forgot-email">
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. yourname@example.com"
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="h-12" iconRight="arrow_forward">
            Send Verification Code
          </Button>
        </form>
      )}

      {/* Step 2: OTP Verification Form */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-space-md" noValidate>
          <div className="p-space-sm rounded-xl border border-outline-variant/60 bg-surface-container-low text-body-sm flex items-start gap-3">
            <Icon name="mark_email_read" className="text-[22px] text-secondary shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-on-surface">Verification code sent to your email</span>
              <span className="text-on-surface-variant">
                We sent a 6-digit code to <b className="text-on-surface">{email}</b>. Open your email inbox or spam folder to find the code.
              </span>
            </div>
          </div>

          {/* 2-Minute Expiration Countdown Card */}
          <div
            className={cn(
              'p-3.5 rounded-xl border flex items-center justify-between transition-all',
              otpExpiresIn > 25
                ? 'bg-surface-container-low border-outline-variant/60'
                : otpExpiresIn > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
                : 'bg-error-container/30 border-error/40 text-error'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                name={otpExpiresIn > 0 ? 'schedule' : 'timer_off'}
                className={cn('text-[20px]', otpExpiresIn > 0 ? 'text-secondary' : 'text-error')}
              />
              <span className="text-body-sm font-medium">
                {otpExpiresIn > 0 ? 'Code valid for' : 'Code expired!'}
              </span>
            </div>
            <span
              className={cn(
                'font-mono font-bold text-base px-2.5 py-0.5 rounded-md tracking-wider',
                otpExpiresIn > 25
                  ? 'bg-surface-container-high text-on-surface'
                  : otpExpiresIn > 0
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 animate-pulse'
                  : 'bg-error text-white'
              )}
            >
              {otpExpiresIn > 0 ? formatTimer(otpExpiresIn) : '00:00'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="otp-input" className="text-label-lg font-semibold text-center">
              6-Digit Code
            </label>
            <Input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              disabled={otpExpiresIn <= 0}
              autoFocus
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                if (error) setError('');
              }}
              placeholder="••••••"
              className={cn(
                'text-center font-mono text-[28px] tracking-[0.35em] h-14 bg-surface-container-lowest focus:bg-surface-container-low',
                otpExpiresIn <= 0 && 'opacity-60 cursor-not-allowed bg-surface-container-high'
              )}
            />
            <p className={cn(
              'text-label-sm text-center',
              otpExpiresIn <= 0 ? 'text-error font-medium' : 'text-outline'
            )}>
              {otpExpiresIn <= 0
                ? 'This 2-minute code has expired. Click "Resend code" below.'
                : 'Check your email inbox and spam folder'}
            </p>
          </div>

          <div className="flex items-center justify-between text-body-sm pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className={cn(
                'text-label-md font-semibold transition-colors flex items-center gap-1.5',
                resendCooldown > 0
                  ? 'text-outline cursor-not-allowed'
                  : otpExpiresIn <= 0
                  ? 'text-primary font-bold underline cursor-pointer'
                  : 'text-secondary hover:underline cursor-pointer'
              )}
            >
              <Icon name="refresh" className={cn('text-[18px]', resendCooldown > 0 && 'opacity-50')} />
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              className="text-label-sm text-outline hover:text-on-surface"
            >
              Change email
            </button>
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={otpExpiresIn <= 0 || otp.replace(/\D/g, '').length !== 6}
            className="h-12"
            iconRight={otpExpiresIn > 0 ? 'verified' : 'timer_off'}
          >
            {otpExpiresIn <= 0 ? 'Code Expired — Resend Required' : 'Verify Code'}
          </Button>
        </form>
      )}

      {/* Step 3: New Password Form */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-space-md" noValidate>
          <Field label="New Password" hint="8+ characters with at least one letter and number" htmlFor="new-password">
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </Field>
          <Field label="Confirm New Password" htmlFor="confirm-new-password">
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </Field>
          <Button type="submit" loading={loading} className="h-12" iconRight="lock_reset">
            Set New Password & Sign In
          </Button>
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
