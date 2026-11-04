import React from 'react';
import { createRoot } from 'react-dom/client';
import { UIProvider } from './components/ui';
import { IconContext } from '@phosphor-icons/react';
import App from './App';
import { ThemeProvider } from './theme';
import './components/ui/ui.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <IconContext.Provider value={{ size: 16, weight: 'regular', className: 'ui-icon' }}>
        <UIProvider>
          <App />
        </UIProvider>
      </IconContext.Provider>
    </ThemeProvider>
  </React.StrictMode>,
);
