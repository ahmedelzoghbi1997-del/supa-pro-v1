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

const providerDecl = sourceFile.getVariableDeclaration('DataProvider') || sourceFile.getVariableDeclaration('DataProvider'); // check arrow func
const body = providerDecl ? providerDecl.getInitializer().getBody() : sourceFile.getFunction('DataProvider').getBody();

const valueDecl = body.getDescendantsOfKind(SyntaxKind.VariableDeclaration).find(d => d.getName() === 'value');

if (!valueDecl) {
    console.log("Could not find 'value' object inside DataProvider");
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
                    
                    // 1. Replace sanitizePayloadForTable('unknown', ...) with correct table
                    const sanitizeCalls = init.getDescendantsOfKind(SyntaxKind.CallExpression).filter(c => c.getExpression().getText() === 'sanitizePayloadForTable');
                    for (const call of sanitizeCalls) {
                        const args = call.getArguments();
                        if (args.length === 2 && args[0].getText() === "'unknown'") {
                            args[0].replaceWithText(`'${table}'`);
                        }
                    }

                    // For Supabase inserts that don't use sanitizePayloadForTable yet
                    // e.g. await supabase.from('invoices').insert([{ ...inv, user_id: effectiveUserId }])
                    const supabaseCalls = init.getDescendantsOfKind(SyntaxKind.CallExpression)
                        .filter(c => {
                            const exp = c.getExpression().getText();
                            return exp.endsWith('.insert') || exp.endsWith('.update');
                        });
                        
                    for (const call of supabaseCalls) {
                        const args = call.getArguments();
                        if (args.length > 0) {
                            const parentMember = call.getExpression();
                            if (parentMember.getKind() === SyntaxKind.PropertyAccessExpression) {
                                const parentCall = parentMember.getExpression();
                                if (parentCall.getKind() === SyntaxKind.CallExpression && parentCall.getExpression().getText() === 'supabase.from') {
                                    const tableName = parentCall.getArguments()[0].getText().replace(/'|"/g, '');
                                    
                                    // if it's the target table, and hasn't been sanitized
                                    if (tableName === table && !args[0].getText().includes('sanitizePayloadForTable')) {
                                        let innerPayload = args[0].getText();
                                        if (call.getExpression().getText().endsWith('.insert')) {
                                            if (innerPayload.startsWith('[') && innerPayload.endsWith(']')) {
                                                const objPayload = innerPayload.slice(1, -1);
                                                args[0].replaceWithText(`[sanitizePayloadForTable('${table}', ${objPayload})]`);
                                            }
                                        } else { // update
                                            args[0].replaceWithText(`sanitizePayloadForTable('${table}', ${innerPayload})`);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 2. Wrap catch blocks
                    const tryStatements = init.getDescendantsOfKind(SyntaxKind.TryStatement);
                    for (const tryStmt of tryStatements) {
                        const catchClause = tryStmt.getCatchClause();
                        if (catchClause) {
                            const errVarName = catchClause.getVariableDeclaration()?.getName() || 'error';
                            const catchBlock = catchClause.getBlock();
                            const catchBodyText = catchBlock.getText().replace(/^{|}$/g, '').trim();
                            
                            // Prevent double wrapping
                            if (!catchBodyText.includes('isNetworkError(')) {
                                
                                let action = propName.startsWith('add') ? 'insert' : propName.startsWith('update') ? 'update' : 'delete';
                                
                                let networkBlock = `if (isNetworkError(${errVarName})) {\n`;
                                
                                // Best effort mapping state mutators
                                let stateTarget = table;
                                let setterName = 'set' + stateTarget.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                                
                                if (action === 'insert' || action === 'update') {
                                    let payloadVar = 'data';
                                    if (propName === 'updateInvoice' || propName === 'updateExpense' || propName === 'updateCycle') payloadVar = 'd';
                                    if (propName === 'addExpenseCategory' || propName === 'updateExpenseCategory') payloadVar = 'c';
                                    if (propName === 'addAsset' || propName === 'updateAsset') payloadVar = 'a';
                                    if (propName === 'addFarmer' || propName === 'updateFarmer') payloadVar = '{ name }';
                                    if (propName === 'addSupplier') payloadVar = '{ name, opening_balance }';
                                    if (propName === 'updateSupplier') payloadVar = 'supplier';
                                    if (propName === 'addPerson' || propName === 'updatePerson') payloadVar = '{ name, virtual_id, percentage }';
                                    
                                    networkBlock += `  await addToSyncQueue({ table: '${table}', action: '${action}', payload: ${payloadVar} });\n`;
                                    
                                    // For delete, we need recordId
                                    let idVar = action === 'update' ? 'targetId' : 'stableId';
                                    if (propName === 'updateInvoice') idVar = 'invoiceId';
                                    if (propName === 'addInvoice') idVar = 'stableId';
                                    if (propName === 'updatePerson' || propName === 'updateFarmer' || propName === 'updateSupplier') idVar = 'id';
                                    
                                    networkBlock += `  try {\n    ${setterName}(prev => prev.map(item => (item._stable_id === ${idVar} || item.id === ${idVar}) ? { ...item, pending_sync: true } as any : item));\n  } catch (e) {}\n`;
                                } else {
                                    networkBlock += `  await addToSyncQueue({ table: '${table}', action: 'delete', payload: {}, recordId: id });\n`;
                                }
                                
                                networkBlock += `} else {\n  ${catchBodyText}\n}`;
                                
                                catchBlock.replaceWithText(`{\n${networkBlock}\n}`);
                            }
                        }
                    }
                }
            }
        }
    }
}

sourceFile.saveSync();
console.log('Modifications completed.');
