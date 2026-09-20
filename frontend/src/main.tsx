import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppStateProvider } from './app/AppState';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

// BASE_URL is "/" for a normal deploy and "/repo-name/" when the site is published under a
// sub-path (GitHub Pages). Passing it as the router basename is what stops every internal link
// 404-ing there; it is set at build time by `VITE_BASE` (see vite.config.ts).
createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
