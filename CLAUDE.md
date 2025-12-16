# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AmaPlayer is a React-based sports social media platform built with Firebase backend, featuring athlete onboarding, profile management, real-time messaging, posts, events, and video talent showcases. The app is optimized for performance with virtual scrolling, code splitting, and offline-first architecture.

## Technology Stack

- **Frontend**: React 19, TypeScript, React Router v7
- **State Management**: Zustand (stores), React Context (Auth, Theme, Language), TanStack Query (server state)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Build**: CRACO (Create React App Configuration Override)
- **Bundling**: Webpack with custom chunk splitting (vendors, firebase, three, react)
- **Performance**: react-window (virtual scrolling), React Query offline-first caching
- **Media**: Three.js (3D effects), react-easy-crop (image cropping)

## Development Commands

### Essential Commands
```bash
npm run dev              # Start development server (same as npm start)
npm run build            # Production build with optimizations
npm run type-check       # TypeScript type checking (no emit)
npm run lint             # ESLint code linting
npm run lint:fix         # Auto-fix linting issues
npm run test             # Run tests once
npm run test:watch       # Run tests in watch mode
npm run validate         # Run type-check + lint
```

### Advanced Commands
```bash
npm run build:analyze    # Build with bundle analyzer (ANALYZE=true)
npm run build:serve      # Build and serve locally with serve
npm run test:coverage    # Run tests with coverage report
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without changes
npm run pre-commit       # Lint fix + format (before commits)
```

### Firebase Deployment
```bash
npm run build:all        # Build all configurations
npm run deploy:all       # Build all + deploy to Firebase hosting
firebase deploy --only hosting
firebase deploy --only functions
```

## Architecture

### Module System & Path Aliases

The project uses TypeScript path aliases defined in both `tsconfig.json` and `craco.config.js`:

```typescript
@/*            -> src/*
@components/*  -> src/components/*
@hooks/*       -> src/hooks/*
@utils/*       -> src/utils/*
@services/*    -> src/services/*
@types/*       -> src/types/*
@contexts/*    -> src/contexts/*
@store/*       -> src/store/*
@features/*    -> src/features/*
@pages/*       -> src/pages/*
@lib/*         -> src/lib/*
@constants/*   -> src/constants/*
```

Always use these aliases when importing across directories.

### Feature-Based Organization

Code is organized by features under `src/features/`:
- **auth**: Login, signup, authentication logic
- **athlete-onboarding**: Sport selection, position selection, multi-sport flows
- **profile**: User profiles (athlete, coach, parent, organization)
- **settings**: User settings management
- **stories**: Story creation, viewing, sharing
- **social**: Social interactions (likes, shares, comments)
- **messaging**: Real-time chat functionality

Each feature typically contains:
- `components/`: UI components specific to the feature
- `pages/`: Full page components
- `hooks/`: Feature-specific custom hooks
- `types/`: TypeScript interfaces for the feature
- `styles/`: CSS modules for the feature

### Service Layer Architecture

All Firebase operations are abstracted through services in `src/services/`:

- **`api/baseService.ts`**: Base class with CRUD operations, pagination, and query building
- **`api/userService.ts`**: User profile operations (athletes, coaches, parents, organizations)
- **`api/postsService.ts`**: Posts CRUD and engagement
- **`api/friendsService.ts`**: Friend requests, connections
- **`api/groupsService.ts`**: Groups management
- **`api/storiesService.ts`**: Stories CRUD
- **`api/momentsService.ts`**: Moments (temporary posts)
- **`api/videoService.ts`**: Video operations
- **`api/eventsService.ts`**: Events management
- **`notificationService.ts`**: Real-time notifications
- **`socialService.ts`**: Social interactions (likes, comments, shares)

Services follow a consistent pattern:
1. Extend `BaseService` when possible
2. Handle errors with `errorHandler` utility
3. Return typed data structures
4. Use Firestore converters for type safety

### State Management Strategy

**Three-tier state approach:**

1. **Global App State (Zustand)** - `src/store/`:
   - `appStore.ts`: UI state, modals, theme
   - `performanceStore.ts`: Performance metrics, video performance
   - `postInteractionsStore.ts`: Post likes, shares, engagement tracking

2. **Context Providers** - `src/contexts/`:
   - `AuthContext`: Current user, auth methods
   - `ThemeContext`: Dark/light mode
   - `LanguageContext`: i18n language selection

3. **Server State (TanStack Query)** - `src/lib/queryClient.ts`:
   - Offline-first configuration (5min stale time, 10min cache)
   - Query key factories in `queryKeys` object
   - Automatic retry, refetch on reconnect
   - Cache invalidation helpers

**Rule:** Use TanStack Query for all server data fetching. Use Zustand only for client-side UI state.

### Custom Hooks Pattern

The `src/hooks/` directory contains reusable logic:

- **Data Fetching**: `useUserQueries.ts`, `usePostQueries.ts`
- **Real-time**: `useRealtimeEngagement.ts`, `useRealtimeComments.ts`, `useRealtimeFriendRequests.ts`
- **Performance**: `usePerformanceMonitor.ts`, `useVideoPerformance.ts`, `useVirtualScroll.ts`
- **Social**: `useSocialActions.ts`, `usePostInteractions.ts`, `useFriendsManagement.ts`
- **Media**: `useMediaUpload.ts`, `useVideoAutoPlay.ts`, `useVideoManager.ts`

When creating hooks:
- Prefix with `use`
- Return objects with descriptive keys (not arrays)
- Handle loading/error states
- Use React Query for data fetching hooks

### Type System

Types are centralized in `src/types/` organized by domain:
- `api/`: Firebase document types
- `components/`: Component prop types
- `contexts/`: Context value types
- `hooks/`: Hook return types
- `models/`: Business logic types
- `store/`: Zustand store types
- `utils/`: Utility function types

Features may have local `types/` directories for feature-specific types (e.g., `src/features/profile/types/ProfileTypes.ts`).

**Important types:**
- `UserRole`: 'athlete' | 'organization' | 'parent' | 'coach'
- `PersonalDetails`: User profile data (role-specific fields)
- `BaseDocument`: All Firestore documents extend this

### User Roles and Profiles

The app supports four user roles with distinct profile structures:

1. **Athlete**: sport, position, playerType, physicalAttributes, talentVideos
2. **Coach**: specializations, yearsExperience, certifications
3. **Parent**: child details, schoolInfo, childSports, aspirations
4. **Organization**: organizationType, location, sports[], facilities[]

User data is stored in role-specific collections:
- `users/`: Common user data
- `athletes/`: Athlete-specific data
- `coaches/`: Coach-specific data
- `parents/`: Parent-specific data
- `organizations/`: Organization-specific data

When querying users, join data from the role-specific collection.

### Firebase Configuration

Firebase is initialized in `src/lib/firebase.ts`:
- Environment variables: `REACT_APP_FIREBASE_*` (see `.env` file)
- Services: `auth`, `db` (Firestore), `storage`, `messaging`, `analytics`
- Offline persistence enabled for Firestore
- Emulator support for development

### Performance Optimizations

**Code Splitting:**
- Route-based splitting with `React.lazy()` and `Suspense`
- Webpack chunks: home, profile, search, messages, events, stories, onboarding, verification
- Critical chunks (home, profile) are preloaded after 1 second

**Virtual Scrolling:**
- `react-window` for long lists (posts, users, messages)
- Custom hooks: `useVirtualScroll.ts`, `useProgressiveLoading.ts`
- Infinite loading with `react-window-infinite-loader`

**Image/Video Optimization:**
- Progressive image loading: `ProgressiveImage.tsx`, `LazyLoadImage.tsx`
- Video autoplay management: `useVideoAutoPlay.ts`, `useVideoManager.ts`
- Lazy video loading: `LazyVideo.tsx`

**Caching:**
- React Query offline-first strategy
- Service Worker registration (`src/utils/service/serviceWorkerRegistration.ts`)
- IndexedDB persistence for Firestore

### Error Handling

Centralized error handling:
- `src/utils/error/errorHandler.ts`: Global error handler
- `src/utils/error/authErrorHandler.ts`: Firebase auth errors
- `src/components/common/safety/ErrorBoundary.tsx`: React error boundaries
- `ChunkErrorBoundary.tsx`: Handles code-splitting errors

All async operations should wrap errors with appropriate handlers.

### Routing Structure

Routes are defined in `src/App.tsx`:

**Public Routes:**
- `/`: Welcome page
- `/about/:role`: Role-specific about pages
- `/login/:role?`: Login with optional role
- `/signup`: Signup flow

**Athlete Onboarding Routes:**
- `/athlete-onboarding/sport`: Sport selection
- `/athlete-onboarding/position`: Position selection
- `/athlete-onboarding/multi-position`: Multi-sport flow
- `/athlete-onboarding/subcategory`: Subcategory selection
- `/athlete-onboarding/specialization`: Specialization
- `/athlete-onboarding/personal-details`: Personal info form

**Protected Routes (require auth via `<PrivateRoute>`):**
- `/home`: Main feed
- `/search`: User/content search
- `/moments`: Temporary moments feed
- `/add-post`: Create new post
- `/messages`: Messaging inbox
- `/events`: Events listing
- `/profile/:userId?`: User profile (own or others)
- `/settings`: User settings
- `/post/:postId`: Post detail view
- `/story/:storyId`: Story viewer
- `/story-share/:storyId`: Share story (public)
- `/verify/:verificationId`: Verification page
- `/verify/:userId/:videoId`: Video verification

### Component Structure

**Common components** (`src/components/common/`):
- `analytics/`: Share analytics, share history
- `Avatar/`: Avatar with badges
- `comments/`: Comment section, comment input
- `debug/`: Performance dashboard, debug tools
- `error/`: Error boundaries, retry handlers
- `feed/`: Feed card components
- `feedback/`: Loading spinners, toasts, error messages
- `forms/`: Form fields, language selector, video upload
- `loading/`: Skeleton loaders, loading indicators
- `media/`: Image croppers, lazy loading, video player, optimized images
- `modals/`: Share modal, comment modal, filter modal, verification modals
- `network/`: Network status indicator
- `safety/`: Error boundaries

**Feature components** are in `src/features/[feature]/components/`.

### Language and Internationalization

Multi-language support via `LanguageContext`:
- Translations: `src/services/i18n/translations.ts`
- Persistence: `src/services/i18n/languagePersistenceService.ts`
- Hook: `useLanguage()` from `src/hooks/useLanguage.ts`

Supported languages are defined in translations service. User language preferences are stored per-user in Firestore.

### Testing

Tests use React Testing Library and Jest:
- Test files: `*.test.tsx` or `*.test.ts`
- Setup: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- Coverage: `npm run test:coverage`

When writing tests:
- Use `render()` from `@testing-library/react`
- Query with `getByRole`, `getByText`, `getByTestId`
- Fire events with `userEvent` or `fireEvent`
- Mock Firebase with `jest.mock('@/lib/firebase')`

### Build Configuration

**CRACO Config** (`craco.config.js`):
- Path aliases matching `tsconfig.json`
- Production optimizations:
  - Gzip compression for js/css/html/svg
  - Chunk splitting (vendors, firebase, three, react)
  - Tree shaking (usedExports, sideEffects)
  - CSS minimization disabled (due to parsing issues - fix CSS first)

**Environment Variables:**
All Firebase config must be in `.env`:
```
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_MEASUREMENT_ID=
```

### Common Patterns

**Fetching User Data:**
```typescript
import { useUserQueries } from '@hooks/useUserQueries';
const { data: user, isLoading } = useUserQueries.useUserProfile(userId);
```

**Posting Data:**
```typescript
import postsService from '@services/api/postsService';
await postsService.createPost(postData);
queryClient.invalidateQueries({ queryKey: ['posts'] });
```

**Managing Social Interactions:**
```typescript
import { useSocialActions } from '@hooks/useSocialActions';
const { handleLike, handleComment } = useSocialActions();
```

**Handling Auth:**
```typescript
import { useAuth } from '@contexts/AuthContext';
const { currentUser, signup, login, logout } = useAuth();
```

## Known Issues and Constraints

- CSS minimization is disabled in production builds due to parsing errors in existing CSS files
- TypeScript strict mode is disabled (`strict: false`) - type checking is lenient
- Firebase hosting cache headers are set to no-cache for JS/CSS to avoid stale code issues
- Service worker may cause caching issues during development - clear cache if needed

## Development Workflow

1. **Starting development**: `npm run dev`
2. **Before committing**: `npm run pre-commit` (lint + format)
3. **Type checking**: `npm run type-check` (catches type errors without building)
4. **Testing**: `npm run test:watch` (for iterative development)
5. **Building**: `npm run build` (creates optimized production build in `build/`)
6. **Deploying**: `npm run deploy:all` (builds + deploys to Firebase)

## Firebase Firestore Collections

Main collections:
- `users`: User accounts and basic info
- `athletes`: Athlete-specific profile data
- `coaches`: Coach-specific profile data
- `parents`: Parent-specific profile data
- `organizations`: Organization-specific profile data
- `posts`: User posts with media
- `stories`: Temporary stories
- `moments`: Ephemeral moments
- `comments`: Post/story comments
- `events`: Events and competitions
- `groups`: User groups
- `messages`: Chat messages
- `conversations`: Message threads
- `notifications`: User notifications
- `friendRequests`: Friend connection requests
- `talentVideos`: Athlete talent showcase videos

Subcollections are commonly used (e.g., `users/{userId}/settings`, `posts/{postId}/comments`).

## Admin Dashboard

A separate admin dashboard exists in `admin/amaplayer-admin-dashboard/` (not covered here, separate React app).
 




 When you make changes and want to redeploy:

  # Build both apps
  npm run build
  cd admin/amaplayer-admin-dashboard && npm run build && cd ../..

  # Prepare deployment
  node scripts/prepareDeployment.js

  # Deploy to Firebase
  firebase deploy --only hosting

  Congratulations! Your announcement system is fully functional and live!