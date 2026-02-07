
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from './icons';

interface ThemeSwitcherProps {
    collapsed?: boolean;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ collapsed = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-light-onSurfaceVariant dark:text-dark-onSurfaceVariant hover:bg-light-surfaceContainerHigh dark:hover:bg-dark-surfaceContainerHigh focus:outline-none transition-colors"
      aria-label="Toggle theme"
      title={theme === 'light' ? 'Prepnúť na tmavý režim' : 'Prepnúť na svetlý režim'}
    >
      {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
    </button>
  );
};

export default ThemeSwitcher;