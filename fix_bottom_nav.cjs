const fs = require('fs');
let code = fs.readFileSync('./components/BottomNav.tsx', 'utf8');

const returnRegex = /return \(\s*<>\s*\{\/\* Bottom Navigation Bar \(Mobile Only\) \*\/\}.*?\);\s*\};\s*export default BottomNav;/s;

const newReturn = `return (
        <>
            {/* Bottom Navigation Bar (Mobile Only) */}
            <div 
                className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0a0a0a] border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
            >
                <div className="flex items-center justify-around px-2 py-1.5 relative">
                    {bottomBarItems.map(item => {
                        const isActive = activeItem === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                className="relative flex flex-col items-center justify-center flex-1 h-[56px] transition-transform duration-200 active:scale-90 group outline-none select-none"
                            >
                                <div className={\`relative z-10 flex flex-col items-center justify-center gap-1 w-full max-w-[72px] py-1.5 mx-auto transition-colors duration-200 \${isActive ? 'bg-neutral-100 dark:bg-neutral-900 rounded-2xl' : ''}\`}>
                                    <item.icon className={\`w-6 h-6 transition-colors duration-200 \${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}\`} />
                                    <span className={\`text-[11px] tracking-wide truncate w-full text-center px-1 transition-colors duration-200 \${isActive ? 'font-black text-neutral-900 dark:text-white' : 'font-semibold text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}\`}>{getShortLabel(item.id, item.label)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
export default BottomNav;`;

const newCode = code.replace(returnRegex, newReturn);
fs.writeFileSync('./components/BottomNav.tsx', newCode);
console.log("Done");
