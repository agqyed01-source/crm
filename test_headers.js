import https from 'https';

const req = https.request('https://ais-dev-m5r3lxi6rrdqa3yyjvnzxd-530272112596.asia-southeast1.run.app/api/auth/login', {
  method: 'POST'
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
});
req.on('error', err => console.log('Error:', err.message));
req.end();
