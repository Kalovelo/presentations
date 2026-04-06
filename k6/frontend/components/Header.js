'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const router = useRouter();

  async function handleSeed() {
    const res = await fetch('/api/seed', { method: 'POST' });
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        Splitdumb
      </Link>
      <nav className={styles.nav}>
        <Link href="/">Dashboard</Link>
        <Link href="/groups">Groups</Link>
        <Link href="/users">Users</Link>
      </nav>
      <button className={styles.seedBtn} onClick={handleSeed}>
        Seed Demo Data
      </button>
    </header>
  );
}
