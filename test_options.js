import http from 'http';

const req = http.request('http://127.0.0.1:3000/api/auth/register', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:3000',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type'
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', body.substring(0, 500)));
});

req.on('error', err => console.log('Error:', err.message));
req.end();
