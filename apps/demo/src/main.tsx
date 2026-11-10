import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { startOffline } from './offline/offline.js';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
// offline use: the app is saved on this device after first paint (offline/offline.ts decides whether, and says why not)
startOffline();
