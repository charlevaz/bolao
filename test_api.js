const https = require('https');

const options = {
  hostname: 'v3.football.api-sports.io',
  path: '/status',
  method: 'GET',
  headers: {
    'x-apisports-key': 'd16191f69610189a4a831a8e1417b14c'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});

req.on('error', (e) => { console.error(e); });
req.end();
