import React from 'react';
import { useAppContext } from '../context/AppContext';
import { XIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from './icons'; // Assuming you have these icons

const Notification: React.FC<{ notification: { id: string; message: string; type: 'success' | 'error' | 'info' } }> = ({ notification }) => {
  const { removeNotification } = useAppContext();
  
  const baseClasses = "flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white divide-x divide-gray-200 rounded-lg shadow dark:text-gray-400 dark:divide-gray-700 dark:bg-gray-800";
  
  const typeClasses = {
    success: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200',
    info: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
  };

  const Icon = ({ type }: { type: 'success' | 'error' | 'info' }) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-6 h-6" />;
      case 'error': return <ExclamationCircleIcon className="w-6 h-6" />;
      case 'info': return <InformationCircleIcon className="w-6 h-6" />;
    }
  };

  return (
    <div className={`${baseClasses} ${typeClasses[notification.type]}`} role="alert">
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg`}>
        <Icon type={notification.type} />
      </div>
      <div className="pl-4 text-sm font-normal">{notification.message}</div>
      <button onClick={() => removeNotification(notification.id)} className="p-1.5 -m-1.5 ml-auto inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10" aria-label="Close">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const NotificationsContainer: React.FC = () => {
  const { notifications } = useAppContext();

  return (
    <div className="fixed top-5 right-5 z-50 space-y-4">
      {notifications.map(n => (
        <Notification key={n.id} notification={n} />
      ))}
    </div>
  );
};

export default NotificationsContainer;
