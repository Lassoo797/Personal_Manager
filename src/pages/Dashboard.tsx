import React, { useMemo, useState } from 'react';
import { 
    Area, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, CartesianGrid, ReferenceArea
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';
import { LandmarkIcon, PiggyBankIcon, BanknotesIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, WalletIcon } from '../components/icons';

const COLORS = ['#0061A4', '#535F70', '#6B5778', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC = () => {
  const { accounts, transactions, categories, budgets, getAccountBalance, getFinancialSummary } = useAppContext();
  const { theme } = useTheme();
  const [displayedYear, setDisplayedYear] = useState(new Date().getFullYear());

  const { minBudgetYear, maxBudgetYear } = useMemo(() => {
    const budgetYears = budgets.map(b => parseInt(b.month.split('-')[0], 10));
    const currentYear = new Date().getFullYear();
    return {
      minBudgetYear: budgetYears.length > 0 ? Math.min(...budgetYears) : currentYear,
      maxBudgetYear: budgetYears.length > 0 ? Math.max(...budgetYears) : currentYear
    };
  }, [budgets]);

  const { currentMonthName, previousMonthLabel } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    const currentName = now.toLocaleString('sk-SK', { month: 'short' });

    let previousLabel;
    if (currentMonthIndex === 0) { // If it's January
        previousLabel = (currentYear - 1).toString();
    } else {
        const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1);
        previousLabel = prevMonthDate.toLocaleString('sk-SK', { month: 'short' });
    }
    
    return { currentMonthName: currentName, previousMonthLabel: previousLabel };
  }, []);

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const totalSavings = useMemo(() => {
      return accounts
        .filter(a => a.isSavings)
        .reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);

  const budgetBalance = useMemo(() => totalBalance - totalSavings, [totalBalance, totalSavings]);
  
  const accountIds = useMemo(() => new Set(accounts.map(a => a.id)), [accounts]);

  const budgetTransactions = useMemo(() => 
    transactions.filter(t => accountIds.has(t.accountId) && t.onBudget !== false),
    [transactions, accountIds]
  );
  
  const { 
    monthlyIncome, 
    monthlyExpenses,
    monthlyChartData,
    averageMonthlyIncome,
    averageMonthlyExpense,
    pieChartData,
    monthlyNet
  } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const byCategory: { [key: string]: number } = {};
    const lastSixMonthsData: { [key: string]: { income: number, expenses: number }} = {};

    let totalYearIncome = 0;
    let totalYearExpenses = 0;
    
    const yearlyTransactions = budgetTransactions.filter(t => new Date(t.transactionDate).getFullYear() === currentYear);
    const yearlySummary = getFinancialSummary(yearlyTransactions);
    totalYearIncome = yearlySummary.actualIncome;
    totalYearExpenses = yearlySummary.actualExpense;

    const monthsPassed = new Date().getMonth() + 1;

    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const monthKey = d.toLocaleString('sk-SK', { month: 'short', year: 'numeric' });
        const monthTransactions = budgetTransactions.filter(t => {
            const tDate = new Date(t.transactionDate);
            return tDate.getFullYear() === d.getFullYear() && tDate.getMonth() === d.getMonth();
        });
        const { actualIncome, actualExpense } = getFinancialSummary(monthTransactions);
        lastSixMonthsData[monthKey] = { income: actualIncome, expenses: actualExpense };
    }

    const currentMonthTransactions = budgetTransactions.filter(t => {
        const transactionDate = new Date(t.transactionDate);
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
    });

    const { actualIncome: monthlyIncome, actualExpense: monthlyExpenses } = getFinancialSummary(currentMonthTransactions);
    const monthlyNet = monthlyIncome - monthlyExpenses;

    currentMonthTransactions.forEach(t => {
      if (t.type === 'expense') {
        const category = categories.find(c => c.id === t.categoryId);
        const parentCategory = category?.parentId ? categories.find(c => c.id === category.parentId) : category;
        if (parentCategory) {
          byCategory[parentCategory.name] = (byCategory[parentCategory.name] || 0) + t.amount;
        }
      }
    });

    const pieChartData = Object.entries(byCategory)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);

    const chartData = Object.entries(lastSixMonthsData).map(([name, values]) => ({ name, ...values }));
    const avgIncome = monthsPassed > 0 ? totalYearIncome / monthsPassed : 0;
    const avgExpense = monthsPassed > 0 ? totalYearExpenses / monthsPassed : 0;

    return { 
        monthlyIncome, 
        monthlyExpenses, 
        pieChartData, 
        monthlyChartData: chartData,
        averageMonthlyIncome: avgIncome,
        averageMonthlyExpense: avgExpense,
        monthlyNet
    };
  }, [budgetTransactions, categories, getFinancialSummary]);


const { chartData, months, currentMonthIndex, yAxisDomain, yAxisTicks } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); 

    const allTransactions = transactions.filter(t => 
        accountIds.has(t.accountId) || (t.destinationAccountId && accountIds.has(t.destinationAccountId))
    );
    const incomeCategoryIds = new Set(categories.filter(c => c.type === 'income').map(c => c.id));

    const getBalanceUpToDate = (targetDate: Date, onlyBudgetAccounts = false): number => {
        let balance = 0;
        const targetAccounts = onlyBudgetAccounts ? accounts.filter(a => !a.isSavings) : accounts;
        const targetAccountIds = new Set(targetAccounts.map(a => a.id));

        targetAccounts.forEach(acc => {
            if (acc.initialBalanceDate && new Date(acc.initialBalanceDate) < targetDate) {
                balance += acc.initialBalance || 0;
            }
        });
        const relevantTransactions = allTransactions.filter(t => new Date(t.transactionDate) < targetDate);
        const delta = relevantTransactions.reduce((sum, t) => {
            if (t.type === 'transfer') {
                if (targetAccountIds.has(t.accountId)) sum -= t.amount;
                if (t.destinationAccountId && targetAccountIds.has(t.destinationAccountId)) sum += t.amount;
            } else if (targetAccountIds.has(t.accountId)) {
                sum += (t.type === 'income' ? t.amount : -t.amount);
            }
            return sum;
        }, 0);
        return balance + delta;
    };

    let yearStartBalance = 0;
    let yearStartSavings = 0;

    if (displayedYear <= currentYear) {
        yearStartBalance = getBalanceUpToDate(new Date(displayedYear, 0, 1), true);
        yearStartSavings = getBalanceUpToDate(new Date(displayedYear, 0, 1)) - yearStartBalance;
    } else {
        // ... (predikcia pre budúce roky - tu by bolo vhodné tiež zohľadniť rozdelenie, ale pre zjednodušenie necháme zatiaľ logiku "všetko v jednom" alebo ju upravíme neskôr ak bude treba)
        // Pre jednoduchosť, predikcia vychádza z aktuálneho stavu budget účtov
        const startOfCurrentMonthBalance = getBalanceUpToDate(new Date(currentYear, currentMonth, 1), true);
        const startOfCurrentMonthTotal = getBalanceUpToDate(new Date(currentYear, currentMonth, 1));
        const startOfCurrentMonthSavings = startOfCurrentMonthTotal - startOfCurrentMonthBalance;
        
        // ... (zvyšok logiky pre predikciu - tu treba dať pozor, aby sme počítali len budget účty pre 'balance' a savings pre 'savings')
        // Pre tento moment zjednodušíme a povieme, že forecast pre budúce roky sa týka len "budget" peňazí, keďže sporiace sa hýbu len manuálne.
        
        // REVIZOVANÁ LOGIKA PREDIKCIE (iba pre budget účty):
        const currentMonthTransactions = allTransactions.filter(t => {
            const d = new Date(t.transactionDate);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        const currentMonthBudgets = budgets.filter(b => b.month === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`);
        
        // ... výpočet delty pre aktuálny mesiac ...
        const categoryData = new Map<string, { plan: number, actual: number, type: 'income' | 'expense' }>();
        // ... (naplnenie categoryData ako doteraz) ...
        const allCategoryIds = new Set([
            ...currentMonthBudgets.map(b => b.categoryId),
            ...currentMonthTransactions.map(t => t.categoryId).filter((id): id is string => !!id)
        ]);
        allCategoryIds.forEach(categoryId => {
            const category = categories.find(c => c.id === categoryId);
            if(category) {
                categoryData.set(categoryId, { plan: 0, actual: 0, type: category.type });
            }
        });
        currentMonthBudgets.forEach(b => {
            const data = categoryData.get(b.categoryId);
            if (data) data.plan = b.amount;
        });
        currentMonthTransactions.forEach(t => {
             // Tu by sme mali brať do úvahy len transakcie z budget účtov? 
             // Zatiaľ berieme všetky, lebo budget sa týka kategórií, nie účtov.
             // Ale reálne, ak zaplatím zo sporiaceho, nemalo by to ovplyvniť budget forecast bežného účtu?
             // Pre zjednodušenie: Budget = plán pre bežné výdavky.
             if (t.type !== 'transfer' && t.categoryId) {
                const data = categoryData.get(t.categoryId);
                if (data) data.actual += t.amount;
            }
        });

        let effectiveCurrentMonthDelta = 0;
        categoryData.forEach(data => {
            const value = Math.max(data.actual, data.plan);
            if (data.type === 'income') effectiveCurrentMonthDelta += value;
            else effectiveCurrentMonthDelta -= value;
        });

        let initialBalanceInCurrentMonth = 0;
        accounts.filter(a => !a.isSavings).forEach(acc => {
             if (acc.initialBalanceDate) {
                const d = new Date(acc.initialBalanceDate);
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) initialBalanceInCurrentMonth += acc.initialBalance || 0;
            }
        });

        const endOfCurrentMonthForecast = startOfCurrentMonthBalance + effectiveCurrentMonthDelta + initialBalanceInCurrentMonth;

        // ... forecast do konca roka ...
        let forecastForEndOfYear = endOfCurrentMonthForecast;
        for (let m = currentMonth + 1; m < 12; m++) {
            budgets.forEach(b => {
                const [bYear, bMonth] = b.month.split('-').map(Number);
                if (bYear === currentYear && (bMonth - 1) === m) {
                    forecastForEndOfYear += incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount;
                }
            });
            accounts.filter(a => !a.isSavings).forEach(acc => {
                if (acc.initialBalanceDate) {
                    const d = new Date(acc.initialBalanceDate);
                    if (d.getFullYear() === currentYear && d.getMonth() === m) forecastForEndOfYear += acc.initialBalance || 0;
                }
            });
        }
        
        // ... forecast pre ďalšie roky až po displayedYear ...
        let runningProjectedBalance = forecastForEndOfYear;
        for (let year = currentYear + 1; year < displayedYear; year++) {
            const yearBudgets = budgets.filter(b => b.month.startsWith(year.toString()));
            runningProjectedBalance += yearBudgets.reduce((sum, b) => sum + (incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount), 0);
             accounts.filter(a => !a.isSavings).forEach(acc => {
                if(acc.initialBalanceDate) {
                    const d = new Date(acc.initialBalanceDate);
                    if (d.getFullYear() === year) runningProjectedBalance += acc.initialBalance || 0;
                }
            });
        }
        
        yearStartBalance = runningProjectedBalance;
        
        // Savings forecast - assume constant unless transfers are planned (which we don't have planned transfers yet)
        yearStartSavings = startOfCurrentMonthSavings; 
    }
    
    const months = Array.from({ length: 12 }, (_, i) => new Date(displayedYear, i, 1).toLocaleString('sk-SK', { month: 'short' }));
    
    const chartData = [{
        name: (displayedYear - 1).toString(),
        actual: yearStartBalance, 
        plan: yearStartBalance, 
        forecast: null as number | null,
        savings: yearStartSavings,
        savingsPlan: yearStartSavings
    }, ...months.map(name => ({
        name, actual: null as number | null, plan: null as number | null, forecast: null as number | null, savings: null as number | null, savingsPlan: null as number | null
    }))];

    const monthlyBudgetDeltas = Array(12).fill(0);
    budgets.forEach(b => {
        const [bYear, bMonth] = b.month.split('-').map(Number);
        if (bYear === displayedYear) {
            monthlyBudgetDeltas[bMonth - 1] += incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount;
        }
    });

    let runningPlanBalance = yearStartBalance;
    let runningSavingsPlanBalance = yearStartSavings;

    for (let i = 0; i < 12; i++) {
        accounts.filter(a => !a.isSavings).forEach(acc => {
            if (acc.initialBalanceDate) {
                const initialDate = new Date(acc.initialBalanceDate);
                if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) runningPlanBalance += acc.initialBalance || 0;
            }
        });
        
        accounts.filter(a => a.isSavings).forEach(acc => {
            if (acc.initialBalanceDate) {
                const initialDate = new Date(acc.initialBalanceDate);
                if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) runningSavingsPlanBalance += acc.initialBalance || 0;
            }
        });

        runningPlanBalance += monthlyBudgetDeltas[i];
        chartData[i + 1].plan = runningPlanBalance;
        chartData[i + 1].savingsPlan = runningSavingsPlanBalance;
    }
    
    // Výpočet ACTUAL a SAVINGS pre minulosť a prítomnosť
    // Zadefinovanie množín ID účtov pre rýchlejšie vyhľadávanie
    const budgetAccountIds = useMemo(() => new Set(accounts.filter(a => !a.isSavings).map(a => a.id)), [accounts]);
    const savingsAccountIds = useMemo(() => new Set(accounts.filter(a => a.isSavings).map(a => a.id)), [accounts]);

    if (displayedYear <= currentYear) {
        let runningActualBalance = yearStartBalance;
        let runningSavingsBalance = yearStartSavings;
        const effectiveMonthCount = displayedYear < currentYear ? 12 : currentMonth;
        
        for (let i = 0; i < effectiveMonthCount; i++) { 
            // Initial balances in this month
            accounts.forEach(acc => {
                if (acc.initialBalanceDate) {
                    const initialDate = new Date(acc.initialBalanceDate);
                    if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) {
                        if (acc.isSavings) runningSavingsBalance += acc.initialBalance || 0;
                        else runningActualBalance += acc.initialBalance || 0;
                    }
                }
            });

            const monthlyTransactions = allTransactions.filter(t => new Date(t.transactionDate).getFullYear() === displayedYear && new Date(t.transactionDate).getMonth() === i);
            
            monthlyTransactions.forEach(t => {
                if (t.type === 'transfer') {
                    // Odchod z budget účtu
                    if (budgetAccountIds.has(t.accountId)) runningActualBalance -= t.amount;
                    // Príchod na budget účet
                    if (t.destinationAccountId && budgetAccountIds.has(t.destinationAccountId)) runningActualBalance += t.amount;
                    
                    // Odchod zo savings účtu
                    if (savingsAccountIds.has(t.accountId)) runningSavingsBalance -= t.amount;
                    // Príchod na savings účet
                    if (t.destinationAccountId && savingsAccountIds.has(t.destinationAccountId)) runningSavingsBalance += t.amount;
                    
                } else {
                    // Income/Expense
                    if (budgetAccountIds.has(t.accountId)) {
                        runningActualBalance += (t.type === 'income' ? t.amount : -t.amount);
                    }
                    if (savingsAccountIds.has(t.accountId)) {
                         runningSavingsBalance += (t.type === 'income' ? t.amount : -t.amount);
                    }
                }
            });

            chartData[i + 1].actual = runningActualBalance;
            chartData[i + 1].savings = runningSavingsBalance;
        }
    }

    // FORECAST pre aktuálny rok
    if (displayedYear === currentYear) {
        const startOfCurrentMonthBalance = chartData[currentMonth].actual ?? getBalanceUpToDate(new Date(currentYear, currentMonth, 1), true);
        const startOfCurrentMonthSavings = chartData[currentMonth].savings ?? (getBalanceUpToDate(new Date(currentYear, currentMonth, 1)) - startOfCurrentMonthBalance);

        chartData[currentMonth].forecast = startOfCurrentMonthBalance;
        
        // Pre jednoduchosť, savings forecast držíme konštantný od posledného známeho bodu, ale musíme zohľadniť aktuálne prevody v tomto mesiaci
        let runningSavingsForecast = startOfCurrentMonthSavings;
        
        // ... (Logika pre forecast balance beží rovnako ako predtým, len s odfiltrovaním savings účtov pre initialBalance) ...
        const currentMonthTransactions = allTransactions.filter(t => new Date(t.transactionDate).getFullYear() === currentYear && new Date(t.transactionDate).getMonth() === currentMonth);
        const currentMonthBudgets = budgets.filter(b => b.month === `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`);
        
        const categoryData = new Map<string, { plan: number, actual: number, type: 'income' | 'expense' }>();
        const allCategoryIds = new Set([
            ...currentMonthBudgets.map(b => b.categoryId),
            ...currentMonthTransactions.map(t => t.categoryId).filter((id): id is string => !!id)
        ]);

        allCategoryIds.forEach(categoryId => {
            const category = categories.find(c => c.id === categoryId);
            if(category) {
                categoryData.set(categoryId, { plan: 0, actual: 0, type: category.type });
            }
        });

        currentMonthBudgets.forEach(b => {
            const data = categoryData.get(b.categoryId);
            if (data) data.plan = b.amount;
        });

        let currentMonthTransferDeltaBudget = 0;
        let currentMonthTransferDeltaSavings = 0;

        currentMonthTransactions.forEach(t => {
            // Income/Expense categories logic
            if (t.type !== 'transfer' && t.categoryId) {
                const data = categoryData.get(t.categoryId);
                if (data) data.actual += t.amount;
            }

            // Transfer Logic for Forecast
            if (t.type === 'transfer') {
                // Budget Accounts Impact
                if (budgetAccountIds.has(t.accountId)) currentMonthTransferDeltaBudget -= t.amount;
                if (t.destinationAccountId && budgetAccountIds.has(t.destinationAccountId)) currentMonthTransferDeltaBudget += t.amount;

                // Savings Accounts Impact
                if (savingsAccountIds.has(t.accountId)) currentMonthTransferDeltaSavings -= t.amount;
                if (t.destinationAccountId && savingsAccountIds.has(t.destinationAccountId)) currentMonthTransferDeltaSavings += t.amount;
            }
        });

        let effectiveCurrentMonthDelta = 0;
        categoryData.forEach(data => {
            const value = Math.max(data.actual, data.plan);
            if (data.type === 'income') effectiveCurrentMonthDelta += value;
            else effectiveCurrentMonthDelta -= value;
        });
        
        let initialBalanceInCurrentMonth = 0;
        accounts.filter(a => !a.isSavings).forEach(acc => {
            if (acc.initialBalanceDate) {
                const d = new Date(acc.initialBalanceDate);
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) initialBalanceInCurrentMonth += acc.initialBalance || 0;
            }
        });
        
        // Forecast na konci mesiaca = (Start) + (Plan vs Actual Income/Expense) + (Transfers) + (Initials)
        const endOfCurrentMonthForecast = startOfCurrentMonthBalance + effectiveCurrentMonthDelta + currentMonthTransferDeltaBudget + initialBalanceInCurrentMonth;
        
        // Update savings forecast with transfers happened this month
        runningSavingsForecast += currentMonthTransferDeltaSavings;

        chartData[currentMonth + 1].forecast = endOfCurrentMonthForecast;
        chartData[currentMonth + 1].savings = runningSavingsForecast;
        
        let runningForecastBalance = endOfCurrentMonthForecast;
        for (let i = currentMonth + 1; i < 12; i++) {
            let monthlyInitialBalance = 0;
            accounts.filter(a => !a.isSavings).forEach(acc => {
                if (acc.initialBalanceDate) {
                    const initialDate = new Date(acc.initialBalanceDate);
                    if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) monthlyInitialBalance += acc.initialBalance || 0;
                }
            });
            runningForecastBalance += monthlyInitialBalance + monthlyBudgetDeltas[i];
            chartData[i + 1].forecast = runningForecastBalance;
            chartData[i + 1].savings = runningSavingsForecast;
        }
    }
    
    // Fill savings for past years or future years if needed (simple constant extension for now)
    if (displayedYear !== currentYear) {
         // Ak pozeráme minulý rok, savings sú už vypočítané v 'actual' loope vyššie.
         // Ak pozeráme budúci rok, mali by sme ich naplniť z posledného známeho stavu.
         if (displayedYear > currentYear) {
             const latestSavings = getBalanceUpToDate(new Date()) - getBalanceUpToDate(new Date(), true);
             chartData.forEach(d => d.savings = latestSavings);
         }
    }

    const processedChartData = chartData.map(d => {
        const rawSavings = d.savings ?? 0;
        const rawActual = d.actual;
        const rawForecast = d.forecast;
        const rawPlan = d.plan;

        // --- VÝPOČET ZOBRAZOVANÉHO SPORENIA ---
        // Ak je budget (actual alebo forecast) záporný, znamená to, že "požierame" sporenie.
        // Vtedy sa krivka sporenia zníži o túto stratu.
        
        let visualSavingsActual = null;
        let visualTotalActual = null;

        if (rawActual !== null) {
            // Celkový majetok je vždy Sporenie + Budget
            visualTotalActual = rawSavings + rawActual;
            // Zobrazované sporenie: Ak je budget < 0, sporenie klesá (rovná sa celkovému majetku)
            // Ak je budget > 0, sporenie ostáva na svojej úrovni
            visualSavingsActual = rawActual < 0 ? visualTotalActual : rawSavings;
        }

        let visualSavingsForecast = null;
        let visualTotalForecast = null;

        if (rawForecast !== null) {
            visualTotalForecast = rawSavings + rawForecast;
            // Rovnaká logika pre prognózu
            visualSavingsForecast = rawForecast < 0 ? visualTotalForecast : rawSavings;
        }

        // Plán tiež pripočítame k sporeniu pre kontext celkového majetku,
        // ale použijeme 'savingsPlan', ktorý ignoruje interné prevody v rámci roka,
        // aby 'Total Plan' (Celkový majetok) ostal konzistentný.
        const totalPlan = rawPlan !== null ? (d.savingsPlan ?? 0) + rawPlan : null;

        return {
            ...d,
            visualSavingsActual,
            visualTotalActual,
            visualSavingsForecast,
            visualTotalForecast,
            totalPlan
        };
    });
    
    const allValues = processedChartData
        .flatMap(d => [d.visualTotalActual, d.totalPlan, d.visualTotalForecast, d.visualSavingsActual, d.visualSavingsForecast])
        .filter((v): v is number => v !== null);

    let yAxisDomain: [number, number] = [0, 5000];
    let yAxisTicks: number[] = [0, 1000, 2000, 3000, 4000, 5000];

    if (allValues.length > 0) {
        const dataMin = Math.min(...allValues);
        const dataMax = Math.max(...allValues);
        // Ensure 0 is always included/visible context if numbers are positive
        const effectiveMin = Math.min(0, dataMin);
        
        const buffer = (dataMax - effectiveMin) * 0.1; 
        const bottom = Math.floor((effectiveMin - buffer) / 1000) * 1000;
        const top = Math.ceil((dataMax + buffer) / 1000) * 1000;
        yAxisDomain = [bottom, top];
        
        const ticks = [];
        const step = Math.max(1000, Math.round((top - bottom) / 5 / 1000) * 1000);
        if (step > 0) {
            for (let i = bottom; i <= top; i += step) {
                ticks.push(i);
            }
        }
        yAxisTicks = ticks;
    }

    return { 
        chartData: processedChartData, 
        months, 
        currentMonthIndex: displayedYear === currentYear ? currentMonth : -1, 
        yAxisDomain, 
        yAxisTicks 
    };
}, [accounts, transactions, budgets, categories, accountIds, displayedYear]);


  const tickColor = theme === 'dark' ? '#C3C7CF' : '#43474E';
  const tooltipStyles = {
    contentStyle: { 
        backgroundColor: theme === 'dark' ? '#282A2D' : '#F1ECF1', 
        border: `1px solid ${theme === 'dark' ? '#43474E' : '#C3C7CF'}`,
        borderRadius: '1rem'
    },
    labelStyle: { color: theme === 'dark' ? '#E2E2E6' : '#1A1C1E' }
  };

  return (
    <div className="space-y-8 relative h-full flex flex-col">
      <PageHeader title="Nástenka">
      </PageHeader>
      
      <div className="flex flex-col space-y-2">
        <p className="text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Prehľad vašich financií</p>
      </div>
      
      {/* Sekcia 1: Stav Majetku (Snapshot) */}
      <section>
          <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface flex items-center gap-2">
              <LandmarkIcon className="w-5 h-5" />
              Stav účtov
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Celkový majetok */}
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <LandmarkIcon className="w-24 h-24 text-light-primary dark:text-dark-primary" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider">Celkový majetok</p>
                    <p className="text-3xl font-bold text-light-primary dark:text-dark-primary mt-2">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                    <div className="mt-4 flex items-center text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                        <span className="inline-block w-2 h-2 rounded-full bg-light-primary dark:bg-dark-primary mr-2"></span>
                        Všetky účty spolu
                    </div>
                </div>
            </div>

            {/* Sporenia */}
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <PiggyBankIcon className="w-24 h-24 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider">Sporenia</p>
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{totalSavings.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                    <div className="mt-4 flex items-center text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400 mr-2"></span>
                        {totalBalance > 0 ? ((totalSavings / totalBalance) * 100).toFixed(1) : 0}% z celkového majetku
                    </div>
                </div>
            </div>

            {/* V rozpočte (Bežné peniaze) */}
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-2xl border border-light-outlineVariant dark:border-dark-outlineVariant relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BanknotesIcon className="w-24 h-24 text-green-600 dark:text-green-400" />
                </div>
                <div className="relative z-10">
                    <p className="text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant uppercase tracking-wider">Disponibilné pre rozpočet</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{budgetBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                    <div className="mt-4 flex items-center text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                         <span className="inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                        Peniaze na bežné použitie
                    </div>
                </div>
            </div>
          </div>
      </section>

      {/* Sekcia 2: Mesačný prehľad (Performance) */}
      <section>
        <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface flex items-center gap-2">
            <WalletIcon className="w-5 h-5" />
            Prehľad za {currentMonthName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-5 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex items-center justify-between">
                <div>
                    <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Príjmy</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{monthlyIncome.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                    <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1">Priemer: {averageMonthlyIncome.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <ArrowUpCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
            </div>

            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-5 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex items-center justify-between">
                <div>
                    <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Výdavky</p>
                    <p className="text-2xl font-bold text-light-error dark:text-dark-error mt-1">{monthlyExpenses.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                     <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1">Priemer: {averageMonthlyExpense.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <ArrowDownCircleIcon className="w-8 h-8 text-light-error dark:text-dark-error" />
                </div>
            </div>

            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-5 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex items-center justify-between">
                <div>
                    <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Mesačná bilancia</p>
                    <p className={`text-2xl font-bold mt-1 ${monthlyNet >= 0 ? 'text-light-primary dark:text-dark-primary' : 'text-light-error dark:text-dark-error'}`}>
                        {monthlyNet > 0 ? '+' : ''}{monthlyNet.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                    </p>
                     <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1">
                        {monthlyNet >= 0 ? 'Ušetrili ste' : 'Minuli ste viac ako prijali'}
                     </p>
                </div>
                <div className={`p-3 rounded-full ${monthlyNet >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <WalletIcon className={`w-8 h-8 ${monthlyNet >= 0 ? 'text-light-primary dark:text-dark-primary' : 'text-light-error dark:text-dark-error'}`} />
                </div>
            </div>
        </div>
      </section>

      {/* Sekcia 3: Analytika (Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Príjmy vs. Výdavky (Posledných 6 mesiacov)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyChartData}>
              <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
              <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
              <Tooltip {...tooltipStyles} formatter={(value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
              <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
              <Bar dataKey="income" fill={theme === 'dark' ? '#55DDA2' : '#00875A'} name="Príjmy" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expenses" fill={theme === 'dark' ? '#FFB4AB' : '#BA1A1A'} name="Výdavky" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Výdavky podľa kategórií (Tento mesiac)</h2>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} fill="#8884d8" labelLine={false} label={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyles} formatter={(value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} />
                <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
                </PieChart>
            </ResponsiveContainer>
           ) : <p className="text-center text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-12">Žiadne výdavky na zobrazenie.</p>}
        </div>
      </div>
      
      <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium text-light-onSurface dark:text-dark-onSurface">Vývoj celkového majetku (Sporenie + Budget) - {displayedYear}</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setDisplayedYear(displayedYear - 1)}
              disabled={displayedYear <= minBudgetYear}
              className="p-1 rounded-full hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Predchádzajúci rok"
            >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-lg font-semibold">{displayedYear}</span>
            <button 
              onClick={() => setDisplayedYear(displayedYear + 1)}
              disabled={displayedYear >= maxBudgetYear}
              className="p-1 rounded-full hover:bg-light-surfaceContainerHighest dark:hover:bg-dark-surfaceContainerHighest disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Nasledujúci rok"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#43474E' : '#C3C7CF'} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <YAxis domain={yAxisDomain} ticks={yAxisTicks} allowDataOverflow={false} tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <Tooltip 
                {...tooltipStyles} 
                formatter={(value: number, name: string, props) => {
                    const hoveredMonthIndex = months.indexOf(props.payload.name);
                    const isFutureYear = displayedYear > new Date().getFullYear();
                    const isCurrentYear = displayedYear === new Date().getFullYear();
                    const currentMonth = new Date().getMonth();

                    // Hide Forecast in past/current
                    if (name.includes('Prognóza') && !isFutureYear) {
                         if (!isCurrentYear || (hoveredMonthIndex !== -1 && hoveredMonthIndex < currentMonth)) {
                            return null;
                         }
                    }
                    
                    // Hide Actual in future
                    if (name.includes('Aktuálne') && isFutureYear) {
                        return null;
                    }
                    
                    if (name.includes('Aktuálne') && isCurrentYear && hoveredMonthIndex > currentMonth) {
                        return null;
                    }
                    
                    const formattedValue = typeof value === 'number'
                        ? value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })
                        : value;
                    
                    return [formattedValue, name];
                }}
            />
            <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
            {displayedYear === new Date().getFullYear() && <ReferenceArea x1={previousMonthLabel} x2={currentMonthName} stroke="none" fill={theme === 'dark' ? 'rgba(255, 180, 171, 0.1)' : 'rgba(186, 26, 26, 0.1)'} />}
            
            {/* Total Plan Line */}
            <Line 
                type="monotone" 
                dataKey="totalPlan" 
                stroke="#ffc658" 
                strokeWidth={2} 
                name="Plán (Spolu)" 
                strokeDasharray="5 5" 
                dot={false} 
                connectNulls 
            />

             {/* Savings Lines (Actual & Forecast) */}
             <Line 
                type="monotone" 
                dataKey="visualSavingsActual" 
                stroke={theme === 'dark' ? '#D6BBFB' : '#6B5778'} 
                strokeWidth={3}
                name="Sporenie (Aktuálne)"
                connectNulls={false}
                dot={{ r: 4 }}
            />
            <Line 
                type="monotone" 
                dataKey="visualSavingsForecast" 
                stroke={theme === 'dark' ? '#D6BBFB' : '#6B5778'} 
                strokeWidth={2}
                name="Sporenie (Prognóza)"
                strokeDasharray="3 7" 
                connectNulls
                dot={false}
            />

            {/* Total Wealth Lines (Actual & Forecast) */}
            <Line 
                type="monotone" 
                dataKey="visualTotalForecast" 
                stroke={theme === 'dark' ? '#55DDA2' : '#00875A'} 
                strokeWidth={2} 
                name="Majetok (Prognóza)" 
                strokeDasharray="3 7" 
                connectNulls 
                dot={false}
            />

            <Line 
                type="monotone" 
                dataKey="visualTotalActual" 
                stroke={theme === 'dark' ? '#9FCAFF' : '#0061A4'} 
                strokeWidth={3} 
                name="Majetok (Aktuálne)" 
                connectNulls={false} 
                dot={{ r: 4 }} 
            />
            
            </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Dashboard;