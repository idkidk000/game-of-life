import App from '@/app.tsx';
import '@/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const root = document.getElementById('root');
if (!root) throw new Error('could not find root node');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
