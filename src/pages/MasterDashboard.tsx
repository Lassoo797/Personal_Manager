import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const MasterDashboard: React.FC = () => {
  const { budgetProfiles, allAccounts, allTransactions } = useAppContext();
  const { theme } = useTheme();

  const getAccountBalance = (account: { initialBalance: number; id: string; }, transactions: any[]) => {
    return transactions.reduce((acc, t) => {
      if (t.accountId === account.id) {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, account.initialBalance);
  };
  
  const {
    operatingBalance,
    savingsBalance,
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    averageMonthlyIncome,
    averageMonthlyExpense
  } = useMemo(() => {
    const operatingAccounts = allAccounts.filter(a => a.accountType === 'Štandardný účet');
    const savingsAccounts = allAccounts.filter(a => a.accountType === 'Sporiaci účet');

    const opBalance = operatingAccounts.reduce((sum, acc) => sum + getAccountBalance(acc, allTransactions), 0);
    const savBalance = savingsAccounts.reduce((sum, acc) => sum + getAccountBalance(acc, allTransactions), 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let income = 0;
    let expenses = 0;
    let totalYearIncome = 0;
    let totalYearExpenses = 0;
    const monthsPassed = now.getMonth() + 1;
    
    allTransactions.forEach(t => {
      const transactionDate = new Date(t.date);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();

      if (transactionYear === currentYear) {
        if (t.type === 'income') {
            totalYearIncome += t.amount;
        } else {
            totalYearExpenses += t.amount;
        }
      }
      
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
    }
    });
    
    const avgIncome = monthsPassed > 0 ? totalYearIncome / monthsPassed : 0;
    const avgExpense = monthsPassed > 0 ? totalYearExpenses / monthsPassed : 0;

    return { 
      operatingBalance: opBalance,
      savingsBalance: savBalance,
      totalBalance: opBalance + savBalance,
      monthlyIncome: income,
      monthlyExpenses: expenses,
      averageMonthlyIncome: avgIncome,
      averageMonthlyExpense: avgExpense
    };
  }, [allAccounts, allTransactions]);

  if (budgetProfiles.length === 0) {
    return (
        <div className="text-center py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-light-onSurface dark:text-dark-onSurface">Vitajte v Rozpočtovom manažéri!</h2>
            <p className="mt-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                Zdá sa, že zatiaľ nemáte žiadny rozpočtový profil. Začnite tým, že si vytvoríte svoj prvý.
            </p>
            <p className="mt-2 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                Použite menu vľavo hore na správu a výber profilov.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Celkový prehľad</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Dostupné v rozpočte (Všetky profily)</h2>
          <p className="text-3xl font-bold text-light-primary dark:text-dark-primary mt-1">{operatingBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Sporenia (Všetky profily)</h2>
          <p className="text-3xl font-bold text-light-secondary dark:text-dark-secondary mt-1">{savingsBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Celkový majetok (Všetky profily)</h2>
          <p className="text-3xl font-bold text-light-tertiary dark:text-dark-tertiary mt-1">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Príjmy tento mesiac</h2>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{monthlyIncome.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Výdavky tento mesiac</h2>
          <p className="text-2xl font-bold text-light-error dark:text-dark-error mt-1">{monthlyExpenses.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Priemerný mesačný príjem</h2>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{averageMonthlyIncome.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
          <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">(od začiatku roka)</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Priemerný mesačný výdaj</h2>
          <p className="text-2xl font-bold text-light-error dark:text-dark-error mt-1">{averageMonthlyExpense.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
          <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">(od začiatku roka)</p>
        </div>
      </div>
    </div>
  );
};

export default MasterDashboard;