const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

// Fix updateSupplier
content = content.replace(
    /setSuppliers\(prev => prev\.map\(item => \(item\._stable_id === supplier\.id \|\| item\.id === supplier\.id\)\) \? \{ \.\.\.item, pending_sync: true \} as any : item\)\);/,
    `setSuppliers(prev => prev.map(item => (item._stable_id === supplier.id || item.id === supplier.id) ? { ...item, pending_sync: true } as any : item));`
);

// Fix updateFarmer
content = content.replace(
    /setFarmers\(prev => prev\.map\(item => \(item\._stable_id === farmer\.id \|\| item\.id === farmer\.id\)\) \? \{ \.\.\.item, pending_sync: true \} as any : item\)\);/,
    `setFarmers(prev => prev.map(item => (item._stable_id === farmer.id || item.id === farmer.id) ? { ...item, pending_sync: true } as any : item));`
);

// Fix updateExpense
content = content.replace(
    /setExpenses\(prev => prev\.map\(item => \(item\._stable_id === \(d\.id \|\| d\) \|\| item\.id === \(d\.id \|\| d\)\)\) \? \{ \.\.\.item, pending_sync: true \} as any : item\)\);/,
    `setExpenses(prev => prev.map(item => (item._stable_id === (d.id || d) || item.id === (d.id || d)) ? { ...item, pending_sync: true } as any : item));`
);

fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed parens');
