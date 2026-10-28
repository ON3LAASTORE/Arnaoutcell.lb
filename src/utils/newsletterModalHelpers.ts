/**
 * Helper utilities for Timed Newsletter Modal frequency capping & qualification
 */

export interface ModalTriggerState {
  isHomePage: boolean;
  isDismissedInSession: boolean;
  hasAlreadySubscribed: boolean;
  timeOnPageMs: number;
  triggerDelayMs?: number;
}

export const MODAL_TRIGGER_DELAY_MS = 15000; // 15 seconds

export const SESSION_DISMISS_KEY = 'arnaout_newsletter_modal_dismissed';
export const LOCAL_SUBSCRIBED_FLAG = 'arnaout_newsletter_subscribed';

/**
 * Determines whether the timed newsletter modal should open
 */
export function shouldShowTimedModal(state: ModalTriggerState): boolean {
  const delay = state.triggerDelayMs ?? MODAL_TRIGGER_DELAY_MS;

  // Must be currently on the homepage
  if (!state.isHomePage) return false;

  // If user already dismissed in this session, do not interrupt
  if (state.isDismissedInSession) return false;

  // If user already subscribed, do not prompt again
  if (state.hasAlreadySubscribed) return false;

  // Must have passed the timed delay threshold
  if (state.timeOnPageMs < delay) return false;

  return true;
}

/**
 * Generates an exclusive welcome voucher code for new subscribers
 */
export function generateWelcomeVoucherCode(): string {
  return 'ARNAOUT-VIP15';
}
