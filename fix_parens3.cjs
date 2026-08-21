const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

// Fix expenses
content = content.replace(
    /item\.id === \(d\.id \|\| d\) \? \{/g,
    'item.id === (d.id || d)) ? {'
);

// Fix farmers
content = content.replace(
    /item\.id === farmer\.id \? \{/g,
    'item.id === farmer.id) ? {'
);

// Fix suppliers
content = content.replace(
    /item\.id === supplier\.id \? \{/g,
    'item.id === supplier.id) ? {'
);

fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed syntax again');
