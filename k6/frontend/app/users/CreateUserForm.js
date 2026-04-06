'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.css';

export default function CreateUserForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      setName('');
      setEmail('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create user');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3>Create User</h3>
      <div className={styles.formRow}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Add User</button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
