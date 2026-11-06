/**
 * Safe External URL Navigator
 * Dispatches simulated anchor clicks instead of direct window.open()
 * to reliably navigate without triggering popup blockers in embedded iframes.
 */

export function openExternalUrl(url: string): boolean {
  if (typeof window === 'undefined' || !url) {
    return false;
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch {
    // Fallback if DOM manipulation fails
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
}
