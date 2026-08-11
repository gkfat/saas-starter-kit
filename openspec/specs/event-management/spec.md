# Event Management Spec

## Purpose

Provides admin-facing event management: creating, editing, and deleting events with banner image, schedule (`startAt`/`endAt`), and plain-text copy, including banner upload to object storage and permission/feature-flag enforcement.

## Requirements

### Requirement: Admin can create an event with banner, schedule, and copy

The system SHALL allow an admin user with `events:create` permission to create an event with a title, banner image, start/end datetime (`startAt` / `endAt`), and multi-line plain-text copy. The system SHALL reject creation when `endAt` is not later than `startAt`.

#### Scenario: Admin creates a valid event

- **WHEN** an admin with `events:create` submits a title, banner image, `startAt` before `endAt`, and copy text
- **THEN** the system creates a new `events` document with the given fields and `enabled: true` by default

#### Scenario: Admin submits an invalid schedule

- **WHEN** an admin submits an event where `endAt` is earlier than or equal to `startAt`
- **THEN** the system rejects the request with a validation error and does not create the event

### Requirement: Admin can upload and replace an event banner image

The system SHALL allow an admin with `events:write` permission to upload an image file for an event's banner, store it in object storage, and persist the resulting public URL on the event document. The system SHALL reject files whose MIME type is not one of `image/png`, `image/jpeg`, `image/webp`, or whose size exceeds the configured limit.

#### Scenario: Admin uploads a valid banner image

- **WHEN** an admin uploads a PNG/JPEG/WebP file within the size limit for an existing event
- **THEN** the system stores the file in object storage and updates the event's `bannerUrl`

#### Scenario: Admin uploads an unsupported file type

- **WHEN** an admin uploads a file whose MIME type is not image/png, image/jpeg, or image/webp
- **THEN** the system rejects the upload and does not modify the event's `bannerUrl`

#### Scenario: Admin uploads an oversized file

- **WHEN** an admin uploads an image file larger than the configured size limit
- **THEN** the system rejects the upload and does not modify the event's `bannerUrl`

### Requirement: Admin can edit and delete events

The system SHALL allow an admin with `events:write` permission to update an event's title, banner, schedule, copy, and enabled state, and SHALL allow an admin with `events:delete` permission to delete an event.

#### Scenario: Admin updates an event's schedule

- **WHEN** an admin with `events:write` submits a new `startAt`/`endAt` for an existing event where `endAt` is after `startAt`
- **THEN** the system updates the event's schedule

#### Scenario: Admin deletes an event

- **WHEN** an admin with `events:delete` requests deletion of an existing event
- **THEN** the system removes the event document and it no longer appears in any listing

### Requirement: Replacing or removing a banner deletes the stale storage object

The system SHALL delete the previously stored banner file from object storage when an event's banner is replaced with a new upload, and SHALL delete the stored banner file when the event itself is deleted.

#### Scenario: Admin replaces an existing banner

- **WHEN** an admin uploads a new banner image for an event that already has a `bannerUrl`
- **THEN** the system stores the new file, updates `bannerUrl` to the new file, and deletes the previous file from object storage

#### Scenario: Admin deletes an event with a banner

- **WHEN** an admin deletes an event that has a `bannerUrl`
- **THEN** the system removes the event document and deletes the corresponding banner file from object storage

### Requirement: Admin can list all events with their status

The system SHALL allow an admin with `events:read` permission to list all events regardless of schedule or enabled state, including each event's computed status (upcoming / active / ended / disabled).

#### Scenario: Admin lists events

- **WHEN** an admin with `events:read` requests the event list
- **THEN** the system returns all events with their schedule, enabled state, and computed status

### Requirement: Event management API enforces permission checks

The system SHALL reject any admin event API request (create, update, delete, upload, list) from a user lacking the corresponding `events:*` permission.

#### Scenario: Unauthorized admin attempts to create an event

- **WHEN** an admin user without `events:create` permission attempts to create an event
- **THEN** the system rejects the request with an authorization error and does not create the event

### Requirement: Event management API is gated by a feature flag

The system SHALL reject any admin event API request with a not-found error when the event feature flag is disabled.

#### Scenario: Feature flag disabled

- **WHEN** an admin sends any request to an admin event API endpoint while the event feature flag is disabled
- **THEN** the system responds with a not-found error and performs no event operation
