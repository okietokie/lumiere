# Lumiere Master Notes

This file is the single merged note set for Lumiere. It consolidates and updates the earlier learning notes, viva notes, technology inventory, and budget contract notes into one place, with extra verification against the current frontend and backend codebase.

If someone on the team reads only one document before a review, demo, viva, handoff, or continuation of development, this should be the document.

## 1. Project Identity

### Project name
Lumiere

### Expanded brand wording visible in the frontend
Lumiere Maison

### One-line description
Lumiere is a full-stack interior design platform that lets users plan rooms in 2D, visualize them in 3D, place furniture and lights, customize materials, estimate budgets, save projects, and share public views online.

### Core idea
The project is not just a renderer and not just a drawing tool. It stores editable scene data, which means a user can:

- draw a plan
- convert it into a 3D room
- keep editing walls, doors, windows, furniture, lights, and materials
- save the structured scene to the backend
- reopen it later without losing editability

That is one of the strongest technical points in the whole project.

## 2. Problem Statement

Interior planning is hard for most users because they must mentally imagine:

- room size
- wall positions
- door and window placements
- furniture scale
- circulation space
- materials and finishes
- lighting mood
- rough cost impact

Lumiere reduces that gap by giving users an interactive visual workflow from plan to immersive room scene.

## 3. Objectives

The project is designed to combine:

- 2D floor planning
- 3D room visualization
- editable room geometry
- door and window placement
- furniture and decor placement
- material customization
- lighting control
- budget estimation
- user authentication
- project save/load/share
- asset-backed furniture models

## 4. Target Users

Main target users include:

- students learning interior or spatial design
- homeowners planning room layouts
- beginners who want visual room planning without professional CAD complexity
- small design teams creating quick concept drafts
- users who want layout plus presentation-style visualization in one product

## 5. Workspace Shape

Root workspace:

- `C:\Users\kalya\Lumiere`

Main project areas:

- `lumiere-frontend/` for the React app
- `lumiere-backend/` for the FastAPI API and persistence layer
- `render.yaml` for backend deployment
- root `package.json` for orchestration
- root note files for project documentation

## 6. Tech Stack

### Frontend stack

- React 19
- Vite
- React Router
- Ant Design
- Tailwind CSS 4
- MUI and Emotion in some UI areas
- Zustand for state
- `react-konva` and Konva for 2D drawing
- `three`, `@react-three/fiber`, and `@react-three/drei` for 3D
- `@react-three/cannon` and `@react-three/rapier`
- GSAP and Barba for page transitions
- Framer Motion
- Shepherd.js for onboarding
- Axios for API communication

### Backend stack

- FastAPI
- Python 3.12
- Uvicorn
- Pydantic v2
- MongoDB
- Motor and PyMongo
- JWT authentication
- bcrypt password hashing
- FastAPI Mail and `aiosmtplib`
- `httpx` and `requests`
- Backblaze B2 integration for assets

### Hosting and storage

- MongoDB for persistent structured data
- Backblaze B2 style storage for models, previews, and large assets
- Render for backend deployment
- Vercel-style SPA configuration in frontend deployment files

## 7. High-Level System Flow

The main runtime flow is:

1. User opens the React app.
2. Router decides whether they see landing, auth, dashboard, 2D editor, 3D editor, or public viewer.
3. If a route is protected, JWT presence is checked.
4. The user logs in or registers.
5. The dashboard loads project data from the backend.
6. The user opens a project or creates one.
7. The project is edited in 2D or 3D.
8. Scene data is converted between 2D and 3D when needed.
9. The scene is saved as JSON in MongoDB.
10. Heavy files such as previews, videos, GLB, or USDZ assets are stored separately and referenced by URL.

## 8. Frontend Route Map

Important routes currently visible in the code:

- `/` landing page
- `/login` login page
- `/register` registration page
- `/reset-password` password reset page
- `/user/dashboard` authenticated dashboard
- `/user/room` authenticated 3D editor
- `/user/room-2d` authenticated 2D editor
- `/view/:projectId` public project viewer
- `/admin/model-previews` admin model preview studio

Route utilities:

- `RequireAuth` protects authenticated pages
- `RequireAuthOrDemo` allows either a logged-in user or demo mode
- `RedirectAuthenticated` keeps logged-in users out of login/register pages
- `RouteShell` handles route animation, page shell behavior, logout, and fullscreen editor behavior

## 9. Big Architectural Strength

The project stores scene data, not just images.

That scene data contains things like:

- rooms
- walls
- doors
- windows
- furniture
- materials
- lighting
- measurements
- budget data

Because of that, saved projects remain editable, measurable, shareable, and convertible between 2D and 3D.

## 10. Frontend Visual Identity and UI Language

The project’s visual language is consistent with a warm luxury interior brand rather than a default developer dashboard.

### Core palette

From `src/utils/colors.js`:

- background: `#211A17`
- surface: `#2D241F`
- secondary: `#625044`
- text: `#EAD8C3`
- action: `#A9784E`
- accent: `#6E5038`
- grid: `#806B5F`

### Style direction

The app uses:

- warm dark browns and charcoal tones
- beige and cream text
- bronze and gold accents
- glassmorphism in some dashboard shells
- gradients instead of flat panels
- soft inset and raised shadows
- high-radius rounded cards and pills
- luxury/interior-editorial presentation rather than plain enterprise styling

### Typography patterns

In the 2D editor CSS, the fonts include:

- `Cormorant Garamond` for elegant serif branding accents
- `Archivo` for practical interface text

This supports a premium interior-design tone.

### Motion style

Motion is handled with GSAP and Barba hooks:

- page transitions
- reveal sequences
- parallax-like hero effects
- scroll-triggered landing page animations
- reduced-motion fallbacks for accessibility/performance

## 11. Landing Page Design Details

The landing page is not a generic form page. It behaves like a design-product marketing site.

### Main characteristics

- cinematic hero section
- 3D-backed visuals using React Three Fiber
- moving aura and layered scrims
- animated word reveal
- smooth parallax response to mouse movement
- sticky top nav that changes when scrolled
- feature cards with icons and editorial copy
- workflow section explaining the product in 3 stages
- marquee text such as interactive previews, precision lighting, cinematic materials, and collaborative iteration

### Main landing messages

The frontend explicitly markets:

- 3D room planning
- furniture and decor placement
- real-time interior visualization
- wall and surface customization
- budget and material estimation
- AI-assisted design ideas

### Nav and CTA style

Top navigation contains:

- Features
- Gallery
- Workflow
- Login
- Get Started / Start CTA

The branding label shown is `Lumiere Maison`.

## 12. Dashboard Design and Features

The dashboard is the logged-in home area of the app.

### Visual style

The dashboard uses:

- dark luxury background
- radial gradients
- blurred sticky surfaces
- rounded 24px cards
- bronze-accent buttons
- project cards with glass-like surfaces
- strong spacing and polished layout

### Dashboard feature areas

Visible module groups include:

- overview
- projects
- renders
- tutorials
- welcome/hero panel
- storage panel
- quick actions
- recent activity
- project grid
- tips panel
- notifications state

### Core dashboard actions

Users can:

- create a project
- rename a project
- duplicate/copy project flows in supporting hooks/services
- open projects
- delete projects
- review storage usage

## 13. Authentication System

Authentication uses JWT bearer tokens.

### Frontend auth files

- `src/components/login/login.jsx`
- `src/components/login/Register.jsx`
- `src/components/login/ResetPassword.jsx`
- `src/api/auth.js`
- `src/api/axiosClient.js`
- `src/utils/authStorage.js`

### Backend auth files

- `lumiere-backend/app/routes/auth_routes.py`
- `lumiere-backend/app/services/auth_service.py`
- `lumiere-backend/app/core/security.py`
- `lumiere-backend/app/schemas/auth_schema.py`

### What auth supports

- registration
- login
- current-user fetch
- forgot password
- reset password confirmation

### Token storage

Frontend stores:

- token under `token`
- user under `lumiereUser`

### Axios behavior

Every authenticated request attaches:

- `Authorization: Bearer <token>`

If the backend returns `401`, the app clears stored auth and sends the user back to login.

### Password security detail

The backend normalizes the password before bcrypt:

1. convert to UTF-8 bytes
2. SHA-256 hash the password
3. Base64-encode the result
4. pass that normalized value into bcrypt

This avoids awkward bcrypt behavior with long raw passwords and still gives bcrypt the final secure hash stage.

### JWT contents

Tokens include:

- `sub` user id
- `email`
- `name`
- `exp` expiry

## 14. 2D Editor Overview

Main file:

- `lumiere-frontend/src/components/2d/RoomCanvas.jsx`

The 2D editor is the floor-plan side of the app.

### 2D editor purpose

- draw room outlines
- create closed rooms
- create wall-based shapes
- edit corners/points
- place doors and windows on walls
- place 2D furniture symbols
- apply floor color/pattern presets
- save/share/export work
- switch to 3D

### Important implementation helpers

- `src/utils/useFloorPlan.js`
- `src/utils/useRoomDrawing.js`
- `src/utils/editorSceneBridge.js`

### 2D editor UI style details

The CSS establishes a luxury workshop/editor look:

- background gradients instead of flat dark gray
- cream text on deep charcoal surfaces
- gold accents for active elements
- gold-highlighted points and selected states
- muted grid lines using semi-transparent warm gray
- polished shadows and inset shells
- branded sidebars rather than utilitarian panels

### 2D editor color tokens

Examples from CSS:

- cream: `#f4ede3`
- warm: `#e7dccd`
- gold: `#c8a16b`
- dark: `#1d1917`
- charcoal: `#2a2421`
- muted: `#948779`
- snap highlight: `#dc7365`

### 2D floor patterns

The editor procedurally generates textures on canvas instead of depending only on external image files. Supported texture styles in the code include:

- solid
- tile
- parquet
- marble
- herring
- dots

That is a good design point because the plan view can show material mood without needing a large asset pipeline.

### 2D interaction details

The editor supports:

- stage pan and zoom
- touch pinch behavior
- snapping
- direct dragging for selected elements
- draggable openings
- draggable furniture
- fit-to-view behavior

### Draggable viewport control

The current 2D viewport control has been simplified to a single visible `Fit` button and is user-draggable.

Important behavior:

- its position is stored in local storage
- it clamps inside the viewport
- it distinguishes drag from click
- it stays visible in responsive layouts

This is a small UI detail but it matters because it directly affects usability on smaller screens.

### 2D editor state ideas

The editor tracks:

- current rooms/walls
- selected objects
- zoom level
- autosave toggle
- share URL
- current project id
- mobile/tablet viewport states
- onboarding state

## 15. 2D Data Model

The 2D plan conceptually stores:

- room points
- standalone wall segments
- room fills and floor settings
- doors/windows attached to wall segments
- furniture positions

The bridge later converts those into a 3D-friendly scene structure.

### 2D geometry concepts worth explaining in viva

- point arrays define room polygons
- wall generation comes from adjacent points
- area uses the shoelace formula
- point-in-polygon is used for room membership logic
- projection onto wall segments helps opening placement
- snap-to-grid improves clean geometry editing

## 16. 3D Editor Overview

Main file:

- `lumiere-frontend/src/components/threeD/scene/RoomScene.jsx`

The 3D editor is the immersive spatial side of Lumiere.

### 3D editor purpose

- render room geometry in 3D
- place and move furniture models
- edit walls and rooms
- add and tune lighting
- change floor and ceiling materials
- manage projects
- record previews
- estimate budgets
- switch back to 2D

### Major imported submodules

- camera controls
- interactive walls
- wall gizmos
- wall editor panel
- furniture item/gizmo/panels
- lighting system and lighting panel
- material panels
- save/project panels
- score and collision panels
- room creation panel
- performance tools
- recorder

### Camera/view support

The code defines camera presets:

- perspective
- top
- front
- side

### 3D editor UX capabilities

- orbit-style room inspection
- first-person walk mode
- gizmos for orientation
- contextual editing panels
- save/load actions
- undo/redo
- furniture movement and rotation
- wall manipulation
- opening editing
- light placement
- budget tools

## 17. 3D Scene and Room Design Details

The 3D editor is more than a static viewer. It includes editing logic for real room semantics.

### Room system

There are room and layout helpers that support:

- generating layout walls
- directional room addition
- adjacent room creation
- footprint generation
- wall canonicalization and merging
- room footprint reconstruction from walls

### Surface support

Users can customize:

- floors
- ceilings
- walls

The save/load layer treats floor and ceiling materials as structured scene data, not just temporary UI state.

### Lighting support

There are two levels of lighting:

- global scene lighting such as time-of-day and mood
- placed individual lights

The code and assets show mood and lighting presets such as:

- modern white
- night blue
- romantic
- warm cozy

Placed light type assets include:

- ceiling light
- floor lamp
- pendant light
- strip light
- wall light

### Furniture support

Furniture is backed by model metadata rather than purely decorative placeholders.

Furniture items store fields such as:

- id
- filename
- name
- url
- category
- roomId
- position
- rotation
- scale
- optional tint
- optional light-emission state for luminous furniture

## 18. Doors and Windows

Doors and windows are first-class editable scene elements.

### Where they live

They are attached to walls in the saved scene structure:

- each wall has a `doors` list
- each wall has a `windows` list

### Scene fields

Each opening can include:

- `id`
- `type`
- `roomId`
- `wallId`
- `label`
- `width`
- `height`
- `measurements`

### Derived count tracking

The backend measurement system derives:

- `doorCount`
- `windowCount`

for walls, so the system can describe how many openings a wall contains.

### Door styles currently supported in code

- single hinged door
- single sliding door
- double hinged door

### Window styles currently supported in code

- sliding window
- 3-panel sliding window
- casement window
- fixed window

### Extra opening behavior details

Depending on style, openings may store:

- `panelCount`
- `hingeSide`
- `slideDirection`

This is a very good minute-detail talking point because it shows the project treats openings as behavior-aware design elements, not just rectangles.

## 19. 2D to 3D and 3D to 2D Bridge

One of the most viva-worthy and technically important areas is:

- `src/utils/editorSceneBridge.js`

### Why it matters

It allows:

- switching from plan view to immersive view
- switching back without losing the editable meaning of the design
- preserving current unsaved work

### Live snapshot logic

The bridge saves temporary snapshots in session storage:

- `lumiere:live-3d-scene`
- `lumiere:live-2d-plan`

It can determine which editor snapshot is newest and reopen that state.

### Bridge responsibilities

- convert room polygons into 3D rooms/walls
- infer room height when needed
- reconstruct 2D plans from 3D scenes
- match 2D furniture hints to 3D model manifest entries
- preserve openings and layout structure as well as possible

### Why this is strong design

Many student projects stop at one-way conversion or image export. Lumiere supports bidirectional scene understanding, which is a stronger software-engineering and data-modeling choice.

## 20. Saving, Loading, Sharing, and Autosave

Project save logic is centralized in:

- `src/hooks/useProjectSave.js`

### Save pipeline responsibilities

- build normalized scene payloads
- include measured wall/opening/room data
- include materials
- include lighting
- include budget state
- capture snapshots when available
- call backend create/update endpoints
- hydrate loaded scene data back into frontend state

### Share support

Projects expose public viewer links in the form:

- `/view/:projectId`

The backend serializes a `share_url` for each project.

### Autosave

Autosave exists in both the 2D and 3D editor flows.

Autosave conditions include:

- autosave enabled
- existing project id
- user authenticated
- not in demo-only flow

### Export support

The notes and code indicate support for:

- JSON import/export
- project preview snapshots
- preview video upload
- GLB upload
- USDZ upload

## 21. Public Viewer

The project includes a public viewer route and page:

- `src/components/viewer/ProjectViewerPage.jsx`

This page can render saved projects for external viewing without requiring edit mode.

It supports:

- public project fetch
- 2D/3D view behavior
- scene lighting recreation
- material recreation
- placed light recreation

This is important because it separates collaborative presentation from direct editing.

## 22. Onboarding and Guided Use

The frontend includes onboarding support:

- `OnboardingJoyride`
- `OnboardingTourProvider`
- Shepherd.js dependency

This means the app is designed not just for technical completeness, but also for usability and first-time-user guidance.

## 23. Performance Mode

The project contains a dedicated performance system:

- `PerformanceModeProvider`
- performance dock position persistence
- responsive quality logic
- reduced-motion handling
- viewport-aware defaults

### Performance behavior examples

- auto quality choice based on viewport and motion preferences
- saved user preference in local storage
- draggable performance dock
- canvas/performance tuning for 3D rendering

This is a nice detail because it shows the team considered device variability, not just desktop development conditions.

## 24. Budget Estimation System

The budget system is one of the most detailed feature layers in the codebase and notes.

### Budget feature layers

1. Budget mode
2. Cost assignment system
3. Estimation engine

### Supported cost target types

- furniture
- decor
- light
- door
- window
- wall
- floor
- ceiling

### Supported pricing modes

- fixed cost
- per-square-meter cost

### Scope behavior

Rules can target:

- all items of a type
- a room-specific surface type
- a single item override

### Budget data includes

- enabled state
- currency
- rules
- totals
- category totals
- snapshots
- quotation
- last calculated timestamp

### Why this matters

This is not a trivial cosmetic feature. It is tied into:

- scene measurements
- saved project payloads
- backend recalculation
- room/wall/opening/item identity

### Budget currency

The current defaults reference `AED`, which aligns with the environment and current implementation.

## 25. Scene Measurement and Quantification

The backend and frontend both normalize measurements.

### Measurement helpers include

- wall area
- floor area
- ceiling area
- wall length
- room footprint area
- opening measurements
- furniture quantity
- light quantity
- room lookup by position

### Derived wall measurements can include

- length
- area in square meters
- door count
- window count

### Why this is useful

Measurements support:

- budget estimation
- design validation
- consistent save normalization
- richer scene analytics

## 26. Backend Overview

Main backend entry:

- `lumiere-backend/app/main.py`

### Backend responsibilities

- create FastAPI app
- configure CORS
- connect to MongoDB
- ensure indexes
- sync storage data to MongoDB on startup
- mount static video and project asset routes
- expose model proxy route
- serve auth, model, and project routers

### Middleware detail

There is a custom process-time header middleware that adds request timing as:

- `x-process-time`

That is a nice engineering-quality detail.

## 27. Backend Route Groups

### Auth routes

- register
- login
- me
- forgot password
- reset password confirm

### Project routes

- save project
- list projects
- get storage usage
- get latest project
- open owned project
- update project
- activate budget
- create budget rule
- update budget rule
- delete budget rule
- get public project
- delete project
- upload project video
- upload GLB/USDZ assets

### Model routes

The notes and inventory indicate support for:

- list models
- model manifest
- model registration
- preview upload

## 28. Project Persistence Design

The backend stores project documents with fields such as:

- user id
- title
- thumbnail URL
- scene data
- preview video
- model assets
- created time
- updated time
- last opened time

### Important limits visible in backend service

- max storage per user: 20 MB
- max projects per user: 50
- max rooms: 200
- max video upload: 100 MB
- max project asset upload: 250 MB

These are strong practical controls for a project of this scale.

## 29. Database Model

The app uses MongoDB document storage.

### Main collections logically represented

- users
- projects
- model metadata

### Why MongoDB fits this project

MongoDB is suitable because the scene payload is hierarchical and flexible:

- rooms contain optional geometry and measurements
- walls contain nested doors and windows
- lighting contains placed lights
- materials can evolve
- budget objects can grow over time

This structure is easier to evolve in a document model than in a rigid relational schema for a student/full-stack product like this.

## 30. Scene Schema Snapshot

The backend `SceneData` schema includes:

- version
- savedAt
- rooms
- walls
- furniture
- placedItems
- materials
- floorMaterial
- ceilingMaterial
- lighting
- budget

### SceneRoom

Can include:

- id
- name
- label
- type
- x
- z
- width
- depth
- height
- footprint
- isCustomShape
- measurements

### SceneWall

Can include:

- id
- type
- roomId
- start
- end
- height
- thickness
- doors
- windows
- measurements

### SceneFurniture

Can include:

- id
- type
- roomId
- name
- label
- category
- position
- rotation
- scale
- measurements

### SceneLighting

Can include placed lights with:

- id
- type
- budgetCategory
- quantity
- roomId
- label
- position
- intensity
- measurements

## 31. Model Catalog and Asset Handling

The project has a real model-catalog flow rather than hardcoded only-local furniture.

### Model-related features

- fetch model list
- fetch manifest for prefetching
- register uploaded models
- upload model preview images
- choose matching models during 2D to 3D conversion

### Asset handling

The backend also supports:

- video uploads
- GLB asset uploads
- USDZ asset uploads
- public/project asset URL generation
- B2-backed public asset URLs when configured

### Proxy detail

The backend exposes:

- `/api/proxy/models/{file_path:path}`

to redirect model access through a controlled endpoint.

## 32. Algorithms and Logic Worth Explaining

Important algorithms and technical ideas across the project include:

- JWT authentication
- bcrypt password hashing
- safe redirect validation after login
- snap-to-grid
- Euclidean distance
- shoelace polygon area formula
- point-in-polygon ray casting
- point projection onto line segment
- wall normal vector logic
- ray-plane intersection
- extrusion with holes for walls/openings
- graph-like wall traversal for footprint reconstruction
- interval overlap/subtraction
- separating axis theorem for overlap detection
- bounding-box collision checks
- clearance/spatial analysis
- interpolation for color/value changes
- undo/redo stacks
- manifest priority sorting
- rule-based budget estimation
- storage quota estimation
- cache with TTL in model prefetch logic

## 33. Undo/Redo and Edit History

Both 2D and 3D editing notes reference history support.

This matters because geometry editing and object movement are not simple form edits. The user needs reversible scene interactions. History support improves:

- experimentation
- safety
- design iteration speed
- professional feel

## 34. Spatial Analysis and Quality Features

The 3D editor includes spatial analysis hooks and collision-related utilities.

That means the app is not only storing objects, but also reasoning about:

- overlap
- placement quality
- surface snapping
- clearance
- collision highlighting

This helps move the app toward actual design assistance.

## 35. Lighting and Mood System

Lighting is one of the more presentation-focused strengths of Lumiere.

### Lighting layers

- global time-of-day
- active mood preset
- global brightness
- manually placed lights

### Why it matters

Interior design is highly dependent on light perception. Supporting mood and placement gives the project more realism and better design storytelling than plain geometry-only tools.

## 36. Materials and Surface Styling

The project supports editable materials for:

- floor
- ceiling
- walls

The app also includes themed visual directions such as:

- cozy warm
- dark luxury
- industrial
- luxury marble
- modern minimal
- scandinavian

These style names show that the product is not only technical but also presentation-oriented and design-aware.

## 37. Public and Team Collaboration Value

Even without full real-time multiplayer, the app supports collaboration through:

- saved structured projects
- share links
- public viewer pages
- exportable assets
- budget summaries
- reusable model-driven scenes

For a team demo or academic defense, this helps position Lumiere as a practical workflow product instead of a one-session prototype.

## 38. Security Considerations

Important security points visible in the code and notes:

- JWT-based protected routes
- current-user validation via bearer token
- password hashing with bcrypt
- secure-ish redirect validation after login
- file type checks for video and 3D asset uploads
- route protection for owned project access

### Security limitation to mention honestly

The frontend stores tokens in local storage, which is simple but weaker than secure httpOnly cookies if XSS were introduced.

That is a valid and mature limitation to acknowledge in viva.

## 39. Performance Considerations

The project includes several performance-conscious choices:

- performance mode provider
- reduced-motion behavior
- viewport-aware quality selection
- model manifest prefetching
- separation of large asset URLs from scene JSON
- public asset/CDN support
- static mounting of videos and project assets

## 40. Software Engineering Principles Visible

The project demonstrates:

- separation of concerns
- modular component design
- reusable hooks
- reusable utility functions
- route-level organization
- service-layer backend design
- schema-based validation
- normalization of saved data
- progressive enhancement through onboarding, sharing, and budgeting

### Examples of separation of concerns

- routes vs services on backend
- UI components vs hooks vs utilities on frontend
- editor conversion logic in bridge utilities
- measurements separated from budget rules
- save/load logic centralized in `useProjectSave`

## 41. Main Strengths

The strongest features of Lumiere are:

- two-way 2D and 3D workflow
- structured editable scene data
- real furniture/model pipeline
- lighting and material customization
- public sharing support
- budget estimation tied to actual scene elements
- polished branded UI instead of default template styling
- onboarding and usability touches

## 42. Current Limitations

Realistic limitations to mention:

- token storage is local-storage based
- some advanced collaboration features appear share-based rather than real-time
- complex geometry cases may still need more validation and refinement
- some production-hardening areas such as broader testing and stricter asset governance can grow further
- frontend complexity is high, especially in large editor files

## 43. Future Scope

Strong future extensions could include:

- real-time multi-user collaboration
- AI-generated room suggestions connected to actual scene mutations
- supplier/pricing database integration
- richer quotation export
- more advanced measurement and compliance checks
- stronger mobile editing flows
- stronger cloud rendering/export options
- fuller analytics and recommendation layers

## 44. Best Short Summary for Demo or Viva

Lumiere is a full-stack interior design application where users can create a room layout in 2D, convert it into a 3D scene, customize materials, lighting, furniture, doors, and windows, estimate costs, save the project in MongoDB as structured scene data, and share the result through public links. The main strength of the project is that it preserves editability by storing complete scene information rather than only final images.

## 45. Best 60-Second Viva Answer

Lumiere is a full-stack room design platform built with React on the frontend and FastAPI with MongoDB on the backend. Users can register, log in, create projects, design a room in 2D, convert that design into 3D, edit materials, lighting, furniture, doors, and windows, and save the project online. The project uses structured scene JSON so that rooms remain editable after saving. We also added model-based furniture handling, project sharing, preview assets, and a budget estimation system linked to measurable room elements such as walls, floors, ceilings, doors, windows, lights, and furniture.

## 46. Best “Why Is Your Project Good?” Answer

The project is strong because it solves a real usability gap between technical planning and visual understanding. It combines geometry editing, immersive visualization, data persistence, and cost-awareness in one workflow. Technically, its strongest point is the structured scene model and the bridge between 2D and 3D, which makes saved projects reusable and editable instead of disposable outputs.

## 47. Best “What Did You Learn?” Answer

We learned how to design a full-stack system around a shared scene model, not just around UI pages. On the frontend, we learned canvas-based 2D interaction, 3D rendering, state management, and responsive design for a complex editor. On the backend, we learned authentication, API design, file handling, data normalization, and schema validation. We also learned that features like budget estimation become much easier when geometry and object identity are stored consistently.

## 48. Best “What Would You Improve Next?” Answer

The next improvements would be real-time collaboration, stronger AI-assisted layout generation, more advanced budget/quotation workflows, more robust mobile editing, and a tighter production security model such as cookie-based auth and broader automated testing.

## 49. Team Member Claim Areas

### Frontend-focused member can claim

- landing page and brand design
- dashboard UI
- 2D editor behavior
- 3D editor interaction
- material and lighting controls
- responsive and onboarding improvements

### Backend-focused member can claim

- FastAPI routes
- JWT auth flow
- MongoDB persistence
- project CRUD
- asset/video upload
- startup sync and normalization
- budget summary recalculation

### Integration-focused member can claim

- 2D/3D bridge
- scene save/load normalization
- public viewer
- share URL handling
- model manifest integration
- budget data flow across frontend and backend

## 50. Viva Questions and Answers

### What is Lumiere?
Lumiere is a full-stack interior design platform for 2D planning, 3D visualization, project saving, and budget-aware room design.

### What problem does it solve?
It helps users understand layout, scale, lighting, materials, and furniture placement visually instead of imagining everything mentally.

### What type of project is this?
It is a full-stack web application with interactive graphics, authentication, persistence, and design-oriented editing tools.

### Which languages are used?
JavaScript/JSX on the frontend and Python on the backend.

### Which frontend framework is used?
React.

### Which backend framework is used?
FastAPI.

### Which database is used?
MongoDB.

### Why did you choose MongoDB?
Because the project stores nested scene data such as rooms, walls, openings, furniture, materials, lights, and budget objects, which map naturally to document storage.

### What is JWT?
JWT is a signed token format used to identify authenticated users between requests without storing session state on the server in the traditional way.

### How is the project structured?
The frontend in `lumiere-frontend/` handles UI, editor logic, and routing. The backend in `lumiere-backend/` handles auth, projects, models, storage integration, and persistence.

### How do users save projects?
The frontend builds normalized scene data and sends it to the backend through project save/update APIs. The backend stores it in MongoDB and returns a serialized project including share URL and assets metadata.

### How are rooms represented?
Rooms can be represented by dimensions and center coordinates or by explicit footprints/polygons, with measurements and metadata attached.

### How are doors and windows stored?
They are stored inside each wall as nested opening lists, with ids, sizes, labels, room/wall ids, and measurement metadata.

### How is password security handled?
Passwords are normalized, then hashed with bcrypt, and only the hash is stored.

### How are protected routes handled?
The frontend checks for auth tokens, and the backend verifies bearer tokens and loads the current user before allowing protected actions.

### Why use separate 2D and 3D editors?
2D is better for precise planning and geometry editing, while 3D is better for spatial understanding, materials, furniture, and presentation.

### Explain the 2D to 3D conversion logic.
The 2D plan contains room geometry, walls, openings, and items. The bridge utility converts those plan structures into room and wall entities, infers 3D layout information, and matches plan furniture with model metadata where possible.

### Explain the 3D to 2D conversion logic.
The bridge reads rooms, walls, and openings from the 3D scene, reconstructs a floor-plan-friendly representation, and stores a plan snapshot that can be edited again in the 2D canvas.

### Why is storing scene data better than storing only images?
Because scene data preserves editability, supports conversion between views, enables measurement and budgeting, and allows the project to reopen in a meaningful interactive state.

### Why separate routes and services in the backend?
Routes stay thin and HTTP-focused, while services hold business logic, making the code cleaner, more testable, and easier to scale.

### What are the strongest innovative parts?
The strongest parts are the two-way 2D/3D workflow, the structured scene model, and the budget estimation system tied to actual scene elements.

## 51. Minute Design Details Checklist

These are the kinds of small details that make the project feel intentional:

- warm brown, bronze, and cream palette instead of default blue UI
- serif-plus-sans pairing for brand tone
- layered gradients in landing, dashboard, and editor shells
- draggable floating utility controls
- visible single-button `Fit` viewport control in 2D
- performance mode dock with persistent position
- glow/accent states rather than flat active markers
- editor textures like parquet, marble, and herring patterns
- room styling presets such as dark luxury and scandinavian
- lighting mood presets such as warm cozy and romantic
- door styles with hinge/slide behavior
- window styles with style-specific labels
- public viewer support for presentation

## 52. Final Mental Model

The easiest way to think about Lumiere is this:

- the landing page sells the experience
- authentication protects personal design work
- the dashboard manages the user’s project library
- the 2D editor handles plan precision
- the 3D editor handles immersion and styling
- the bridge connects both representations
- the backend persists and normalizes everything
- the budget system turns design objects into costable elements
- the public viewer turns a saved project into something shareable

That complete loop is what makes Lumiere a real product-shaped project instead of a single isolated UI experiment.

## 53. Source Basis for This Master File

This merged document was built from:

- `CODEBASE_LEARNING_NOTES.md`
- `VIVA_NOTES.md`
- `PROJECT_TECH_INVENTORY.md`
- `Lumiere Costable Elements.md`

and then updated by checking the current code in:

- `lumiere-frontend/src/`
- `lumiere-backend/app/`

