import http from 'http';
import https from 'https';

const data = JSON.stringify({email: 'agqyed01@gmail.com', password: 'password'});
const req = https.request('https://ais-dev-m5r3lxi6rrdqa3yyjvnzxd-530272112596.asia-southeast1.run.app/api/auth/login', {
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
