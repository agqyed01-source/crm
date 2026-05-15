import { execSync } from 'child_process';
console.log(execSync('ps aux | grep node || true').toString());
