import { adminDb } from '../../shared/firebase-admin';
import { prefixCollection } from '../../shared/firestore-prefix';
import type { Event } from './events.types';

function eventsCollection() {
  return adminDb().collection(prefixCollection('events'));
}

export async function listEvents(): Promise<Event[]> {
  const snapshot = await eventsCollection().orderBy('createdAt', 'desc').get();
  return snapshot.docs.map((doc) => doc.data() as Event);
}

export async function getEventById(id: string): Promise<Event | null> {
  const snap = await eventsCollection().doc(id).get();
  return snap.exists ? (snap.data() as Event) : null;
}

export async function createEvent(event: Event): Promise<void> {
  await eventsCollection().doc(event.id).set(event);
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<Event, 'id' | 'createdAt'>>,
): Promise<void> {
  await eventsCollection().doc(id).update(patch);
}

export async function deleteEvent(id: string): Promise<void> {
  await eventsCollection().doc(id).delete();
}

// `enabled == true` combined with an inequality filter on `endAt` plus a sort on
// `startAt` would require a composite Firestore index; event counts are expected to
// stay small (see design.md), so filter/sort in memory instead of adding an index.
// Includes both upcoming and active events (i.e. anything not yet ended), so LIFF can
// show events before they officially start.
export async function listVisibleEvents(now: string): Promise<Event[]> {
  const snapshot = await eventsCollection().where('enabled', '==', true).get();
  return snapshot.docs
    .map((doc) => doc.data() as Event)
    .filter((event) => event.endAt >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}
