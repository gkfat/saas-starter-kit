## 1. Data model & generation

- [x] 1.1 Add `memberNo: string` to `User` type (`apps/server/server/modules/users/users.types.ts`)
- [x] 1.2 Add `findUserByMemberNo(memberNo)` to `users.repo.ts`; extend `createUser()` to persist `memberNo`
- [x] 1.3 Implement `generateMemberNo()` in `users.service.ts`: `M` + epoch millis + 2-char random alphanumeric suffix, with a retry loop against `findUserByMemberNo` on collision (small max-retry cap, throw on exhaustion)
- [x] 1.4 Wire `registerUserWithProvider()` to generate and persist `memberNo` alongside existing account creation steps; failure propagates the same way existing steps do (see `docs/known-issues.md`)

## 2. Existing account backfill

- [x] 2.1 Backfill `memberNo` for all existing accounts that lack it, using the same generation/uniqueness logic as registration

## 3. API surface

- [x] 3.1 Confirm `memberNo` is included in `GET /api/admin/users` (list) and `GET /api/admin/users/[id]` (detail) responses — both already spread the full `User` object, verify no explicit field allowlist drops it
- [x] 3.2 Add `memberNo` to shared `UserRow` type (`packages/shared/users.ts`)
- [x] 3.3 Add `memberNo` to `AuthUser` (`packages/shared/dto/auth.ts`) and to wherever `/api/auth/login` builds the `AuthUser` response, so the LIFF app receives it at login without a separate call

## 4. QRCode dependency

- [x] 4.1 Add `qrcode@^1.5.4` and `@types/qrcode@^1.5.6` to `apps/liff/package.json` — same package/version already used in `apps/admin` (`LoginMethodsCard.vue`), reused rather than newly evaluated

## 5. LIFF member card

- [x] 5.1 Display `memberNo` on the member card (`apps/liff/src/pages/home/index.vue`)
- [x] 5.2 Render a QR code encoding `memberNo` on the member card, using `QRCode.toDataURL()` → `<img>`, matching the pattern in `apps/admin/pages/profile/components/LoginMethodsCard.vue`

## 6. Admin UI

- [x] 6.1 Add `memberNo` column to `UsersTable.vue` (members list)
- [x] 6.2 Display `memberNo` in `MemberDetailDialog.vue`

## 7. Documentation

- [x] 7.1 Note the new registration step's shared non-atomicity risk in `docs/known-issues.md` (same pattern as the `level` module's entry)
