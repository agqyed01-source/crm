const Database = require('better-sqlite3');
try {
  const db = new Database(':memory:');
  console.log('Success!');
} catch (e) {
  console.error('Failed:', e.message);
}
