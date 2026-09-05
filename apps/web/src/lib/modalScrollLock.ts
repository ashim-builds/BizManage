let activeModalCount = 0;
let originalBodyOverflow = '';
let originalDocOverflow = '';
let originalBodyPaddingRight = '';

export function lockScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (activeModalCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalDocOverflow = document.documentElement.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift when vertical scrollbar is removed
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.setAttribute('data-modal-open', 'true');
    document.documentElement.setAttribute('data-modal-open', 'true');
  }

  activeModalCount += 1;
}

export function unlockScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  activeModalCount = Math.max(0, activeModalCount - 1);

  if (activeModalCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.documentElement.style.overflow = originalDocOverflow;
    document.body.style.paddingRight = originalBodyPaddingRight;
    document.body.removeAttribute('data-modal-open');
    document.documentElement.removeAttribute('data-modal-open');
  }
}
