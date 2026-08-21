const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

content = content.replace(/\)\) \? \{ \.\.\.item/g, ') ? { ...item');

fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed parens generically');
