import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthActions } from '../hooks/useAuth';
import { Button, Icon, PageLoader, Spinner } from '../components/ui';
import Seo from '../components/Seo';

const schema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });

const field =
  'w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-body-md transition-all focus:outline-none focus:border-secondary-fixed-dim focus:ring-2 focus:ring-secondary-fixed-dim/20';

/** Separate sign-in for the admin portal. The server only accepts administrator accounts here. */
export default function AdminLogin() {
  const { user, status } = useSelector((s) => s.auth);
  const { adminLogin } = useAuthActions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [show, setShow] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

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
    <div className="min-h-screen bg-ink text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <Seo title="Admin sign in" noindex />
      <div aria-hidden="true" className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-secondary/25 blur-[120px]" />
      <div aria-hidden="true" className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-secondary-fixed-dim/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <span className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon name="admin_panel_settings" className="text-[30px] text-secondary-fixed-dim" />
          </span>
          <div>
            <h1 className="text-headline-md">WILDTANE Admin</h1>
            <p className="text-body-sm text-white/50">Restricted area. Store administrators only.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4 p-6 sm:p-8 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-2xl">
          {user && (
            <p className="p-3 rounded-xl bg-white/5 text-body-sm text-white/70 flex items-start gap-2">
              <Icon name="info" className="text-[18px] mt-0.5" /> You're signed in as {user.email}, which isn't an admin account. Signing in here switches accounts.
            </p>
          )}
          {errors.root && (
            <p role="alert" className="p-3 rounded-xl bg-error/15 border border-error/30 text-body-sm text-red-200 flex items-start gap-2">
              <Icon name="error" className="text-[18px] mt-0.5" /> {errors.root.message}
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md text-white/70">Admin email</span>
            <span className="relative">
              <Icon name="mail" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-white/40" />
              <input type="email" autoComplete="username" className={field} placeholder="admin@yourstore.com" {...register('email')} />
            </span>
            {errors.email && <span className="text-label-md text-red-300">{errors.email.message}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label-md text-white/70">Password</span>
            <span className="relative">
              <Icon name="lock" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-white/40" />
              <input type={show ? 'text' : 'password'} autoComplete="current-password" className={`${field} pr-12`} placeholder="••••••••" {...register('password')} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5">
                <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[20px]" />
              </button>
            </span>
            {errors.password && <span className="text-label-md text-red-300">{errors.password.message}</span>}
          </label>
          <Button type="submit" variant="secondary" disabled={isSubmitting} className="h-12 mt-2">
            {isSubmitting ? <Spinner /> : <Icon name="login" className="text-[18px]" />} Sign in to dashboard
          </Button>
          <p className="text-label-sm font-normal text-white/40 text-center flex items-center justify-center gap-1">
            <Icon name="shield" className="text-[14px]" /> 5 failed attempts lock the account for 15 minutes
          </p>
        </form>

        <div className="mt-6 flex items-center justify-between text-body-sm text-white/50">
          <Link to="/" className="flex items-center gap-1 hover:text-white"><Icon name="arrow_back" className="text-[18px]" /> Back to store</Link>
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
