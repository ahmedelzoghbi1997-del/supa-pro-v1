const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

const functionParamMap = {
    'updateInvoice': 'd',
    'addDailyLog': 'data', // wait, addDailyLog uses `data`
    'updateDailyLog': 'd',
    'addExpense': 'data', // uses `data`
    // 'updateExpense': 'd', // skipping updateExpense because targetId is correct there
    'addCycle': 'data', // uses data
    'updateCycle': 'd',
    'addAdvance': 'd',
    'updateAdvance': 'd',
    'addSupplier': 'name',
    'updateSupplier': 'supplier',
    'addSupplierPayment': 'd',
    'updateSupplierPayment': 'd',
    'addFarmer': 'name',
    'updateFarmer': 'farmer',
    'addFarmerWithdrawal': 'd',
    'updateFarmerWithdrawal': 'd',
    'addExpenseCategory': 'c',
    'updateExpenseCategory': 'd',
    'addAsset': 'a',
    'updateAsset': 'd',
    'addBankAccount': 'd',
    'updateBankAccount': 'd',
    'addBankTransaction': 'd',
    'updateBankTransaction': 'd',
    'addPartnerDebt': 'd',
    'updatePartnerDebt': 'd',
};

// Replace 'payload: data' inside the function scope with the right variable
for (const [funcName, paramName] of Object.entries(functionParamMap)) {
    // Find the function definition
    const funcStartRegex = new RegExp(`${funcName}:\\s*async\\s*\\(([^)]*)\\)\\s*=>\\s*\\{`, 'g');
    let match = funcStartRegex.exec(content);
    if (match) {
        let startIndex = match.index;
        // Find the matching closing bracket for this function (or just assume the next function definition is the end)
        let endIndex = content.length;
        const nextFuncRegex = /[a-zA-Z0-9_]+:\s*async\s*\(/g;
        nextFuncRegex.lastIndex = startIndex + match[0].length;
        let nextMatch = nextFuncRegex.exec(content);
        if (nextMatch) {
            endIndex = nextMatch.index;
        }

        let funcBody = content.substring(startIndex, endIndex);

        // Fix payload: data -> payload: paramName
        if (paramName !== 'data') {
            funcBody = funcBody.replace(/payload:\s*data(\s*})?/g, (m, g1) => {
                // if it's `payload: data}`, replace with `payload: paramName}`
                if (g1) return `payload: ${paramName}${g1}`;
                return `payload: ${paramName}`;
            });
        }
        
        // Fix targetId -> paramName.id (unless paramName is 'name'?)
        // If it's updateSupplier, it's supplier.id
        // For add functions it usually uses `stableId`. So we shouldn't touch `stableId`. We are replacing `targetId`.
        if (funcName !== 'updateExpense' && funcName !== 'updateInvoice') {
            funcBody = funcBody.replace(/targetId/g, `${paramName}.id`);
        }

        content = content.substring(0, startIndex) + funcBody + content.substring(endIndex);
    }
}

// Special case for updateInvoice: it uses 'd' as param, but it has `invoiceId`
// I don't see targetId in updateInvoice, it uses `invoiceId`.

fs.writeFileSync('contexts/DataContext.tsx', content);
console.log('Fixed reference errors');
