# Lumiere Viva Notes

## 1. Project Overview

### Project title
Lumiere

### One-line introduction
Lumiere is a full-stack interior design platform that lets users plan spaces in 2D, visualize them in 3D, customize materials and lighting, place furniture models, and save/share projects online.

### Problem statement
Traditional interior planning is difficult for non-technical users because they must imagine scale, layout, lighting, and furniture placement mentally. Our project reduces that gap by giving users an interactive digital environment where they can draw rooms, convert them into 3D scenes, edit finishes and lighting, and preserve their work as reusable projects.

### Main objective
To build an easy-to-use interior design platform that combines:
- 2D floor planning
- 3D room visualization
- project saving and sharing
- authentication and user-specific dashboards
- asset-based furniture placement

### Target users
- students or beginners learning space planning
- home owners planning room layouts
- interior design enthusiasts
- small design teams who want quick concept visualization

## 2. What the project actually does

The project currently supports:
- user registration, login, token-based authentication, and password reset
- a dashboard showing projects, storage usage, and recent activity
- a 2D floor planner built with `react-konva`
- a 3D editor built with `react-three-fiber` and `three.js`
- switching between 2D and 3D editor modes
- conversion from 2D floor plan to 3D scene
- conversion from 3D scene back to 2D plan
- room creation and wall editing
- door and window placement
- furniture placement and manipulation
- floor and ceiling material customization
- lighting presets, mood presets, and placed lights
- project save, update, load, duplicate, delete, export, and sharing
- model catalog loading from MongoDB with cloud-storage sync
- upload of preview images, videos, and export assets like `glb` or `usdz`

## 3. Tech Stack

### Frontend
- React
- Vite
- React Router
- Ant Design
- `@react-three/fiber`
- `@react-three/drei`
- `three`
- `react-konva`
- GSAP
- Framer Motion
- Axios

### Backend
- FastAPI
- Motor / PyMongo
- MongoDB
- JWT authentication
- bcrypt password hashing
- FastAPI Mail
- httpx

### Storage / deployment
- MongoDB for persistent data
- Backblaze B2 style cloud storage/CDN for model files and previews
- Render config for backend deployment
- Vercel config exists in frontend

## 4. High-Level Architecture

### Simple explanation
The frontend is the user interface. It sends requests to the FastAPI backend. The backend validates users, stores projects in MongoDB, serves uploaded media, and manages model metadata. The 2D and 3D editors share scene data through conversion utilities and live session snapshots.

### Architecture flow
1. User opens frontend and logs in.
2. Frontend stores JWT token in local storage.
3. Authenticated API calls go to FastAPI with `Authorization: Bearer <token>`.
4. Backend validates the token and fetches the current user from MongoDB.
5. Project data is saved as structured JSON scene data in MongoDB.
6. Heavy assets like videos and 3D files are stored as files and exposed through URLs.
7. 2D and 3D editors exchange state through bridge utilities and conversion logic.

### Real codebase structure
- `lumiere-frontend/`: presentation, editor UI, dashboard, visualization logic
- `lumiere-backend/`: API, authentication, persistence, media upload, cloud sync
- `render.yaml`: backend deployment definition

## 5. Important Frontend Modules

### `src/App.jsx`
This is the main frontend entry point.
It defines routes for:
- landing page
- login/register/reset password
- dashboard
- 3D room editor
- 2D room editor
- public project viewer
- admin model preview page

It also contains:
- protected routes
- 2D/3D mode switching
- theme configuration
- route transition animations

### 2D editor
Main file: `src/components/2d/RoomCanvas.jsx`

Purpose:
- draw room outlines
- edit corners
- place doors/windows
- place 2D furniture symbols
- apply floor presets and textures
- export floor plan image

Supporting logic:
- `src/utils/useFloorPlan.js`
- `src/utils/useRoomDrawing.js`

### 3D editor
Main file: `src/components/threeD/scene/RoomScene.jsx`

Purpose:
- render rooms, walls, lights, furniture, and materials in 3D
- allow editing walls and room layout
- customize floor, ceiling, and lighting
- save/load projects
- record preview videos

Supporting hooks/modules:
- `src/hooks/useProjectSave.js`
- `src/hooks/useLighting.js`
- `src/hooks/useMaterials.js`
- `src/hooks/useHistory.js`
- `src/hooks/useSpatialAnalysis.js`

### Dashboard
Main file: `src/components/userDashboard/Dashboard/Dashboard.jsx`

Purpose:
- show project overview
- storage statistics
- quick actions
- recent activity
- project library

Supporting data hook:
- `src/hooks/useDashboard.js`

### 2D/3D bridge
Main file: `src/utils/editorSceneBridge.js`

Purpose:
- save temporary live snapshots in session storage
- convert a 2D plan into a 3D scene
- convert a 3D scene into a 2D plan

This is one of the most viva-worthy parts because it demonstrates algorithmic and architectural thinking.

## 6. Important Backend Modules

### `app/main.py`
This is the FastAPI application entry point.
It:
- creates the app
- configures CORS
- registers routers
- pings MongoDB on startup
- ensures indexes
- performs storage-to-database sync on startup
- exposes static video and project asset routes
- provides a model proxy endpoint

### Authentication routes
File: `app/routes/auth_routes.py`

Endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password-confirm`

### Project routes
File: `app/routes/project_routes.py`

Endpoints support:
- save project
- list projects
- latest project
- open owned project
- update project
- get public project
- delete project
- upload video
- upload `glb`/`usdz` assets

### Model routes
File: `app/routes/model_routes.py`

Endpoints support:
- list models
- provide model manifest for prefetching
- register uploaded models
- upload model preview images

### Database layer
File: `app/core/database.py`

Collections:
- `users`
- `projects`
- `designs`
- model records are also used through the shared database object

Indexes:
- unique email index on users
- sorting indexes on project activity fields

### Security layer
File: `app/core/security.py`

Responsibilities:
- password normalization and bcrypt hashing
- password verification
- JWT token creation and decoding
- extracting the current authenticated user

## 7. Database Design

### User document
Main fields:
- name
- email
- password hash
- created_at
- updated_at
- optional reset token and reset expiry

### Project document
Main fields:
- user_id
- title
- thumbnail_url
- scene_data
- preview_video
- model_assets
- created_at
- updated_at
- last_opened_at

### Model metadata
Main fields:
- name
- filename
- category
- url
- size_bytes
- preview_url

### Why MongoDB was suitable
- project scene data is nested and JSON-like
- rooms, walls, furniture, materials, and lighting are hierarchical structures
- schema flexibility helps during rapid prototyping
- MongoDB works naturally with JavaScript-style objects from the frontend

## 8. Core Scene Data Model

The saved project scene is not just an image. It stores structured room information such as:
- rooms
- walls
- furniture
- materials
- lighting

This allows the system to:
- reopen and edit previous projects
- generate thumbnails again
- share projects
- export and import scene state
- convert across 2D and 3D editors

## 9. Key Algorithms and Logic You Should Explain

### 1. Room area calculation
Used in 2D planning.
The code uses the shoelace formula to calculate polygon area from corner points.

Why important:
- gives room area
- supports room metadata
- shows mathematical reasoning in the project

### 2. Point-in-polygon test
Used to determine whether furniture belongs inside a room.

Why important:
- helps assign furniture to rooms
- useful for selection and room ownership logic

### 3. Snap-to-grid
In the 2D planner, points can snap to grid intervals for cleaner room geometry.

Why important:
- improves usability
- reduces irregular wall placement
- makes measurements more consistent

### 4. Wall hit testing
When placing doors and windows, the system checks where the click lies relative to a wall segment.

Why important:
- enables accurate opening placement
- prevents placement outside the wall span

### 5. 2D to 3D conversion
The bridge code converts room polygons, wall thickness, openings, and furniture layout into 3D scene objects.

Important details:
- points in pixels are converted to meters
- room polygons become footprints
- walls become 3D wall entities
- furniture is matched to 3D model metadata using name/category hints

### 6. 3D to 2D conversion
The system can also derive a floor plan from a 3D snapshot.

Important details:
- room footprint is projected into 2D points
- walls and openings are reconstructed
- furniture is converted into symbolic 2D objects

### 7. Model manifest prioritization
Backend model manifest logic assigns category priorities and sorts by file size so the frontend can prefetch useful models first.

Why important:
- reduces perceived loading time
- improves UX

### 8. Autosave and snapshot generation
`useProjectSave.js` periodically saves project state and captures thumbnails from the canvas.

Why important:
- protects user work
- creates dashboard previews

## 10. Authentication Flow

### Simple viva answer
We implemented JWT-based authentication. A user registers with name, email, and password. Passwords are hashed using bcrypt before storage. On login, the backend verifies credentials and returns a JWT access token. The frontend stores the token in local storage and sends it in the `Authorization` header for protected requests.

### Password reset flow
1. User submits email.
2. Backend checks whether account exists.
3. Backend generates a secure temporary token.
4. Reset link is sent by email.
5. User submits new password with token.
6. Backend validates token expiry and updates password.

## 11. API Design Points

### Why we used REST APIs
- simple and understandable for CRUD operations
- suitable for authentication, projects, and media upload
- easy to test with frontend and Postman

### Examples of API groups
- auth APIs
- project APIs
- model APIs
- media upload APIs

### Example viva answer
We separated APIs by responsibility so authentication, projects, and model management remain modular. This improves maintainability and makes the backend easier to extend later.

## 12. Frontend Design Decisions

### Why React
- component-based
- reusable UI blocks
- strong ecosystem
- state-driven rendering is ideal for editors

### Why `react-three-fiber`
- lets us use Three.js with React component patterns
- easier state synchronization with React UI

### Why `react-konva`
- good for interactive 2D drawing on canvas
- easier event handling for drag, click, and shape editing

### Why separate 2D and 3D editors
- 2D is better for precise planning
- 3D is better for visualization and immersion
- combining both gives users flexibility

## 13. Backend Design Decisions

### Why FastAPI
- fast to build APIs
- async support
- built-in docs
- strong validation using Pydantic

### Why async Mongo access
- backend can handle I/O operations efficiently
- useful when loading projects, models, or cloud resources

### Why startup sync with cloud storage
The backend syncs model files from storage into MongoDB so the app always has updated metadata for available models.

## 14. Storage and Asset Handling

The project distinguishes between:
- structured data in MongoDB
- binary assets like previews, videos, and model files in storage

This is good design because databases are better for metadata, while files/CDNs are better for large media.

## 15. Performance Considerations

Points you can say:
- model list is cached briefly on backend
- manifest is sorted to prefetch important and smaller assets first
- indices are created on high-usage MongoDB fields
- large media upload sizes are validated
- 2D and 3D state is serialized instead of storing raw rendered outputs

## 16. Security Considerations

Implemented:
- bcrypt hashing for passwords
- JWT tokens for authenticated access
- protected project routes using bearer auth
- input validation using Pydantic
- upload size checks for media
- CORS configuration

Honest limitation:
- token storage is currently in local storage, which is simpler but less secure than httpOnly cookies for production-grade security

## 17. Challenges We Likely Faced

Good viva points:
- synchronizing 2D and 3D representations
- handling room geometry and openings correctly
- keeping UI responsive while working with 3D assets
- saving complex scene data in a reusable format
- managing both local editor state and backend persistence
- dealing with furniture model matching between symbolic 2D items and 3D asset metadata

## 18. Innovation / Strongest Features

These are your best selling points:
- dual-mode editing: 2D plan plus 3D scene
- live bridge between editors
- structured scene persistence
- customizable lighting and materials
- shareable project pages
- model prefetch strategy using manifest priority
- support for future cost estimation, shown by the `Lumiere Costable Elements.md` design document

## 19. Current Limitations

Be honest and confident:
- some editor logic is large and could be further modularized
- local storage token management can be improved
- collaboration is single-user, not real-time multi-user
- advanced cost estimation is planned but not fully integrated
- geometry validation for highly complex floor plans can still be improved
- public project viewing exists, but access control could be extended further

## 20. Future Scope

- AI-based design recommendations
- automatic furniture suggestions based on room type
- real-time collaborative editing
- better collision detection and space optimization
- AR/VR walkthrough mode
- complete cost estimation engine using the costable elements design
- export to professional design formats
- analytics and recommendation dashboard

## 21. What Each Team Member Could Claim

Use this only if it matches your group work:

### Frontend member
- routing and UI structure
- 2D floor planner
- 3D room scene and controls
- dashboard design

### Backend member
- FastAPI routes
- auth flow
- MongoDB schema and services
- file upload and cloud sync

### Integration member
- API integration
- project save/load
- 2D/3D bridge logic
- deployment and environment setup

## 22. Very Basic Viva Questions With Answers

### What is Lumiere?
Lumiere is an interior design platform that allows users to create room layouts in 2D and visualize them in 3D with materials, lighting, furniture, and project saving.

### What problem does it solve?
It helps users plan and visualize room designs more easily than using imagination alone or static sketches.

### What type of project is this?
It is a full-stack web application.

### Which languages are used?
- JavaScript for frontend
- Python for backend

### Which database is used?
MongoDB.

### Which framework is used in frontend?
React with Vite.

### Which framework is used in backend?
FastAPI.

### Why did you choose MongoDB?
Because project scene data is nested and flexible, so a document database fits naturally.

### What is JWT?
JWT is a token format used to authenticate users after login without storing server-side session state for every request.

## 23. Intermediate Viva Questions With Answers

### How is the project structured?
The project is split into a frontend folder and backend folder. The frontend handles user interaction and rendering, while the backend handles authentication, storage, and APIs.

### How do users save projects?
The frontend serializes room, wall, furniture, material, and lighting state into JSON and sends it to the backend. The backend stores it in MongoDB and returns project metadata including a share URL.

### How is password security handled?
Passwords are normalized and hashed with bcrypt before they are stored. During login, the entered password is verified against the stored hash.

### How do you protect routes?
The frontend blocks access to private pages if no token exists, and the backend verifies bearer tokens for protected endpoints.

### How are rooms represented?
In 2D they are polygons made of corner points and walls. In 3D they are room objects with width, depth, height, and optionally custom footprints.

### How are doors and windows stored?
They are stored as wall openings with properties such as type, width, offset, and style information.

### What is the role of the model manifest?
It provides model metadata in a form optimized for frontend prefetching and loading priority.

## 24. Advanced Viva Questions With Answers

### Explain the 2D to 3D conversion logic.
The 2D planner stores room polygons, wall thickness, openings, and symbolic furniture. The bridge utility converts pixel-based coordinates into meter-based world coordinates, builds room footprints, generates 3D walls, transforms openings into door/window entities, and maps 2D furniture items to matching 3D model metadata using category and keyword hints.

### Explain the 3D to 2D conversion logic.
The bridge reads the 3D room snapshot, converts footprints and wall segments into 2D plan coordinates, reconstructs wall openings, and creates symbolic 2D furniture objects from placed 3D items.

### Why is storing scene data better than storing only images?
Images are static and cannot be edited later. Structured scene data preserves geometry and object properties, so projects can be reopened, modified, exported, and transformed between editors.

### How does the backend improve performance?
It uses MongoDB indexes, lightweight caching for model lists, asynchronous requests, and filtered manifest generation for model prefetching.

### Why did you separate services and routes in the backend?
Routes handle HTTP interaction, while services contain business logic. This improves maintainability, readability, and testability.

### Why are there both local file asset URLs and cloud model URLs?
Cloud URLs are used for the shared model catalog, while local/static-served asset URLs are used for user-generated project exports like preview videos and model files.

### What are the tradeoffs of using local storage for tokens?
It is easy to implement and works well in development, but it is more exposed to XSS risk than using secure httpOnly cookies.

## 25. Design and Software Engineering Questions

### Which software engineering principles are visible in your project?
- modularity
- separation of concerns
- component reuse
- service-based backend organization
- schema validation
- iterative extensibility

### Where is separation of concerns visible?
- frontend UI components are separated from hooks and utilities
- backend routes are separated from services, schemas, and config
- conversion logic is isolated in bridge utilities

### Why is this project scalable?
Because the architecture is layered, the APIs are modular, MongoDB supports flexible scene documents, and heavy media is stored separately from metadata.

## 26. Testing / Validation Questions

If asked and you do not have formal tests, answer honestly:
We mainly validated the system through functional testing of user flows like registration, project creation, editor switching, saving/loading, and asset uploads. A future improvement would be automated unit and integration tests.

## 27. Deployment Questions

### How is the backend deployed?
The repository includes a `render.yaml` file showing backend deployment on Render using Uvicorn to run the FastAPI app.

### What environment variables are required?
Important ones include:
- MongoDB URI and database name
- JWT secret
- frontend URL / CORS origins
- mail credentials
- B2/cloud storage credentials
- media serve URLs

## 28. Best 60-Second Viva Summary

Lumiere is a full-stack interior design web application where users can design rooms in both 2D and 3D. The frontend is built with React, Vite, React Konva, and React Three Fiber, while the backend uses FastAPI and MongoDB. Users can register, log in, create floor plans, place furniture, customize materials and lighting, save projects, and share them. One of the strongest parts of the project is the bridge between 2D and 3D editors, where structured scene data is converted both ways instead of storing only static images. This makes the project interactive, reusable, and extensible for future features like cost estimation and AI-assisted design.

## 29. Best "Why is your project good?" Answer

Our project is strong because it solves a real visualization problem, combines multiple technologies in a meaningful way, supports both precision planning and immersive viewing, and stores data in a reusable structured format. It is not just a static website; it includes authentication, API integration, geometry handling, 2D and 3D editors, persistence, and clear future scope.

## 30. Best "What did you learn?" Answer

We learned how to integrate frontend and backend systems, handle authentication securely, design data structures for complex scenes, work with both 2D canvas and 3D rendering, and think about architecture, user experience, and scalability together instead of as separate parts.

## 31. Best "What would you improve next?" Answer

The next improvements would be better automated testing, stronger production security for auth tokens, more advanced geometry validation, real-time collaboration, and a fully integrated cost estimation engine based on our existing costable-elements design.

## 32. Short Speaking Tips

- Start from problem, not technology.
- Say "structured scene data" often because it sounds strong and is true.
- Highlight the 2D to 3D bridge as your key technical differentiator.
- If you do not know a detail, explain the design logic confidently.
- Be honest about limitations; examiners usually appreciate that.
- When asked "why this technology?", always answer in terms of suitability, not popularity.

## 33. Quick Revision Keywords

- React
- FastAPI
- MongoDB
- JWT
- bcrypt
- REST API
- scene serialization
- 2D floor planning
- 3D visualization
- model manifest
- prefetch optimization
- session snapshot bridge
- shoelace formula
- point-in-polygon
- cloud asset sync
- project persistence
