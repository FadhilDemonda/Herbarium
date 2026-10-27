import { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import styles from './LoginModal.module.css';

export function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setErrorMessage('');
      document.body.classList.add('modal-open');
      setTimeout(() => usernameRef.current?.focus(), 50);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  // Handle Esc to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Username dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(username, password);
      showToast(`Selamat datang, ${username}!`);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Username atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="login-title" className={styles.title}>Masuk</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup dialog masuk"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="login-username" className={styles.label}>
              Username
            </label>
            <input
              ref={usernameRef}
              id="login-username"
              type="text"
              autoComplete="username"
              className={styles.input}
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="login-password" className={styles.label}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={styles.passwordInput}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
          >
            {isLoading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
