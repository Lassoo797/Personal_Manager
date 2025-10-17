import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import pb from '../lib/pocketbase';
import type { SystemEvent } from '../types';
import EventDetails from '../components/EventDetails'; // Import the new component

const SystemEvents: React.FC = () => {
  const { currentWorkspaceId } = useAppContext();
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentWorkspaceId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const filter = pb.filter('workspace = {:workspaceId}', { workspaceId: currentWorkspaceId });
        const result = await pb.collection('system_events').getFullList({
          '$autoCancel': false,
          filter,
          sort: '-created',
        });
        setEvents(result as any as SystemEvent[]);
      } catch (e: any) {
        setError(e);
        console.error("Chyba pri načítavaní systémových udalostí:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentWorkspaceId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20 text-red-500">Chyba: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl md:text-2xl font-bold text-light-onSurface dark:text-dark-onSurface">
        Systémové Udalosti
      </h1>

      {events.length === 0 ? (
        <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer p-6 rounded-xl text-center">
          <p>Pre tento pracovný priestor neboli nájdené žiadne systémové udalosti.</p>
        </div>
      ) : (
        <div className="bg-light-surfaceContainer dark:bg-dark-surfaceContainer rounded-xl shadow-sm">
          <ul className="divide-y divide-light-outlineVariant dark:divide-dark-outlineVariant">
            {events.map(event => (
              <li key={event.id} className="p-4 flex justify-between items-center hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh transition-colors">
                <div className="flex-grow">
                  <EventDetails event={event} />
                  <p className="text-xs text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant mt-1">
                    {new Date(event.created).toLocaleString('sk-SK')}
                  </p>
                </div>
                <div className="text-sm font-mono bg-light-surfaceContainerHigh dark:bg-dark-surfaceContainerHigh px-2 py-1 rounded">
                  {event.type}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SystemEvents;
