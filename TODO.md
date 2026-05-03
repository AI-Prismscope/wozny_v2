# TODO & Technical Debt Tracker

This file tracks pending features, technical debt, and improvements for the Wozny V2 project.

---

## 🔴 HIGH PRIORITY

### Session Management UI
**Status:** Not Started  
**Priority:** High  
**Effort:** Medium-Large  
**Files:** `src/lib/db/persistence.ts`, UI components (to be created)

**Description:**
Currently, when a user uploads a new CSV file and existing sessions are present in the database, the application automatically creates a new session without prompting the user. This prevents users from:
- Viewing their session history
- Loading a previous session
- Choosing whether to create a new session or continue an existing one

**Requirements:**
1. **Session List Modal/UI Component**
   - Display all existing sessions with metadata:
     - File name
     - Created date
     - Last updated date
     - Active status
   - Show when user uploads a file and existing sessions are found

2. **User Actions**
   - **CREATE_NEW:** Create a new session (current behavior)
   - **LOAD_EXISTING:** Select and load a previous session
   - **CANCEL:** Abort the upload operation

3. **Implementation Details**
   - Update `handleNewFile()` in `persistence.ts` to:
     - Check for existing sessions
     - Show modal if sessions exist
     - Wait for user choice before proceeding
   - Create session selection modal component
   - Handle session activation via `activateSession()` (already implemented)
   - Update store state when loading existing session

4. **Edge Cases to Handle**
   - What happens to the uploaded file if user cancels?
   - Should we allow merging uploaded data into existing session?
   - How to handle conflicts if loaded session has different columns?

**Related Code:**
- `src/lib/db/persistence.ts` - `handleNewFile()` function (lines ~145-190)
- `src/lib/db/db.ts` - Helper functions already exist:
  - `getAllSessions()`
  - `getSessionById()`
  - `activateSession()`
  - `loadSession()`

**Notes:**
- Database schema already supports multiple sessions
- Backend logic is complete
- Only UI/UX implementation is missing

---

### Session List Display in rehydrateSession
**Status:** Not Started  
**Priority:** High  
**Effort:** Small-Medium  
**Files:** `src/lib/db/persistence.ts`, `src/lib/store/useWoznyStore.ts`

**Description:**
The `rehydrateSession()` function fetches all sessions but cannot return them to the UI because it returns a boolean. The session list needs to be accessible to the UI for display.

**Requirements:**
1. Add a new Zustand store action to hold available sessions list
2. Update `rehydrateSession()` to populate this store state
3. Create UI component to display session list (can be combined with Session Management UI above)

**Implementation Options:**
- **Option A:** Add `availableSessions` state to `useWoznyStore`
- **Option B:** Create separate `useSessionStore` for session management
- **Option C:** Return sessions via callback/event system

**Related Code:**
- `src/lib/db/persistence.ts` - `rehydrateSession()` function (lines ~320-355)
- `src/lib/store/useWoznyStore.ts` - Store definition

---

## 🟡 MEDIUM PRIORITY

### ~~CSV Parser Test Coverage~~ ✅ COMPLETED
**Status:** Completed (2026-05-03)  
**Priority:** Medium  
**Effort:** Small-Medium  
**Files:** `src/features/upload/utils/parser.test.ts`

**Description:**
Comprehensive test suite implemented with 32 test cases covering:
- Basic CSV parsing functionality
- Missing value handling ([MISSING] replacement)
- Whitespace trimming
- Empty line skipping
- Quoted fields with commas and newlines
- Special characters and unicode
- Edge cases (headers only, single column, etc.)
- Error handling
- Different line endings (CRLF, LF)
- Real-world scenarios (customer data, financial data, dates)

**Test Coverage:**
- ✅ 32 tests implemented
- ✅ All tests passing
- ✅ Edge cases covered
- ✅ Real-world scenarios tested

---

## 🟢 LOW PRIORITY

### ~~Verify getCurrentSessionId Usage~~ ✅ COMPLETED
**Status:** Completed (2026-05-03)  
**Priority:** Low  
**Effort:** Small  
**Files:** `src/lib/db/persistence.ts`

**Resolution:**
Made `getCurrentSessionId()` an internal function (removed export) with comprehensive documentation:
- ✅ Removed from public API
- ✅ Added detailed JSDoc comments
- ✅ Documented intended use case
- ✅ Explained why UI components should use db.ts API instead

**Reasoning:**
Function is currently unused and provides access to internal state. UI components should query session information directly from the database using `getActiveSession()` from db.ts for consistency and to avoid coupling to internal persistence state.

---

## ✅ COMPLETED

### Duplicate Code Cleanup
**Completed:** 2026-05-03  
**Issues Resolved:**
- Removed unused imports (ArrowLeft, Papa)
- Extracted duplicate session query patterns into helpers
- Consolidated duplicate isRehydrating guards
- Eliminated unreachable code paths in handleNewFile()
- Moved TODOs to centralized tracker

### CSV Parser Test Coverage
**Completed:** 2026-05-03  
**Achievement:**
- Implemented 32 comprehensive test cases
- 100% test pass rate
- Covers all edge cases and real-world scenarios
- Tests missing value handling, whitespace, quotes, special characters, and line endings

### getCurrentSessionId Made Internal
**Completed:** 2026-05-03  
**Achievement:**
- Removed function from public API (removed export)
- Added comprehensive JSDoc documentation
- Documented intended use case and reasoning
- Clarified that UI components should use db.ts API instead

---

## NOTES

- This file should be updated as issues are resolved or new technical debt is identified
- Consider moving to GitHub Issues for better tracking and collaboration
- Priority levels: 🔴 High (blocks features) | 🟡 Medium (quality/testing) | 🟢 Low (cleanup)
