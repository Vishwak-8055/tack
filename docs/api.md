# API reference

All endpoints are under `/api`, speak JSON, and (except `auth/register`, `auth/login` and `health`)
need the `tack_session` cookie that sign-in sets. Writes need `Content-Type: application/json`.

## Conventions

**Errors** always look like this, with a matching HTTP status:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields need attention",
    "fields": { "email": "Enter a valid email address" }
  }
}
```

`fields` is only present for validation problems. Common codes: `validation_error` (400),
`unauthorized` (401), `forbidden` (403), `not_found` (404), `already_member` / `email_taken` (409),
`rate_limited` (429).

**Ids** are UUIDs. A malformed id is a 404.

**Visibility.** A board you aren't on is a 404, not a 403.

**Ordering.** Anything with a `position` is sorted by it as plain bytes. To move a list or a card,
say which card it goes _after_ (`afterId`, or `null` for the top). See
[architecture.md](architecture.md#ordering).

**Client id.** Send `X-Client-Id: <any id up to 64 chars>` and the realtime events caused by that
request will carry it back, so a tab can ignore its own changes.

**Roles.** `owner` can do everything, `editor` can change content, `viewer` can only read.

## Auth

| Method and path       | Body                               | Returns                                     |
| --------------------- | ---------------------------------- | ------------------------------------------- |
| `POST /auth/register` | `{ name, email, password }`        | `201` the user, and sets the session cookie |
| `POST /auth/login`    | `{ email, password }`              | The user, and sets the session cookie       |
| `POST /auth/logout`   |                                    | `204`                                       |
| `GET /auth/me`        |                                    | The current user, or `401`                  |
| `PATCH /auth/me`      | `{ name }`                         | The updated user                            |
| `POST /auth/password` | `{ currentPassword, newPassword }` | `204`; other sessions are signed out        |

## Boards

| Method and path                         | Role   | Body                                | Returns                                      |
| --------------------------------------- | ------ | ----------------------------------- | -------------------------------------------- |
| `GET /boards`                           | any    |                                     | `BoardSummary[]`, newest activity first      |
| `POST /boards`                          | any    | `{ title, background?, template? }` | `201` `BoardSummary`                         |
| `GET /boards/:id`                       | viewer |                                     | `BoardDetail`: members, labels, lists, cards |
| `PATCH /boards/:id`                     | editor | `{ title?, background? }`           | `BoardSummary`                               |
| `DELETE /boards/:id`                    | owner  |                                     | `204`                                        |
| `PUT /boards/:id/star`                  | viewer | `{ starred }`                       | `204`; the star is per person                |
| `GET /boards/:id/activity?cursor&limit` | viewer |                                     | `{ items, nextCursor }`, newest first        |
| `GET /boards/:id/events`                | viewer |                                     | `text/event-stream`, see below               |

`template` is `kanban` (starts with To do, Doing and Done, the default) or `blank`.
`background` is one of `moss`, `navy`, `plum`, `brick`, `slate`, `ochre`.

### Members

| Method and path                      | Role               | Body               | Returns                                                           |
| ------------------------------------ | ------------------ | ------------------ | ----------------------------------------------------------------- |
| `POST /boards/:id/members`           | owner              | `{ email, role? }` | `201` the member. `404 user_not_found` if there's no such account |
| `PATCH /boards/:id/members/:userId`  | owner              | `{ role }`         | `204`. `role` is `editor` or `viewer`                             |
| `DELETE /boards/:id/members/:userId` | owner, or yourself |                    | `204`. The owner can't leave                                      |

### Labels

| Method and path                      | Role   | Body                | Returns         |
| ------------------------------------ | ------ | ------------------- | --------------- |
| `POST /boards/:id/labels`            | editor | `{ name?, color }`  | `201` the label |
| `PATCH /boards/:id/labels/:labelId`  | editor | `{ name?, color? }` | The label       |
| `DELETE /boards/:id/labels/:labelId` | editor |                     | `204`           |

Colours: `green`, `yellow`, `orange`, `red`, `purple`, `blue`, `teal`, `pink`, `gray`.

## Lists

| Method and path          | Role   | Body          | Returns                  |
| ------------------------ | ------ | ------------- | ------------------------ |
| `POST /boards/:id/lists` | editor | `{ title }`   | `201` the list           |
| `PATCH /lists/:id`       | editor | `{ title }`   | The list                 |
| `POST /lists/:id/move`   | editor | `{ afterId }` | The list                 |
| `DELETE /lists/:id`      | editor |               | `204`; deletes its cards |
| `POST /lists/:id/cards`  | editor | `{ title }`   | `201` a `CardDetail`     |

## Cards

Every endpoint that changes a card returns the whole updated `CardDetail`, so a client can replace
what it holds without refetching.

| Method and path                         | Role            | Body                                                      |
| --------------------------------------- | --------------- | --------------------------------------------------------- |
| `GET /cards/:id`                        | viewer          |                                                           |
| `PATCH /cards/:id`                      | editor          | `{ title?, description?, dueAt?, completed? }`            |
| `DELETE /cards/:id`                     | editor          | `204`                                                     |
| `POST /cards/:id/move`                  | editor          | `{ listId, afterId }`. Returns `{ id, listId, position }` |
| `PUT /cards/:id/labels/:labelId`        | editor          |                                                           |
| `DELETE /cards/:id/labels/:labelId`     | editor          |                                                           |
| `PUT /cards/:id/assignees/:userId`      | editor          | The user must be on the board                             |
| `DELETE /cards/:id/assignees/:userId`   | editor          |                                                           |
| `POST /cards/:id/checklist`             | editor          | `{ text }`. `201`                                         |
| `PATCH /cards/:id/checklist/:itemId`    | editor          | `{ text?, done? }`                                        |
| `DELETE /cards/:id/checklist/:itemId`   | editor          |                                                           |
| `POST /cards/:id/comments`              | editor          | `{ body }`. `201`                                         |
| `PATCH /cards/:id/comments/:commentId`  | author          | `{ body }`                                                |
| `DELETE /cards/:id/comments/:commentId` | author or owner |                                                           |

`dueAt` is an ISO 8601 UTC string (`2026-10-31T17:00:00.000Z`) or `null` to clear it. `completed`
sets or clears `completedAt` and is logged in the activity feed.

## Realtime

`GET /boards/:id/events` is a Server-Sent Events stream. Each message is an event named `board`
whose data is JSON:

```json
{ "type": "board.changed", "boardId": "…", "actorId": "…", "clientId": "…", "cardId": "…" }
```

`type` is `board.changed`, `board.deleted` or `member.removed` (which also carries `userId`).
`clientId` is whatever the triggering request sent as `X-Client-Id`, and `cardId` is present when the
change was to one card. The payload says _that_ something changed, not what: refetch the board (and
the card, if it's open). A `: ping` comment arrives every 25 seconds to keep the connection alive.

## Health

`GET /health` returns `{ "status": "ok", "uptime": 123 }`, or `503` if the database can't be
reached. It needs no cookie and isn't rate limited.
