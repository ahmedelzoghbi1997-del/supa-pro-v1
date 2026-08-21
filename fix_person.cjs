const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

content = content.replace(
    /addToSyncQueue\(\{ table: 'persons', action: 'insert', payload: \{ name \} \}\)/,
    `addToSyncQueue({ table: 'persons', action: 'insert', payload: { name, virtual_id, percentage } })`
);

content = content.replace(
    /addToSyncQueue\(\{ table: 'persons', action: 'update', payload: \{ name, id \} \}\)/,
    `addToSyncQueue({ table: 'persons', action: 'update', payload: { id, name, virtual_id, percentage } })`
);

fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed person payloads.');
