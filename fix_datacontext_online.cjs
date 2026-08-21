const fs = require('fs');
let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

const importSync = "import { addToSyncQueue, isNetworkError, processSyncQueue } from '../lib/syncQueue';";
content = content.replace(/import { addToSyncQueue, isNetworkError } from '\.\.\/lib\/syncQueue';/, importSync);

const onlineEffect = `
    // Offline-First: Process sync queue when online
    useEffect(() => {
        const handleOnline = () => {
            console.log("Network online, processing sync queue...");
            processSyncQueue(() => {
                refreshGlobalData();
            });
        };
        window.addEventListener('online', handleOnline);
        
        // Also try to process queue on mount if online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            handleOnline();
        }
        
        return () => window.removeEventListener('online', handleOnline);
    }, [refreshGlobalData]);
`;

// Insert it somewhere inside DataProvider, after effectiveUserId is defined
content = content.replace(/const effectiveUserId = profile\?\.parent_id \|\| \(profile as any\)\?\.owner_id \|\| profile\?\.id;/, "const effectiveUserId = profile?.parent_id || (profile as any)?.owner_id || profile?.id;\n" + onlineEffect);

fs.writeFileSync('contexts/DataContext.tsx', content);
