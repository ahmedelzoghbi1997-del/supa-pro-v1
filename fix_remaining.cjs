const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');
content = content.replace(/sanitizePayloadForTable\('partner_debts'\(\{/g, "sanitizePayloadForTable('partner_debts', {");
fs.writeFileSync('contexts/DataContext.tsx', content);
