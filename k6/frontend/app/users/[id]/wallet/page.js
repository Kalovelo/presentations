import WalletActions from './WalletActions';
import styles from './page.module.css';

async function getUser(id) {
  const res = await fetch(`http://localhost:3000/api/users/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function WalletPage({ params }) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) {
    return <p>User not found</p>;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1>{user.name}&apos;s Wallet</h1>
        <p className={styles.balance} data-testid="balance">
          Balance: <strong>${Number(user.balance).toFixed(2)}</strong>
        </p>
      </div>
      <div className={styles.card}>
        <WalletActions userId={id} />
      </div>
    </div>
  );
}
