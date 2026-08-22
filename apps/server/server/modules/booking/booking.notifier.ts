import type { Booking } from './booking.types';

export type BookingNotificationEvent =
  | { type: 'confirmed'; booking: Booking }
  | { type: 'pendingReview'; booking: Booking }
  | { type: 'rejected'; booking: Booking }
  | { type: 'cancelled'; booking: Booking };

/**
 * design.md D4: booking depends only on this interface, not on a concrete LINE
 * Messaging API integration. Channel credential management and message content/timing
 * are unresolved (proposal.md Open Questions #1) — until that's decided, the only
 * implementation registered below is a log-only stub. Replace `defaultNotifier` with a
 * real implementation (or point it at a shared LINE Messaging integration layer, per D4)
 * once a channel is provisioned; nothing else in the booking module needs to change.
 */
export interface LineNotifier {
  notify(memberId: string, event: BookingNotificationEvent): Promise<void>;
}

class UnconfiguredLineNotifier implements LineNotifier {
  async notify(memberId: string, event: BookingNotificationEvent): Promise<void> {
    const configured = Boolean(
      (useRuntimeConfig().lineMessagingChannelAccessToken as string | undefined)?.length,
    );
    console.log(
      JSON.stringify({
        type: 'api',
        severity: 'INFO',
        message: configured
          ? 'booking.notifier: LINE Messaging channel access token is set, but no notifier implementation is wired up yet — skipping'
          : 'booking.notifier: LINE Messaging channel not configured — skipping notification',
        memberId,
        event: event.type,
        bookingId: event.booking.id,
      }),
    );
  }
}

const defaultNotifier: LineNotifier = new UnconfiguredLineNotifier();

/**
 * Fire-and-forget wrapper (NFR-002 / booking-line-notification spec): notification
 * failures are logged only, never thrown, so they cannot block the booking
 * create/review/cancel flow that triggered them.
 */
export function notifyBookingEvent(memberId: string, event: BookingNotificationEvent): void {
  defaultNotifier.notify(memberId, event).catch((error) => {
    console.error(
      JSON.stringify({
        type: 'api',
        severity: 'WARNING',
        message: 'booking.notifier: failed to send LINE notification',
        memberId,
        event: event.type,
        bookingId: event.booking.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}
