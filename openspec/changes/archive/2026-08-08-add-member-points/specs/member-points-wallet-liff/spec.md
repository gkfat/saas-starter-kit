## ADDED Requirements

### Requirement: Member card displays current point balance

The system SHALL display the member's current point balance on the existing member card component in the LIFF app, alongside their level information.

#### Scenario: Member views their card

- **WHEN** a logged-in member navigates to the page containing the member card
- **THEN** the card shows both their current level information and their current point balance

### Requirement: Member barcode/QR page is a standalone route

The system SHALL present the member's barcode/QR code on a standalone page (not a modal dialog), showing the QR code, the member's current point balance, and the redeemable amount calculated from the global redemption ratio. The page SHALL NOT display level information.

#### Scenario: Member opens the QR code page

- **WHEN** a logged-in member navigates to the member QR code page
- **THEN** the system renders the QR code, the member's current point balance, and the calculated redeemable amount on a dedicated page (not a dialog), without showing level/tier information

#### Scenario: QR code page is read-only

- **WHEN** a member or staff views the member QR code page
- **THEN** the page provides no action to redeem or deduct points; it only displays information

### Requirement: Member can view their point transaction history

The system SHALL provide a standalone page listing the member's own point ledger entries (amount, reason, timestamp), accessible via an entry link from the member center page.

#### Scenario: Member views point history from member center

- **WHEN** a logged-in member taps the point history entry link on the member center page
- **THEN** the system navigates to a standalone page listing their point ledger entries ordered from most recent to oldest

#### Scenario: Member with no point activity sees an empty state

- **WHEN** a member with no point ledger entries opens the point history page
- **THEN** the system shows an empty state instead of an error
