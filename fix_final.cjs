const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

// Fix updateExpense: payload: d -> payload: payload and targetId -> (d.id || d)
content = content.replace(
    /addToSyncQueue\(\{ table: 'expenses', action: 'update', payload: d \}\)\.catch\(console\.error\);\s*try \{\s*setExpenses\(prev => prev\.map\(item => \(item\._stable_id === targetId \|\| item\.id === targetId\)/,
    `addToSyncQueue({ table: 'expenses', action: 'update', payload: payload }).catch(console.error);
              try {
                setExpenses(prev => prev.map(item => (item._stable_id === (d.id || d) || item.id === (d.id || d))`
);

// Fix updateExpenseCategory: payload: c -> payload: d
content = content.replace(
    /addToSyncQueue\(\{ table: 'expense_categories', action: 'update', payload: c \}\)/,
    `addToSyncQueue({ table: 'expense_categories', action: 'update', payload: d })`
);
// Fix addExpenseCategory (if any broken payload) - wait, addExpenseCategory takes `c`, so payload: c is correct.

// Fix updateAsset: payload: a -> payload: d
content = content.replace(
    /addToSyncQueue\(\{ table: 'assets', action: 'update', payload: a \}\)/,
    `addToSyncQueue({ table: 'assets', action: 'update', payload: d })`
);
// Fix updateFarmer: payload: { name } -> payload: farmer and item._stable_id === id -> item._stable_id === farmer.id
content = content.replace(
    /addToSyncQueue\(\{ table: 'farmers', action: 'update', payload: \{ name \} \}\)\.catch\(console\.error\);\s*try \{\s*setFarmers\(prev => prev\.map\(item => \(item\._stable_id === id \|\| item\.id === id\)/,
    `addToSyncQueue({ table: 'farmers', action: 'update', payload: farmer }).catch(console.error);
              try {
                setFarmers(prev => prev.map(item => (item._stable_id === farmer.id || item.id === farmer.id))`
);

// Fix updateSupplier: item._stable_id === id -> item._stable_id === supplier.id
content = content.replace(
    /addToSyncQueue\(\{ table: 'suppliers', action: 'update', payload: supplier \}\)\.catch\(console\.error\);\s*try \{\s*setSuppliers\(prev => prev\.map\(item => \(item\._stable_id === id \|\| item\.id === id\)/,
    `addToSyncQueue({ table: 'suppliers', action: 'update', payload: supplier }).catch(console.error);
              try {
                setSuppliers(prev => prev.map(item => (item._stable_id === supplier.id || item.id === supplier.id))`
);

// Write changes
fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed broken references in payloads and catch blocks.');
