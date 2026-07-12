## ADDED Requirements

### Requirement: Frontend conditionally renders superadmin-only actions

The system SHALL use `v-if="isSuperadmin"` (from `useAuthStore`) to hide UI controls that are exclusive to superadmin (e.g. delete role) from admin users.

#### Scenario: Superadmin sees delete role button

- **WHEN** a superadmin views the roles management page
- **THEN** the delete role button is visible and interactive

#### Scenario: Admin does not see delete role button

- **WHEN** an admin (non-superadmin) views the roles management page
- **THEN** the delete role button is not rendered in the DOM
