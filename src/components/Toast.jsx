import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 2500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className={styles.toastContainer} role="region" aria-label="Notifikasi">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toastItem} role="alert">
            <div className={styles.toastContent}>
              {toast.type === 'success' && <CheckCircle2 size={18} className={styles.toastIconSuccess} />}
              {toast.type === 'error' && <AlertCircle size={18} className={styles.toastIconError} />}
              {toast.type === 'info' && <Info size={18} className={styles.toastIconInfo} />}
              <span>{toast.message}</span>
            </div>
            <button
              className={styles.closeBtn}
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup notifikasi"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
