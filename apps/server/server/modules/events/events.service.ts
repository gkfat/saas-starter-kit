import { randomUUID } from 'node:crypto';
import { FeatureFlag } from '@saas-starter-kit/shared';
import { deleteObject, publicUrlToKey, uploadObject } from '../../shared/r2-storage';
import {
  createEvent as createEventInRepo,
  deleteEvent as deleteEventInRepo,
  getEventById,
  listEvents as listEventsFromRepo,
  listVisibleEvents as listVisibleEventsFromRepo,
  updateEvent as updateEventInRepo,
} from './events.repo';
import { CreateEventSchema, UpdateEventSchema, UploadBannerSchema } from './events.schema';
import type { Event, EventStatus, EventWithStatus } from './events.types';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function isEventEnabled(): boolean {
  return useRuntimeConfig().public.featureFlags[FeatureFlag.Event];
}

export function requireEventEnabled(): void {
  if (!isEventEnabled()) {
    throw Object.assign(new Error('Event module is disabled'), { code: 'event-disabled' });
  }
}

function deriveStatus(event: Event, now: string): EventStatus {
  if (!event.enabled) return 'disabled';
  if (now < event.startAt) return 'upcoming';
  if (now > event.endAt) return 'ended';
  return 'active';
}

function withStatus(event: Event): EventWithStatus {
  return { ...event, status: deriveStatus(event, new Date().toISOString()) };
}

export async function listEvents(): Promise<EventWithStatus[]> {
  requireEventEnabled();
  const events = await listEventsFromRepo();
  return events.map(withStatus);
}

export async function createEvent(input: {
  title: string;
  copyText: string;
  startAt: string;
  endAt: string;
  enabled?: boolean;
}): Promise<Event> {
  requireEventEnabled();
  const parsed = CreateEventSchema.parse(input);
  if (new Date(parsed.endAt).getTime() <= new Date(parsed.startAt).getTime()) {
    throw Object.assign(new Error('endAt must be later than startAt'), {
      code: 'event-invalid-schedule',
    });
  }
  const now = new Date().toISOString();
  const event: Event = {
    id: randomUUID(),
    title: parsed.title,
    copyText: parsed.copyText,
    startAt: parsed.startAt,
    endAt: parsed.endAt,
    enabled: parsed.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await createEventInRepo(event);
  return event;
}

export async function updateEvent(
  id: string,
  input: {
    title?: string;
    copyText?: string;
    startAt?: string;
    endAt?: string;
    enabled?: boolean;
  },
): Promise<Event> {
  requireEventEnabled();
  const patch = UpdateEventSchema.parse(input);
  const existing = await getEventById(id);
  if (!existing) {
    throw Object.assign(new Error(`event ${id} not found`), { code: 'event-not-found' });
  }

  const startAt = patch.startAt ?? existing.startAt;
  const endAt = patch.endAt ?? existing.endAt;
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    throw Object.assign(new Error('endAt must be later than startAt'), {
      code: 'event-invalid-schedule',
    });
  }

  const updatedAt = new Date().toISOString();
  await updateEventInRepo(id, { ...patch, updatedAt });
  return { ...existing, ...patch, updatedAt };
}

export async function deleteEvent(id: string): Promise<void> {
  requireEventEnabled();
  const existing = await getEventById(id);
  if (!existing) {
    throw Object.assign(new Error(`event ${id} not found`), { code: 'event-not-found' });
  }
  await deleteEventInRepo(id);
  if (existing.bannerUrl) {
    await deleteObject(publicUrlToKey(existing.bannerUrl));
  }
}

export async function uploadEventBanner(
  id: string,
  input: { filename: string; mimeType: string; size: number },
  fileBuffer: Buffer,
): Promise<Event> {
  requireEventEnabled();
  const parsed = UploadBannerSchema.parse(input);
  const existing = await getEventById(id);
  if (!existing) {
    throw Object.assign(new Error(`event ${id} not found`), { code: 'event-not-found' });
  }

  const ext = MIME_TO_EXT[parsed.mimeType];
  const key = `events/${id}/banner.${ext}`;
  const bannerUrl = await uploadObject(key, fileBuffer, parsed.mimeType);

  if (existing.bannerUrl) {
    const oldKey = publicUrlToKey(existing.bannerUrl);
    if (oldKey !== key) {
      await deleteObject(oldKey);
    }
  }

  const updatedAt = new Date().toISOString();
  await updateEventInRepo(id, { bannerUrl, updatedAt });
  return { ...existing, bannerUrl, updatedAt };
}

export async function listVisibleEvents(): Promise<Event[]> {
  requireEventEnabled();
  return listVisibleEventsFromRepo(new Date().toISOString());
}

export async function getVisibleEventById(id: string): Promise<Event> {
  requireEventEnabled();
  const event = await getEventById(id);
  if (!event) {
    throw Object.assign(new Error(`event ${id} not found`), { code: 'event-not-found' });
  }
  const now = new Date().toISOString();
  const status = deriveStatus(event, now);
  if (status !== 'active' && status !== 'upcoming') {
    throw Object.assign(new Error(`event ${id} is not currently visible`), {
      code: 'event-not-visible',
    });
  }
  return event;
}
