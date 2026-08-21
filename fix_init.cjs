const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

// Extract the useEffect block
const effectRegex = /\/\/ Offline-First: Process sync queue when online\n\s*useEffect\(\(\) => \{\n\s*const handleOnline = \(\) => \{\n\s*console\.log\("Network online, processing sync queue\.\.\."\);\n\s*processSyncQueue\(\(\) => \{\n\s*refreshGlobalData\(\);\n\s*\}\);\n\s*\};\n\s*window\.addEventListener\('online', handleOnline\);\n\s*\n\s*\/\/ Also try to process queue on mount if online\n\s*if \(typeof navigator !== 'undefined' && navigator\.onLine\) \{\n\s*handleOnline\(\);\n\s*\}\n\s*\n\s*return \(\) => window\.removeEventListener\('online', handleOnline\);\n\s*\}, \[refreshGlobalData\]\);\n/m;

const match = content.match(effectRegex);
if (match) {
    // Remove it from current location
    content = content.replace(effectRegex, '');
    
    // Insert it after refreshGlobalData
    // We will search for:
    // const refreshGlobalData = useCallback(async () => {
    //   ...
    // }, [effectiveUserId]);
    
    // Actually, maybe we can just put it right before `const value: DataContextType = {`
    const insertPos = content.indexOf('const value: DataContextType = {');
    if (insertPos !== -1) {
        content = content.slice(0, insertPos) + match[0] + "\n    " + content.slice(insertPos);
    }
    
    fs.writeFileSync('contexts/DataContext.tsx', content);
    console.log("Moved useEffect!");
} else {
    console.log("Could not find the useEffect block.");
}
