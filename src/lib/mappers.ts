import { RecordModel } from 'pocketbase';
import type { Workspace, Account, Category, Transaction, Budget } from '../types';

export const mapPbToWorkspace = (r: RecordModel): Workspace => ({ id: r.id, name: r.name });
export const mapPbToAccount = (r: RecordModel): Account => ({ id: r.id, name: r.name, workspaceId: r.workspace, currency: r.currency, accountType: r.accountType, type: r.type, initialBalance: r.initialBalance || 0, initialBalanceDate: r.initialBalanceDate, status: r.status || 'active' });
export const mapPbToCategory = (r: RecordModel): Category => ({ id: r.id, name: r.name, parentId: r.parent || null, type: r.type, workspaceId: r.workspace, order: r.order, validFrom: r.validFrom, archivedFrom: r.archivedFrom || null, dedicatedAccount: r.dedicatedAccount || null, status: r.status || 'active' });
export const mapPbToTransaction = (r: RecordModel): Transaction => ({ id: r.id, transactionDate: r.transactionDate, notes: r.notes, amount: r.amount, type: r.type, categoryId: r.category || null, accountId: r.account, destinationAccountId: r.destinationAccount || null, workspaceId: r.workspace, onBudget: r.onBudget !== false, linkedTransaction: r.linkedTransaction || null });
export const mapPbToBudget = (r: RecordModel): Budget => ({ id: r.id, categoryId: r.category, amount: r.amount, month: r.month, workspaceId: r.workspace, note: r.note || '' });
