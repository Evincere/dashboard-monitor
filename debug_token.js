const crypto = require('crypto');

const JWT_SECRET = 'RcmUR2yePNGr5pjZ9bXL_dx7h_xeIliI4iS4ESXDMMs';

function generateAdminToken() {
  const header = {
    alg: 'HS512',
    typ: 'JWT'
  };

  const payload = {
    sub: 'admin',
    roles: ['ROLE_ADMIN', 'ROLE_USER'],
    userId: 'f8b266aa-ecd9-4bbf-b850-ced9991b5fbf',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60)
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
console.log('Generated test token:');
console.log(testToken);

const { execSync } = require('child_process');

try {
  const result = execSync(`curl -s "http://localhost:8080/api/users?page=0&size=2" -H "Authorization: Bearer ${testToken}"`, { encoding: 'utf8' });
  console.log('\nBackend response:');
  console.log(result.substring(0, 500));
} catch (error) {
  console.error('Error:', error.message);
}
