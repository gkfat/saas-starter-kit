## ADDED Requirements

### Requirement: LIFF member can fetch currently active events

The system SHALL expose a LIFF API that returns events where `enabled` is `true` and the current server time falls within `startAt` and `endAt` (inclusive), ordered by `startAt` ascending. The system SHALL require a valid signed-in LIFF session to call this API and SHALL NOT expose disabled, upcoming, or ended events through it.

#### Scenario: Signed-in member fetches active events with one on-schedule event

- **WHEN** a signed-in LIFF member requests active events and one enabled event has `startAt <= now <= endAt`
- **THEN** the system returns that event in the response list

#### Scenario: Event outside its schedule is excluded

- **WHEN** a signed-in LIFF member requests active events and an enabled event's `startAt` is in the future or `endAt` is in the past
- **THEN** that event is not included in the response

#### Scenario: Disabled event is excluded

- **WHEN** a signed-in LIFF member requests active events and an event is within its schedule but `enabled` is `false`
- **THEN** that event is not included in the response

#### Scenario: Unauthenticated request is rejected

- **WHEN** a request to the active events API is made without a valid signed-in session
- **THEN** the system rejects the request with an authentication error

### Requirement: LIFF event API is gated by a feature flag

The system SHALL reject any LIFF event API request with a not-found error when the event feature flag is disabled.

#### Scenario: Feature flag disabled

- **WHEN** a signed-in LIFF member requests active events or event detail while the event feature flag is disabled
- **THEN** the system responds with a not-found error

### Requirement: LIFF home page displays active event banners and notifications

The system SHALL render, on the LIFF home page, a banner and notification entry for each currently active event returned by the active events API. When no event is currently active, the system SHALL render the home page without any event banner section.

#### Scenario: LIFF home shows banners for active events

- **WHEN** the LIFF home page loads and the active events API returns one or more events
- **THEN** the page displays each event's banner image as a clickable entry

#### Scenario: LIFF home shows nothing when no event is active

- **WHEN** the LIFF home page loads and the active events API returns an empty list
- **THEN** the page renders without any event banner or notification section

### Requirement: LIFF member can view event detail

The system SHALL allow a signed-in LIFF member to open an event detail page showing the event's banner, full copy text, and schedule, for any event that is currently active. The system SHALL NOT expose detail for an event that is not currently active.

#### Scenario: Member views detail of an active event

- **WHEN** a signed-in LIFF member navigates to the detail page of a currently active event
- **THEN** the system displays the event's banner, full copy text, and schedule

#### Scenario: Member requests detail of an inactive event

- **WHEN** a signed-in LIFF member requests the detail page of an event that is disabled, not yet started, or already ended
- **THEN** the system does not return the event's detail
