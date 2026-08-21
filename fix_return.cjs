const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

const regex = /if \(isNetworkError\(([^)]+)\)\) \{\s*([^\}]+)catch \(e\) \{\}\s*\}/g;

content = content.replace(regex, (match, errVar, innerContent) => {
    // Determine the return value based on context
    let retVal = "return;";
    if (innerContent.includes('targetId')) retVal = "return;";
    else if (innerContent.includes('stableId')) retVal = "return stableId as any;";
    else if (innerContent.includes('invoiceId')) retVal = "return;";
    else if (innerContent.includes('id')) retVal = "return id as any;";
    
    return `if (isNetworkError(${errVar})) {\n${innerContent}catch (e) {}\n  ${retVal}\n}`;
});

fs.writeFileSync('contexts/DataContext.tsx', content);
