import Page from '@/page';
import '@/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ControlsProvider } from '@/hooks/controls';
import { SimObjectProvider } from '@/hooks/sim-object';
import { SimulationProvider } from '@/hooks/simulation';
import { ThemeProvider } from '@/hooks/theme';

const root = document.getElementById('root');
if (!root) throw new Error('could not find root node');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <ControlsProvider>
        <SimObjectProvider>
          <SimulationProvider>
            <Page />
          </SimulationProvider>
        </SimObjectProvider>
      </ControlsProvider>
    </ThemeProvider>
  </StrictMode>
);
