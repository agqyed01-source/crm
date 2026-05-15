import http from 'http';
import https from 'https';

https.get('https://crm.agdentool.com/api/auth/register', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', body.substring(0, 500)));
}).on('error', err => console.log('Error:', err.message));
