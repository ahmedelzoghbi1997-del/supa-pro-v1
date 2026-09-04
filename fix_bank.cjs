const fs = require('fs');
let data = JSON.parse(fs.readFileSync('en.json', 'utf8'));

if (!data['الحسابات البنكية']) data['الحسابات البنكية'] = 'Bank Accounts';
if (!data['الخزائن النقدية']) data['الخزائن النقدية'] = 'Cash Vaults';

fs.writeFileSync('en.json', JSON.stringify(data, null, 2));
