import { Link } from 'react-router-dom';
import { Icon } from '../components/ui';
import Seo from '../components/Seo';

function ErrorPage({ code, icon, title, text, children }) {
  return (
    <section className="container-x py-24 flex flex-col items-center text-center gap-space-md">
      <Seo title={code === '404' ? 'Page Not Found' : 'Access Restricted'} noindex />
      <span className="text-[120px] leading-none font-extrabold tracking-tighter text-surface-container-highest select-none">{code}</span>
      <div className="w-14 h-14 -mt-16 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lift">
        <Icon name={icon} />
      </div>
      <h1 className="text-headline-xl-mobile md:text-headline-xl mt-space-sm">{title}</h1>
      <p className="text-body-md text-on-surface-variant max-w-md">{text}</p>
      <div className="flex flex-wrap gap-space-sm justify-center pt-space-sm">{children}</div>
    </section>
  );
}

export default function NotFound() {
  return (
    <ErrorPage code="404" icon="explore_off" title="Off the mapped route." text="The page you were looking for has moved, sold out, or never existed. Let's get you back on track.">
      <Link to="/" className="btn-primary">Back to home</Link>
      <Link to="/shop" className="btn-tonal">Browse the catalogue</Link>
    </ErrorPage>
  );
}

export function Unauthorized() {
  return (
    <ErrorPage code="403" icon="lock" title="Restricted area." text="Your account doesn't have access to this page. If you think this is a mistake, contact the store team.">
      <Link to="/" className="btn-primary">Back to home</Link>
      <Link to="/account" className="btn-tonal">My account</Link>
    </ErrorPage>
  );
}
