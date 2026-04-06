import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import type { Options } from 'k6/options';
import { API_URL, seed, SeedData } from './helpers';

const poolExhaustionErrors = new Counter('pool_exhaustion_errors');

export const options: Options = {
  scenarios: {
    pool_exhaustion: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '5s', target: 0 },
      ],
      exec: 'poolExhaustion',
    },
  },
  thresholds: {
    pool_exhaustion_errors: ['count==0'],
  },
};

export function setup(): SeedData {
  return seed();
}

export function poolExhaustion(data: SeedData): void {
  if (!data.users || data.users.length === 0) return;

  const user = data.users[Math.floor(Math.random() * data.users.length)];

  const res = http.post(
    `${API_URL}/api/users/${user.id}/pay`,
    JSON.stringify({ amount: 1 }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '5s' },
  );

  const ok = check(res, { 'pay succeeded': (r) => r.status === 200 });
  if (!ok) {
    console.log(`Pool exhaustion error for user ${user.name}: HTTP ${res.status} — ${res.body}`);
    poolExhaustionErrors.add(1);
  }
}
