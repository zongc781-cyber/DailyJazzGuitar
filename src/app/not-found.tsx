import Link from 'next/link';
import { Hero } from '@/components/ui/Hero';
import { Icon } from '@/components/ui/Icon';
import ui from '@/components/ui/ui.module.css';
import styles from '@/components/screens/screens.module.css';

export default function NotFound() {
  return (
    <div className={styles.full}>
      <Hero
        top={<span>404</span>}
        title="This page isn’t in the book"
        actions={
          <Link href="/" className={`${ui.button} ${ui.onField} ${ui.large} ${styles.onwards}`}>
            Back to today’s lick
            <Icon name="arrowRight" />
          </Link>
        }
      >
        <p>The link may be old or mistyped, but today’s lick is always on the stand.</p>
      </Hero>
    </div>
  );
}
