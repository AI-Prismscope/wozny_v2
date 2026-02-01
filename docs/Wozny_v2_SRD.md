# Wozny V2 Security & Robustness Requirements (SRD)

**Project:** Wozny - Data Workshop (v2)  
**Document:** Security & Robustness Requirements (SRD)  
**Status:** DRAFT / AUDIT COMPLETE  
**Last Updated:** February 1, 2026

---

## 1. Security & PII Protection

### **Risk: Regex ReDoS (Denial of Service)**
*   **Identified Problem:** The `generalMatch` regex in `split-utils.ts` uses a greedy `^(.*)` catch-all followed by a space. This is vulnerable to "Catastrophic Backtracking" if a maliciously long string is processed that matches the start but fails at the zip code.
*   **Implemented Solution:** 
    *   Switch to non-greedy matching `(.*?)`.
    *   Implement a 256-character hard limit on input strings before regex execution.

### **Risk: PII Metadata Leakage**
*   **Identified Problem:** While execution is local-first, PII sampled for LLM context enters the browser's model runtime and may be stored in standard browser caches or IndexedDB history.
*   **Implemented Solution:** 
    *   Implement "Client-Side Sanitization" to redact obvious PII (emails, full phone numbers) from strings sent to the LLM internal prompt if those fields aren't the subject of the query.

---

## 2. Resource Management (Zombies)

### **Risk: ML Worker Memory Leaks**
*   **Identified Problem:** `useMLWorker.ts` lacks a cleanup function. Worker threads and their associated ~22MB WASM models remain active in memory even after the component unmounts.
*   **Implemented Solution:** 
    *   Implement `worker.terminate()` in the `useEffect` cleanup hook.
    *   Switch to a "Singleton Worker" pattern to share one instance across all views and control its lifecycle globally.

### **Risk: Message Listener Accumulation**
*   **Identified Problem:** `useMLWorker.ts` adds new listeners on every function call without a robust "Once" or "Cleanup" mechanism if the promise rejects.
*   **Implemented Solution:** 
    *   Added centralized `requestId` mapping. Listener only responds to the specific ID of the caller and removes itself immediately upon completion or error.

---

## 3. Package & WASM Optimization

### **Risk: Large WASM Payload Bloat**
*   **Identified Problem:** The app downloads multiple large WASM/Model binaries. Repeated loads can hit browser origin storage limits.
*   **Implemented Solution:** 
    *   Implemented a "Model Status" dashboard to show the user how much local space Wozny is using (~50MB+).
    *   Implemented a "Clear Cache" button to purge the Transformers.js and WebLLM IndexedDB caches.

---

## 4. ML Robustness & Hardware

### **Risk: Cloning Overhead**
*   **Identified Problem:** Large result arrays (Clustering results) are currently cloned between threads, causing UI jank on datasets >10k rows.
*   **Implemented Solution:** 
    *   Enforced **Transferable Objects** for all worker communications. Used `Int32Array` buffers for clustering results and `Float32Array` for embeddings to move data without copying.

### **Risk: WebGPU/WASM Load Failures**
*   **Identified Problem:** No recovery logic for interrupted model downloads or WebGPU context loss.
*   **Implemented Solution:** 
    *   Implemented an exponential backoff "Retry" button (manual `resetWorker`) for model initialization.
    *   Added a "Hardware Fallback" mechanism: Explicitly attempts WebGPU first, catches failure, and falls back to WASM, notifying the UI of the active device.

---

## 5. Logic Integrity (Shadowing)

### **Risk: Strategy Conflict (Split vs. Fix)**
*   **Identified Problem:** `parseAddress` (Split) and `applyDictionary` (Auto-Fix) contain overlapping, disjointed logic.
*   **Implemented Solution:** 
    *   Unified Normalizer: Moved all string transformations (TitleCase, Dictionary, Regex) into a single `lib/normalizers.ts`.
    *   Refactored "Smart Split" to invoke this shared normalizer, guaranteeing consistency.

---

## 6. Architectural Separation

### **Risk: Tight Coupling (God Store)**
*   **Identified Problem:** `useWoznyStore.ts` manages file I/O, UI state, Analysis logic, and Sorting.
*   **Implemented Solution:** 
    *   **Feature Modularization:** Extracted analysis logic to a dedicated `useAnalysisStore` that subscribes to main data changes.
    *   **Service Layer:** Moved sorting logic into `lib/services/sorting.ts`, making the store a thin state wrapper.
