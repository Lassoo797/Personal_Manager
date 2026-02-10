import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { XIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from './icons';
import { Notification as NotificationType } from '../types';

const Notification: React.FC<{ notification: NotificationType }> = ({ notification }) => {
  const { removeNotification } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Make it visible after mount to trigger transition
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Wait for the fade-out animation to finish before removing from DOM
    setTimeout(() => removeNotification(notification.id), 300);
  };
  
  const typeStyles = {
    success: {
      bg: 'bg-green-500 dark:bg-green-600',
      icon: <CheckCircleIcon className="w-6 h-6 text-white" />,
    },
    error: {
      bg: 'bg-light-error dark:bg-dark-error',
      icon: <ExclamationCircleIcon className="w-6 h-6 text-light-onError dark:text-dark-onError" />,
    },
    info: {
      bg: 'bg-light-secondary dark:bg-dark-secondary',
      icon: <InformationCircleIcon className="w-6 h-6 text-light-onSecondary dark:text-dark-onSecondary" />,
    },
  };

  const styles = typeStyles[notification.type];

  return (
    <div 
      className={`
        flex items-center w-full max-w-sm rounded-xl shadow-lg overflow-hidden
        transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className={`p-3 ${styles.bg}`}>
        {styles.icon}
      </div>
      <div className="px-4 py-2 bg-light-surfaceContainer dark:bg-dark-surfaceContainer flex-grow">
        <p className="text-sm font-medium text-light-onSurface dark:text-dark-onSurface">
          {notification.message}
        </p>
      </div>
       <button 
        onClick={handleClose} 
        className="p-2 bg-light-surfaceContainer dark:bg-dark-surfaceContainer text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh" 
        aria-label="Close"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

const NotificationsContainer: React.FC = () => {
  const { notifications } = useAppContext();

  return (
    <div className="fixed top-5 right-5 z-50 space-y-3">
      {notifications.map(n => (
        <Notification key={n.id} notification={n} />
      ))}
    </div>
  );
};

export default NotificationsContainer;
