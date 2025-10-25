import { mapPbToAccount } from '../lib/mappers';
import type { Account } from '../types';
import { createPocketBaseService } from './genericService';

// Typ pre vytváranie účtu
type AccountCreationData = Omit<Account, 'id' | 'workspaceId' | 'status'> & { workspace: string; status: 'active' };
// Typ pre aktualizáciu účtu
type AccountUpdateData = Partial<Omit<Account, 'id' | 'workspaceId'>>;

const accountService = createPocketBaseService<Account, AccountCreationData, AccountUpdateData>(
  'accounts',
  mapPbToAccount
);

export { accountService };

