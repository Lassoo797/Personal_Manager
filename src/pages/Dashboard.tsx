import React, { useMemo, useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Line, CartesianGrid, ReferenceArea
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#0061A4', '#535F70', '#6B5778', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC = () => {
  const { accounts, transactions, categories, budgets, getAccountBalance, getFinancialSummary } = useAppContext();
  const { theme } = useTheme();
  const [displayedYear, setDisplayedYear] = useState(new Date().getFullYear());

  const maxBudgetYear = useMemo(() => {
    const budgetYears = budgets.map(b => parseInt(b.month.split('-')[0], 10));
    return budgetYears.length > 0 ? Math.max(...budgetYears) : new Date().getFullYear();
  }, [budgets]);

  const minBudgetYear = useMemo(() => {
    const budgetYears = budgets.map(b => parseInt(b.month.split('-')[0], 10));
    return budgetYears.length > 0 ? Math.min(...budgetYears) : new Date().getFullYear();
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
  
  const accountIds = useMemo(() => new Set(accounts.map(a => a.id)), [accounts]);

  const budgetTransactions = useMemo(() => 
    transactions.filter(t => accountIds.has(t.accountId)),
    [transactions, accountIds]
  );
  
  const { 
    monthlyIncome, 
    monthlyExpenses,
    monthlyChartData,
    averageMonthlyIncome,
    averageMonthlyExpense,
    pieChartData,
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

    const getBalanceUpToDate = (targetDate: Date): number => {
        let balance = 0;
        accounts.forEach(acc => {
            if (acc.initialBalanceDate && new Date(acc.initialBalanceDate) < targetDate) {
                balance += acc.initialBalance || 0;
            }
        });
        const relevantTransactions = allTransactions.filter(t => new Date(t.transactionDate) < targetDate);
        const delta = relevantTransactions.reduce((sum, t) => {
            if (t.type === 'transfer') {
                if (accountIds.has(t.accountId)) sum -= t.amount;
                if (t.destinationAccountId && accountIds.has(t.destinationAccountId)) sum += t.amount;
            } else if (accountIds.has(t.accountId)) {
                sum += (t.type === 'income' ? t.amount : -t.amount);
            }
            return sum;
        }, 0);
        return balance + delta;
    };

    let yearStartBalance = 0;

    if (displayedYear <= currentYear) {
        yearStartBalance = getBalanceUpToDate(new Date(displayedYear, 0, 1));
    } else {
        const startOfCurrentMonthBalance = getBalanceUpToDate(new Date(currentYear, currentMonth, 1));
        
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

        currentMonthTransactions.forEach(t => {
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
        accounts.forEach(acc => {
            if (acc.initialBalanceDate) {
                const d = new Date(acc.initialBalanceDate);
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) initialBalanceInCurrentMonth += acc.initialBalance || 0;
            }
        });

        const endOfCurrentMonthForecast = startOfCurrentMonthBalance + effectiveCurrentMonthDelta + initialBalanceInCurrentMonth;

        let forecastForEndOfYear = endOfCurrentMonthForecast;
        for (let m = currentMonth + 1; m < 12; m++) {
            budgets.forEach(b => {
                const [bYear, bMonth] = b.month.split('-').map(Number);
                if (bYear === currentYear && (bMonth - 1) === m) {
                    forecastForEndOfYear += incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount;
                }
            });
            accounts.forEach(acc => {
                if (acc.initialBalanceDate) {
                    const d = new Date(acc.initialBalanceDate);
                    if (d.getFullYear() === currentYear && d.getMonth() === m) forecastForEndOfYear += acc.initialBalance || 0;
                }
            });
        }
        
        let runningProjectedBalance = forecastForEndOfYear;
        for (let year = currentYear + 1; year < displayedYear; year++) {
            const yearBudgets = budgets.filter(b => b.month.startsWith(year.toString()));
            runningProjectedBalance += yearBudgets.reduce((sum, b) => sum + (incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount), 0);
            accounts.forEach(acc => {
                if(acc.initialBalanceDate) {
                    const d = new Date(acc.initialBalanceDate);
                    if (d.getFullYear() === year) runningProjectedBalance += acc.initialBalance || 0;
                }
            });
        }
        yearStartBalance = runningProjectedBalance;
    }
    
    const months = Array.from({ length: 12 }, (_, i) => new Date(displayedYear, i, 1).toLocaleString('sk-SK', { month: 'short' }));
    
    const chartData = [{
        name: (displayedYear - 1).toString(),
        actual: yearStartBalance, plan: yearStartBalance, forecast: null as number | null,
    }, ...months.map(name => ({
        name, actual: null as number | null, plan: null as number | null, forecast: null as number | null
    }))];

    const monthlyBudgetDeltas = Array(12).fill(0);
    budgets.forEach(b => {
        const [bYear, bMonth] = b.month.split('-').map(Number);
        if (bYear === displayedYear) {
            monthlyBudgetDeltas[bMonth - 1] += incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount;
        }
    });

    let runningPlanBalance = yearStartBalance;
    for (let i = 0; i < 12; i++) {
        accounts.forEach(acc => {
            if (acc.initialBalanceDate) {
                const initialDate = new Date(acc.initialBalanceDate);
                if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) runningPlanBalance += acc.initialBalance || 0;
            }
        });
        runningPlanBalance += monthlyBudgetDeltas[i];
        chartData[i + 1].plan = runningPlanBalance;
    }
    
    if (displayedYear <= currentYear) {
        let runningActualBalance = yearStartBalance;
        const effectiveMonthCount = displayedYear < currentYear ? 12 : currentMonth;
        for (let i = 0; i < effectiveMonthCount; i++) { 
            accounts.forEach(acc => {
                if (acc.initialBalanceDate) {
                    const initialDate = new Date(acc.initialBalanceDate);
                    if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) runningActualBalance += acc.initialBalance || 0;
                }
            });
            const monthlyTransactions = allTransactions.filter(t => new Date(t.transactionDate).getFullYear() === displayedYear && new Date(t.transactionDate).getMonth() === i);
            const monthlyDelta = monthlyTransactions.reduce((sum, t) => {
                if (t.type === 'transfer') {
                    if (accountIds.has(t.accountId)) sum -= t.amount;
                    if (t.destinationAccountId && accountIds.has(t.destinationAccountId)) sum += t.amount;
                } else if (accountIds.has(t.accountId)) { sum += (t.type === 'income' ? t.amount : -t.amount); }
                return sum;
            }, 0);
            runningActualBalance += monthlyDelta;
            chartData[i + 1].actual = runningActualBalance;
        }
    }

    if (displayedYear === currentYear) {
        const startOfCurrentMonthBalance = chartData[currentMonth].actual ?? getBalanceUpToDate(new Date(currentYear, currentMonth, 1));
        chartData[currentMonth].forecast = startOfCurrentMonthBalance;
        
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

        currentMonthTransactions.forEach(t => {
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
        accounts.forEach(acc => {
            if (acc.initialBalanceDate) {
                const d = new Date(acc.initialBalanceDate);
                if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) initialBalanceInCurrentMonth += acc.initialBalance || 0;
            }
        });
        
        const endOfCurrentMonthForecast = startOfCurrentMonthBalance + effectiveCurrentMonthDelta + initialBalanceInCurrentMonth;
        chartData[currentMonth + 1].forecast = endOfCurrentMonthForecast;
        
        let runningForecastBalance = endOfCurrentMonthForecast;
        for (let i = currentMonth + 1; i < 12; i++) {
            let monthlyInitialBalance = 0;
            accounts.forEach(acc => {
                if (acc.initialBalanceDate) {
                    const initialDate = new Date(acc.initialBalanceDate);
                    if (initialDate.getFullYear() === displayedYear && initialDate.getMonth() === i) monthlyInitialBalance += acc.initialBalance || 0;
                }
            });
            runningForecastBalance += monthlyInitialBalance + monthlyBudgetDeltas[i];
            chartData[i + 1].forecast = runningForecastBalance;
        }
    }
    
    const allValues = chartData
        .flatMap(d => [d.actual, d.plan, d.forecast])
        .filter((v): v is number => v !== null);

    let yAxisDomain: [number, number] = [0, 5000];
    let yAxisTicks: number[] = [0, 1000, 2000, 3000, 4000, 5000];

    if (allValues.length > 0) {
        const dataMin = Math.min(...allValues);
        const dataMax = Math.max(...allValues);
        const buffer = (dataMax - dataMin) * 0.1; 
        const bottom = Math.floor((dataMin - buffer) / 1000) * 1000;
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
        chartData, 
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
    <div className="space-y-6">
      <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Nástenka</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Celkový majetok</h2>
          <p className="text-3xl font-bold text-light-tertiary dark:text-dark-tertiary mt-1">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Príjmy tento mesiac</h2>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{monthlyIncome.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Výdavky tento mesiac</h2>
          <p className="text-3xl font-bold text-light-error dark:text-dark-error mt-1">{monthlyExpenses.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
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
          <h2 className="text-xl font-medium text-light-onSurface dark:text-dark-onSurface">Vývoj zostatku na účtoch ({displayedYear})</h2>
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

                    if (name === 'Prognóza' && !isFutureYear) {
                         if (!isCurrentYear || (hoveredMonthIndex !== -1 && hoveredMonthIndex < currentMonth)) {
                            return null;
                         }
                    }
                    
                    if (name === 'Skutočný stav' && isFutureYear) {
                        return null;
                    }
                    
                    if (name === 'Skutočný stav' && isCurrentYear && hoveredMonthIndex > currentMonth) {
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
            <Line type="monotone" dataKey="plan" stroke="#ffc658" strokeWidth={2} name="Plán" strokeDasharray="5 5" dot={false} connectNulls />
            <Line type="monotone" dataKey="forecast" stroke={theme === 'dark' ? '#55DDA2' : '#00875A'} strokeWidth={2} name="Prognóza" strokeDasharray="3 7" dot={false} connectNulls />
            <Line type="monotone" dataKey="actual" stroke={theme === 'dark' ? '#9FCAFF' : '#0061A4'} strokeWidth={3} name="Skutočný stav" connectNulls={false} dot={{ r: 4 }} />
            </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Dashboard;