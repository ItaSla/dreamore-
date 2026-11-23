# Security Specification — DREAMORE+

## 1. Data Invariants
1. **PII Isolation**: User email addresses reside exclusively in `/users/{uid}` and are readable only by `isOwner(uid)` or `isAdmin()`. Public profiles reside in `/users_public/{uid}` without PII.
2. **No Self-Assigned Admin Roles**: A standard user creating or updating `/users/{uid}` or `/users_public/{uid}` can only hold `role` in `['Visitante', 'Desenvolvedor']`; `'Administrador'` is reserved for verified admins checked via `/admins/{uid}` or the verified runtime bootstrap admin (`carloskopvicz@gmail.com` with `email_verified == true`).
3. **Owner & Author Identity Integrity**: Document creation for `Project`, `FeedPost`, `Application`, `Group`, `GroupMessage`, and `ChannelMessage` strictly enforces `ownerId / authorUid / applicantUid / ownerUid == request.auth.uid` and verifies `email_verified == true`.
4. **Immutable Ownership & Creation Timestamps**: `createdAt`, `ownerId`, `ownerUid`, `authorUid`, and `applicantUid` cannot change after creation; `createdAt` must equal `request.time` on create and `updatedAt` must equal `request.time` on create and update.
5. **Group Moderation Authority**: Only a group's `ownerUid`, a UID listed in `moderatorUids`, or `isAdmin()` may edit group photo, description, name, or member/moderator rosters; the `ownerUid` cannot be overwritten by moderators.
6. **Master Gate Subcollections & Terminal Application State**:
   - `/projects/{projectId}/applications/{appId}` requires parent `/projects/{projectId}` to exist on create and grants resolution (`status: 'accepted' | 'rejected'`) only to the parent project's `ownerId` or `isAdmin()`. Once `status` leaves `'pending'`, it is locked against further edits by non-admins.
   - `/groups/{groupId}/messages/{msgId}` checks parent `/groups/{groupId}` via `get()` so only group members/owner or public-group authenticated users may read or post.
7. **Volumetric Bounds**: Every string and array is strictly bounded (avatars/group photos `<= 260000` chars, covers `<= 300000` chars, titles/names `<= 80` chars, group members `<= 100`, moderators `<= 25`) to prevent Denial of Wallet exhaustion.
8. **Zero Blanket Reads & Path Guard**: Every single-doc rule checks `isValidId(...)`; every `list` rule evaluates `resource.data` directly without `get()`/`exists()`.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Self-Assigned Admin Escalation**: Creating `/users/attacker` with `{ role: "Administrador" }` as non-admin.
2. **Email PII Snooping**: `get(/users/victimUid)` by a different authenticated user.
3. **Unverified Admin Email Spoof**: Request with `email == "carloskopvicz@gmail.com"` and `email_verified == false`.
4. **Shadow Ghost Field Injection**: Creating `/projects/proj-1` with extra undeclared field `{ isVerifiedOfficial: true }`.
5. **Identity Spoofing on Feed**: Creating `/feed_posts/fp-1` with `{ authorUid: "someone-else" }`.
6. **Moderator Hijacking Group Owner**: Group moderator attempting to update `ownerUid` on `/groups/grp-1`.
7. **Unauthorized Group Kick/Edit**: Non-member/non-moderator attempting to modify `photo`, `desc`, or `moderators` on `/groups/grp-1`.
8. **Orphaned Application**: Creating `/projects/non-existent/applications/app-1` when parent project does not exist.
9. **Terminal Application Mutation**: Applicant attempting to update `/projects/p1/applications/a1` after `status` is `'rejected'` or `'accepted'`.
10. **ID Poisoning / Resource Exhaustion**: Writing to `/projects/` with a 1,500-character ID or a 500,000-character `name`.
11. **Timestamp Forgery**: Creating `/groups/g1` with backdated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
12. **Blanket List Query Bypass**: Attempting to list `/users` across all users or `/groups` with `visibility: "private"` when UID is not in `memberUids`.
