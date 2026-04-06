import GroupDetail from './GroupDetail';

async function getGroup(id) {
  const [groupsRes, membersRes, expensesRes, balancesRes, usersRes] = await Promise.all([
    fetch('http://localhost:3000/api/groups', { cache: 'no-store' }),
    fetch(`http://localhost:3000/api/groups/${id}/members`, { cache: 'no-store' }),
    fetch(`http://localhost:3000/api/groups/${id}/expenses`, { cache: 'no-store' }),
    fetch(`http://localhost:3000/api/groups/${id}/balances`, { cache: 'no-store' }),
    fetch('http://localhost:3000/api/users', { cache: 'no-store' }),
  ]);

  const groups = await groupsRes.json();
  const group = groups.find((g) => g.id === Number(id));

  return {
    group: group || { id, name: `Group ${id}` },
    members: await membersRes.json(),
    expenses: await expensesRes.json(),
    balances: await balancesRes.json(),
    allUsers: await usersRes.json(),
  };
}

export default async function GroupPage({ params }) {
  const { id } = await params;
  const data = await getGroup(id);

  return <GroupDetail {...data} groupId={id} />;
}
