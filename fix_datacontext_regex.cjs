const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

const replacements = [
    {
        from: /if \(error\) \{ setExpenses\(prev => prev\.filter\(e => e\._stable_id !== stableId\)\); throw error; \}/g,
        to: `if (error) { if (isNetworkError(error)) { addToSyncQueue({ table: 'expenses', action: 'insert', payload: data }).catch(console.error); try { setExpenses(prev => prev.map(item => item._stable_id === stableId ? { ...item, pending_sync: true } as any : item)); } catch(e) {} } else { setExpenses(prev => prev.filter(e => e._stable_id !== stableId)); throw error; } }`
    },
    {
        from: /if \(response\.error\) \{\n\s*console\.error\("Failed to update expense in Supabase:", response\.error\);\n\s*throw response\.error;\n\s*\}/g,
        to: `if (response.error) { if (isNetworkError(response.error)) { addToSyncQueue({ table: 'expenses', action: 'update', payload: payload }).catch(console.error); try { setExpenses(prev => prev.map(item => item.id === targetId ? { ...item, pending_sync: true } as any : item)); } catch(e) {} } else { console.error("Failed to update expense in Supabase:", response.error); throw response.error; } }`
    },
    {
        from: /if \(error\) \{ setCycles\(prev => prev\.filter\(c => c\._stable_id !== stableId\)\); throw error; \}/g,
        to: `if (error) { if (isNetworkError(error)) { addToSyncQueue({ table: 'cycles', action: 'insert', payload: data }).catch(console.error); try { setCycles(prev => prev.map(item => item._stable_id === stableId ? { ...item, pending_sync: true } as any : item)); } catch(e) {} } else { setCycles(prev => prev.filter(c => c._stable_id !== stableId)); throw error; } }`
    }
];

replacements.forEach(r => {
    content = content.replace(r.from, r.to);
});

fs.writeFileSync('contexts/DataContext.tsx', content);
