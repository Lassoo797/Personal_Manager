import React from 'react';

export const MenuIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} stroke="currentColor" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const XIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg className={className} stroke="currentColor" fill="none" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

export const PencilIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export const SunIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

export const MoonIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export const ChevronUpIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
);

export const ArrowUpCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const DotsVerticalIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
    </svg>
);

export const ArrowDownCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export const CalendarClockIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M12 15.75h.008v.008H12v-.008z" />
    </svg>
);

export const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M9 12.75h.008v.008H9v-.008zm3.75 0h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008v-.008zM9 15h.008v.008H9v-.008zm3.75 0h.008v.008h-.008v-.008zm3-2.25h.008v.008h-.008v-.008z" />
    </svg>
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export const ExclamationCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
);

export const InformationCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
);

export const ArchiveBoxIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
);

export const ArrowsPointingOutIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
);

export const ArrowsPointingInIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
    </svg>
);

export const ChatBubbleLeftIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.125 1.125 0 01-1.59 0l-3.72-3.72h-1.422c-1.136 0-2.1-.847-2.193-1.98l-.007-.022v-4.286c0-.97.616-1.813 1.5-2.097m6.091 9.091l.022-.007-3.722-3.722h-4.286c-.578 0-1.048-.47-1.048-1.048V9.61c0-.578.47-1.048 1.048-1.048h10.564c.578 0 1.048.47 1.048 1.048v4.286c0 .482-.337.892-.811 1.015l-1.42 1.42z" />
    </svg>
);

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

export const ArrowRightOnRectangleIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

export const LandmarkIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V3m0 18H3m9 0h9M3 21V10.5M21 21V10.5M3 10.5l9-7.5 9 7.5M3 10.5h18" />
    </svg>
);

export const WalletIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.75V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V9.75a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9.75v3M21 9.75v-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6.75v3.007" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 9.75a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    </svg>
);

export const PiggyBankIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25c-2.488 0-4.5 2.012-4.5 4.5s2.012 4.5 4.5 4.5 4.5-2.012 4.5-4.5-2.012-4.5-4.5-4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 12.75c0-5.25-4.125-9.75-9.375-9.75S3 7.5 3 12.75m18.75 0c0 4.142-3.358 7.5-7.5 7.5s-7.5-3.358-7.5-7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h.008v.008H12v-.008z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12.75h.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.75h.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25l-1.5-1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 6.75l-1.5 1.5" />
    </svg>
);


