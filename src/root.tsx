import App from '@/pages/app';
import '@/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RenderControlsProvider } from '@/hooks/render-controls';
import { SimControlsProvider } from '@/hooks/sim-controls';
import { SimulationProvider } from '@/hooks/simulation';
import { ThemeProvider } from '@/hooks/theme';
import { ToolProvider } from '@/hooks/tools';

const root = document.getElementById('root');
if (!root) throw new Error('could not find root node');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <SimControlsProvider>
        <ToolProvider>
          <SimulationProvider>
            <RenderControlsProvider>
              <App />
            </RenderControlsProvider>
          </SimulationProvider>
        </ToolProvider>
      </SimControlsProvider>
    </ThemeProvider>
  </StrictMode>
);
