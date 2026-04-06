import Link from 'next/link';
import CreateUserForm from './CreateUserForm';
import styles from './page.module.css';

async function getUsers() {
  const res = await fetch('http://localhost:3000/api/users', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className={styles.header}>
        <h1>Users</h1>
      </div>

      <div className={styles.card}>
        <CreateUserForm />
      </div>

      <div className={styles.card}>
        {users.length === 0 ? (
          <p className={styles.empty}>No users yet. Create one above.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>${Number(u.balance).toFixed(2)}</td>
                  <td>
                    <Link href={`/users/${u.id}/wallet`} className={styles.walletLink}>
                      Wallet
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
