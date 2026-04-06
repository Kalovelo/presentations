import Link from 'next/link';
import CreateGroupForm from './CreateGroupForm';
import styles from './page.module.css';

async function getGroups() {
  const res = await fetch('http://localhost:3000/api/groups', { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div>
      <div className={styles.header}>
        <h1>Groups</h1>
      </div>

      <div className={styles.card}>
        <CreateGroupForm />
      </div>

      <div className={styles.card}>
        {groups.length === 0 ? (
          <p className={styles.empty}>No groups yet. Create one above.</p>
        ) : (
          <div className={styles.groupList}>
            {groups.map((g) => (
              <Link href={`/groups/${g.id}`} key={g.id} className={styles.groupCard}>
                <span className={styles.groupName}>{g.name}</span>
                <span className={styles.groupDate}>{g.created_at}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
