import { useEffect, useRef } from 'react';

export function useDropdownMenu({ isOpen, onClose, triggerRef, menuRef }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    menu?.querySelector('[role="menuitem"]')?.focus();
    const outside = (event) => {
      if (!menu?.contains(event.target) && !triggerRef.current?.contains(event.target)) closeRef.current();
    };
    const focusOutside = (event) => outside(event);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', focusOutside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', focusOutside);
    };
  }, [isOpen, triggerRef, menuRef]);

  return {
    onMenuKeyDown: (event) => {
      const items = [...menuRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
      const index = items.indexOf(document.activeElement);
      let next;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); closeRef.current(); triggerRef.current?.focus(); return;
      }
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      if (next !== undefined) { event.preventDefault(); items[next]?.focus(); }
    },
  };
}
