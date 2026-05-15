import http from 'http';

const data = "not-json";

const req = http.request('http://127.0.0.1:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', body.substring(0, 500)));
});

req.on('error', err => console.log('Error:', err.message));
req.write(data);
req.end();
