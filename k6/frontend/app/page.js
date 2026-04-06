import Link from 'next/link';
import styles from './page.module.css';

async function getGroups() {
  const res = await fetch('http://localhost:3000/api/groups', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function getUsers() {
  const res = await fetch('http://localhost:3000/api/users', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function Home() {
  const [groups, users] = await Promise.all([getGroups(), getUsers()]);

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Groups</h2>
          <span className={styles.badge}>{groups.length}</span>
        </div>
        {groups.length === 0 ? (
          <p className={styles.empty}>No groups yet. Create one to get started.</p>
        ) : (
          <ul className={styles.list}>
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className={styles.listItem}>
                  <span className={styles.groupName}>{g.name}</span>
                  <span className={styles.arrow}>&#8250;</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/groups" className={styles.btn}>
          Manage Groups
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Users</h2>
          <span className={styles.badge}>{users.length}</span>
        </div>
        {users.length === 0 ? (
          <p className={styles.empty}>No users yet.</p>
        ) : (
          <ul className={styles.list}>
            {users.map((u) => (
              <li key={u.id} className={styles.listItemStatic}>
                <span>{u.name}</span>
                <span className={styles.email}>{u.email}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/users" className={styles.btn}>
          Manage Users
        </Link>
      </div>
    </div>
  );
}
