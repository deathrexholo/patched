
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Dev Server
- **Start dev server:** `npm start` or `npm run dev`
- **Build for production:** `npm run build` (includes optimization)
- **Build with analysis:** `npm run build:analyze` (generates bundle report)
- **Serve production build locally:** `npm run build:serve`

### Linting & Formatting
- **Run linter:** `npm run lint`
- **Fix linting issues:** `npm run lint:fix`
- **Format code:** `npm run format`
- **Check formatting:** `npm run format:check`

### Testing
- **Run tests once:** `npm test`
- **Run tests in watch mode:** `npm run test:watch`
- **Run tests with coverage:** `npm run test:coverage`

### Type Checking
- **Type check:** `npm run type-check`
- **Type check in watch mode:** `npm run type-check:watch`
- **Full validation:** `npm run validate` (runs type-check + lint)

### Pre-commit
- **Auto-fix before commit:** `npm run pre-commit` (runs lint:fix + format)

## Project Architecture

### Stack
- **React 19** with TypeScript
- **Firebase** (Auth + Firestore)
- **React Router 7** for navigation
- **Zustand** for lightweight state management
- **React Query** for data fetching and caching
- **Three.js** for 3D features
- **Craco** for CRA configuration without ejecting

### Path Aliases (tsconfig.json)
All imports use path aliases for cleaner code:
- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@hooks/*` → `src/hooks/*`
- `@services/*` → `src/services/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@contexts/*` → `src/contexts/*`
- `@store/*` → `src/store/*`
- `@features/*` → `src/features/*`
- `@pages/*` → `src/pages/*`
- `@lib/*` → `src/lib/*`

### High-Level Architecture

#### 1. **Context Layer** (`src/contexts/`)
Global state managed via React Context:
- **AuthContext** - User authentication, signup, login, password management
- **ThemeContext** - Dark/light theme toggling
- **LanguageContext** - Multi-language support

#### 2. **Store Layer** (`src/store/`)
Zustand stores for application state:
- **appStore** - General app state
- **postInteractionsStore** - Post-specific interactions
- **performanceStore** - Performance monitoring

#### 3. **Service Layer** (`src/services/api/`)
Firestore-based services for data operations:
- **commentService** - Comment CRUD across all content types (posts, stories, moments)
- **postsService** - Post creation, retrieval, engagement operations
- **storiesService** - Story management
- **momentsService** - Video moment management
- **userService** - User profile and data with backward compatibility for role-specific collections
- **parentsService** - Parent profile CRUD operations (role-specific collection)
- **coachesService** - Coach profile CRUD operations (role-specific collection)
- **organizationsService** - Organization profile CRUD operations (role-specific collection)
- **athletesService** - Athlete profile CRUD operations (role-specific collection)
- **friendsService** - Connections and relationships
- **eventsService** - Event management
- **verificationService** - User verification flows
- **baseService** - Shared utilities for all services

#### 4. **Hooks Layer** (`src/hooks/`)
Reusable React hooks:
- **useRealtimeComments** - Real-time comment synchronization from Firestore
- **useRealtimeEngagement** - Real-time tracking of likes, comment counts, shares
- **useAuth** - Global authentication state
- **usePostInteractions** - Post-specific interaction handlers

#### 5. **Components Layer** (`src/components/`)
Organized by feature type:
- **common/** - Reusable components (modals, video, comments, safety wrappers)
- **common/comments/CommentSection.tsx** - Main reusable comment display component
- **common/modals/CommentModal.tsx** - Modal for browsing all post comments
- **common/video/VideoComments.tsx** - Comments wrapper for video/moment content
- **common/safety/SafeComment.tsx** - Safe rendering to prevent React errors

#### 6. **Pages & Features** (`src/pages/` and `src/features/`)
Page-level components organized by feature:
- **pages/home/** - Home feed with posts
- **pages/postdetail/** - Individual post detail view
- **features/profile/** - User profile and account management
- **features/auth/** - Login/signup flows
- **features/stories/** - Story features
- **features/athlete-onboarding/** - Athlete registration flow

#### 7. **Utilities** (`src/utils/`)
Helper functions organized by category:
- **error/** - Error handling and user-friendly messages
- **validation/** - Input validation
- **rendering/** - Safe rendering utilities (comment rendering safety)
- **service/** - Service-related utilities (service worker registration)
- **logging/** - Centralized logging system
- **diagnostics/** - Firebase diagnostic tools

### Data Flow Pattern

```
User Action (Component)
    ↓
Context/Store (State)
    ↓
Service Layer (Firebase Operations)
    ↓
Firestore Database
    ↓
Real-time Listeners (useRealtime* hooks)
    ↓
Components Update
```

### Firebase Structure

#### Role-Specific Collections (New Architecture)
The app now uses **role-specific Firestore collections** for user profiles with full backward compatibility:

**New Collections (Role-Based):**
- `parents/` - Parent user profiles with child information
- `coaches/` - Coach profiles with professional details
- `organizations/` - Organization profiles with facility information
- `athletes/` - Athlete profiles with sports details

**Legacy Collection (Backward Compatibility):**
- `users/` - Legacy user profiles (still supported for existing users)

**How It Works:**
- New signups are routed to role-specific collections based on selected role
- `userService.getUserProfile(uid, role)` checks role-specific collection first, then falls back to `users/` collection
- Existing users in `users/` collection continue to work seamlessly
- Services: `parentsService`, `coachesService`, `organizationsService`, `athletesService`

**Other Collections:**
- `posts/` - Post documents with embedded comments array
- `comments/` - Centralized comments collection (referenced by content)
- `stories/` - Story documents
- `moments/` - Video moment documents
- `friendConnections/` - User relationships

## Role-Based Signup System

### Overview
The app supports 4 distinct user roles, each with a custom registration flow:

1. **Parent** - Registers with child information, school details, and sports preferences
2. **Coach** - Registers with professional credentials, sport specialization, and experience
3. **Organization** - Registers with facility details, contact information, and sports offered
4. **Athlete** - Registers with personal details, sport selection, and athletic profile

### Parent Registration Form
**Location:** `src/login_flow/components/ParentRegistrationForm.tsx`

**Features:**
- 6-section comprehensive form with validation
- Dynamic city dropdown based on state selection
- Field validation (email regex, Indian phone format, DD-MM-YYYY date)
- Sections:
  1. Parent/Guardian Information
  2. Child (Player) Information
  3. School Information (Optional)
  4. Sports Details
  5. Additional Details (Achievements, Aspirations)
  6. Content Consent (Required)

### Signup Flow Architecture
**File:** `src/features/auth/Signup.tsx`

**How savePendingDetails() Works:**
1. User completes role-specific form in AboutPage (e.g., ParentRegistrationForm)
2. Form data saved to localStorage (e.g., `parentDetails`, `coachProfessionalDetails`)
3. User navigates to Signup page and creates Firebase Auth account
4. After authentication, `savePendingDetails()` executes:
   - Checks localStorage for role-specific data
   - Maps form data to appropriate role schema
   - Calls `userService.createRoleSpecificProfile(uid, role, data)`
   - Routes profile to correct Firestore collection (parents/coaches/organizations/athletes)
5. localStorage cleared, user redirected to /home

**Type Safety:**
- `src/types/models/parent.ts` - ParentProfile interface
- `src/types/models/coach.ts` - CoachProfile interface
- `src/types/models/organization.ts` - OrganizationProfile interface
- `src/types/models/athlete.ts` - AthleteProfile interface (uses existing User types)

## Comment System Architecture

### Overview
The comment system supports real-time synchronization across posts, stories, and moments using Firestore's real-time listeners.

### Key Files
- **src/services/api/commentService.ts** - Core CRUD operations and comment management
- **src/hooks/useRealtimeComments.ts** - Real-time comment fetching with auto-sync
- **src/components/common/comments/CommentSection.tsx** - Main comment display and input component
- **src/components/common/safety/SafeComment.tsx** - Safe rendering wrapper to prevent errors
- **src/utils/rendering/safeCommentRenderer.ts** - Data validation and sanitization utilities

### Real-Time Comments Feature
Comments now appear instantly when posted (no manual refresh needed):

**How it works:**
1. Component mounts and calls `useRealtimeComments(contentId, contentType)`
2. Hook sets up Firebase `onSnapshot` listener on comments collection
3. When comments change in Firestore, listener fires and updates UI
4. Real-time listeners active simultaneously for all open content

**Performance optimizations:**
- Updates debounced at 300ms (configurable via hook options)
- Listeners only created when component is mounted
- Automatic cleanup on unmount prevents memory leaks
- Batch retrieval available for multiple items

### Comment API Reference

**Add Comment:**
```typescript
import { commentService } from '@services/api/commentService';

const comment = await commentService.addComment(
  contentId,
  'post', // or 'story', 'moment'
  {
    text: "Comment text",
    userId: currentUser.uid,
    userDisplayName: currentUser.displayName,
    userPhotoURL: currentUser.photoURL
  }
);
```

**Get Real-Time Comments:**
```typescript
import { useRealtimeComments } from '@hooks/useRealtimeComments';

const { comments, loading, error, refresh } = useRealtimeComments(
  contentId,
  'post',
  { debounceMs: 300 } // optional
);
```

**Like/Unlike Comment:**
```typescript
await commentService.toggleCommentLike(commentId, userId);
```

**Edit Comment:**
```typescript
await commentService.editComment(commentId, newText);
```

**Delete Comment:**
```typescript
await commentService.deleteComment(commentId, contentId, contentType);
```

### Component Integration
**CommentSection** is the primary component for displaying and managing comments:
```typescript
import CommentSection from '@components/common/comments/CommentSection';

<CommentSection
  contentId={postId}
  contentType="post"
  currentUserId={userId}
/>
```

This component handles:
- Display of all comments in real-time
- Comment form for authenticated users
- Guest login prompt for non-authenticated users
- Edit/delete for comment owners
- Like/unlike functionality

### Error Prevention
**SafeComment** components wrap comment rendering to prevent React #31 errors:
- Multiple validation layers ensure data safety
- Safe timestamp formatting
- Protected comment data extraction
- Error boundaries with fallback UI

## Build & Performance Optimizations

### Webpack Configuration (craco.config.js)
- **Code splitting:** Chunks separated by vendor, Firebase, Three.js, React
- **Compression:** Gzip compression enabled for JS, CSS, HTML, SVG
- **Tree shaking:** Unused exports removed in production
- **Bundle analysis:** `npm run build:analyze` generates report

### CSS Notes
- **CSS minimization is disabled** due to parsing issues - CSS files are manually optimized
- Ensure CSS is properly formatted before committing
- Run `npm run format` to auto-format CSS files

### Lazy Loading
- Pages are lazy-loaded with `React.lazy()` and `Suspense`
- Critical routes (home, profile) are preloaded after app initialization
- Each major route has its own chunk name for better caching

## Error Handling

### Error Utilities
- **errorHandler** - General error handler with user-friendly messages
- **authErrorHandler** - Auth-specific error messages
- **engagementErrorHandler** - Comment/like operation errors

### Error Boundaries
- **ChunkErrorBoundary** - Handles code-splitting errors
- **ErrorBoundary** - Wraps all major sections with custom messages
- **SafeComment** - Prevents comment rendering errors

### Best Practices
- Always catch errors in async operations
- Use error handlers to provide user-friendly messages
- Log errors with context for debugging
- Display graceful fallback UI

## Firebase Integration

### Configuration
Firebase config is in `src/lib/firebase.ts`:
- Auth instance initialized with persistence options
- Firestore database connected
- Storage configured for file uploads

### Firestore Rules
- Rules file at `FIRESTORE_RULES.txt` (comprehensive security rules)
- Auth-based access control on collections
- Comment validation on write

### Diagnostics
- Run `runFirebaseDiagnostics()` to test Firebase connectivity
- Checks API key, auth domain, and project configuration
- Useful for debugging Firebase-related issues

## Testing

### Test Structure
- Tests are co-located with components (`.test.ts` files)
- Using React Testing Library and Jest
- ESLint rule: `@typescript-eslint/no-unused-vars` set to warn (not error)

### Run Single Test
```bash
npm test -- ComponentName.test.ts
```

## Common Development Patterns

### Adding a New Comment Feature
1. Add service method to `commentService.ts`
2. Create/update hook if real-time data is needed (useRealtimeComments)
3. Use `CommentSection` component or `SafeComment` wrapper
4. Test with real-time listeners by opening multiple windows

### Debugging Real-Time Comments
1. Open DevTools → Network → check for Firestore connections
2. Add `console.log('Comments updated:', comments)` in useEffect
3. Test by commenting in two browser windows simultaneously
4. Check for listener cleanup on component unmount

### Adding a New Service
1. Extend `baseService` if using common patterns
2. Use Firestore operations from `firebase/firestore`
3. Follow existing service patterns for consistency
4. Export from `src/services/api/index.ts`

## Important Notes

### Known Issues
- **CSS Minimization:** Disabled in production build due to parsing issues
- **Strict TypeScript:** Set to false for flexibility during development
- **Console Logs:** Enabled via ESLint config (no-console: off)

### Authentication
- Firebase persistence set to `browserLocalPersistence`
- Supports email/password, Google OAuth, and anonymous sign-in
- Profile updates include displayName and photoURL
- Password reset via email available

### Version Management
- Current app version: 2.1.1 (set in src/App.tsx)
- Stored in localStorage for version checks
- Update for cache invalidation when needed

### Service Worker
- Registered on app load with 2-second delay
- Enables offline functionality
- Non-blocking (errors silently handled)

## File Organization Tips

When adding new features:
1. **Components** go in `src/components/` organized by type
2. **Services** go in `src/services/api/` for data operations
3. **Hooks** go in `src/hooks/` for reusable logic
4. **Contexts** only for truly global state (auth, theme, language)
5. **Utils** in `src/utils/` organized by category
6. **Pages** in `src/pages/` or `src/features/` for feature-specific pages

## Additional Documentation

Detailed documentation available:
- `REALTIME_COMMENTS_GUIDE.md` - Comprehensive real-time comments explanation
- `REALTIME_COMMENTS_QUICK_REFERENCE.md` - Quick reference for comment hooks
- `IMPLEMENTATION_SUMMARY.md` - Feature implementation details
- `LIKE_SYSTEM_EXPLANATION.md` - How the like/engagement system works
- `REACT_HOOKS_FIX_REPORT.md` - React hooks optimization changes
- add to memory , "in the firebase i have obly one project called amaplay007  and inside it , it has two databases called ther "default" and another one is "events" the events page on the main app controlled through the admin dashboard and it's event is set through the admin dashboard and it's database is "events", and others data like react , like , comment and connection request and storage to the "default" , and there is section in admin dashboard connection request it fetch the data from the "organisation connection request"
- memories the things that we fix today , some critical fixes