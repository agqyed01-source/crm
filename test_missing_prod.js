import { execSync } from 'child_process';
import http from 'http';

const req = http.request('http://127.0.0.1:3000/api/missing', { method: 'POST' }, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', body));
});
req.end();
