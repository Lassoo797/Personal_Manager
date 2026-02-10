import React from 'react';
import { SystemEvent } from '../types';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';

interface EventDetailsProps {
  event: SystemEvent;
}

const EventDetails: React.FC<EventDetailsProps> = ({ event }) => {
  const { accounts, categories } = useAppContext();

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  const renderDetails = () => {
    const { type, details } = event;

    switch (type) {
      // Workspace Events
      case 'workspace_created':
        return <span>Vytvorený pracovný priestor: <strong>{details.name}</strong></span>;
      case 'workspace_updated':
        return <span>Pracovný priestor premenovaný z "{details.oldName}" na <strong>"{details.newName}"</strong></span>;
      case 'workspace_deleted':
        return <span>Zmazaný pracovný priestor: <strong>{details.name}</strong></span>;
      
      // Account Events
      case 'account_created':
        return <span>Vytvorený účet: <strong>{details.name}</strong></span>;
      case 'account_updated':
        return <span>Účet <strong>{getAccountName(details.accountId)}</strong> premenovaný z "{details.oldName}" na <strong>"{details.newName}"</strong></span>;
      case 'account_deleted':
        return <span>Zmazaný účet: <strong>{details.name}</strong></span>;
      case 'initial_balance_set':
        return <span>Počiatočný zostatok pre účet <strong>{getAccountName(details.accountId)}</strong> nastavený na <strong>{formatCurrency(details.initialBalance)}</strong></span>;
      case 'default_account_set':
        return <span>Účet <strong>{getAccountName(details.accountId)}</strong> bol nastavený ako predvolený.</span>;
        
      // Category Events
      case 'category_created':
        return <span>Vytvorená kategória: <strong>{details.name}</strong> (Typ: {details.type})</span>;
      case 'category_updated':
        return <span>Kategória <strong>{getCategoryName(details.categoryId)}</strong> bola aktualizovaná.</span>; // Simplified for now
      case 'category_deleted':
        return <span>Zmazaná kategória: <strong>{details.name}</strong></span>;
      case 'category_archived':
        return <span>Archivovaná kategória: <strong>{details.name}</strong></span>;


      // Transaction Events
      case 'transaction_created':
        return <span>Vytvorená transakcia ({details.type}) v hodnote <strong>{formatCurrency(details.amount)}</strong> na účte {getAccountName(details.accountId)}</span>;
      case 'transaction_updated':
        return <span>Transakcia bola upravená.</span>; // Simplified for now
      case 'transaction_deleted':
        return <span>Zmazaná transakcia ({details.type}) v hodnote <strong>{formatCurrency(details.amount)}</strong></span>;

      // Budget Events
      case 'budget_created':
        return <span>Vytvorený rozpočet pre <strong>{getCategoryName(details.categoryId)}</strong> na mesiac {details.month} v sume <strong>{formatCurrency(details.amount)}</strong></span>;
      case 'budget_updated':
        return <span>Rozpočet pre <strong>{getCategoryName(details.categoryId)}</strong> ({details.month}) upravený z {formatCurrency(details.oldAmount)} na <strong>{formatCurrency(details.newAmount)}</strong></span>;
      case 'budget_deleted':
        return <span>Zmazaný rozpočet pre <strong>{getCategoryName(details.categoryId)}</strong> ({details.month})</span>;

      default:
        return <pre className="text-xs">{JSON.stringify(details, null, 2)}</pre>;
    }
  };

  return <div className="text-sm">{renderDetails()}</div>;
};

export default EventDetails;
