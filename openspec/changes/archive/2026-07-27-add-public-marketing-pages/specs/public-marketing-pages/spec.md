## ADDED Requirements

### Requirement: Root path dispatches based on session state

The system SHALL treat `/` as a redirect-only route with no rendered content of its own. For a logged-in user, the system SHALL redirect to `/dashboard` if the user has the `Dashboard.Read` permission, otherwise to `/profile`. For a visitor with no active session, the system SHALL redirect to `/home`.

#### Scenario: Logged-in user with dashboard access visits root

- **WHEN** a logged-in user with `Dashboard.Read` permission navigates to `/`
- **THEN** the system redirects them to `/dashboard`

#### Scenario: Logged-in user without dashboard access visits root

- **WHEN** a logged-in user without `Dashboard.Read` permission navigates to `/`
- **THEN** the system redirects them to `/profile`

#### Scenario: Anonymous visitor visits root

- **WHEN** a visitor with no active session navigates to `/`
- **THEN** the system redirects them to `/home`

### Requirement: Homepage (`/home`) shows marketing landing content

The system SHALL render marketing landing content at `/home`, including a login button that navigates to `/login`. The system SHALL NOT redirect a logged-in user away from `/home`.

#### Scenario: Visitor sees landing content

- **WHEN** any visitor (logged in or not) navigates to `/home`
- **THEN** the system renders the homepage with a visible login button

#### Scenario: Anonymous visitor clicks the login button

- **WHEN** an anonymous visitor on `/home` clicks the login button
- **THEN** the browser navigates to `/login`

### Requirement: App shell navigation adapts to authentication state

The system SHALL render the `/home` link within the app shell's `AppDrawer`, in a section visible regardless of login state. The system SHALL hide all permission-gated navigation items (Dashboard, Profile, Admin sections) from `AppDrawer` when no user is logged in, and SHALL replace the drawer's bottom user-info/logout block with a login button when no user is logged in. The system SHALL navigate to `/` when the `AppDrawer` logo is clicked.

#### Scenario: Anonymous visitor sees only public nav items

- **WHEN** an anonymous visitor views the app shell
- **THEN** `AppDrawer` shows only the `/home` link, and does not show Dashboard, Profile, or any Admin navigation items

#### Scenario: Anonymous visitor sees a login button in place of user info

- **WHEN** an anonymous visitor views the app shell
- **THEN** the bottom section of `AppDrawer` shows a login button instead of an avatar, tenant name, and logout button

#### Scenario: Logged-in user sees full navigation including public links

- **WHEN** a logged-in user views the app shell
- **THEN** `AppDrawer` shows the permission-gated navigation items they have access to, plus the `/home` link, and the bottom section shows their user info and logout button as it does today

#### Scenario: Visitor clicks the app logo

- **WHEN** any visitor (logged in or not) clicks the `AppDrawer` logo
- **THEN** the browser navigates to `/`, which then dispatches to the appropriate landing page per session state
