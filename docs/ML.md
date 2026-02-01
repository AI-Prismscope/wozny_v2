# Wozny V2 Machine Learning Architecture

## Core Philosophy: Local-First Intelligence
Wozny operates on a "Privacy by Design" principle. All data analysis, including Machine Learning and Generative AI, occurs solely within the user's browser environment (Client-Side). No data is ever sent to a remote server for processing.

---

## The 3 Layers of Intelligence

### Layer 1: The Analyst (Deterministic)
The first layer is fast, synchronous, and rule-based. It handles structural health checks.
*   **Technology:** Pure TypeScript / Regex.
*   **Location:** `src/lib/data-quality.ts`
*   **Functionality:**
    *   **Duplicates:** Hashes rows to find exact matches.
    *   **Missing Values:** Scans for null, undefined, or empty strings.
    *   **Formatting:** Validates emails, phone numbers, and dates; includes **Date Remediation** (ISO-8601 normalization).
    *   **Smart Split:** Logic-aware data decomposition. Uses a **suffix-anchored waterfall** for robust address splitting and **cardinality/uniqueness checks** combined with business keyword blacklists to differentiate between People and Business Entities.
    *   **Smart Sorting:** Type-aware sorting engine that handles numerical currency (stripping symbols), temporal date ranges, and natural text. Features a 3-state cycle (Asc/Desc/Off) with stable index restoration.
    *   **Dynamic sizing:** Canvas-based text measurement engine for optimal grid layout.
    *   **Smart Typography:** Underscore-aware header wrapping for readability.

### Layer 2: The Brain (Analytical ML)
The second layer provides semantic understanding and clustering capabilities. It runs in a background Web Worker to prevent UI blocking.
*   **Technology:** `transformers.js` (Hugging Face) + Custom K-Means.
*   **Location:** `src/lib/ai/embeddings.worker.ts`
*   **Model:** `Xenova/all-MiniLM-L6-v2` (Quantized, ~22MB).
*   **Hardware:** WebGPU (Preferred) -> WASM (Fallback).
*   **Functionality:**
    *   **Feature Extraction:** Converts text cells into 384-dimensional vector embeddings.
    *   **Smart Grouping:** Uses K-Means clustering (k=5) to group semantically similar values (e.g., "Google" ≈ "Google Inc.").

### Layer 3: The Assistant (Generative AI)
The third layer is the reasoning engine, capable of understanding natural language queries and generating code.
*   **Technology:** `@mlc-ai/web-llm` (WebLLM).
*   **Location:** `src/lib/ai/llm.worker.ts`
*   **Model:** `Llama-3.2-3B-Instruct-q4f32_1-MLC`.
*   **Hardware:** WebGPU (GPU Accelerated).
*   **Functionality:**
    *   **Ask Wozny:** Translates natural language queries (e.g., "Show me missing emails from NY") into executable JavaScript filter functions.
    *   **Reasoning:** Can infer relationships and normalize data based on context.

---

## Security & Robustness

### PII Protection (Layer 3)
*   **Redaction:** Before any text is sent to the LLM context, it passes through a `redactPII` filter in `llm.worker.ts`.
*   **Method:** Regex-based masking replaces detected emails with `[EMAIL REDACTED]` and phone numbers with `[PHONE REDACTED]`.
*   **Scope:** This only applies to the *prompt context*. The actual row data remains untouched in the browser memory for the generated code to act upon locally.

### Reliability Architecture
*   **Singleton Pattern:** `useEmbeddingsWorker` manages a single reference-counted worker instance shared across all views.
*   **Zombie Prevention:** Workers auto-terminate after a 1000ms idle retention period once all subscribers (components) unmount.
*   **Hardware Fallback:** The Embeddings worker attempts to initialize via WebGPU first. If that fails (or context is lost), it gracefully downgrades to WASM execution.
*   **Transferables:** All large data vectors (`Float32Array`, `Int32Array`) are passed via `postMessage` transferables to prevent main-thread cloning jank.

## Implementation Details

### Embeddings Worker
*   **File:** `src/lib/ai/embeddings.worker.ts`
*   **Communication:** `postMessage` / `onmessage`.
*   **Task Types:**
    *   `feature-extraction`: Returns raw embeddings.
    *   `cluster-texts`: Orchestrates embedding generation -> K-Means clustering -> Return Group IDs.

### Ask Wozny (Generative)
The "Ask Wozny" feature uses a sophisticated prompt engineering pipeline to ensure successful code generation.
*   **Context Re-hydration:** The system prompt is dynamically updated with the current dataset schema, including column names and unique values for categorical columns.
*   **Fuzzy Logic:** The generated code runs against a `FuzzyRowProxy` that intercepts property access to handle case-insensitive column matching (e.g., `row['group']` matches `row['Group']`).

## Performance Limits
*   **UI Thread:** Capped at ~5,000 rows for real-time reactivity.
*   **ML Worker:** Can handle larger datasets (~20k rows) but is restricted by UI syncing limits.
*   **Model Loading:** Cached in Browser Storage (`IndexedDB`) after first load. Cache management is available in the Status Dashboard.
