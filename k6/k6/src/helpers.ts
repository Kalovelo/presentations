import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
export const API_URL = __ENV.API_URL || 'http://localhost:3000';

export interface User {
  id: number;
  name: string;
  balance: string;
}

export interface Group {
  id: number;
  name: string;
}

export interface SeedData {
  users: User[];
  groups: Group[];
}

export function seed(): SeedData {
  const seedRes = http.post(`${API_URL}/api/seed`);
  check(seedRes, { 'seed succeeded': (r) => r.status === 200 });

  const users = JSON.parse(http.get(`${API_URL}/api/users`).body as string) as User[];
  const groups = JSON.parse(http.get(`${API_URL}/api/groups`).body as string) as Group[];

  return { users, groups };
}
