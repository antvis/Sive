import { UIProvider } from '@renderer/components/app/UIProvider';
import { IconContext } from '@phosphor-icons/react';
import { RouterProvider } from 'react-router/dom';
import { router } from '@renderer/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@renderer/data/queries';
import { ThemeProvider } from '@renderer/components/app/ThemeProvider';
import { PreferencesProvider } from '@renderer/components/app/PreferencesProvider';

export default function App() {
  return (
    <ThemeProvider>
      <IconContext.Provider
        value={{ size: 16, weight: 'regular', className: 'inline-block shrink-0 align-middle' }}
      >
        <UIProvider>
          <PreferencesProvider>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
            </QueryClientProvider>
          </PreferencesProvider>
        </UIProvider>
      </IconContext.Provider>
    </ThemeProvider>
  );
}
