# Lumiere Codebase Learning Notes

This document is a deep walkthrough of the Lumiere project. It is written for someone who does not know where to start, so it explains the code from the outside in: what happens when the app opens, how login works, how the dashboard loads, how the 2D editor stores geometry, how the 3D editor renders and edits the scene, how switching between 2D and 3D works, how saving works, and what algorithms appear throughout the project.

The shorter `VIVA_NOTES.md` is good for presentation answers. This file is for learning and explaining the actual concepts behind the implementation.

## 1. Big Picture

Lumiere is a full-stack interior design app.

The frontend is in:

- `lumiere-frontend/`

The backend is in:

- `lumiere-backend/`

At a high level:

1. The user opens the React app.
2. React Router decides which page to show.
3. If the route needs login, the app checks whether a JWT token exists in local storage.
4. The user can register or log in.
5. After login, the dashboard loads the user's projects from the backend.
6. The user can create or open a project.
7. The project can be edited in 2D or 3D.
8. The 2D editor uses `react-konva` to draw on a canvas.
9. The 3D editor uses `@react-three/fiber`, `three`, and `@react-three/drei`.
10. Scene data is saved as JSON to MongoDB.
11. Large preview files or exported assets are stored as files and referenced by URL.

The strongest technical concept in the project is that a project is not saved as just an image. It is saved as structured scene data: rooms, walls, openings, furniture, materials, lights, measurements, and budget data. That is why the app can reopen a project and edit it again.

## 2. Main Runtime Flow

The main frontend entry is:

- `lumiere-frontend/src/main.jsx`
- `lumiere-frontend/src/App.jsx`

`main.jsx` mounts the React app. `App.jsx` defines the routes and global providers.

Important routes in `App.jsx`:

- `/`: landing page
- `/login`: login page
- `/register`: registration page
- `/reset-password`: password reset page
- `/user/dashboard`: authenticated dashboard
- `/user/room`: authenticated 3D editor
- `/user/room-2d`: authenticated 2D editor
- `/view/:projectId`: public project viewer
- `/admin/model-previews`: admin model preview studio

`RequireAuth` is a route guard. It checks `getAccessToken()`. If there is no token, it redirects to `/login`.

`RedirectAuthenticated` does the opposite. If the user is already logged in and opens `/login` or `/register`, it redirects to `/user/dashboard`.

`RouteShell` wraps all routes and handles:

- fullscreen behavior for editor pages
- page transition animation using GSAP and Barba hooks
- logout
- routing namespaces
- global background and color setup

The editor routes are special:

- `LiveRoomCanvasRoute` loads the latest live editor snapshot and converts it to a 2D plan if needed.
- `LiveRoomSceneRoute` loads the latest live editor snapshot and converts it to a 3D scene if needed.

This is how switching between 2D and 3D can preserve current work without immediately saving it to the backend.

## 3. Authentication Flow

Authentication uses JWT bearer tokens.

Frontend files:

- `lumiere-frontend/src/components/login/login.jsx`
- `lumiere-frontend/src/components/login/Register.jsx`
- `lumiere-frontend/src/components/login/ResetPassword.jsx`
- `lumiere-frontend/src/api/auth.js`
- `lumiere-frontend/src/api/axiosClient.js`
- `lumiere-frontend/src/utils/authStorage.js`

Backend files:

- `lumiere-backend/app/routes/auth_routes.py`
- `lumiere-backend/app/services/auth_service.py`
- `lumiere-backend/app/core/security.py`
- `lumiere-backend/app/schemas/auth_schema.py`

### Login UI Logic

`AuthExperience` in `login.jsx` handles both login and signup UI. It keeps a `mode` state:

- `login`
- `signup`

When the user submits login:

1. Ant Design validates the form.
2. `onLoginFinish` calls `authApi.login`.
3. The backend receives email and password.
4. If login succeeds, the response includes an access token and user object.
5. `storeAuthSession(response.data)` stores them in local storage.
6. The user is navigated to a safe redirect or `/user/dashboard`.

The safe redirect check matters:

```js
const safeRedirect = redirect?.startsWith("/") && !redirect.startsWith("//")
  ? redirect
  : "/user/dashboard";
```

This avoids redirecting users to an external malicious URL.

### Signup Logic

When the user signs up:

1. The form validates full name, email, password, confirm password, and terms checkbox.
2. `authApi.signup` sends name, email, and password.
3. Backend checks whether the email already exists.
4. Backend hashes the password.
5. Backend inserts the user into MongoDB.
6. Frontend switches back to login mode.

Signup does not automatically log in. The user is asked to log in after account creation.

### Token Storage

`authStorage.js` stores:

- token under `token`
- user under `lumiereUser`

Functions:

- `getAccessToken()`
- `getStoredUser()`
- `storeAuthSession(payload)`
- `clearAuthSession()`

This is simple and works for the project. The limitation is that local storage tokens are exposed if an XSS bug exists. A production-grade system often uses secure httpOnly cookies instead.

### Axios Authentication

`axiosClient.js` creates one Axios instance. Before each request, it reads the token and attaches:

```txt
Authorization: Bearer <token>
```

If a response returns `401`, and the user is not already on an auth page, it clears the stored session and sends the user back to `/login`.

This means expired or invalid tokens are handled globally.

### Backend Auth Routes

`auth_routes.py` exposes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password-confirm`

`register` checks duplicate email, then calls `create_user`.

`login` calls `authenticate_user`, then `build_auth_response`.

`me` uses `Depends(get_current_user)` to require a valid token.

### Password Hashing

`security.py` uses bcrypt, but it first normalizes the password:

1. Convert password string to UTF-8 bytes.
2. SHA-256 hash it.
3. Base64-encode the hash.
4. Give that normalized value to bcrypt.

Why normalize first?

Bcrypt has password length behavior that can be awkward for long inputs. Hashing first gives bcrypt a fixed-size byte string.

`hash_password(password)` returns the bcrypt hash.

`verify_password(password, hashed_password)` re-normalizes the input password and checks it against the stored hash.

### JWT Creation

`create_access_token` stores:

- `sub`: user id
- `email`
- `name`
- `exp`: expiry timestamp

The backend signs the token with `JWT_SECRET_KEY`.

`decode_access_token` verifies the token. If invalid or expired, it raises a `401`.

`get_current_user`:

1. Reads the bearer token.
2. Decodes it.
3. Extracts `sub`.
4. Verifies that the id is a valid MongoDB ObjectId.
5. Fetches the user from MongoDB.
6. Returns the user document.

This dependency protects project routes.

### Password Reset

Password reset flow:

1. User enters email.
2. Backend always returns a generic message so attackers cannot check which emails exist.
3. If the user exists, backend generates a secure token with `secrets.token_urlsafe`.
4. Token and expiry are stored on the user document.
5. Backend emails a reset link.
6. User submits a new password with the token.
7. Backend checks token and expiry.
8. Backend writes a new password hash and removes reset fields.

The algorithm here is a temporary token lookup with expiry validation.

## 4. Dashboard Flow

Frontend files:

- `lumiere-frontend/src/components/userDashboard/Dashboard/Dashboard.jsx`
- `lumiere-frontend/src/hooks/useDashboard.js`
- `lumiere-frontend/src/utils/api.js`
- dashboard panels under `components/userDashboard/`

Backend files:

- `lumiere-backend/app/routes/project_routes.py`
- `lumiere-backend/app/services/project_service.py`

### Dashboard Data Hook

`useDashboard` is the central dashboard hook. It stores:

- `projects`
- `lastProject`
- `stats`
- `activities`
- `storage`
- `loading`
- `error`

`fetchAll` does the main work:

1. Calls `projectsAPI.getAll()`.
2. Saves normalized projects into state.
3. Calculates stats.
4. Chooses the first project as last modified.
5. Builds recent activity entries from recent projects.
6. Starts a second request for storage usage.

Project actions:

- `createProject`
- `deleteProject`
- `duplicateProject`
- `renameProject`
- `searchProjects`
- `refetch`

After most actions, it calls `fetchAll` again so the dashboard stays consistent.

### Dashboard API Wrapper

`utils/api.js` uses `fetch` instead of Axios. It builds API URLs using `apiUrl`.

`request(method, path, body)`:

1. Adds JSON headers.
2. Adds bearer token if present.
3. Sends request.
4. Parses error JSON if status is not OK.
5. Returns parsed JSON.

`normalizeProject(project)` makes backend records easier for the UI:

- `id`
- `_id`
- `name`
- `thumbnail`
- `last_modified`
- `rooms_count`

This is important because backend data may use `title`, `thumbnail_url`, `updated_at`, or `last_opened_at`, while the dashboard UI wants consistent names.

### Backend Project Listing

`list_projects` in `project_service.py` queries MongoDB by `user_id`.

It excludes heavy scene fields such as walls, furniture, materials, and lighting when listing. This is a performance optimization: the dashboard needs summary cards, not full editor data.

It sorts projects by:

1. `last_opened_at`
2. `updated_at`

Then it adds `rooms_count`.

## 5. 2D Editor

Main files:

- `lumiere-frontend/src/components/2d/RoomCanvas.jsx`
- `lumiere-frontend/src/components/2d/RoomCanvas.css`
- `lumiere-frontend/src/utils/useFloorPlan.js`

The 2D editor is built with `react-konva`, which is a React wrapper around Konva canvas drawing.

The editor works in modes:

- `draw`
- `select`
- `door`
- `window`
- `furniture`

The state engine is mostly inside `useFloorPlan.js`. `RoomCanvas.jsx` renders that state and wires it to UI buttons, keyboard shortcuts, save modal, export, import, and switching.

### 2D Data Model

A 2D room has:

- `id`
- `name`
- `points`
- `walls`
- `area`
- `floor`

A point is:

```js
{ x, y }
```

A wall is:

```js
{
  id,
  roomId,
  start: { x, y },
  end: { x, y },
  length,
  angleDeg,
  nx,
  ny,
  thickness,
  openings
}
```

A 2D furniture item has:

```js
{
  id,
  type,
  roomId,
  x,
  y,
  w,
  h,
  rotation,
  color,
  label,
  shape,
  locked,
  source3D
}
```

An opening has:

```js
{
  id,
  type: "door" | "window",
  t,
  width,
  swingDir
}
```

The `t` value is a normalized wall position. `0` means the start of the wall, `1` means the end of the wall, and `0.5` means the center.

### Pixels to Meters

The 2D editor uses:

```js
PX_PER_M = 40
```

So 40 pixels represents 1 meter.

This constant appears in many calculations:

- area conversion
- wall length display
- furniture conversion
- 2D to 3D conversion

### Drawing a Room

The draw algorithm:

1. User clicks on the canvas.
2. Mouse coordinates are snapped to grid if snap is enabled.
3. The snapped point is added to `draftPts`.
4. When the pointer is near the first point and there are at least 3 points, the editor can close the polygon.
5. Closing creates a room.
6. `buildWalls(points, roomId)` creates wall segments from consecutive points.
7. `calcArea(points)` calculates polygon area.
8. The new room is added to `rooms`.

Closing can happen by:

- clicking near the first point
- double-clicking

The `isNearFirst` function uses Euclidean distance:

```txt
distance = sqrt((x2 - x1)^2 + (y2 - y1)^2)
```

If distance is less than `CLOSE_DISTANCE`, the polygon can close.

### Snap to Grid

The snapping algorithm:

```js
snapToGrid(v, g) {
  return Math.round(v / g) * g;
}
```

Example:

- grid = 20 px
- click x = 53
- 53 / 20 = 2.65
- round to 3
- 3 * 20 = 60

So x becomes 60.

This makes the floor plan cleaner and helps wall measurements stay readable.

### Shoelace Area Formula

`calcArea(pts)` uses the shoelace formula.

For points around a polygon:

```txt
area = abs(sum(x_i * y_next - x_next * y_i) / 2)
```

The formula works for any simple polygon, not just rectangles.

This is used to display room area and save measurements.

### Building Walls from Points

`buildWalls(points, roomId, existingWalls)` loops through all points. For each point `a`, it connects to the next point `b`. The last point connects back to the first.

For each wall it calculates:

- `dx`
- `dy`
- `length`
- `angleDeg`
- normal vector `nx`, `ny`

The normal vector is perpendicular to the wall:

```txt
nx = -dy / length
ny = dx / length
```

Normals are useful for drawing wall thickness and offset visuals.

### Hit Testing a Wall

`hitTestWall(wall, cx, cy, pad)` checks whether a click is close enough to a wall.

The algorithm:

1. Treat the wall as a line segment.
2. Project the click point onto the wall direction.
3. Calculate `along`, a normalized value from 0 to 1.
4. Calculate perpendicular distance from click to wall.
5. Reject if `along` is outside 0..1.
6. Reject if perpendicular distance is greater than wall thickness plus padding.
7. Return `along` if the click hits.

This is used when placing doors and windows.

### Point in Polygon

`pointInPolygon(px, py, pts)` uses ray casting.

The idea:

1. Shoot a horizontal ray from the point.
2. Count how many polygon edges the ray crosses.
3. Odd number means inside.
4. Even number means outside.

This is used to decide which room owns a placed furniture symbol.

### Door and Window Placement in 2D

When the editor is in `door` or `window` mode:

1. User clicks a wall.
2. `hitTestWall` returns where on the wall the click happened.
3. The opening width is converted into a half-width ratio.
4. The `t` value is clamped so the opening does not stick out past wall edges.
5. The opening object is added to `wall.openings`.

The key idea is clamping:

```txt
t = max(half, min(1 - half, clickPosition))
```

This keeps the opening fully inside the wall span.

### Furniture in 2D

Furniture can come from:

- built-in symbolic 2D catalogue
- backend 3D model manifest
- converted 3D furniture from a live scene

`FURNITURE_CATALOGUE` defines symbolic sizes and shapes such as sofa, bed, table, wardrobe, bathtub, toilet, and sink.

When placing furniture:

1. User selects furniture.
2. User clicks the canvas.
3. The point is snapped.
4. The editor finds the room containing that point using point-in-polygon.
5. A furniture object is added with size, label, color, and optional `source3D`.

Dragging furniture updates x and y. Rotating furniture increases rotation by 90 degrees:

```txt
rotation = (rotation + 90) % 360
```

### 2D Undo and Redo

The 2D editor uses two refs:

- `historyRef`
- `futureRef`

Before major changes, it pushes a snapshot of `{ rooms, furniture }`.

Undo:

1. Pop previous snapshot from history.
2. Push current snapshot into future.
3. Restore previous rooms and furniture.

Redo:

1. Shift next snapshot from future.
2. Push current snapshot to history.
3. Restore next rooms and furniture.

It limits history to `MAX_HISTORY = 50`.

### 2D Floor Textures

`RoomCanvas.jsx` has `makeTexture(pattern, color, scale)`.

It creates a hidden browser canvas and draws procedural patterns:

- solid
- tile
- parquet
- marble
- herringbone
- dots

Konva then uses that canvas as a fill pattern for the room polygon.

This is a procedural texture algorithm: the texture is generated in code instead of loaded from an image file.

## 6. 3D Editor

Main file:

- `lumiere-frontend/src/components/threeD/scene/RoomScene.jsx`

Supporting files:

- `components/threeD/walls/InteractiveWall.jsx`
- `components/threeD/furniture/FurnitureItem.jsx`
- `components/threeD/furniture/FurniturePicker.jsx`
- `components/threeD/furniture/FurnitureGizmo.jsx`
- `components/threeD/lighting/SceneLighting.jsx`
- `components/threeD/lighting/LightingPanel.jsx`
- `components/threeD/materials/MaterialPanel.jsx`
- `components/threeD/materials/SurfaceMaterial.jsx`
- `components/threeD/camera/FirstPersonControls.jsx`
- `components/threeD/camera/CameraControls.jsx`
- `components/threeD/rooms/useRoomCreation.js`
- `utils/sceneEntities.js`
- `utils/roomLayout.js`
- `hooks/useHistory.js`
- `hooks/useMaterials.js`
- `hooks/useLighting.js`
- `hooks/useSpatialAnalysis.js`
- `hooks/useProjectSave.js`

The 3D editor is built with React Three Fiber. React components create Three.js objects.

### 3D Scene Data Model

A 3D room has:

```js
{
  id,
  name,
  type,
  x,
  z,
  width,
  depth,
  height,
  footprint,
  isCustomShape
}
```

The `x` and `z` axes are the floor plane. The `y` axis is vertical height.

A wall has:

```js
{
  id,
  roomId,
  start: [x, z],
  end: [x, z],
  height,
  thickness,
  color,
  roughness,
  metalness,
  textureId,
  doors,
  windows
}
```

Furniture has:

```js
{
  id,
  filename,
  name,
  url,
  category,
  position: [x, y, z],
  rotation: [xRot, yRot, zRot],
  scale: [xScale, yScale, zScale],
  tint
}
```

Lighting has:

```js
{
  timeOfDay,
  activeMood,
  globalBrightness,
  placedLights
}
```

### Entity Factories

`sceneEntities.js` contains factory functions:

- `createRoomEntity`
- `createWallEntity`
- `createDoorEntity`
- `createWindowEntity`

These functions create consistent objects with default values and IDs.

This is useful because the editor creates entities in many places. A factory prevents missing fields.

### Wall Metrics

`getWallMetrics(wall)` calculates:

- length
- angle
- center
- direction vector
- normal vector

For a wall from `[sx, sz]` to `[ex, ez]`:

```txt
dx = ex - sx
dz = ez - sz
length = sqrt(dx^2 + dz^2)
angle = atan2(dz, dx)
center = [(sx + ex) / 2, (sz + ez) / 2]
direction = [dx / length, dz / length]
normal = [-directionZ, directionX]
```

This appears in wall rendering, dragging, door/window placement, and measurement.

### 3D Wall Rendering

`InteractiveWall.jsx` renders a wall as an extruded shape.

The wall geometry algorithm:

1. Create a 2D rectangle in local wall space.
2. Width of rectangle is wall length.
3. Height of rectangle is wall height.
4. For every door and window, create a rectangular hole.
5. Add holes to the wall shape.
6. Extrude the shape by wall thickness.
7. Rotate and position the resulting mesh in 3D.

This is a constructive geometry style: start with a wall rectangle, subtract holes for openings, then extrude.

Important Three.js classes:

- `THREE.Shape`
- `THREE.Path`
- `THREE.ExtrudeGeometry`
- `THREE.Plane`
- `THREE.Raycaster`

### Door and Window Rendering

After the wall mesh is carved, the code separately renders visible opening models:

- `BasicDoor`
- `BasicWindow`

The hole removes wall material. The door/window component adds the visual object.

The opening position is stored as `offsetAlongWall` in meters. To render it locally:

```txt
localX = offsetAlongWall - wallLength / 2
```

### Door and Window Dragging in 3D

The editor supports dragging openings along a wall and resizing them.

The algorithm:

1. Convert mouse coordinates into a ray from the camera.
2. Intersect the ray with the wall plane.
3. Project that 3D point onto the wall direction.
4. Convert the result to `offsetAlongWall`.
5. Clamp the value so the opening stays inside the wall.
6. If resizing, update width and center offset.

This is ray-plane intersection plus vector projection.

### Wall Dragging in 3D

Wall dragging has three modes:

- drag whole wall body
- drag start endpoint
- drag end endpoint

For whole-wall dragging:

1. Store original wall start/end and pointer origin.
2. On pointer move, find new ground or wall-plane position.
3. Calculate delta.
4. Add delta to both start and end.

For endpoint dragging:

1. Keep the opposite endpoint fixed.
2. Project dragged position onto the wall's original direction.
3. Enforce minimum length.
4. Snap length to 0.5m increments if close enough.
5. Update start or end.

### First-Person Wall Fade

`InteractiveWall` fades walls when the camera is close in first-person mode.

The algorithm:

1. Find the closest point on the wall segment to the camera.
2. Measure camera distance to that closest point.
3. Convert distance into opacity between `FADE_END` and `FADE_START`.
4. Smoothly lerp material opacity.

This prevents the wall from blocking the user's view when walking close to it.

### Room Floor and Ceiling Shapes

`RoomScene.jsx` has logic for polygon surfaces:

- `createHorizontalShape(points, flip)`
- `PolygonSurface`
- `getRenderableRoomFootprint`
- `buildFootprintFromWalls`

If a room has a custom footprint, the floor and ceiling are polygon shapes instead of simple rectangles.

Algorithm:

1. Get ordered footprint points.
2. Create a `THREE.Shape`.
3. Move to the first point.
4. Draw lines to all other points.
5. Close the shape.
6. Use `shapeGeometry`.
7. Rotate it flat onto the XZ plane.

This allows irregular rooms from the 2D planner to render in 3D.

### Reconstructing a Footprint from Walls

Several files contain a version of `buildFootprintFromWalls`.

The idea:

1. Treat each wall as an edge between two points.
2. Build a map from each point to connected neighbor points.
3. Pick a starting point.
4. Walk from point to point without immediately going back to the previous point.
5. Stop when you return to the start.
6. If at least 3 points were found, that is the polygon footprint.

This is graph traversal over wall endpoints.

### Room Layout Generation

`roomLayout.js` generates walls for rectangular rooms and handles shared walls between adjacent rooms.

Important functions:

- `getRoomBounds`
- `getRoomEdges`
- `addRoomAdjacent`
- `checkRoomOverlap`
- `hasRoomOverlap`
- `generateLayoutWalls`

`generateLayoutWalls` is important because if two rooms touch, the app should not render duplicate overlapping walls everywhere.

The algorithm:

1. Convert each room into four edges.
2. Compare edges from different rooms.
3. Find edges on the same line with opposite sides.
4. Calculate interval overlaps.
5. Subtract shared intervals from exposed wall segments.
6. Render exterior segments.
7. Render only one owned shared segment where needed.

Supporting interval algorithm:

- `intervalOverlap(aStart, aEnd, bStart, bEnd)` finds overlap between two 1D spans.
- `subtractIntervals(base, intervals)` cuts shared spans out of an exterior wall span.

This is computational geometry in one dimension.

### Adding an Adjacent Room

`useRoomCreation.js` lets the user add a room attached to an existing boundary.

The key algorithm is `buildAdjacentRoomFromBoundary`.

Steps:

1. Get the source room footprint.
2. Find the best attachment edge in the requested direction.
3. Choose a shared segment along that edge.
4. Extend outward by the requested depth.
5. Build a new polygon footprint.
6. If the new footprint overlaps the source room, flip the normal direction.
7. Check against other rooms using polygon overlap.
8. Create the new room.
9. Create walls for all new edges except the shared boundary.

### Polygon Overlap

`polygonsOverlap(a, b)` uses the Separating Axis Theorem.

The idea:

1. For each polygon edge, calculate a perpendicular axis.
2. Project both polygons onto that axis.
3. If there is any axis where projections do not overlap, the polygons do not overlap.
4. If projections overlap on every axis, the polygons overlap.

This is a common collision detection algorithm for convex polygons.

### Furniture Loading

`FurnitureItem.jsx` loads GLB models.

Main concepts:

- `useGLTF` loads model files.
- Draco decoder path is configured for compressed GLB files.
- `SkeletonUtils.clone(scene)` clones the model so multiple instances do not share mutable scene objects.
- A bounding box is calculated to normalize scale and center the object.
- Materials can be tinted.

### Runtime CDN URL Learning

`FurnitureItem.jsx` has smart model URL resolution:

- If the saved item has a full URL, use it.
- If only filename exists, try to match it with the live model manifest.
- If a CDN base can be inferred from model URLs, store it.
- If nothing else works, use backend proxy `/api/proxy/models/...`.

This helps old saved projects keep working even if they only stored filenames.

### Model Normalization

`computeNormAndCentroid(scene, category)`:

1. Creates a `THREE.Box3` bounding box around the model.
2. Gets model size and center.
3. Chooses a target dimension based on category.
4. Calculates scale factor:

```txt
normScale = targetSize / currentSize
```

5. Clamps scale between 0.01 and 100.
6. Returns scale and centroid.

The model is then centered by subtracting centroid and scaled uniformly.

This solves the common 3D asset problem where different GLB models arrive at different sizes and origins.

### Furniture Selection and Gizmo

`FurnitureItem` handles selection and context menu. `FurnitureGizmo` handles transformations.

The important concept is that furniture state is just:

- position
- rotation
- scale
- tint

The visual mesh follows that state.

### Materials

`useMaterials.js` manages:

- floor material
- ceiling material
- wall materials
- active theme

A material includes:

- color
- roughness
- metalness
- textureId

`applyTexture(surface, texture, wallId)` changes a surface:

- if floor, update floor material
- if ceiling, update ceiling material
- if wall, update one wall or all walls

`applyTheme(themeId)` applies coordinated wall, floor, and ceiling materials.

This is a state-management layer over Three.js materials.

### Lighting

`useLighting.js` manages:

- time of day
- mood preset
- placed lights
- selected light
- global brightness
- preview mode

Time of day uses interpolation.

`getTimeOfDayLighting(timeValue)`:

1. Finds two presets surrounding the current time.
2. Computes `t` between 0 and 1.
3. Linearly interpolates intensities.
4. Interpolates colors with `lerpColor`.

This is the same basic idea as animation keyframes.

Moods:

- set ambient override
- tint placed lights
- boost intensities slightly

Placed light creation uses defaults from `LIGHT_TYPES`.

### Spatial Analysis

`useSpatialAnalysis.js` scores furniture layout.

It checks:

- object collisions
- wall clipping
- clearance between objects
- object alignment
- sparse rooms

Collision detection:

1. Build a bounding box for each furniture item.
2. Slightly shrink boxes with `expandByScalar(-0.05)` to avoid tiny false positives.
3. Check every pair with `intersectsBox`.
4. Mark colliding items.
5. Deduct score and add suggestions.

Clearance:

1. If boxes do not intersect, calculate gap between boxes.
2. If gap is less than `MIN_CLEARANCE`, add warning.

Wall distance:

1. Convert walls into line segments.
2. For each item center, calculate minimum distance to wall segments.
3. If too small, mark as clipping.

Scoring:

```txt
score = clamp(100 - deductions, 0, 100)
```

This is a rule-based evaluation algorithm.

### 3D Undo and Redo

`useHistory.js` is a generic hook:

- `state`
- `past`
- `future`

`set(newState)`:

1. Push current state into `past`.
2. Set new state.
3. Clear future.

`undo()`:

1. Move last past state into current state.
2. Move current state into future.

`redo()`:

1. Move first future state into current state.
2. Move current state into past.

In the 3D editor it is used mainly for wall state.

## 7. 2D to 3D and 3D to 2D Switching

Main file:

- `lumiere-frontend/src/utils/editorSceneBridge.js`

This file is one of the most important parts of the project.

It handles:

- storing live snapshots in session storage
- choosing the latest snapshot
- converting 3D scene to 2D plan
- converting 2D plan to 3D scene
- matching 2D furniture symbols to 3D models
- matching 3D furniture models back to 2D symbols
- preserving openings
- merging duplicate shared walls

### Live Snapshot Storage

Two session storage keys:

- `lumiere:live-3d-scene`
- `lumiere:live-2d-plan`

Saving a snapshot:

1. Check if `window.sessionStorage` is available.
2. Add `savedAt: Date.now()`.
3. JSON stringify the snapshot.
4. Store it.

Loading:

1. Read the raw JSON.
2. Parse it.
3. If parsing fails, return null.

`getLatestLiveEditorSnapshot()` compares `savedAt` values and returns the newest one.

Why session storage?

It survives route navigation in the same tab but does not permanently save unfinished work as a backend project.

### Route-Level Switching

When going to 2D:

1. `LiveRoomCanvasRoute` asks for latest snapshot.
2. If latest is already 2D, use it.
3. If latest is 3D, call `convert3DSceneTo2DPlan`.
4. Pass result to `RoomCanvas`.

When going to 3D:

1. `LiveRoomSceneRoute` asks for latest snapshot.
2. If latest is already 3D, use it.
3. If latest is 2D, fetch model manifest.
4. Call `convert2DPlanTo3DScene(plan, { manifest })`.
5. Pass result to `RoomScene`.

### 3D to 2D Conversion

`convert3DSceneTo2DPlan(snapshot)` converts meters into pixels.

Steps:

1. Read rooms, walls, and furniture from snapshot.
2. Find all world points.
3. Calculate min X and min Z.
4. Create a shift so the converted plan has padding.
5. For each room:
   - prefer tracing wall footprint
   - otherwise use room footprint
   - otherwise use rectangular room dimensions
   - convert `[x, z]` meters to `{ x, y }` pixels
   - build 2D walls
   - copy openings from 3D wall segments into nearest 2D wall
6. For each furniture item:
   - pick a 2D furniture symbol using text matching
   - convert 3D `[x, z]` position to 2D `{ x, y }`
   - convert Y rotation radians to degrees
   - find owner room with point-in-polygon
7. Return a 2D plan object.

Important coordinate conversion:

```txt
pixelX = worldX * PX_PER_M + shiftX
pixelY = worldZ * PX_PER_M + shiftY
```

### Opening Conversion from 3D to 2D

`convertOpeningTo2D(opening, segment, targetWall, shiftX, shiftY)`:

1. Converts the 3D wall segment start/end into 2D pixels.
2. Calculates opening center along that segment.
3. Projects center onto the target 2D wall.
4. If distance is too large, ignore it.
5. Return a 2D opening with:
   - id
   - type
   - t
   - width in pixels
   - swing direction

This is projection plus nearest-wall matching.

### 2D to 3D Conversion

`convert2DPlanTo3DScene(plan, options)` converts pixels into meters.

Steps:

1. Find 2D plan bounds.
2. Shift the plan so the 3D scene is centered around origin.
3. Convert each room's points into meters.
4. Normalize polygon orientation.
5. Calculate room center, width, depth, height, and footprint.
6. Convert 2D walls into 3D walls.
7. Canonicalize wall direction so duplicate shared walls can merge.
8. Convert openings into 3D door/window entities.
9. Sanitize openings so they fit inside the wall and do not overlap.
10. Convert furniture:
    - if it came from a 3D source, preserve that source
    - otherwise search the model manifest using category/name hints
    - convert position and rotation
11. Add default floor and ceiling materials.
12. Return 3D scene.

Important coordinate conversion:

```txt
worldX = (pixelX + shiftX) / PX_PER_M
worldZ = (pixelY + shiftY) / PX_PER_M
```

### Polygon Orientation

`normalizePolygonOrientation(pointsMeters)` calculates signed area.

If area is negative, it reverses the point order.

Why this matters:

3D shape rendering can depend on winding order. A consistent winding prevents inverted surfaces and weird normals.

### Wall Canonicalization and Merging

If two rooms share the same wall, the 2D plan may contain the same segment twice in opposite directions.

`buildWallSegmentKey(start, end)`:

1. Rounds coordinates to a fixed precision.
2. Sorts endpoints into canonical order.
3. Builds a string key like:

```txt
x1,z1|x2,z2
```

If another wall has the same key, it is treated as the same wall.

When merging:

- doors are merged
- windows are merged
- duplicate opening IDs are skipped
- height and thickness keep the larger value
- openings are sanitized again

This avoids duplicate overlapping walls in 3D.

### Opening Sanitization

`sanitizeWallOpenings`:

1. Combines doors and windows into one list.
2. Applies default width, height, and bottom offset.
3. Clamps width to usable wall length.
4. Clamps center offset away from wall edges.
5. Clamps bottom offset and height within wall height.
6. Sorts openings by start position.
7. Accepts openings only if they do not overlap previous accepted openings.
8. Splits accepted openings back into doors and windows.

This protects the 3D wall geometry from invalid holes.

### Furniture Matching

2D to 3D uses `TWO_D_TO_THREE_D_MODEL_HINTS`.

Example:

- `sofa` matches sofa, couch, sectional
- `bed_d` matches bed, queen, king, double bed
- `desk` matches desk, workstation, office table

The model scoring algorithm:

1. Build a text haystack from model name, filename, category, and URL.
2. Add score if category matches.
3. Add score for each matching keyword.
4. Add score if model name exactly matches item label.
5. Sort by score descending.
6. Choose best match.

3D to 2D does the reverse. It searches the model name/category/filename and picks a symbolic 2D furniture definition.

## 8. Saving, Loading, Exporting, and Sharing

Main frontend file:

- `lumiere-frontend/src/hooks/useProjectSave.js`

Main backend files:

- `lumiere-backend/app/routes/project_routes.py`
- `lumiere-backend/app/services/project_service.py`

### Building Scene Data

`buildSceneData` creates the saved project payload.

It includes:

- version
- saved timestamp
- rooms
- walls
- furniture
- materials
- lighting
- budget

For rooms, walls, openings, furniture, and lights, it also builds measurements.

This is important because the saved project becomes both:

- editable editor state
- measurable design data

### Applying Scene Data

`applySceneData(sceneData, setters)` loads a saved project into the editor.

It:

1. Normalizes rooms.
2. Reconstructs footprints from walls if needed.
3. Sets rooms.
4. Sets walls.
5. Sets placed furniture.
6. Sets floor and ceiling materials.
7. Applies lighting state.

It supports older scene shapes too:

- `sceneData.furniture`
- `sceneData.placedItems`
- `sceneData.materials.floor`
- `sceneData.floorMaterial`

That is backward compatibility.

### Saving a Project

`saveProject(name, withThumbnail, options)`:

1. Sets status to `saving`.
2. Calls `getSceneData()`.
3. Captures thumbnail from the canvas.
4. If there is a current project id and not creating new:
   - sends `PUT /api/projects/{id}`
5. Otherwise:
   - sends `POST /api/projects/save`
6. Backend returns saved project.
7. Frontend hydrates budget from returned scene.
8. Stores current project id, name, share URL, and model assets.
9. Sets status to `saved`.

Thumbnail capture waits two animation frames before reading the canvas. This gives React/Three time to render the latest visual state.

### Loading a Project

`loadProject(projectId)`:

1. If user has token, use owned-project endpoint.
2. Otherwise use public endpoint.
3. Load scene data.
4. Hydrate budget.
5. Apply scene data to editor state.
6. Update project name, id, share URL, and assets.

Owned load endpoint:

- `/api/projects/me/open/{project_id}`

Public load endpoint:

- `/api/projects/{project_id}`

### Latest Project Load

`loadLatestProject`:

1. Only runs if user is logged in and no current project id exists.
2. Calls `/api/projects/me/latest`.
3. Applies scene if one exists.

There is a mutation version guard so an async latest-project load does not overwrite local changes that happened while the request was in flight.

### Autosave

Autosave is disabled by default. When enabled and a project id exists:

- every 30 seconds, it calls `saveProject`.

The constant is:

```js
AUTOSAVE_MS = 30_000
```

### Export and Import JSON

Export:

1. Build scene data.
2. Convert it to formatted JSON.
3. Create a Blob.
4. Trigger browser download with `.lumiere.json`.

Import:

1. Create hidden file input.
2. Read selected JSON file.
3. Parse it.
4. Apply it as scene data.
5. Clear current project id.

### Share Link

`copyShareLink` and `openSharePage` call `ensureProject`.

If there is no project yet, it saves one first. Then it uses:

```txt
/view/{projectId}
```

The backend serializer also creates a `share_url`.

## 9. Backend Project Service

`project_service.py` contains the main project business logic.

Important constants:

- `MAX_STORAGE_MB = 20`
- `MAX_PROJECTS = 50`
- `MAX_ROOMS = 200`

The current code enforces storage bytes. Project and room max values are returned in storage usage and are ready for UI display.

### Project Serialization

`_serialize_project(doc)` converts MongoDB documents to frontend-friendly JSON.

It:

- converts `_id` to string id through `serialize_document`
- ensures title and name exist
- exposes `scene_data`
- aliases `scene` to `scene_data`
- sets `thumbnail_url`
- creates `share_url`
- ensures `model_assets` exists
- removes old `thumbnail`

This is a compatibility layer between database shape and frontend expectations.

### Creating a Project

`create_project`:

1. Builds title.
2. Builds scene with measurements and budget summary.
3. Creates document with user id, title, thumbnail, scene data, assets, timestamps.
4. Estimates storage size.
5. Checks storage capacity.
6. Inserts into MongoDB.
7. Serializes and returns the project.

### Updating a Project

`update_project`:

1. Fetches owned project by project id and user id.
2. Builds update fields only for provided values.
3. If scene is provided, recalculates measurements and budget.
4. Estimates storage size with new data.
5. Checks storage capacity.
6. Updates MongoDB.
7. Returns serialized project.

### Opening a Project

`open_owned_project`:

1. Updates `last_opened_at` and `updated_at`.
2. Fetches the owned project.
3. Recalculates budget and persists it.
4. Returns serialized project.

### Public Project Loading

`get_project(project_id)` fetches by id without user id. This supports public share pages.

This means anyone with a valid project id can view it. That is the current sharing model.

### Deleting a Project

`delete_project(project_id, user_id)` deletes only if both id and owner match.

This prevents users from deleting each other's projects.

### Storage Estimation

`_estimate_project_bytes(doc, overrides)`:

1. Builds a JSON payload from title, thumbnail, scene, model assets, and preview video.
2. Counts UTF-8 bytes of that JSON.
3. Counts rooms.
4. Adds local file sizes for preview video, GLB, and USDZ if they exist.
5. Allows overrides for an incoming upload.

`_ensure_storage_capacity` gets totals for the user and rejects if the new total exceeds 20 MB.

This is a quota algorithm.

### Project Video Upload

`save_project_video`:

1. Verifies project ownership.
2. Builds a filename using project id and timestamp.
3. Builds public video URL.
4. Checks storage capacity including incoming video bytes.
5. Writes file to `VIDEOS_DIR`.
6. Updates project with preview video URL.

Route validation rejects non-video content types and videos above 100 MB.

### Project Asset Upload

`save_project_asset` supports:

- `glb`
- `usdz`

It:

1. Verifies project ownership.
2. Sanitizes filename.
3. Ensures extension matches kind.
4. Builds stamped stored filename.
5. Checks storage capacity.
6. Writes file to `PROJECT_ASSETS_DIR`.
7. Updates `model_assets` fields in MongoDB.

Route validation rejects empty files, wrong extension, and assets above 250 MB.

## 10. Model Catalog and Prefetching

Backend files:

- `lumiere-backend/app/routes/model_routes.py`
- `lumiere-backend/app/services/model_service.py`
- `lumiere-backend/app/services/sync_b2_to_mongo.py`

Frontend files:

- `lumiere-frontend/src/hooks/useModelPrefetch.js`
- `lumiere-frontend/src/components/threeD/furniture/FurniturePicker.jsx`
- `lumiere-frontend/src/components/threeD/furniture/FurnitureModelCard.jsx`
- `lumiere-frontend/src/components/threeD/furniture/FurnitureItem.jsx`

### Model List

`GET /api/models/list` returns all models with URLs.

`list_models()` caches the list for 60 seconds to reduce MongoDB reads.

It skips records without a URL.

### Model Manifest

`GET /api/models/manifest` returns enriched model data.

`get_manifest()` adds:

- `priority`
- `size_bytes`

Then it sorts:

1. Higher category priority first.
2. Smaller file size first inside the same priority.

Example priorities:

- sofas: 95
- chairs: 90
- tables: 85
- beds: 80
- lamps: 70
- uncategorized: 20

This is a greedy prefetch strategy: load likely useful and smaller models earlier so the UI feels faster.

### Registering Models

`POST /api/models/register` upserts a model by filename.

This lets an upload/sync script update MongoDB metadata when model files are added to storage.

### Model Preview Upload

`POST /api/models/{model_id}/preview`:

1. Finds model.
2. Reads image bytes.
3. Uploads preview bytes through `preview_service`.
4. Stores preview URL in model record.
5. Clears model cache.

## 11. Measurements

Frontend:

- `lumiere-frontend/src/utils/measurements.js`

Backend:

- `lumiere-backend/app/utils/measurements.py`

The measurement utilities calculate:

- wall length
- wall height
- wall area
- room footprint area
- floor area
- ceiling area
- door count
- window count
- room id for a position
- measurements for rooms, walls, items, lights, openings

The frontend adds measurements while building scene data. The backend recalculates measurements before saving or budget calculation. This makes the backend authoritative even if a client sends incomplete measurements.

Important algorithms:

- Euclidean segment length
- polygon area using shoelace formula
- point-in-polygon test
- rectangular fallback bounds

## 12. Budget Logic

Frontend:

- `lumiere-frontend/src/utils/budgetEstimator.js`
- `lumiere-frontend/src/utils/budgetContract.js`
- `lumiere-frontend/src/stores/useBudgetStore.js`

Backend:

- `lumiere-backend/app/utils/budget_estimator.py`
- `lumiere-backend/app/schemas/budget_schema.py`
- budget routes in `project_routes.py`

Budgeting is rule-based.

### Budget Elements

The estimator collects billable elements from the scene:

- floors
- ceilings
- walls
- doors
- windows
- furniture
- decor
- lights

Area-based elements:

- wall
- floor
- ceiling

Quantity-based elements:

- door
- window
- furniture
- decor
- light

### Rule Priority

For area-based items:

1. `singleItem`
2. `roomType`
3. `globalType`

For quantity-based items:

1. `singleItem`
2. `globalType`

This means the most specific rule wins.

Example:

- A global wall painting rule applies to all walls.
- A room-specific floor rule applies only to one room.
- A single-item rule overrides both.

### Cost Calculation

For each budget element:

1. Find applied rule.
2. Decide quantity:
   - area in sqm for area-based items
   - count for quantity-based items
3. Multiply quantity by rule amount.
4. Round to 2 decimals.
5. Add to category totals.
6. Add to room totals.
7. Add line item to breakdown.

Formula:

```txt
calculatedCost = quantity * amount
```

The final total is the sum of category totals.

### Quotation

The budget summary also builds a quotation object:

- project name
- date
- currency
- room breakdown
- line items
- totals
- grand total

This makes it ready for a future quotation/export feature.

## 13. Backend App Startup

Main backend file:

- `lumiere-backend/app/main.py`

On startup:

1. Logs startup.
2. Pings MongoDB.
3. Ensures indexes.
4. Tries to sync B2 model storage to MongoDB.
5. Continues even if sync fails.

On shutdown:

1. Closes shared HTTP client.
2. Logs shutdown.

Registered routers:

- `/api/auth`
- `/api/models`
- `/api/projects`
- `/projects` legacy alias

Static mounts:

- `/api/videos`
- `/api/project-assets`

### CORS

CORS allows configured origins plus localhost/127.0.0.1 development URLs.

This lets the Vite frontend call the FastAPI backend during development.

### Model Proxy

`/api/proxy/models/{file_path}` fetches model bytes from B2 public URL.

It:

1. Builds B2 URL.
2. Uses shared `httpx.AsyncClient`.
3. Handles storage errors.
4. Creates an MD5 ETag from response bytes.
5. Returns `304` if client already has matching ETag.
6. Otherwise returns GLB bytes with long cache headers.

This solves CORS/cache issues for model files.

## 14. Database Design

MongoDB collections include:

- users
- projects
- designs
- models

### Users

Typical fields:

- `_id`
- name
- email
- password_hash
- created_at
- updated_at
- reset_token
- reset_expiry

Sensitive fields are removed before returning user data.

### Projects

Typical fields:

- `_id`
- user_id
- title
- thumbnail_url
- scene_data
- preview_video
- model_assets
- created_at
- updated_at
- last_opened_at

`scene_data` is the main design payload.

### Models

Typical fields:

- `_id`
- name
- filename
- category
- url
- size_bytes
- preview_url

### Indexes

The backend ensures indexes at startup. Important indexes include:

- unique email on users
- project activity/sorting indexes

Indexes make repeated queries faster and enforce unique emails.

## 15. Public Project Viewer

Main frontend file:

- `lumiere-frontend/src/components/viewer/ProjectViewerPage.jsx`

Conceptually:

1. Read `projectId` from route.
2. Fetch public project data.
3. Render a read-only/project-view experience.
4. Use saved scene data and media URLs.

This relies on the public backend route:

- `GET /api/projects/{project_id}`

The public viewer is part of the sharing feature.

## 16. Landing Page

Main files:

- `lumiere-frontend/src/components/Landingpage.jsx`
- `lumiere-frontend/src/components/landing/LandingScene.jsx`
- `lumiere-frontend/src/components/landing/LMLogoScene.jsx`
- `lumiere-frontend/src/components/landing/LandingSections.jsx`

The landing page is separate from the editor. It uses React UI, images, and 3D/animation components to present the product.

Important concepts:

- public route, no auth required
- visual first impression
- navigation to login/register/dashboard
- animation and 3D decorative scenes

It is not part of the core editor algorithm, but it is part of the complete user journey.

## 17. API Base URL Logic

File:

- `lumiere-frontend/src/utils/apiBase.js`

This centralizes backend URL construction.

It creates:

- `API_ORIGIN`
- `API_BASE`
- `apiUrl(path)`
- `apiAssetUrl(value)`

Why this matters:

The frontend may run locally while backend is remote, or both may be deployed. A central API base prevents hardcoding backend URLs everywhere.

## 18. Important Algorithms List

This section is a quick index of algorithms used in the codebase.

### 1. JWT Authentication

Used for login sessions.

Concept:

- server signs a token
- client stores token
- client sends token on protected requests
- server verifies token and loads user

### 2. Bcrypt Password Hashing

Used for password security.

Concept:

- never store raw password
- hash password with salt
- compare login password by hashing/checking

### 3. Snap to Grid

Used in 2D drawing and movement.

Concept:

```txt
snapped = round(value / gridSize) * gridSize
```

### 4. Euclidean Distance

Used for click closeness, wall length, clearance, and geometry.

Formula:

```txt
sqrt(dx^2 + dy^2)
```

or in 3D:

```txt
sqrt(dx^2 + dy^2 + dz^2)
```

### 5. Shoelace Formula

Used for polygon area.

Formula:

```txt
abs(sum(x_i * y_next - x_next * y_i) / 2)
```

### 6. Ray Casting Point-in-Polygon

Used to determine whether a point is inside a room.

Concept:

- cast a horizontal ray
- count edge crossings
- odd means inside
- even means outside

### 7. Point Projection Onto Segment

Used for wall hit testing and opening placement.

Concept:

- project point onto wall vector
- clamp projection between 0 and wall length
- calculate perpendicular distance

### 8. Wall Normal Vector

Used for wall thickness, offset, and room attachment.

For direction `[dx, dz]`, normal can be:

```txt
[-dz, dx]
```

### 9. Ray-Plane Intersection

Used in 3D mouse interactions.

Concept:

- mouse becomes a ray from the camera
- ray intersects ground plane or wall plane
- intersection point becomes editable 3D coordinate

### 10. Shape Extrusion With Holes

Used to create 3D walls with doors and windows.

Concept:

- create wall rectangle as 2D shape
- add rectangular holes
- extrude shape into 3D mesh

### 11. Graph Traversal for Footprint Reconstruction

Used to rebuild polygon footprints from wall segments.

Concept:

- wall endpoints are graph nodes
- walls are graph edges
- walk connected edges until returning to start

### 12. Interval Overlap and Subtraction

Used for adjacent room walls.

Concept:

- represent wall spans as 1D intervals
- find shared overlap
- subtract shared intervals from exposed wall intervals

### 13. Separating Axis Theorem

Used to detect room polygon overlap.

Concept:

- project polygons onto all edge normals
- if one axis separates them, no overlap
- if no separating axis exists, they overlap

### 14. Bounding Box Collision

Used for furniture collision.

Concept:

- compute `THREE.Box3` for each furniture item
- test every pair for intersection

### 15. Clearance Calculation

Used for layout suggestions.

Concept:

- if boxes do not collide, calculate gap between them
- warn if gap is too small

### 16. Linear Interpolation

Used for lighting time of day and color blending.

Formula:

```txt
value = a + (b - a) * t
```

### 17. Color Interpolation

Used in lighting mood/time transitions.

Concept:

- parse RGB values
- interpolate R, G, B separately
- reassemble hex color

### 18. Undo/Redo Stacks

Used in 2D and 3D editing.

Concept:

- past stack
- current state
- future stack
- undo moves current to future and past to current
- redo moves current to past and future to current

### 19. Manifest Priority Sorting

Used for model loading.

Concept:

- assign category priority
- sort by priority descending
- sort by size ascending

### 20. Rule-Based Budget Estimation

Used for project cost summaries.

Concept:

- collect billable elements
- find most specific matching rule
- multiply quantity or area by amount
- aggregate totals

### 21. Storage Quota Estimation

Used in backend project service.

Concept:

- estimate JSON bytes
- add file sizes
- compare user total against quota

### 22. Cache With TTL

Used for model list.

Concept:

- save result and timestamp
- return cached result if not expired
- refresh after TTL

## 19. File-by-File Mental Map

### Frontend Routing and App Shell

- `src/App.jsx`: routes, auth guards, editor switching route logic, transitions, theme provider.
- `src/main.jsx`: React mount point.
- `src/index.css`, `src/App.css`: global styling.

### Auth

- `src/components/login/login.jsx`: login/signup UI and form submit logic.
- `src/components/login/Register.jsx`: wrapper that opens auth UI in signup mode.
- `src/components/login/ResetPassword.jsx`: reset password confirmation screen.
- `src/api/auth.js`: auth HTTP functions.
- `src/api/axiosClient.js`: Axios instance with token injection and 401 handling.
- `src/utils/authStorage.js`: local storage token/user helpers.

### Dashboard

- `src/hooks/useDashboard.js`: fetches and mutates dashboard data.
- `src/components/userDashboard/Dashboard/Dashboard.jsx`: dashboard page composition.
- `ProjectGrid`, `ProjectCard`: project listing UI.
- `StoragePanel`: storage quota UI.
- `WelcomePanel`, `QuickActions`, `RecentActivity`, `TipsPanel`: dashboard sections.

### 2D Editor

- `src/components/2d/RoomCanvas.jsx`: visible 2D editor UI and Konva rendering.
- `src/utils/useFloorPlan.js`: 2D editor state engine and geometry helpers.

### 3D Editor

- `src/components/threeD/scene/RoomScene.jsx`: main 3D editor scene and UI.
- `src/components/threeD/walls/InteractiveWall.jsx`: 3D wall mesh, openings, dragging.
- `src/components/threeD/walls/WallEditor.jsx`: wall settings UI.
- `src/components/threeD/furniture/FurnitureItem.jsx`: GLB model loading and rendering.
- `src/components/threeD/furniture/FurniturePicker.jsx`: model/furniture selection UI.
- `src/components/threeD/furniture/FurnitureGizmo.jsx`: transform controls.
- `src/components/threeD/lighting/*`: light rendering and light controls.
- `src/components/threeD/materials/*`: material UI and material rendering.
- `src/components/threeD/camera/*`: orbit/preset/first-person camera behavior.
- `src/components/threeD/rooms/*`: room creation UI and logic.

### Shared Editor Utilities

- `src/utils/editorSceneBridge.js`: live snapshots and 2D/3D conversion.
- `src/utils/sceneEntities.js`: factories and wall/opening helpers.
- `src/utils/roomLayout.js`: rectangular room layout and shared wall generation.
- `src/utils/wallOpenings.js`: opening clamp/conflict/segment helpers.
- `src/utils/measurements.js`: frontend measurement calculations.
- `src/hooks/useProjectSave.js`: save/load/export/import/share/autosave.
- `src/hooks/useHistory.js`: undo/redo state.
- `src/hooks/useMaterials.js`: floor/ceiling/wall material state.
- `src/hooks/useLighting.js`: lighting and mood state.
- `src/hooks/useSpatialAnalysis.js`: layout scoring and collision suggestions.
- `src/hooks/useModelPrefetch.js`: model manifest fetching and preloading.

### Budget

- `src/utils/budgetContract.js`: constants, allowed budget types, defaults, normalization.
- `src/utils/budgetEstimator.js`: frontend budget calculation.
- `src/stores/useBudgetStore.js`: Zustand store for budget rules/state.

### Backend App

- `app/main.py`: FastAPI app setup, CORS, routers, startup sync, static files, model proxy.
- `app/core/config.py`: environment/config values.
- `app/core/database.py`: MongoDB collections and indexes.
- `app/core/security.py`: password hashing, JWT, current-user dependency.

### Backend Routes

- `app/routes/auth_routes.py`: auth endpoints.
- `app/routes/project_routes.py`: project CRUD, storage, budget, uploads.
- `app/routes/model_routes.py`: model list, manifest, register, preview upload.

### Backend Services

- `app/services/auth_service.py`: user creation, login, reset token logic.
- `app/services/project_service.py`: project business logic, quotas, save/load, assets, budget.
- `app/services/model_service.py`: model metadata queries, cache, manifest sorting.
- `app/services/preview_service.py`: preview upload helper.
- `app/services/sync_b2_to_mongo.py`: sync model storage metadata to MongoDB.

### Backend Schemas and Models

- `app/schemas/auth_schema.py`: auth request/response validation.
- `app/schemas/project_schema.py`: project request/response validation.
- `app/schemas/scene_schema.py`: scene data validation.
- `app/schemas/budget_schema.py`: budget rule validation.
- `app/models/*`: Pydantic document models.

### Backend Utilities

- `app/utils/helpers.py`: datetime and document serialization.
- `app/utils/measurements.py`: backend measurements.
- `app/utils/budget_estimator.py`: backend budget calculation.

## 20. Concepts to Learn in Order

If you are learning this codebase from scratch, learn in this order:

1. Basic React components and props.
2. React state with `useState`.
3. React effects with `useEffect`.
4. React Router routes and navigation.
5. API calls with Axios/fetch.
6. JWT authentication and bearer headers.
7. Basic FastAPI routes and dependencies.
8. MongoDB documents and ObjectIds.
9. 2D geometry: points, lines, polygons.
10. Canvas drawing with Konva.
11. 3D coordinates: X, Y, Z and camera.
12. Three.js meshes, materials, geometry.
13. React Three Fiber component model.
14. Raycasting and pointer interaction in 3D.
15. Scene serialization.
16. Conversion between coordinate systems.
17. Collision detection and bounding boxes.
18. Budget rules and aggregation.
19. Uploads, file URLs, CDN/proxy behavior.
20. Performance: caching, prefetching, excluding heavy fields.

## 21. Simple End-to-End Explanation

If you need to explain the entire app to another person:

Lumiere starts as a React app with routes for landing, authentication, dashboard, 2D editor, 3D editor, and public viewing. Users register or log in through FastAPI endpoints. The backend hashes passwords with bcrypt and returns a JWT token on login. The frontend stores that token and sends it on protected API requests.

After login, the dashboard fetches the user's projects from MongoDB through the backend. The project list is lightweight because the backend excludes heavy scene details when only dashboard cards are needed.

The 2D editor lets users draw polygon rooms on a Konva canvas. It snaps points to a grid, calculates area using the shoelace formula, builds wall segments from polygon edges, places doors/windows by hit testing walls, and places symbolic furniture by checking which room contains the click point.

The 3D editor represents rooms and walls in meters on an XZ floor plane with Y as height. It renders walls as extruded shapes with holes cut out for doors and windows. It renders rooms as floor and ceiling polygon surfaces. Furniture is loaded from GLB files, normalized by bounding box size, centered, scaled, and placed in the scene. Materials, lighting, camera modes, room creation, wall editing, and furniture transforms all update React state.

Switching between 2D and 3D uses session storage and conversion utilities. A 2D plan can become a 3D scene by converting pixels to meters, turning room polygons into footprints, converting walls and openings, merging shared walls, and matching 2D furniture to 3D model metadata. A 3D scene can become a 2D plan by projecting room footprints and furniture positions back into pixels.

Saving builds structured scene JSON with rooms, walls, furniture, materials, lighting, measurements, and budget data. The frontend sends it to the backend. The backend recalculates measurements and budget summaries, checks storage quota, stores the project in MongoDB, and returns a share URL. Public viewers can open saved projects by project id.

The main algorithms are geometry algorithms: snapping, distance, polygon area, point-in-polygon, wall projection, footprint tracing, interval subtraction, polygon overlap, bounding-box collision, and 2D/3D coordinate conversion. The main system design idea is structured scene persistence.

## 22. Best Short Summary

Lumiere is a full-stack scene editor. The frontend manages interactive design state in React, renders 2D plans with Konva, renders 3D rooms with Three.js, and converts between both representations. The backend manages users, projects, model metadata, uploads, budgets, and MongoDB persistence. The most important idea is that designs are saved as structured scene data, not screenshots, so they can be reopened, edited, converted, measured, costed, and shared.
