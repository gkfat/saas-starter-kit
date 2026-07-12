## 1. Users Module（Server）

- [x] 1.1 建立 `server/modules/users/users.types.ts`（User、UserWithRole types）
- [x] 1.2 建立 `server/modules/users/users.schema.ts`（Zod schema for create/update request）
- [x] 1.3 建立 `server/modules/users/users.repo.ts`：getUsers、getUserById、createUser、updateUser、deleteUser
- [x] 1.4 建立 `server/modules/users/users.service.ts`：business logic，join user_roles，呼叫 roles.repo.ts 取得 role
- [x] 1.5 建立 `server/modules/users/index.ts`：公開 `usersService`

## 2. Users API Endpoints

- [x] 2.1 建立 `server/api/admin/users.get.ts`：列出 tenant users（需 `users:read`）

## 3. Users Page

- [x] 3.1 建立 `pages/users/index.vue`：使用者列表（email、displayName、role、createdAt）

## 4. Audit Log（Pending）

- [ ] 4.1 `users.service.ts` create user 後寫入 audit_log（待 Phase 5 logging module）
- [ ] 4.2 `users.service.ts` update user 後寫入 audit_log（待 Phase 5 logging module）
- [ ] 4.3 `users.service.ts` delete user 後寫入 audit_log（待 Phase 5 logging module）
