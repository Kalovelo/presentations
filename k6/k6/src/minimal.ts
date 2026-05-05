import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '5s',
};

export default function () {
  const res = http.get('http://localhost:3000/api/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}