# Lumiere Project Technology Inventory

This file is a repo-level inventory of the main modules, libraries, stacks, services, tooling, and assets used in this project as currently declared in the codebase.

## 1. Project shape

Root workspace: `C:\Users\kalya\Lumiere`

Primary app areas:

- `lumiere-frontend/`: React frontend for landing page, auth flows, dashboard, 2D editor, 3D editor, viewer, onboarding, and admin model preview tooling.
- `lumiere-backend/`: FastAPI backend for auth, projects, models, preview uploads, budget-related scene data, and storage sync.
- Root `package.json`: dev orchestration for running frontend and backend together.
- `render.yaml`: backend deployment definition.
- `lumiere-frontend/vercel.json`: frontend SPA rewrite config for deployment.

## 2. Main technology stack

### Frontend

- Language/runtime: JavaScript, JSX, browser runtime
- Framework: React 19
- Router: `react-router-dom`
- Build tool: Vite 7
- Styling: CSS, Tailwind CSS 4, Ant Design, MUI, Emotion
- State management: Zustand
- 2D rendering: Konva via `react-konva`
- 3D rendering: Three.js via `@react-three/fiber`, `@react-three/drei`
- 3D physics/collision stack: `@react-three/cannon`, `@react-three/rapier`
- Motion/animation: GSAP, Framer Motion, Barba
- Gesture/input helpers: `@use-gesture/react`
- Onboarding/tours: Shepherd.js
- Utilities: Axios, UUID, `clsx`, `tailwind-merge`, `class-variance-authority`, `simplex-noise`

### Backend

- Language/runtime: Python 3.12
- API framework: FastAPI
- ASGI server: Uvicorn
- Validation/models: Pydantic v2
- Database: MongoDB
- Mongo drivers: Motor, PyMongo
- Auth/security: JWT, bcrypt, FastAPI HTTP Bearer auth
- Email: `fastapi-mail`, `aiosmtplib`
- Object/document IDs: `bson`
- Environment loading: `python-dotenv`
- HTTP clients: `requests`, `httpx`, `httpcore`
- Storage integration: Backblaze B2 via `b2sdk`

### Deployment and hosting

- Frontend deployment target: Vercel-style SPA config in `lumiere-frontend/vercel.json`
- Backend deployment target: Render via `render.yaml`
- Asset/model storage: Backblaze B2
- Public asset delivery: configurable CDN/B2 public URL
- Local fallback database support: local Mongo URI fallback is built into backend config

## 3. Internal code modules

### Frontend source modules

Top-level frontend source folders in `lumiere-frontend/src`:

- `api/`: API clients and auth requests
- `assets/`: images, icons, videos, GLB files, and UI media
- `components/`: app UI and feature modules
- `hooks/`: reusable React hooks
- `lib/`: utility helpers such as class-name merging
- `providers/`: app-wide providers such as performance mode
- `stores/`: Zustand stores
- `ui/`: shared UI primitives such as toast notifications
- `utils/`: business logic helpers for auth, scene conversion, budgets, measurements, colors, room layout, furniture/light state, share URLs, and API helpers

Major frontend feature modules visible from code:

- Landing page and marketing scenes
- Login, registration, reset password
- User dashboard
- 2D room editor
- 3D room editor
- Project viewer
- Onboarding tour flow
- Admin model preview studio
- Performance mode controls
- Recording and save/share UI
- Furniture, lighting, materials, room creation, wall editing, door/window editing
- Gesture tracking support through MediaPipe-loaded browser scripts

### Backend source modules

Top-level backend app folders in `lumiere-backend/app`:

- `core/`: config, database bootstrap, security
- `database/`: database access bridge
- `models/`: Pydantic/domain models
- `routes/`: FastAPI route modules
- `schemas/`: API request/response schemas
- `services/`: business logic and integrations
- `utils/`: helper logic, measurements, budget calculations

Major backend feature modules visible from code:

- Authentication routes and services
- Password reset email flow
- Project CRUD and project asset handling
- Model metadata and light-style override handling
- Preview upload handling
- MongoDB connection management and index creation
- Backblaze B2 sync into MongoDB
- Static serving for generated videos and project assets
- Readiness and root health endpoints

## 4. Frontend dependencies

Direct runtime dependencies from `lumiere-frontend/package.json`:

- `@ant-design/icons` `^6.1.0`
- `@barba/core` `^2.10.3`
- `@emotion/react` `^11.14.0`
- `@emotion/styled` `^11.14.1`
- `@mui/icons-material` `^7.3.9`
- `@mui/material` `^7.3.9`
- `@radix-ui/react-slot` `^1.2.4`
- `@react-three/cannon` `^6.6.0`
- `@react-three/drei` `^10.7.7`
- `@react-three/fiber` `^9.5.0`
- `@react-three/rapier` `^2.2.0`
- `@use-gesture/react` `^10.3.1`
- `antd` `^6.3.0`
- `axios` `^1.13.5`
- `class-variance-authority` `^0.7.1`
- `clsx` `^2.1.1`
- `framer-motion` `^12.38.0`
- `gsap` `^3.14.2`
- `konva` `^10.2.3`
- `leva` `^0.10.1`
- `lucide-react` `^1.8.0`
- `react` `^19.2.4`
- `react-dom` `^19.2.4`
- `react-konva` `^19.2.3`
- `react-router-dom` `^6.30.3`
- `shepherd.js` `^15.2.2`
- `simplex-noise` `^4.0.3`
- `tailwind-merge` `^3.5.0`
- `three` `^0.183.0`
- `uuid` `^13.0.0`
- `zustand` `^5.0.12`

Direct frontend dev/build dependencies:

- `@eslint/js` `^9.39.1`
- `@tailwindcss/vite` `^4.2.2`
- `@types/react` `^19.2.7`
- `@types/react-dom` `^19.2.3`
- `@vitejs/plugin-react` `^5.1.1`
- `eslint` `^9.39.1`
- `eslint-plugin-react-hooks` `^7.0.1`
- `eslint-plugin-react-refresh` `^0.4.24`
- `globals` `^16.5.0`
- `tailwindcss` `^4.2.2`
- `vite` `^7.3.1`

Frontend build/config files in use:

- `lumiere-frontend/vite.config.js`
- `lumiere-frontend/eslint.config.js`
- `lumiere-frontend/jsconfig.js`
- `lumiere-frontend/index.html`

Frontend path aliases configured in Vite:

- `@` -> `src`
- `@components` -> `src/components`
- `@hooks` -> `src/hooks`
- `@utils` -> `src/utils`

## 5. Backend dependencies

### Backend application-facing libraries

These are the main backend libraries actively reflected in source imports or runtime config:

- `fastapi`
- `uvicorn`
- `starlette`
- `pydantic`
- `pydantic-settings`
- `motor`
- `pymongo`
- `bcrypt`
- `jwt`
- `python-dotenv`
- `fastapi-mail`
- `aiosmtplib`
- `email-validator`
- `certifi`
- `requests`
- `httpx`
- `httpcore`
- `python-multipart`
- `b2sdk`
- `dnspython`
- `cryptography`

### Full pinned backend `requirements.txt` inventory

The current backend requirements file includes the following packages:

- `aiosmtplib==5.1.0`
- `annotated-doc==0.0.4`
- `annotated-types==0.7.0`
- `anyio==4.13.0`
- `asttokens==3.0.1`
- `attrs==26.1.0`
- `b2sdk==2.10.4`
- `backcall==0.2.0`
- `bcrypt==5.0.0`
- `beautifulsoup4==4.14.3`
- `bleach==6.3.0`
- `blinker==1.9.0`
- `certifi==2026.2.25`
- `cffi==2.0.0`
- `charset-normalizer==3.4.7`
- `click==8.3.2`
- `colorama==0.4.6`
- `cryptography==46.0.6`
- `decorator==5.2.1`
- `defusedxml==0.7.1`
- `dnspython==2.8.0`
- `docopt==0.6.2`
- `dotenv==0.9.9`
- `email-validator==2.3.0`
- `executing==2.2.1`
- `fastapi==0.135.3`
- `fastapi-mail==1.6.2`
- `fastjsonschema==2.21.2`
- `h11==0.16.0`
- `httpcore==1.0.9`
- `httpx==0.28.1`
- `idna==3.11`
- `ipython==8.12.3`
- `jedi==0.19.2`
- `Jinja2==3.1.6`
- `jsonschema==4.26.0`
- `jsonschema-specifications==2025.9.1`
- `jupyter_client==8.8.0`
- `jupyter_core==5.9.1`
- `jupyterlab_pygments==0.3.0`
- `jwt==1.4.0`
- `logfury==1.0.1`
- `MarkupSafe==3.0.3`
- `matplotlib-inline==0.2.1`
- `mistune==3.2.0`
- `motor==3.7.1`
- `nbclient==0.10.4`
- `nbconvert==7.17.0`
- `nbformat==5.10.4`
- `packaging==26.0`
- `pandocfilters==1.5.1`
- `parso==0.8.6`
- `pickleshare==0.7.5`
- `platformdirs==4.9.4`
- `prompt_toolkit==3.0.52`
- `pure_eval==0.2.3`
- `pycparser==3.0`
- `pydantic==2.12.5`
- `pydantic-settings==2.13.1`
- `pydantic_core==2.41.5`
- `Pygments==2.20.0`
- `pymongo==4.16.0`
- `python-dateutil==2.9.0.post0`
- `python-dotenv==1.2.2`
- `python-multipart==0.0.22`
- `pyzmq==27.1.0`
- `referencing==0.37.0`
- `regex==2025.11.3`
- `requests==2.33.1`
- `rpds-py==0.30.0`
- `six==1.17.0`
- `soupsieve==2.8.3`
- `stack-data==0.6.3`
- `starlette==0.52.1`
- `tinycss2==1.4.0`
- `tornado==6.5.5`
- `traitlets==5.14.3`
- `typing-inspection==0.4.2`
- `typing_extensions==4.15.0`
- `urllib3==2.6.3`
- `uvicorn==0.43.0`
- `wcwidth==0.6.0`
- `webencodings==0.5.1`
- `yarg==0.1.9`

Note: the requirements file includes both core runtime packages and notebook/document-processing related packages currently pinned in the backend environment.

## 6. Root-level tooling

Root `package.json` tooling:

- `concurrently` `^8.2.2`

Root scripts:

- `dev`: runs backend and frontend together
- `dev-backend`: runs Uvicorn from the backend virtual environment
- `dev-frontend`: runs frontend Vite dev server
- `sync-b2-models`: runs the B2-to-Mongo sync script

## 7. External services and integrations

Configured or referenced external services:

- MongoDB
- Backblaze B2 object storage
- CDN/public asset base URL for models and previews
- SMTP email server for password reset flow
- Vercel frontend hosting config
- Render backend hosting config
- Browser-loaded MediaPipe scripts from `cdn.jsdelivr.net`

Environment/config values explicitly referenced in backend/frontend config:

- `ENVIRONMENT`
- `APP_ENV`
- `MONGO_URI`
- `LOCAL_MONGO_URI`
- `MONGO_FALLBACK_ENABLED`
- `MONGO_DB_NAME`
- `JWT_SECRET_KEY`
- `SECRET_KEY`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `B2_PUBLIC_URL`
- `B2_KEY_ID`
- `B2_APP_KEY`
- `B2_BUCKET_NAME`
- `CDN_BASE`
- `VIDEOS_DIR`
- `VIDEO_SERVE_URL`
- `PROJECT_ASSETS_DIR`
- `PROJECT_ASSET_SERVE_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `MAIL_SERVER`
- `MAIL_PORT`
- `PYTHON_VERSION`
- `WEB_CONCURRENCY`

## 8. Asset and content formats used

File and media types present in the repo:

- `.jsx`, `.js`, `.css`, `.html`, `.json`, `.md`
- `.py`, `.txt`, `.yaml`
- `.png`, `.jpg`, `.svg`, `.ico`
- `.mp4`
- `.glb`, `.gltf`, `.fbx`, `.blend`
- `.webmanifest`, `.xml`

Asset categories visible in frontend:

- 3D furniture models
- landing page graphics
- logo/brand assets
- room theme images
- lighting preset images
- tutorial videos
- social/SEO preview images

## 9. Runtime behavior and architecture notes

Observed architecture traits from source:

- SPA frontend with route rewrites to `index.html`
- Token-based auth with JWT
- FastAPI routers grouped by auth, models, and projects
- Mongo-backed persistence with index setup at startup
- Local Mongo fallback support when primary URI is unavailable
- Static file mounts for videos and project assets
- B2-backed model/preview storage and sync
- 2D editor and 3D editor coexist in the same frontend app
- Viewer/admin tools share the same frontend codebase
- Browser-side MediaPipe hand tracking is loaded through CDN scripts, not a local npm package import

## 10. Files used to build this inventory

- `C:\Users\kalya\Lumiere\package.json`
- `C:\Users\kalya\Lumiere\render.yaml`
- `C:\Users\kalya\Lumiere\lumiere-frontend\package.json`
- `C:\Users\kalya\Lumiere\lumiere-frontend\vite.config.js`
- `C:\Users\kalya\Lumiere\lumiere-frontend\eslint.config.js`
- `C:\Users\kalya\Lumiere\lumiere-frontend\vercel.json`
- `C:\Users\kalya\Lumiere\lumiere-frontend\index.html`
- `C:\Users\kalya\Lumiere\lumiere-frontend\src\App.jsx`
- `C:\Users\kalya\Lumiere\lumiere-frontend\src\main.jsx`
- `C:\Users\kalya\Lumiere\lumiere-frontend\src\components\gestures\HandTracker.jsx`
- `C:\Users\kalya\Lumiere\lumiere-backend\requirements.txt`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\main.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\core\config.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\core\database.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\core\security.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\routes\auth_routes.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\services\preview_service.py`
- `C:\Users\kalya\Lumiere\lumiere-backend\app\services\sync_b2_to_mongo.py`

