import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthActions } from '../hooks/useAuth';
import { Button, Field, Icon, Img, Input, PageLoader, Spinner } from '../components/ui';
import Seo from '../components/Seo';
import { BrandLogo, BrandLogoFull } from '../components/Brand';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

/** Separate sign-in for the admin portal, styled with the storefront luxury design system. */
export default function AdminLogin() {
  const { user, status } = useSelector((s) => s.auth);
  const { adminLogin } = useAuthActions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  if (status !== 'ready') return <PageLoader />;
  if (user?.role === 'admin') return <Navigate to={next?.startsWith('/admin') ? next : '/admin'} replace />;

  const onSubmit = async (values) => {
    try {
      const u = await adminLogin(values);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      navigate(next?.startsWith('/admin') ? next : '/admin', { replace: true });
    } catch (err) {
      setError('root', { message: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center py-10 px-4">
      <Seo title="Admin sign in" noindex />
      <div className="container-x w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-gutter-lg items-center">
        {/* Left hero banner (desktop) */}
        <div className="hidden lg:block relative h-[600px] rounded-3xl overflow-hidden shadow-lift">
          <Img w={640} src="/uploads/seed/terminal-traveler.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-transparent" />
          <Link to="/" aria-label="WILDTANE home" className="absolute top-8 left-8">
            <BrandLogoFull className="w-24 rounded-2xl shadow-lift" alt="WILDTANE" />
          </Link>
          <div className="absolute bottom-10 left-10 right-10 text-white flex flex-col gap-3">
            <span className="text-label-sm uppercase tracking-wider text-secondary-fixed font-bold">Store operations</span>
            <h2 className="text-headline-lg font-display text-white">WILDTANE Administration</h2>
            <p className="text-body-sm text-white/70">Master management console for catalogue, orders, logistics, and visual store themes.</p>
            <ul className="flex flex-col gap-2.5 text-body-sm text-white/90 mt-2">
              {[
                'Real-time catalogue, variant stock & pricing management',
                'One-touch order fulfilment & automated WhatsApp alerts',
                'Visual theme designer with instant storefront synchronization',
                'Secured session encryption with automated lockout protection',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[18px] text-secondary-fixed shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right form container */}
        <div className="w-full max-w-md mx-auto flex flex-col gap-space-lg">
          <Link to="/" aria-label="WILDTANE home" className="lg:hidden self-center">
            <BrandLogo className="h-10" alt="WILDTANE" eager tone="auto" />
          </Link>

          <div>
            <span className="eyebrow block mb-1">Restricted portal</span>
            <h1 className="text-headline-xl-mobile md:text-headline-lg font-display">Admin sign in</h1>
            <p className="text-body-md text-on-surface-variant mt-1">Authorized store administrators only.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="surface-card card p-6 sm:p-8 flex flex-col gap-4 border border-outline-variant/60">
            {user && (
              <p className="p-3 rounded-xl bg-surface-container text-body-sm text-on-surface flex items-start gap-2 border border-surface-container-high">
                <Icon name="info" className="text-[18px] text-secondary mt-0.5 shrink-0" />
                <span>
                  Signed in as <b>{user.email}</b> (customer account). Signing in here switches to your administrator session.
                </span>
              </p>
            )}

            {errors.root && (
              <p role="alert" className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-start gap-2 border border-error/30">
                <Icon name="error" className="text-[18px] mt-0.5 shrink-0" />
                <span>{errors.root.message}</span>
              </p>
            )}

            <Field label="Admin email" error={errors.email?.message} required htmlFor="admin-email">
              <div className="relative">
                <Icon name="mail" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  className="pl-10"
                  placeholder="admin@wildtane.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </Field>

            <Field label="Password" error={errors.password?.message} required htmlFor="admin-password">
              <div className="relative">
                <Icon name="lock" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]" />
                <Input
                  id="admin-password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pl-10 pr-11"
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon w-8 h-8"
                >
                  <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" loading={isSubmitting} icon="login" className="h-11 mt-2">
              Sign in to dashboard
            </Button>

            <p className="text-label-sm font-normal text-outline text-center flex items-center justify-center gap-1.5 mt-1">
              <Icon name="shield" className="text-[16px] text-secondary" /> 5 failed attempts lock the account for 15 minutes
            </p>
          </form>

          <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
            <Link to="/" className="flex items-center gap-1.5 hover:text-secondary transition-colors font-medium">
              <Icon name="arrow_back" className="text-[18px]" /> Storefront home
            </Link>
            <Link to="/forgot-password" className="hover:text-secondary transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
