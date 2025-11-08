import pb from '../lib/pocketbase';
import { mapPbToWorkspace } from '../lib/mappers';
import type { Workspace } from '../types';
import { createPocketBaseService } from './genericService';

type WorkspaceCreationData = { name: string };
type WorkspaceUpdateData = { name: string };

const baseWorkspaceService = createPocketBaseService<Workspace, WorkspaceCreationData, WorkspaceUpdateData>(
  'workspaces',
  mapPbToWorkspace
);


const deleteCascade = async (workspaceId: string) => {
    try {
        console.log(`Starting cascade delete for workspace: ${workspaceId}`);

        const accountsToDelete = await pb.collection('accounts').getFullList({
            filter: `workspace = "${workspaceId}"`,
        });
        const accountIds = accountsToDelete.map(acc => acc.id);
        console.log(`Found ${accountIds.length} accounts to delete.`);

        if (accountIds.length > 0) {
            
            const transactionsToDelete = await pb.collection('transactions').getFullList({
                filter: accountIds.map(id => `account = "${id}" || destinationAccount = "${id}"`).join(' || '),
            });
            const transactionPromises = transactionsToDelete.map(t => pb.collection('transactions').delete(t.id));
            await Promise.all(transactionPromises);
            console.log(`Deleted ${transactionsToDelete.length} transactions.`);
        }
        
        const budgetsToDelete = await pb.collection('budgets').getFullList({
            filter: `workspace = "${workspaceId}"`,
        });
        const budgetPromises = budgetsToDelete.map(b => pb.collection('budgets').delete(b.id));
        await Promise.all(budgetPromises);
        console.log(`Deleted ${budgetsToDelete.length} budgets.`);
        
        const categoriesToDelete = await pb.collection('categories').getFullList({
            filter: `workspace = "${workspaceId}"`,
        });
        const categoryPromises = categoriesToDelete.map(c => pb.collection('categories').delete(c.id));
        await Promise.all(categoryPromises);
        console.log(`Deleted ${categoriesToDelete.length} categories.`);

        const accountPromises = accountIds.map(id => pb.collection('accounts').delete(id));
        await Promise.all(accountPromises);
        console.log(`Deleted ${accountIds.length} accounts.`);

        const systemEventsToDelete = await pb.collection('system_events').getFullList({
            filter: `workspace = "${workspaceId}"`,
        });
        const systemEventPromises = systemEventsToDelete.map(e => pb.collection('system_events').delete(e.id));
        await Promise.all(systemEventPromises);
        console.log(`Deleted ${systemEventsToDelete.length} system events.`);
        
        await pb.collection('workspaces').delete(workspaceId);
        console.log(`Successfully deleted workspace: ${workspaceId}`);

        return { success: true };
    } catch (error) {
        console.error(`Error during cascade delete for workspace ${workspaceId}:`, error);
        throw new Error('Nepodarilo sa zmazať pracovný priestor a všetky jeho dáta.');
    }
};


export const workspaceService = {
  getAll: baseWorkspaceService.getAll,
  delete: baseWorkspaceService.delete,
  deleteCascade: deleteCascade,
  batchUpdate: baseWorkspaceService.batchUpdate,
  create: (name: string) => baseWorkspaceService.create({ name }),
  update: (id: string, name: string) => baseWorkspaceService.update(id, { name }),
};

