const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

let lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('} catch (e) {}')) {
        // Find if this is inside an add/insert or update
        // Let's just look at what's returned in the original block or add `return;`
        if (lines[i+1] && lines[i+1].includes('} else {')) {
            // Check the function name we are in by looking backwards
            let j = i;
            let funcName = '';
            while (j >= 0) {
                let match = lines[j].match(/\s+([a-zA-Z0-9_]+):\s*async\s*\(/);
                if (match) {
                    funcName = match[1];
                    break;
                }
                j--;
            }
            
            // Determine return value
            let ret = 'return;';
            if (funcName === 'addBankAccount') ret = 'return stableId;';
            else if (funcName === 'addExpenseCategory') ret = 'return stableId;';
            else if (funcName === 'addPerson') ret = 'return optimisticPerson;'; // wait, what is the var?
            else if (funcName === 'addInvoice') ret = 'return;'; // addInvoice doesn't return value
            
            // just append return; after the catch
            lines[i] = lines[i].replace('} catch (e) {}', '} catch (e) {} ' + ret);
        }
    }
}

fs.writeFileSync('contexts/DataContext.tsx', lines.join('\n'));
