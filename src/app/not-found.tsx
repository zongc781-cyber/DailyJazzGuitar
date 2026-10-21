import Link from 'next/link';
import ui from '@/components/ui/ui.module.css';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 560, margin: '48px auto', display: 'grid', gap: 16 }}>
      <p className={ui.eyebrow}>Not found</p>
      <h1>That page is not in the library</h1>
      <p>The lesson may have been renamed or removed.</p>
      <p>
        <Link href="/" className={`${ui.button} ${ui.primary}`}>
          Go to today’s lick
        </Link>
      </p>
    </div>
  );
}
