import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import './styles/base.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>
);
