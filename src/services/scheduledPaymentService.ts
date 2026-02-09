import { mapPbToScheduledPayment } from '../lib/mappers';
import type { ScheduledPayment } from '../types';
import { createPocketBaseService } from './genericService';

// Type for creating a scheduled payment
type ScheduledPaymentCreationData = Omit<ScheduledPayment, 'id' | 'workspaceId' | 'nextPaymentDate'> & { workspace: string; nextPaymentDate?: string };

// Type for updating a scheduled payment
type ScheduledPaymentUpdateData = Partial<Omit<ScheduledPayment, 'id'>>;

const scheduledPaymentService = createPocketBaseService<ScheduledPayment, ScheduledPaymentCreationData, ScheduledPaymentUpdateData>(
  'scheduled_payments',
  mapPbToScheduledPayment,
  (data) => {
    const { workspaceId, ...payload } = data;
    return payload;
  }
);

export { scheduledPaymentService };
