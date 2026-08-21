const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

// The file has several functions:
// addAdvance: async (d) => ... -> payload: d, id is d.id
// updateAdvance: async (d) => ... targetId is d.id, payload is d
// addDailyLog: async (d) => ... -> payload: d
// updateDailyLog: async (d) => ... targetId is d.id, payload: d
// addBankAccount: async (d) => ... payload: d
// updateBankAccount: async (d) => ... targetId is d.id, payload: d
// etc...

content = content.replace(/updateDailyLog:\s*async\s*\(([^)]+)\)\s*=>\s*\{([\s\S]*?)await refreshGlobalData\(\);\n\s*\}/g, (match, args, body) => {
    return match.replace(/targetId/g, 'd.id').replace(/payload:\s*data/g, 'payload: d');
});

content = content.replace(/addDailyLog:\s*async\s*\(([^)]+)\)\s*=>\s*\{([\s\S]*?)await refreshGlobalData\(\);\n\s*\}/g, (match, args, body) => {
    return match.replace(/payload:\s*data/g, 'payload: d');
});

content = content.replace(/addCycle:\s*async\s*\(([^)]+)\)\s*=>\s*\{([\s\S]*?)await refreshGlobalData\(\);\n\s*\}/g, (match, args, body) => {
    // args: data, transferBalance, customTransferAmount -> already has 'data'
    return match;
});

// For cycle, updateCycle is actually a bit more complex? Let's check updateCycle.
// It might be `updateCycle: async (id, data) => ...`
