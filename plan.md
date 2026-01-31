# Project Plan: Wozny V2 - Hybrid ML Integration

## 1. Project Overview
* **Application Type:** Next.js Web Application (React 19, TailwindCSS 4)
* **Goal:** Elevate into an "Intelligent Data Workshop" using Hybrid Machine Learning.
* **Core Philosophy:** **Local-First.**

## 2. Technical Architecture
| Layer | Type | Technology | Hardware | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1** | **Deterministic** | Regex | CPU | Formatting |
| **Layer 2** | **Analytical** | `transformers.js` | **CPU (WASM)** | Embeddings, Clustering |
| **Layer 3** | **Generative** | `@mlc-ai/web-llm` | **GPU (WebGPU)** | Reasoning |

## 3. Phased Build Plan

### Phase 1: Architecture & Prototyping (Complete)
- [x] **Task 1: Infrastructure**
  - `@huggingface/transformers` installed.
  - `ml-worker.ts` and `kmeans.ts` implemented.

### Phase 2: "Smart Grouping" Logic (Complete)
- [x] **Task 2: Logic**
  - K-Means implemented.
  - Worker supports `cluster-texts`.

### Phase 3: UX Integration (Complete)
- [x] **Task 3.1: Report View Redesign**
  - Master-Detail Layout.
- [x] **Task 3.2: Smart Analysis View**
  - "Group by Similarity" feature.
- [x] **Task 3.3: Store Integration**
  - `addColumn` action.

### Phase 4: Workflow & Documentation (Complete)
- [x] **Task 4.1: "About Wozny" Tab**
  - Mission & Features logic implemented.
  - "Local-First" documentation codified.

### Phase 5: "Smart Split" & Quality Polish (Complete)
- [x] **Task 5.1: Address Extraction**
  - Regex-based waterfall for Street/City/State/Zip.
- [x] **Task 5.2: Surgical Remediations**
  - Standardized `[MISSING]` labeling.
  - Issue-aware "Auto-Fix" logic.

### Phase 6: Performance & UI Polish (Complete)
- [x] **Task 6.1: Dynamic Column Sizing**
  - Canvas-based measurement engine (`measure-utils.ts`).
  - Automated sampling (100 rows) on data changes.

### Phase 7: Remediation & UI Polish (Complete)
- [x] **Task 7.1: Temporal Remediation**
  - Robust Date Normalizer (`normalizeDate`).
  - Auto-Fix integration for text and numeric dates.
- [x] **Task 7.2: Categorical Casing**
  - Whitespace & Casing fixes for Payment/Status/Type columns.
- [x] **Task 7.3: Smart UX**
  - Underscore-aware header wrapping.
  - Interactive header text selection enabled.
### Phase 8: Financial Remediation (Complete)
- [x] **Task 8.1: Currency Normalization**
  - Robust Currency Normalizer (`normalizeCurrency`).
  - Auto-Fix integration for price, cost, and amount columns.
  - Standardized decimal precision (2 decimal places) with robust rounding.
