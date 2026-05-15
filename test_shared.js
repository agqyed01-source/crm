import https from 'https';

const req = https.request('https://ais-pre-m5r3lxi6rrdqa3yyjvnzxd-530272112596.asia-southeast1.run.app/api/auth/register', {
  method: 'POST'
}, (res) => {
  console.log('STATUS:', res.statusCode);
});
req.on('error', err => console.log('Error:', err.message));
req.end();
