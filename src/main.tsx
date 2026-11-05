import React from 'react';
import { createRoot } from 'react-dom/client';
import { UIProvider } from './components/ui';
import { IconContext } from '@phosphor-icons/react';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';
import { ThemeProvider } from './theme';
import './components/ui/ui.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <IconContext.Provider value={{ size: 16, weight: 'regular', className: 'ui-icon' }}>
        <UIProvider>
          <RouterProvider router={router} />
        </UIProvider>
      </IconContext.Provider>
    </ThemeProvider>
  </React.StrictMode>,
);
