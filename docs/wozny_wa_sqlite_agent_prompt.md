# Agent Prompt: Add wa-sqlite Persistent Storage to Wozny

## Role and Objective

You are a senior software engineer working on **Wozny**, a privacy-first, browser-based data cleaning application built with Next.js. Your task is to add persistent storage using **wa-sqlite with an OPFS (Origin Private File System) backend**.

Currently all application state lives in Zustand stores (`useWoznyStore`, `useAnalysisStore`) and is lost on page refresh. The goal is to persist this state so users can resume their work across sessions without needing to re-upload or re-clean their data.

**Do not write any implementation code until explicitly instructed to proceed to a phase.**

---

## Step 0 — Codebase Review and Compatibility Report (Do This First)

Before proposing any implementation plan, review the codebase thoroughly and produce a structured report covering the following:

### 1. Current Storage Architecture
- Identify all files related to `useWoznyStore` and `useAnalysisStore`
- Document what state shape each store holds (fields, types, structure)
- Identify where state is read from and written to across the codebase
- Document the current IndexedDB Cache usage (used by the embeddings/ML layer) and confirm its implementation pattern

### 2. Current Export Service
- Locate the Export Service
- Document what it currently exports (file formats, data shape)
- Note how it accesses store state

### 3. Web Worker Architecture
- Identify the existing Web Workers (LLM Worker, Embeddings Worker, Analysis Runner)
- Note how they communicate with the main thread
- Confirm whether a dedicated worker pattern already exists that wa-sqlite can follow (wa-sqlite requires running in a Web Worker with OPFS)

### 4. Next.js Configuration
- Identify the Next.js version in use
- Check `next.config.js` for existing WASM, worker, or OPFS-related configuration
- Note whether the app uses the App Router or Pages Router, as this affects how Web Workers are configured
- Check if `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers are set (required for OPFS SharedArrayBuffer access)

### 5. Package and Dependency Audit
- Check `package.json` for existing dependencies relevant to storage, workers, or WASM
- Confirm Node version and whether it is compatible with wa-sqlite's build requirements
- Note any existing bundler plugins (e.g. for WASM loading)

### 6. Compatibility Risk Assessment
Produce a table with the following columns: **Area**, **Current State**, **Compatibility Risk**, **Notes**

Flag any of the following as risks if found:
- Missing COOP/COEP headers (blocks OPFS SharedArrayBuffer)
- App Router SSR components that touch store state (wa-sqlite is browser-only)
- Workers not yet using a standard message pattern
- Any existing use of localStorage or sessionStorage that conflicts with the new approach

### 7. Proposed Data Schema
Based on the store shapes identified, propose a SQL schema for persisting Wozny state. Include:
- Table definitions with column names and types
- Which store fields map to which tables
- How sessions or named workspaces would be represented
- How transformation history (if present) would be stored

---

## Step 1 — Present the Phased Implementation Plan

After completing the review, present the following phased plan **without writing any code**. Confirm each phase matches what you found in the codebase.

---

### Phase 1 — Infrastructure: Install wa-sqlite and Configure OPFS Worker

**Scope:** Add wa-sqlite as a dependency, create a dedicated database Web Worker, verify OPFS is accessible in the browser, and confirm the worker can initialize a database that survives a page refresh.

**What to build:**
- Install `wa-sqlite` package
- Create a `db.worker.ts` (or `.js`) file that initializes wa-sqlite with the OPFS VFS
- Add a thin `db.ts` module on the main thread that communicates with the worker via `postMessage` / `MessageChannel`
- Add required COOP/COEP headers to `next.config.js` if not already present
- Write a minimal smoke test: worker opens a database, creates a test table, inserts one row, and on page reload confirms the row still exists

**Test criteria before proceeding to Phase 2:**
- [ ] `wa-sqlite` installs without dependency conflicts
- [ ] OPFS is available in the browser (check DevTools → Application → Storage)
- [ ] The db worker initializes without errors in the browser console
- [ ] A test table and row persists across a hard page refresh (Cmd+Shift+R)
- [ ] No regressions in existing app functionality

---

### Phase 2 — Schema: Create the Wozny Database Tables

**Scope:** Implement the SQL schema identified in the review. No store wiring yet — just the database structure.

**What to build:**
- A `migrations.ts` (or equivalent) module that runs `CREATE TABLE IF NOT EXISTS` statements on db initialization
- Tables for dataset state, transformation history, and analysis results as defined in the schema proposal
- A `db-version` table or pragma to support future schema migrations

**Test criteria before proceeding to Phase 3:**
- [ ] All tables are created on first load (verify in DevTools or a debug query)
- [ ] Running initialization a second time (page reload) does not throw errors or duplicate tables
- [ ] Schema matches the agreed proposal from the review

---

### Phase 3 — Persistence: Wire useWoznyStore to the Database

**Scope:** Connect `useWoznyStore` to the database so that state changes are written through automatically and state is rehydrated on page load.

**What to build:**
- A Zustand middleware or store subscriber that writes relevant state to the database after meaningful changes (debounced to avoid excessive writes)
- A rehydration function called during app initialization that reads from the database and populates the store before first render
- A loading state in the UI that prevents rendering stale or empty state while rehydration is in progress

**Test criteria before proceeding to Phase 4:**
- [ ] Upload a CSV, clean several columns, then hard-refresh the page — data and cleaning steps are restored
- [ ] The app does not flash empty state before rehydration completes
- [ ] Write performance is acceptable — no UI lag after cleaning operations
- [ ] No regressions in Upload, Workshop, or AskWozny views

---

### Phase 4 — Persistence: Wire useAnalysisStore to the Database

**Scope:** Same pattern as Phase 3, applied to `useAnalysisStore`.

**What to build:**
- Subscriber and rehydration for analysis results and any related state
- Confirm analysis results are restored correctly after refresh, including any computed values that should not be re-run automatically

**Test criteria before proceeding to Phase 5:**
- [ ] Run an analysis, refresh the page — results are visible without re-running
- [ ] Analysis state does not incorrectly trigger re-computation on load
- [ ] No regressions in Analysis Runner or Embeddings Worker behaviour

---

### Phase 5 — Session Management: Named Sessions and the Updated Export Flow

**Scope:** Give users basic session awareness and upgrade the Export Service to treat file export as an explicit backup action rather than the primary save mechanism.

**What to build:**
- A session concept in the database (a named or timestamped workspace row that groups a dataset with its transformation history)
- A minimal UI affordance showing the user their current session is saved (e.g. a status indicator, not a save button)
- Update the Export Service to make clear it is exporting a portable copy, not the primary save
- Optionally: a session list so users can return to previous workspaces

**Test criteria for Phase 5:**
- [ ] User can see their current session is persisted without any manual action
- [ ] Export still works correctly and produces the same output as before
- [ ] If a second dataset is loaded, it does not silently overwrite the previous session
- [ ] UI clearly communicates the difference between "saved locally" and "exported to file"

---

## General Instructions for the Agent

- **Do not skip phases.** Each phase must pass its test criteria before work begins on the next.
- **Do not modify the Web Worker architecture** for the LLM Worker or Embeddings Worker. The new db worker is additive, not a replacement for anything existing.
- **Preserve the privacy guarantee.** No phase should introduce any network call, external service, or telemetry. All storage must remain on-device.
- **Keep the Export Service intact** throughout all phases. It remains the user's escape hatch for portable files.
- **After each phase**, summarise what was built, confirm the test criteria were met, and explicitly ask for approval to proceed to the next phase.
- **If a compatibility issue is discovered** during the review that makes any phase infeasible as described, flag it clearly in the report and propose an alternative before proceeding.
