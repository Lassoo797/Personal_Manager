import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
    ComposedChart, Line, CartesianGrid, ReferenceArea
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const MasterDashboard: React.FC = () => {
  const { budgetProfiles, allAccounts, allTransactions, allBudgets, allCategories } = useAppContext();
  const { theme } = useTheme();

  const { currentMonthName, previousMonthName } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    const currentName = now.toLocaleString('sk-SK', { month: 'short' });

    let previousName;
    if (currentMonthIndex === 0) { // If it's January
        previousName = (currentYear - 1).toString();
    } else {
        const prevMonthDate = new Date(currentYear, currentMonthIndex - 1, 1);
        previousName = prevMonthDate.toLocaleString('sk-SK', { month: 'short' });
    }
    
    return { currentMonthName: currentName, previousMonthName: previousName };
  }, []);

  const getAccountBalance = (account: { initialBalance: number; id: string; }, transactions: any[]) => {
    return transactions.reduce((acc, t) => {
      if (t.accountId === account.id) {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
      }
      return acc;
    }, account.initialBalance);
  };

  const { totalBalance, balancesByProfile } = useMemo(() => {
    let total = 0;
    const byProfile = budgetProfiles.map(profile => {
      const profileAccounts = allAccounts.filter(a => a.profileId === profile.id);
      const profileTransactions = allTransactions.filter(t => t.profileId === profile.id);
      
      const profileBalance = profileAccounts.reduce((sum, account) => {
        return sum + getAccountBalance(account, profileTransactions);
      }, 0);
      
      total += profileBalance;
      return { name: profile.name, zostatok: profileBalance };
    });

    return { totalBalance: total, balancesByProfile: byProfile };
  }, [allAccounts, allTransactions, budgetProfiles]);

  
  const { chartData, months, currentMonthIndex } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    let yearStartBalance = allAccounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
    allTransactions.forEach(t => {
        if (new Date(t.date).getFullYear() < currentYear) {
            yearStartBalance += t.type === 'income' ? t.amount : -t.amount;
        }
    });

    const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1).toLocaleString('sk-SK', { month: 'short' }));
    
    const chartData = [{
        name: (currentYear - 1).toString(),
        actual: yearStartBalance,
        plan: yearStartBalance,
        forecast: null as number | null
    }, ...months.map(name => ({
        name,
        actual: null as number | null,
        plan: null as number | null,
        forecast: null as number | null
    }))];

    const incomeCategoryIds = new Set(allCategories.filter(c => c.type === 'income').map(c => c.id));
    const monthlyBudgetDeltas = Array(12).fill(0);
    allBudgets.forEach(b => {
        const [bYear, bMonth] = b.month.split('-').map(Number);
        if (bYear === currentYear) {
            const monthIndex = bMonth - 1;
            const amount = incomeCategoryIds.has(b.categoryId) ? b.amount : -b.amount;
            monthlyBudgetDeltas[monthIndex] += amount;
        }
    });

    let runningPlanBalance = yearStartBalance;
    let runningActualBalance = yearStartBalance;

    for (let i = 0; i < 12; i++) { // i=0 pre Január
        runningPlanBalance += monthlyBudgetDeltas[i];
        chartData[i + 1].plan = runningPlanBalance;

        if (i < currentMonth) { // Iba pre celé mesiace, ktoré už prešli
            const monthlyTransactions = allTransactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate.getFullYear() === currentYear && tDate.getMonth() === i;
            });
            const monthlyDelta = monthlyTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
            runningActualBalance += monthlyDelta;
            chartData[i + 1].actual = runningActualBalance;
        }
    }
    
    // // Pre aktuálny, neukončený mesiac, zoberieme transakcie do dnešného dňa
    // const currentMonthTransactions = allTransactions.filter(t => {
    //     const tDate = new Date(t.date);
    //     return tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
    // });
    // const currentMonthDelta = currentMonthTransactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    // chartData[currentMonth + 1].actual = runningActualBalance + currentMonthDelta;


    // Prognóza začína od posledného známeho stavu (koniec minulého mesiaca)
    const lastKnownActualBalance = chartData[currentMonth].actual ?? yearStartBalance;
    let runningForecastBalance = lastKnownActualBalance;
    chartData[currentMonth].forecast = lastKnownActualBalance;

    for (let i = currentMonth; i < 12; i++) {
        runningForecastBalance += monthlyBudgetDeltas[i];
        chartData[i + 1].forecast = runningForecastBalance;
    }
    
    return { chartData, months, currentMonthIndex: currentMonth };
  }, [allAccounts, allTransactions, allBudgets, allCategories]);


  const tickColor = theme === 'dark' ? '#C3C7CF' : '#43474E';
  const tooltipStyles = {
    contentStyle: { 
        backgroundColor: theme === 'dark' ? '#282A2D' : '#F1ECF1', 
        border: `1px solid ${theme === 'dark' ? '#43474E' : '#C3C7CF'}`,
        borderRadius: '1rem'
    },
    labelStyle: { color: theme === 'dark' ? '#E2E2E6' : '#1A1C1E' }
  };

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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-light-primaryContainer dark:bg-dark-primaryContainer p-6 rounded-2xl flex flex-col items-center justify-center">
          <h2 className="text-lg font-medium text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer">Celkový kombinovaný zostatok</h2>
          <p className="text-4xl font-bold text-light-onPrimaryContainer dark:text-dark-onPrimaryContainer mt-2">{totalBalance.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</p>
        </div>

        <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
          <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Zostatky podľa profilov</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={balancesByProfile} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: tickColor, fontSize: 14 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyles} formatter={(value: number) => value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}/>
                <Bar dataKey="zostatok" fill={theme === 'dark' ? '#9FCAFF' : '#0061A4'} name="Zostatok" radius={[0, 8, 8, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
        <h2 className="text-xl font-medium mb-4 text-light-onSurface dark:text-dark-onSurface">Kombinovaný vývoj zostatku (Tento rok)</h2>
        <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#43474E' : '#C3C7CF'} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`} axisLine={{ stroke: tickColor }} tickLine={{ stroke: tickColor }} />
            <Tooltip
                {...tooltipStyles}
                formatter={(value: number, name: string, props) => {
                    const hoveredMonthIndex = months.indexOf(props.payload.name);
                    
                    if (name === 'Prognóza' && (hoveredMonthIndex === -1 || hoveredMonthIndex < currentMonthIndex)) {
                        return null;
                    }

                    const formattedValue = typeof value === 'number'
                        ? value.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })
                        : value;
                    
                    return [formattedValue, name];
                }}
            />
            <Legend wrapperStyle={{ color: tickColor, fontSize: 14 }} />
            <ReferenceArea x1={previousMonthName} x2={currentMonthName} stroke="none" fill={theme === 'dark' ? 'rgba(255, 180, 171, 0.1)' : 'rgba(186, 26, 26, 0.1)'} />
            <Line type="monotone" dataKey="plan" stroke="#ffc658" strokeWidth={2} name="Plán" strokeDasharray="5 5" dot={false} connectNulls />
            <Line type="monotone" dataKey="forecast" stroke={theme === 'dark' ? '#55DDA2' : '#00875A'} strokeWidth={2} name="Prognóza" strokeDasharray="3 7" dot={false} connectNulls />
            <Line type="monotone" dataKey="actual" stroke={theme === 'dark' ? '#9FCAFF' : '#0061A4'} strokeWidth={3} name="Skutočný stav" connectNulls={false} dot={{ r: 4 }} />
            </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default MasterDashboard;