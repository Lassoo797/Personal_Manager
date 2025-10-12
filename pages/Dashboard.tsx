import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
    ComposedChart, Area, Line, CartesianGrid 
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const Dashboard: React.FC = () => {
  const { accounts, transactions, categories, budgets, getAccountBalance } = useAppContext();
  const { theme } = useTheme();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + getAccountBalance(account.id), 0);
  }, [accounts, getAccountBalance]);
  
  const { 
    monthlyIncome, 
    monthlyExpenses, 
    expenseByCategory, 
    monthlyChartData,
    averageMonthlyIncome,
    averageMonthlyExpense
  } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const byCategory: { [key: string]: number } = {};
    const lastSixMonthsData: { [key: string]: { income: number, expenses: number }} = {};

    let totalYearIncome = 0;
    let totalYearExpenses = 0;
    const monthsPassed = new Date().getMonth() + 1;

    for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const monthKey = d.toLocaleString('sk-SK', { month: 'short', year: 'numeric' });
        lastSixMonthsData[monthKey] = { income: 0, expenses: 0 };
    }

    transactions.forEach(t => {
      const transactionDate = new Date(t.date);
      const transactionMonth = transactionDate.getMonth();
      const transactionYear = transactionDate.getFullYear();
      
      const monthKey = transactionDate.toLocaleString('sk-SK', { month: 'short', year: 'numeric' });
      if (lastSixMonthsData[monthKey]) {
          if (t.type === 'income') {
              lastSixMonthsData[monthKey].income += t.amount;
          } else {
              lastSixMonthsData[monthKey].expenses += t.amount;
          }
      }

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
          const category = categories.find(c => c.id === t.categoryId);
          const parentCategory = category?.parentId ? categories.find(c => c.id === category.parentId) : category;
          if (parentCategory) {
            byCategory[parentCategory.name] = (byCategory[parentCategory.name] || 0) + t.amount;
          }
        }
      }
    });

    const expenseData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
    const chartData = Object.entries(lastSixMonthsData).map(([name, values]) => ({ name, ...values }));
    const avgIncome = monthsPassed > 0 ? totalYearIncome / monthsPassed : 0;
    const avgExpense = monthsPassed > 0 ? totalYearExpenses / monthsPassed : 0;

    return { 
        monthlyIncome: income, 
        monthlyExpenses: expenses, 
        expenseByCategory: expenseData, 
        monthlyChartData: chartData,
        averageMonthlyIncome: avgIncome,
        averageMonthlyExpense: avgExpense
    };
  }, [transactions, categories, currentMonth, currentYear]);

  const recentTransactions = useMemo(() => 
    [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5), 
    [transactions]
  );
  
  const cashFlowData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let yearStartBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    transactions.forEach(t => {
        if (new Date(t.date).getFullYear() < currentYear) {
            yearStartBalance += t.type === 'income' ? t.amount : -t.amount;
        }
    });

    const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1).toLocaleString('sk-SK', { month: 'short' }));
    const chartData = months.map(name => ({
        name,
        actual: null as number | null,
        plan: null as number | null,
        forecast: null as number | null
    }));

    const incomeCategoryIds = new Set(categories.filter(c => c.type === 'income').map(c => c.id));
    const monthlyBudgets = Array(12).fill(0).map(() => ({ plannedIncome: 0, plannedExpense: 0 }));
    budgets.forEach(b => {
        const [bYear, bMonth] = b.month.split('-').map(Number);
        if (bYear === currentYear) {
            const monthIndex = bMonth - 1;
            if (incomeCategoryIds.has(b.categoryId)) {
                monthlyBudgets[monthIndex].plannedIncome += b.amount;
            } else {
                monthlyBudgets[monthIndex].plannedExpense += b.amount;
            }
        }
    });

    let runningPlanBalance = yearStartBalance;
    let runningActualBalance = yearStartBalance;

    for (let i = 0; i < 12; i++) {
        runningPlanBalance += monthlyBudgets[i].plannedIncome - monthlyBudgets[i].plannedExpense;
        chartData[i].plan = runningPlanBalance;

        if (i <= currentMonth) {
            const monthlyTransactions = transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === currentYear && tDate.getMonth() === i;
            });
            const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const monthlyExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            runningActualBalance += monthlyIncome - monthlyExpense;
            chartData[i].actual = runningActualBalance;
        }
    }

    const lastActualBalance = chartData[currentMonth].actual;
    if (lastActualBalance !== null) {
        let runningForecastBalance = lastActualBalance;
        chartData[currentMonth].forecast = lastActualBalance; 

        for (let i = currentMonth + 1; i < 12; i++) {
            runningForecastBalance += monthlyBudgets[i].plannedIncome - monthlyBudgets[i].plannedExpense;
            chartData[i].forecast = runningForecastBalance;
        }
    }
    
    return chartData;
}, [accounts, transactions, budgets, categories]);


  const COLORS = ['#0061A4', '#535F70', '#6B5778', '#00C49F', '#FFBB28', '#FF8042'];
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-base font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Celkový zostatok</h2>
          <p className="text-3xl font-bold text-light-primary dark:text-dark-primary mt-1">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
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
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} fill="#8884d8" labelLine={false} label={{ fill: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                    {expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyles} formatter={(value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} />
                <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
                </PieChart>
            </ResponsiveContainer>
           ) : <p className="text-center text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-12">Žiadne výdavky na zobrazenie.</p>}
        </div>
      </div>
      
      <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
        <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Vývoj zostatku na účtoch (Tento rok)</h2>
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#43474E' : '#C3C7CF'} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <Tooltip {...tooltipStyles} formatter={(value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} />
            <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
            <Line type="monotone" dataKey="plan" stroke="#ffc658" strokeWidth={2} name="Pôvodný plán" strokeDasharray="5 5" dot={false} />
            <Area type="monotone" dataKey="forecast" fill={theme === 'dark' ? '#55DDA2' : '#00875A'} stroke="none" fillOpacity={0.2} name="Prognóza" legendType="none" connectNulls />
            <Line type="monotone" dataKey="forecast" stroke={theme === 'dark' ? '#55DDA2' : '#00875A'} strokeWidth={2} name="Prognóza" strokeDasharray="3 7" dot={false} connectNulls />
            <Line type="monotone" dataKey="actual" stroke={theme === 'dark' ? '#9FCAFF' : '#0061A4'} strokeWidth={3} name="Skutočný stav" connectNulls={false} dot={{ r: 4 }} />
            </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
        <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Posledné transakcie</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-light-outlineVariant dark:border-dark-outlineVariant">
                <th className="py-3 px-4 font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Dátum</th>
                <th className="py-3 px-4 font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Popis</th>
                <th className="py-3 px-4 font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Kategória</th>
                <th className="py-3 px-4 font-medium text-right text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">Suma</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(t => (
                <tr key={t.id} className="border-b border-light-surfaceContainerHigh dark:border-dark-surfaceContainerHigh last:border-b-0">
                  <td className="py-3 px-4 text-light-onSurface dark:text-dark-onSurface">{new Date(t.date).toLocaleDateString('sk-SK')}</td>
                  <td className="py-3 px-4 text-light-onSurface dark:text-dark-onSurface">{t.description}</td>
                  <td className="py-3 px-4 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{categories.find(c => c.id === t.categoryId)?.name}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-light-error dark:text-dark-error'}`}>
                    {t.amount.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;