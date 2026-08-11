export type Event = {
  id: string;
  title: string;
  bannerUrl?: string;
  copyText: string;
  startAt: string;
  endAt: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventStatus = 'upcoming' | 'active' | 'ended' | 'disabled';

export type EventWithStatus = Event & { status: EventStatus };

export type CreateEventRequest = {
  title: string;
  copyText: string;
  startAt: string;
  endAt: string;
  enabled?: boolean;
};

export type UpdateEventRequest = {
  title?: string;
  copyText?: string;
  startAt?: string;
  endAt?: string;
  enabled?: boolean;
};
