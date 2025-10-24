// src/services/systemEventService.ts
import pb from '../lib/pocketbase';

type SystemEventType = 
  | "account_created" | "account_deleted" | "account_archived" | "initial_balance_set"
  | "workspace_created" | "workspace_updated" | "workspace_deleted"
  | "account_updated" | "category_created" | "category_updated"
  | "category_deleted" | "category_archived" | "transaction_created"
  | "transaction_updated" | "transaction_deleted" | "budget_created"
  | "budget_updated" | "budget_deleted" | "default_account_set";

interface SystemEventPayload {
  workspace: string;
  type: SystemEventType;
  details: Record<string, any>;
}

const collection = pb.collection('system_events');

export const systemEventService = {
  /**
   * Creates a new system event log.
   * @param data The payload for the system event.
   * @returns A promise that resolves when the event is created.
   */
  create: async (data: SystemEventPayload): Promise<void> => {
    await collection.create(data);
  },
};
