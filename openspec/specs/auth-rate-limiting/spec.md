# Auth Rate Limiting Spec

## Purpose

Protect the `register` and password `login` endpoints from brute-force and mass-registration abuse by rate-limiting requests per IP and per account, without requiring new third-party dependencies or affecting Google-based auth flows.

## Requirements

### Requirement: Register endpoint is rate-limited per IP

The system SHALL limit `/api/auth/register` requests from a single IP address to at most 10 requests per rolling 1-hour window. When the threshold is exceeded, the system SHALL reject the request with HTTP `429` and SHALL NOT create a Firebase Auth account or Firestore user document.

#### Scenario: Registration requests within threshold

- **WHEN** an IP address has submitted 10 or fewer registration requests within the current 1-hour window
- **THEN** each request is processed normally by the existing registration flow

#### Scenario: Registration requests exceed IP threshold

- **WHEN** an IP address submits an 11th registration request within the current 1-hour window
- **THEN** the system responds with HTTP `429`, does not call Firebase Auth or Firestore to create a user, and writes a `login_log` entry with `severity: WARNING` and `result: failure`

### Requirement: Password login endpoint is rate-limited per IP and per account

The system SHALL limit `/api/auth/login` (username/password) requests both by source IP and by the target account identifier (username): after 5 consecutive failed attempts within either dimension, that dimension SHALL be locked out for 15 minutes. When either dimension is locked out, the system SHALL reject the request with HTTP `429` and SHALL NOT attempt password verification. The lockout duration is fixed at 15 minutes and SHALL NOT increase with repeated lockouts (no exponential backoff).

#### Scenario: Login attempts within threshold

- **WHEN** neither the IP-based nor the account-based consecutive failure count has reached 5 within the current window
- **THEN** the request proceeds to the existing password verification flow

#### Scenario: Account-based lockout after repeated failures

- **WHEN** a given username has accumulated 5 consecutive failed login attempts
- **THEN** subsequent login requests for that username are rejected with HTTP `429` for 15 minutes, regardless of source IP, and a `login_log` entry is written with `severity: WARNING` and `result: failure`

#### Scenario: IP-based lockout after repeated failures across accounts

- **WHEN** a given source IP has accumulated 5 consecutive failed login attempts, regardless of target account
- **THEN** subsequent login requests from that IP are rejected with HTTP `429` for 15 minutes, and a `login_log` entry is written with `severity: WARNING` and `result: failure`

#### Scenario: Successful login resets account failure count

- **WHEN** a username successfully authenticates
- **THEN** the account-based consecutive failure counter for that username is reset to zero

### Requirement: Login page displays a lockout warning when rate-limited

The system SHALL detect an HTTP `429` response from `/api/auth/login` and display a warning message informing the user that their account has been temporarily locked due to repeated failed login attempts, distinct from the existing generic login failure message.

#### Scenario: User sees lockout warning after triggering rate limit

- **WHEN** the login page receives an HTTP `429` response from `/api/auth/login`
- **THEN** the page displays the localized "account locked" warning message instead of the default login failure message

### Requirement: Rate limit state is isolated per tenant

The system SHALL scope all rate limit counters to the resolved `tenantId`, storing them under `tenants/{tenantId}/rate_limits/{key}`, so that request activity in one tenant does not affect rate limit state in another tenant.

#### Scenario: Same IP across different tenants counted independently

- **WHEN** the same source IP submits requests against two different tenants
- **THEN** each tenant's rate limit counters are evaluated and updated independently

### Requirement: Logout and Google auth endpoints are not subject to auth rate limiting

The system SHALL NOT apply the register/login rate limit rules defined above to `/api/auth/logout`, `/api/auth/google-login`, `/api/auth/google-register`, or to any endpoint that requires a valid authenticated session.

#### Scenario: Logout is never rate-limited by this mechanism

- **WHEN** an authenticated user calls `/api/auth/logout` any number of times
- **THEN** the request is not rejected by the auth rate limiting mechanism

#### Scenario: Google login/register is never rate-limited by this mechanism

- **WHEN** a client calls `/api/auth/google-login` or `/api/auth/google-register` any number of times from the same IP
- **THEN** the request is not rejected by the auth rate limiting mechanism
