import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <h1 style={{ fontSize: '64px', fontWeight: 700, color: 'var(--accent)', marginBottom: '8px' }}>
        404
      </h1>
      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Page not found
      </p>
      <Link
        to="/"
        style={{
          color: 'var(--accent)',
          fontSize: '14px',
          textDecoration: 'none',
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
