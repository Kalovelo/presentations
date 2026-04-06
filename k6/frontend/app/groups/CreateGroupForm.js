'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.css';

export default function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setName('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to create group');
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3>Create Group</h3>
      <div className={styles.formRow}>
        <input
          type="text"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Create</button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
