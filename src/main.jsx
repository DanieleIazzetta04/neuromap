import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider, ConfirmProvider } from './store.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StoreProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </StoreProvider>
  </StrictMode>,
);
