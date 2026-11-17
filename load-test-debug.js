import http from 'k6/http';
import { check } from 'k6';

const USER = {
  email: __ENV.EMAIL || 'teste@teste.com',
  password: __ENV.PASSWORD || '123456',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function debugFlow() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: USER.email,
    password: USER.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    console.error(`LOGIN FALHOU: ${loginRes.status}`);
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
      id: `k6-test-${Date.now()}`,
      name: 'Teste Carga k6',
      grade: '1 Ano',
      status: 'Ativo',
      birthDate: '2000-01-01',
      gender: 'Masculino',
      enrollmentId: `MAT${Date.now()}`,
    }],
  }), { headers: authHeaders });

  console.error(`WRITE STATUS: ${writeRes.status}`);
  console.error(`WRITE BODY: ${writeRes.body}`);

  check(writeRes, {
    'write ok': (r) => r.status === 200,
  });
}