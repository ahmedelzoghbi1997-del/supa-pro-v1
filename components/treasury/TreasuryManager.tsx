import { useState } from 'react';

import React, { useMemo, useCallback, useEffect } from 'react';
import TreasuryList from './TreasuryList';
import TreasuryDetails from './TreasuryDetails';
import BankAccountDetails from './BankAccountDetails';
import { useTreasury } from '../../hooks/useTreasury';

const TreasuryManager: React.FC = () => {
    const { treasuryFunds, bankAccounts } = useTreasury();
    
    const [view, setView] = useState<'list' | 'fund_details' | 'bank_details'>(() => {
        const state = window.history.state;
        if (state?.treasuryDetails) return 'fund_details';
        if (state?.bankDetails) return 'bank_details';
        return 'list';
    });
    const [selectedFundId, setSelectedFundId] = useState<string | null>(() => window.history.state?.treasuryDetails || null);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(() => window.history.state?.bankDetails || null);

    const handleViewFundDetails = (id: string) => {
        window.history.pushState({ ...window.history.state, treasuryDetails: id }, '', window.location.href);
        setSelectedFundId(id);
        setView('fund_details');
    };

    const handleViewBankDetails = (id: string) => {
        window.history.pushState({ ...window.history.state, bankDetails: id }, '', window.location.href);
        setSelectedBankId(id);
        setView('bank_details');
    };

    const handleBackToList = useCallback(() => {
        setView('list');
        setSelectedFundId(null);
        setSelectedBankId(null);
        window.history.back();
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (view !== 'list' && !event.state?.treasuryDetails && !event.state?.bankDetails) {
                setView('list');
                setSelectedFundId(null);
                setSelectedBankId(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [view]);

    const selectedFund = useMemo(() => {
        return treasuryFunds.find(fund => fund.id === selectedFundId);
    }, [selectedFundId, treasuryFunds]);

    const selectedBank = useMemo(() => {
        return bankAccounts.find(acc => acc.id === selectedBankId);
    }, [selectedBankId, bankAccounts]);

    return (
        <div className="w-full">
            {view === 'fund_details' && selectedFund ? (
                <TreasuryDetails 
                    fund={selectedFund} 
                    onBack={handleBackToList} 
                    showBackButton={true}
                />
            ) : view === 'bank_details' && selectedBank ? (
                <BankAccountDetails 
                    account={selectedBank} 
                    onBack={handleBackToList} 
                />
            ) : (
                <TreasuryList 
                    funds={treasuryFunds} 
                    onViewDetails={handleViewFundDetails} 
                    onViewBankDetails={handleViewBankDetails}
                />
            )}
        </div>
    );
};

export default TreasuryManager;
