const crypto = require('crypto');

const JWT_SECRET = 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

function generateAdminToken() {
  const header = {
    alg: 'HS512',
    typ: 'JWT'
  };

  const payload = {
    sub: 'admin',
    authorities: ['ROLE_ADMIN', 'ROLE_USER'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha512', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

const testToken = generateAdminToken();
console.log('Generated test token:', testToken.substring(0, 50) + '...');

const { spawn } = require('child_process');

const curl = spawn('curl', [
  '-s',
  'http://localhost:8080/api/users?page=0&size=2',
  '-H', `Authorization: Bearer ${testToken}`
]);

let output = '';
curl.stdout.on('data', (data) => {
  output += data.toString();
});

curl.on('close', (code) => {
  console.log('Response status:', code);
  try {
    const response = JSON.parse(output);
    console.log('Response success:', !!response.content);
    console.log('Users count:', response.content?.length || 0);
  } catch (e) {
    console.log('Raw response:', output.substring(0, 200));
  }
});
