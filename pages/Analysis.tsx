import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

// Data structure for the analysis
interface CategoryAnalysis {
  id: string;
  name: string;
  parentName: string;
  totalBudgeted: number;
  totalActual: number;
  difference: number;
  overspendingRatio: number; // actual / budget
  monthsOverspent: { month: number; overage: number }[];
}

// Card component to display the analysis for one category
const CategoryAnalysisCard: React.FC<{ data: CategoryAnalysis }> = ({ data }) => {
    const { totalBudgeted, totalActual, overspendingRatio, name, parentName, difference } = data;
    
    const isOverspent = difference < 0;
    const hasBudget = totalBudgeted > 0;
    
    let progressBarWidth = '0%';
    if (hasBudget) {
        progressBarWidth = `${Math.min(overspendingRatio * 100, 100)}%`;
    } else if (totalActual > 0) {
        progressBarWidth = '100%'; // No budget but has spending
    }

    let statusText = '';
    let statusColor = 'text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant';

    if (hasBudget) {
        if (isOverspent) {
            statusText = `Prekročené o ${Math.abs(difference).toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
            statusColor = 'text-light-error dark:text-dark-error';
        } else {
            statusText = `Zostáva ${difference.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}`;
            statusColor = 'text-green-600 dark:text-green-400';
        }
    } else if (totalActual > 0) {
        statusText = `Minuté ${totalActual.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })} bez rozpočtu`;
        statusColor = 'text-orange-500';
    } else {
        statusText = 'Žiadna aktivita ani rozpočet';
    }


    const getBarColor = () => {
        if (!hasBudget && totalActual > 0) return 'bg-orange-500';
        if (overspendingRatio > 1) return 'bg-light-error dark:bg-dark-error';
        if (overspendingRatio > 0.8) return 'bg-yellow-500';
        return 'bg-light-primary dark:bg-dark-primary';
    }

    return (
        <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-4 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant flex flex-col justify-between">
            <div>
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">{parentName}</p>
                <h3 className="text-lg font-bold text-light-onSurface dark:text-dark-onSurface">{name}</h3>
            </div>
            <div className="mt-4 space-y-2">
                 {overspendingRatio > 1 && hasBudget && (
                     <div className="relative w-full h-2 mb-1">
                        <div className="absolute w-full bg-light-errorContainer/50 dark:bg-dark-errorContainer/50 rounded-full h-2">
                            <div 
                                className="bg-light-error dark:bg-dark-error h-2 rounded-full"
                                style={{ width: `${Math.min((overspendingRatio - 1) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                )}
                <div className="w-full bg-light-surfaceContainerHighest dark:bg-dark-surfaceContainerHighest rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full ${getBarColor()}`} 
                        style={{ width: progressBarWidth }}
                    ></div>
                </div>
                 <div className="flex justify-between text-sm font-medium text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                    <span>{totalActual.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' })}</span>
                    <span>{hasBudget ? totalBudgeted.toLocaleString('sk-SK', { style: 'currency', currency: 'EUR' }) : 'Žiadny plán'}</span>
                </div>
            </div>
             <div className="mt-4 text-center">
                 <p className={`font-semibold ${statusColor}`}>{statusText}</p>
            </div>
            {data.monthsOverspent.length > 0 && (
                <div className="mt-3 text-center">
                    <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">
                        Prekročené v mesiacoch: {data.monthsOverspent.map(m => new Date(2000, m.month).toLocaleString('sk-SK', { month: 'short' })).join(', ')}
                    </p>
                </div>
            )}
        </div>
    );
};

const Analysis: React.FC = () => {
    const { categories, transactions, budgets } = useAppContext();

    const analysisData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const expenseSubcategories = categories.filter(c => c.type === 'expense' && c.parentId);
        const parentCategoryMap = new Map(categories.map(c => [c.id, c.name]));

        const results: CategoryAnalysis[] = [];

        for (const category of expenseSubcategories) {
            if (!category.parentId) continue;

            let totalBudgeted = 0;
            let totalActual = 0;
            const monthsOverspent: { month: number; overage: number }[] = [];
            
            for (let month = 0; month <= currentMonth; month++) {
                const monthStr = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
                
                const monthlyBudget = budgets.find(b => b.categoryId === category.id && b.month === monthStr)?.amount || 0;
                
                const monthlyTransactions = transactions.filter(t => 
                    t.categoryId === category.id &&
                    new Date(t.date).getFullYear() === currentYear &&
                    new Date(t.date).getMonth() === month
                );
                const monthlyActual = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

                totalBudgeted += monthlyBudget;
                totalActual += monthlyActual;

                if (monthlyActual > 0 && monthlyActual > monthlyBudget) {
                    monthsOverspent.push({ month, overage: monthlyActual - monthlyBudget });
                }
            }
            
            // Only include categories with spending or a budget
            if (totalBudgeted > 0 || totalActual > 0) {
                 results.push({
                    id: category.id,
                    name: category.name,
                    parentName: (parentCategoryMap.get(category.parentId) as string | undefined) || 'N/A',
                    totalBudgeted,
                    totalActual,
                    difference: totalBudgeted - totalActual,
                    overspendingRatio: totalBudgeted > 0 ? totalActual / totalBudgeted : Infinity,
                    monthsOverspent,
                });
            }
        }
        
        // Sort by the ones most overspent in absolute terms
        return results.sort((a, b) => a.difference - b.difference);

    }, [categories, transactions, budgets]);

    const overspentCategories = analysisData.filter(d => d.difference < 0 || (d.totalBudgeted === 0 && d.totalActual > 0));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-normal text-light-onSurface dark:text-dark-onSurface">Analýza rozpočtu</h1>
            </div>

            <div className="bg-light-surfaceContainerLow dark:bg-dark-surfaceContainerLow p-4 sm:p-6 rounded-xl border border-light-outlineVariant dark:border-dark-outlineVariant">
                <h2 className="text-xl font-medium mb-2 text-light-onSurface dark:text-dark-onSurface">Najviac prekračované kategórie</h2>
                <p className="text-sm text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mb-6">
                    Prehľad kategórií, kde výdavky prekročili plánovaný rozpočet v tomto roku ({new Date().getFullYear()}).
                </p>
                {overspentCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {overspentCategories.map(data => (
                            <CategoryAnalysisCard key={data.id} data={data} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-light-onSurface dark:text-dark-onSurface">Výborne!</h3>
                        <p className="mt-1 text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant">V žiadnej kategórii ste tento rok neprekročili rozpočet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analysis;