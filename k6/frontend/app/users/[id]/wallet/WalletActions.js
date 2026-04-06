'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.css';

export default function WalletActions({ userId }) {
  const router = useRouter();
  const [topupAmount, setTopupAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleTopup(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch(`/api/users/${userId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(topupAmount) }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessage(`Topped up! New balance: $${Number(data.balance).toFixed(2)}`);
      setTopupAmount('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  async function handlePay(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch(`/api/users/${userId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(payAmount) }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessage(`Payment sent! New balance: $${Number(data.balance).toFixed(2)}`);
      setPayAmount('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        <form onSubmit={handleTopup} className={styles.formRow}>
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            min="0.01"
            value={topupAmount}
            onChange={(e) => setTopupAmount(e.target.value)}
            data-testid="topup-amount"
            required
          />
          <button type="submit" data-testid="topup-btn">Top Up</button>
        </form>

        <form onSubmit={handlePay} className={styles.formRow}>
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            min="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            data-testid="pay-amount"
            required
          />
          <button type="submit" className={styles.payBtn} data-testid="pay-btn">Pay</button>
        </form>
      </div>

      {message && <p className={styles.success} data-testid="message">{message}</p>}
      {error && <p className={styles.error} data-testid="error">{error}</p>}
    </>
  );
}
