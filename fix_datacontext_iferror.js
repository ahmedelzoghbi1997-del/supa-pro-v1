import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
const sourceFile = project.addSourceFileAtPath('contexts/DataContext.tsx');

const tableMap = {
    addInvoice: 'invoices', updateInvoice: 'invoices', deleteInvoice: 'invoices',
    addExpense: 'expenses', updateExpense: 'expenses', deleteExpense: 'expenses',
    addCycle: 'cycles', updateCycle: 'cycles', deleteCycle: 'cycles',
    addPerson: 'persons', updatePerson: 'persons', deletePerson: 'persons',
    addVirtualMember: 'virtual_members', updateVirtualMember: 'virtual_members', deleteVirtualMember: 'virtual_members',
    addAdvance: 'advances', updateAdvance: 'advances', deleteAdvance: 'advances',
    addExpenseCategory: 'expense_categories', updateExpenseCategory: 'expense_categories', deleteExpenseCategory: 'expense_categories',
    addSupplier: 'suppliers', updateSupplier: 'suppliers', deleteSupplier: 'suppliers',
    addSupplierPayment: 'supplier_payments', updateSupplierPayment: 'supplier_payments', deleteSupplierPayment: 'supplier_payments',
    addFarmer: 'farmers', updateFarmer: 'farmers', deleteFarmer: 'farmers',
    addFarmerWithdrawal: 'farmer_withdrawals', updateFarmerWithdrawal: 'farmer_withdrawals', deleteFarmerWithdrawal: 'farmer_withdrawals',
    addAsset: 'assets', updateAsset: 'assets', deleteAsset: 'assets',
    addDailyLog: 'daily_logs', updateDailyLog: 'daily_logs', deleteDailyLog: 'daily_logs',
    addBankAccount: 'bank_accounts', updateBankAccount: 'bank_accounts', deleteBankAccount: 'bank_accounts',
    addBankTransaction: 'bank_transactions', updateBankTransaction: 'bank_transactions', deleteBankTransaction: 'bank_transactions',
    addPartnerDebt: 'partner_debts', updatePartnerDebt: 'partner_debts', deletePartnerDebt: 'partner_debts'
};

const providerDecl = sourceFile.getVariableDeclaration('DataProvider') || sourceFile.getVariableDeclaration('DataProvider'); 
const body = providerDecl ? providerDecl.getInitializer().getBody() : sourceFile.getFunction('DataProvider').getBody();

const valueDecl = body.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find(d => d.getName() === 'value');

if (!valueDecl) {
    process.exit(1);
}

const objLiteral = valueDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
if (objLiteral) {
    for (const prop of objLiteral.getProperties()) {
        if (prop.getKind() === SyntaxKind.PropertyAssignment) {
            const propName = prop.getName();
            const table = tableMap[propName];
            
            if (table) {
                const init = prop.getInitializer();
                if (init && (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression)) {
                    
                    // find "if (error)" or "if (response.error)" that throw
                    const ifStatements = init.getDescendantsOfKind(SyntaxKind.IfStatement);
                    for (const ifStmt of ifStatements) {
                        const condition = ifStmt.getExpression().getText();
                        if (condition === 'error' || condition === 'response.error' || condition === 'invError' || condition.endsWith('.error')) {
                            const thenStmt = ifStmt.getThenStatement();
                            const thenText = thenStmt.getText();
                            if (thenText.includes('throw') && !thenText.includes('isNetworkError(')) {
                                
                                let action = propName.startsWith('add') ? 'insert' : propName.startsWith('update') ? 'update' : 'delete';
                                
                                let stateTarget = table;
                                let setterName = 'set' + stateTarget.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                
                                let payloadVar = 'data';
                                if (propName === 'updateInvoice' || propName === 'updateExpense' || propName === 'updateCycle') payloadVar = 'd';
                                if (propName === 'addExpenseCategory' || propName === 'updateExpenseCategory') payloadVar = 'c';
                                if (propName === 'addAsset' || propName === 'updateAsset') payloadVar = 'a';
                                if (propName === 'addFarmer' || propName === 'updateFarmer') payloadVar = '{ name }';
                                if (propName === 'addSupplier') payloadVar = '{ name, opening_balance }';
                                if (propName === 'updateSupplier') payloadVar = 'supplier';
                                if (propName === 'addPerson' || propName === 'updatePerson') payloadVar = '{ name, virtual_id, percentage }';
                                
                                let idVar = action === 'update' ? 'targetId' : 'stableId';
                                if (propName === 'updateInvoice') idVar = 'invoiceId';
                                if (propName === 'addInvoice') idVar = 'stableId';
                                if (propName === 'updatePerson' || propName === 'updateFarmer' || propName === 'updateSupplier') idVar = 'id';
                                if (propName.startsWith('delete')) idVar = 'id';

                                let errVar = condition;
                                
                                let networkBlock = `if (isNetworkError(${errVar})) {\n`;
                                
                                if (action === 'insert' || action === 'update') {
                                    networkBlock += `  addToSyncQueue({ table: '${table}', action: '${action}', payload: ${payloadVar} }).catch(console.error);\n`;
                                    networkBlock += `  try {\n    ${setterName}(prev => prev.map(item => (item._stable_id === ${idVar} || item.id === ${idVar}) ? { ...item, pending_sync: true } as any : item));\n  } catch (e) {}\n`;
                                } else {
                                    networkBlock += `  addToSyncQueue({ table: '${table}', action: 'delete', payload: {}, recordId: ${idVar} }).catch(console.error);\n`;
                                }
                                
                                networkBlock += `} else {\n  ${thenText.replace(/^{|}$/g, '').trim()}\n}`;
                                
                                ifStmt.replaceWithText(`if (${errVar}) { ${networkBlock} }`);
                            }
                        }
                    }
                }
            }
        }
    }
}

sourceFile.saveSync();
console.log('If-error Modifications completed.');
