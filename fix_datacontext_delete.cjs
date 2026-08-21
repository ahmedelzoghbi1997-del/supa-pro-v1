const fs = require('fs');

let content = fs.readFileSync('contexts/DataContext.tsx', 'utf8');

const tables = [
    { method: 'deleteExpense', table: 'expenses' },
    { method: 'deleteCycle', table: 'cycles' },
    { method: 'deletePerson', table: 'persons' },
    { method: 'deleteVirtualMember', table: 'virtual_members' },
    { method: 'deleteAdvance', table: 'advances' },
    { method: 'deleteSupplier', table: 'suppliers' },
    { method: 'deleteSupplierPayment', table: 'supplier_payments' },
    { method: 'deleteFarmer', table: 'farmers' },
    { method: 'deleteFarmerWithdrawal', table: 'farmer_withdrawals' },
    { method: 'deleteExpenseCategory', table: 'expense_categories' },
    { method: 'deleteAsset', table: 'assets' },
    { method: 'deleteDailyLog', table: 'daily_logs' },
    { method: 'deleteBankAccount', table: 'bank_accounts' },
    { method: 'deleteBankTransaction', table: 'bank_transactions' },
    { method: 'deletePartnerDebt', table: 'partner_debts' }
];

tables.forEach(t => {
    const regexStr = `${t.method}: async \\(id\\) => \\{\\s*([\\s\\S]*?await supabase\\.from\\('${t.table}'\\)\\.delete\\(\\)\\.eq\\('id', id\\);\\s*[\\s\\S]*?)\\s*\\},`;
    const regex = new RegExp(regexStr);
    const match = content.match(regex);
    if (match) {
        if (!match[1].includes('isNetworkError')) {
            const newBody = `try {\n${match[1]}\n} catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: '${t.table}', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }`;
            content = content.replace(regex, `${t.method}: async (id) => {\n${newBody}\n},`);
        }
    }
});

fs.writeFileSync('contexts/DataContext.tsx', content);
