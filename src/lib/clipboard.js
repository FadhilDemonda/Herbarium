/**
 * Herbarium Clipboard Helper
 * Copies text using navigator.clipboard with execCommand fallback
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard failed, attempting fallback...', err);
    }
  }

  // 2. Fallback using document.execCommand('copy')
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback copy failed:', fallbackErr);
    return false;
  }
}
