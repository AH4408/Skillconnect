# SkillConnect real-time updates

## Module update strategy

| Module | Initial data | Live updates |
| --- | --- | --- |
| Client – Find My Jobs | REST API | Socket.IO user room |
| Worker – Find Available Jobs | REST API | Socket.IO category/city rooms |
| Worker – Bookings | REST API | Socket.IO user room |
| Worker – Profile | Existing REST API | Existing behavior |
| Client – Profile | Existing REST API | Existing behavior |
| Admin | Existing REST APIs | Socket.IO admin room; refreshes dashboard data after relevant mutations |

MongoDB remains the source of truth. Socket.IO events carry identifiers/status hints; the frontend re-fetches authoritative data through the existing REST APIs. This avoids trusting stale event payloads and keeps existing normalization/business logic in place.

## Rooms and security

- `user:<userId>`: authenticated user's private updates.
- `admin`: authenticated users whose role is `admin` only.
- `city:<city-slug>`: workers in that city, matching the current city-wide available-jobs REST feed.
- `category:<category-slug>` and `category:<category-slug>:city:<city-slug>`: worker skill/category subscriptions.

The server verifies the access JWT, reloads the user role from MongoDB, and loads worker skills/city from the worker profile. The browser cannot choose privileged room membership. Reconnection re-runs authentication and room assignment.

## Install and run

From `frontend/`, run `npm install` (this installs the new `socket.io-client` dependency and refreshes `package-lock.json`), then `npm run dev`.

From `backend/`, run `npm install` if dependencies are not installed, then `npm start`.

Set `VITE_API_BASE_URL=http://localhost:5004/api`, `VITE_SOCKET_URL=http://localhost:5004`, and `VITE_USE_BACKEND=true` in the frontend environment. The backend's `FRONTEND_URL` must include the frontend origin.

## Reliability

- REST loads existing data when a module opens.
- The frontend also re-fetches after each Socket.IO connection/reconnection, closing the initial fetch/subscription race and recovering events missed while offline.
- Socket events trigger REST refreshes; job and booking IDs are not blindly appended to local state, preventing duplicate cards.
- No five-second polling remains in the Client Find My Jobs or Worker Find Available Jobs flows.


## Worker job category isolation fix

The available-jobs REST endpoint now filters by the authenticated worker profile's
saved `skills` and city. Category matching is case-insensitive but exact: a worker
with `Painting` does not receive `Electrical` jobs. An empty/missing skills list
returns no available jobs rather than falling back to every job in the city.

The `jobs:new` Socket.IO event is also restricted to the combined
`category:<skill>:city:<city>` room. City-wide and broad category room delivery
has been removed so real-time events follow the same skill-and-city rules as
the REST feed. Only the worker profile's `skills` are used for job eligibility;
free-text `services` do not expand the categories.
