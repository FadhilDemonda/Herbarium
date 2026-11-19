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
  const previousFocus = document.activeElement;
  let textarea;
  try {
    textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    // Native modal dialogs make body siblings inert, including fallback inputs.
    const modal = previousFocus?.closest('dialog[open]') || [...document.querySelectorAll('dialog[open]')].pop();
    (modal || document.body).appendChild(textarea);
    textarea.focus();
    if (document.activeElement !== textarea) return false;
    textarea.select();

    const successful = document.execCommand('copy');
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback copy failed:', fallbackErr);
    return false;
  } finally {
    textarea?.remove();
    if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) previousFocus.focus({ preventScroll: true });
  }
}
