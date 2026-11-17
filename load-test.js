import http from 'k6/http';
import { check, sleep } from 'k6';

const USER = {
  email: __ENV.EMAIL || 'teste@teste.com',
  password: __ENV.PASSWORD || '123456',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 15 },
    { duration: '20s', target: 25 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'],
  },
};

export default function loadFlow() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: USER.email,
    password: USER.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login 200': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }

  const token = loginRes.json('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const writeRes = http.post(`${BASE_URL}/api/data`, JSON.stringify({
    table: 'students',
    op: 'upsert',
    rows: [{
      id: `k6-load-${__VU}-${Date.now()}`,
      name: `Teste Carga ${__VU}`,
      email: `testecarga${__VU}${Date.now()}@teste.com`,
      grade: '1 Ano',
      status: 'Ativo',
      gender: 'Masculino',
      enrollment_id: `K6${Date.now()}`,
    }],
  }), { headers: authHeaders });

  check(writeRes, {
    'write 200': (r) => r.status === 200,
  });

  sleep(1);
}