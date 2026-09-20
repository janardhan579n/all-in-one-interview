import { Link, useLocation } from 'react-router-dom';
import { Card } from '../components/ui';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-mono text-sm text-ink-faint">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Nothing lives at that address</h1>
      <p className="mt-2 text-sm text-ink-muted">
        <code className="font-mono text-xs">{location.pathname}</code> does not match any lesson, problem or concept.
      </p>

      <Card className="mt-6 text-left">
        <p className="mb-3 text-sm font-medium text-ink">Try one of these instead</p>
        <ul className="space-y-1.5 text-sm">
          <li>
            <Link to="/" className="text-brand hover:underline">
              Dashboard
            </Link>{' '}
            <span className="text-ink-muted">— continue where you left off</span>
          </li>
          <li>
            <Link to="/pattern-map" className="text-brand hover:underline">
              Pattern map
            </Link>{' '}
            <span className="text-ink-muted">— the whole territory on one page</span>
          </li>
          <li>
            <Link to="/dsa/what-is-an-algorithm" className="text-brand hover:underline">
              Start from zero
            </Link>{' '}
            <span className="text-ink-muted">— assumes you have never written code</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
