## ADDED Requirements

### Requirement: System defaults to UTC+8 for time display

The system SHALL default all displayed timestamps to `UTC+8` when no timezone preference has been previously selected by the user.

#### Scenario: First-time visitor sees UTC+8 formatted times

- **WHEN** a user with no stored timezone preference views any page that displays a timestamp (e.g. user list `createdAt`, login logs, audit logs)
- **THEN** the system formats the timestamp using `UTC+8`

### Requirement: User can select a display timezone from the global header

The system SHALL provide a timezone selector in the global header, positioned to the right of the language switcher, allowing the user to choose from a fixed list of UTC offsets ranging from `UTC-12` to `UTC+12`, ordered ascending by offset. On narrow viewports (RWD), the selector SHALL instead appear inside the right-side settings menu as a dropdown (`v-select`, outlined style) rather than in the header. Selecting a timezone SHALL immediately re-render all currently visible timestamps in the new timezone without a full page reload.

#### Scenario: User switches timezone from the header (desktop)

- **WHEN** a user on a desktop viewport selects a different timezone from the header dropdown, next to the language switcher
- **THEN** all currently displayed timestamps across the open page update to reflect the newly selected timezone

#### Scenario: User switches timezone from the RWD settings menu (mobile)

- **WHEN** a user on a narrow viewport opens the right-side settings menu and selects a different timezone from the outlined dropdown
- **THEN** all currently displayed timestamps across the open page update to reflect the newly selected timezone

### Requirement: Selected timezone persists across sessions

The system SHALL persist the user's selected timezone in browser `localStorage` and SHALL apply the persisted value on subsequent page loads and navigations, without requiring the user to re-select it.

#### Scenario: Returning user sees previously selected timezone

- **WHEN** a user who previously selected `UTC` returns to the site in a new browser session (same browser/device)
- **THEN** all displayed timestamps are formatted using `UTC`, not the default `UTC+8`

#### Scenario: localStorage has no saved preference

- **WHEN** a user's browser has no saved timezone preference (e.g. cleared storage)
- **THEN** the system falls back to the default `UTC+8`

### Requirement: All timestamp displays across the app use the selected timezone

The system SHALL apply the user's selected (or default) timezone to every UI location that displays a timestamp, by routing all timestamp formatting through the shared `utils/format-date.ts` utility. No page or component SHALL format timestamps using the browser's local timezone directly.

#### Scenario: Admin tables reflect selected timezone

- **WHEN** a user has selected a non-default timezone
- **THEN** `pages/admin/users/index.vue` (`createdAt`), `pages/admin/logs/login.vue` (`timestamp`), `pages/admin/logs/audit.vue` (`timestamp`), and `pages/users/index.vue` (`createdAt`) all display times converted to the selected timezone

### Requirement: Timezone mechanism is frontend-only

The system SHALL NOT alter how timestamps are stored or transmitted by the backend. All Firestore documents and API responses SHALL continue to use UTC ISO 8601 strings; timezone conversion SHALL occur exclusively at display time in the browser.

#### Scenario: API payload unaffected by timezone selection

- **WHEN** a user has selected any timezone
- **THEN** `GET` responses from admin/user APIs continue to return `createdAt`/`timestamp` fields as UTC ISO 8601 strings, unmodified by the selected display timezone
