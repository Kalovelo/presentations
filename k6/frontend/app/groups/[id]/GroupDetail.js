'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from './page.module.css';

export default function GroupDetail({ group, members, expenses, balances, allUsers, groupId }) {
  const router = useRouter();
  const [tab, setTab] = useState('expenses');

  // Add member form
  const [selectedUserId, setSelectedUserId] = useState('');
  const nonMembers = allUsers.filter((u) => !members.find((m) => m.id === u.id));

  // Add expense form
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState(members[0]?.id || '');
  const [error, setError] = useState('');

  async function addMember(e) {
    e.preventDefault();
    setError('');
    if (!selectedUserId) return;
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(selectedUserId) }),
    });
    if (res.ok) {
      setSelectedUserId('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    setError('');
    if (!expAmount || !expPayer) return;
    const res = await fetch(`/api/groups/${groupId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paid_by: Number(expPayer),
        amount: parseFloat(expAmount),
        description: expDesc,
      }),
    });
    if (res.ok) {
      setExpDesc('');
      setExpAmount('');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error);
    }
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1>{group.name}</h1>
      </div>

      <div className={styles.tabs}>
        {['members', 'expenses', 'balances'].map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className={styles.card}>
        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <>
            {members.length === 0 ? (
              <p className={styles.empty}>No members yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td className={styles.muted}>{m.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {nonMembers.length > 0 && (
              <form onSubmit={addMember} className={styles.formRow} style={{ marginTop: '1rem' }}>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Select user...</option>
                  {nonMembers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button type="submit">Add Member</button>
              </form>
            )}
            {error && tab === 'members' && <p className={styles.error}>{error}</p>}
          </>
        )}

        {/* EXPENSES TAB */}
        {tab === 'expenses' && (
          <>
            {expenses.length === 0 ? (
              <p className={styles.empty}>No expenses yet.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Paid by</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>{e.description}</td>
                      <td>{e.paid_by_name}</td>
                      <td className={styles.amount}>${Number(e.amount).toFixed(2)}</td>
                      <td className={styles.muted}>{e.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {members.length > 0 && (
              <form onSubmit={addExpense} className={styles.formRow} style={{ marginTop: '1rem' }}>
                <input
                  type="text"
                  placeholder="Description"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  min="0.01"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  required
                />
                <select value={expPayer} onChange={(e) => setExpPayer(e.target.value)} required>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button type="submit">Add Expense</button>
              </form>
            )}
            {error && tab === 'expenses' && <p className={styles.error}>{error}</p>}
          </>
        )}

        {/* BALANCES TAB */}
        {tab === 'balances' && (
          <>
            {balances.balances?.length === 0 ? (
              <p className={styles.empty}>No balances to show.</p>
            ) : (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Total Paid</th>
                      <th>Total Owed</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.balances?.map((b) => (
                      <tr key={b.user_id}>
                        <td>{b.name}</td>
                        <td>${Number(b.total_paid).toFixed(2)}</td>
                        <td>${Number(b.total_owed).toFixed(2)}</td>
                        <td
                          className={
                            b.balance > 0
                              ? styles.positive
                              : b.balance < 0
                                ? styles.negative
                                : styles.muted
                          }
                        >
                          {b.balance > 0 ? '+' : ''}${Number(b.balance).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {balances.settlements?.length > 0 && (
                  <div className={styles.settlements}>
                    <h3>Suggested Settlements</h3>
                    {balances.settlements.map((s, i) => (
                      <div key={i} className={styles.settlement}>
                        <strong>{s.from}</strong>
                        <span className={styles.arrow}>pays</span>
                        <strong>{s.to}</strong>
                        <span className={styles.settlementAmount}>${s.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
