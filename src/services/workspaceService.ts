import { mapPbToWorkspace } from '../lib/mappers';
import type { Workspace } from '../types';
import { createPocketBaseService } from './genericService';

// Typy pre vytvorenie a aktualizáciu pracovného priestoru
type WorkspaceCreationData = { name: string };
type WorkspaceUpdateData = { name: string };

// Vytvoríme službu pomocou generickej funkcie
const baseWorkspaceService = createPocketBaseService<Workspace, WorkspaceCreationData, WorkspaceUpdateData>(
  'workspaces',
  mapPbToWorkspace
);

// `workspaceService` bol nekonzistentný (create a update brali `name` priamo).
// Zachováme pôvodné rozhranie, aby sme nemuseli meniť AppContext, ale interne použijeme novú službu.
export const workspaceService = {
  ...baseWorkspaceService,
  create: (name: string) => baseWorkspaceService.create({ name }),
  update: (id: string, name: string) => baseWorkspaceService.update(id, { name }),
};








// `workspaceService` bol nekonzistentný (create a update brali `name` priamo).
// Zachováme pôvodné rozhranie, aby sme nemuseli meniť AppContext, ale interne použijeme novú službu.
export const workspaceService = {
  ...baseWorkspaceService,
  create: (name: string) => baseWorkspaceService.create({ name }),
  update: (id: string, name: string) => baseWorkspaceService.update(id, { name }),
};
