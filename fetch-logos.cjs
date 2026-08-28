const fs = require('fs');
const https = require('https');
const path = require('path');

const logos = [
  { name: 'mitre-attack', url: 'https://raw.githubusercontent.com/mitre/attack-website/master/src/assets/images/logo_attack.svg' },
  { name: 'cve', url: 'https://raw.githubusercontent.com/CVEProject/cve-website/main/src/assets/images/cve-logo.svg' },
  { name: 'nist', url: 'https://raw.githubusercontent.com/usnistgov/nist-header-footer/main/img/nist_logo.svg' },
  { name: 'owasp', url: 'https://raw.githubusercontent.com/OWASP/www-project-top10/master/assets/images/owasp-logo.svg' }
];

const dir = path.join(__dirname, 'apps/web/public/logos');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

logos.forEach(logo => {
  const file = fs.createWriteStream(path.join(dir, `${logo.name}.svg`));
  https.get(logo.url, function(response) {
    if (response.statusCode === 200) {
      response.pipe(file);
      console.log(`Downloaded ${logo.name}.svg`);
    } else {
      console.log(`Failed to download ${logo.name}.svg: ${response.statusCode}`);
    }
  }).on('error', function(err) {
    console.error(`Error downloading ${logo.name}.svg: ${err.message}`);
  });
});
