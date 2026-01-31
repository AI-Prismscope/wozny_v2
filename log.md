# Project Error & Solutions Log

## Error Categories:
- **UNIT**: Unit test failures
- **INTEGRATION**: Integration test failures
- **EVAL**: AI/LLM Evaluation failures
- **SECURITY**: Security scan findings
- **DOCKER**: Container build/runtime errors
- **DEPLOYMENT**: CI/CD or Environment issues

---
**Timestamp:** `2026-01-24 13:52:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `Analysis UI Frozen at "Initializing AI Engine..." / "Analyzing Rows"`
**Root Cause Analysis:** `React Strict Mode (in Development) mounted the Analysis component twice. This triggered two competitive analysis jobs. The first "ghost" job completed but couldn't update the UI because it belonged to an unmounted component, while the second job was blocked.`
**Solution Implemented:** `Implemented the "Timeout Pattern" in useEffect. Added a 500ms delay to start the analysis, and a cleanup function to cancel the timer if the component unmounts immediately (as it does in Strict Mode mount-unmount-mount cycle).`
**Refactoring Action:** `Refactored AnalysisView.tsx to robustly handle component lifecycle events.`
---
**Timestamp:** `2026-01-24 14:03:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `Analysis Hang at 50%`
**Root Cause Analysis:** `Unclear if Engine or Logic was hanging. Suspected WebGPU worker initialization or prompt processing stall.`
**Solution Implemented:** `Added a "Health Check" (trivial inference request "Say OK") before the main batch processing loop to verify engine responsiveness.`
**Refactoring Action:** `Updated analysis-runner.ts to include debug logging and pre-flight health checks.`
---
**Timestamp:** `2026-01-24 14:14:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `App body scrolling instead of internal windows (Layout Overflow)`
**Root Cause Analysis:** `Shell.tsx was using min-h-screen, allowing the body to grow beyond the viewport. This broke the internal overflow-auto assumption of the Review/Diff views.`
**Solution Implemented:** `Changed Shell container to h-screen and overflow-hidden to force viewport constraint.`
**Refactoring Action:** `Standardized layout constraint in Shell.tsx.`
---
**Timestamp:** `2026-01-24 14:25:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `Theme Switcher not toggling dark mode`
**Root Cause Analysis:** `Tailwind CSS v4 (newest) defaults to "media" strategy (OS preference) for dark mode, ignoring the "class" strategy used by next-themes.`
**Solution Implemented:** `Added @custom-variant dark (&:where(.dark, .dark *)); to globals.css to manually bind the .dark class to the dark variant.`
**Refactoring Action:** `Updated globals.css to align with Tailwind v4 + next-themes requirements.`
---
**Timestamp:** `2026-01-24 14:29:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `First data row missing in Table/DataGrid`
**Root Cause Analysis:** `The DataGrid virtualization calculated row positions starting at y=0, but the Sticky Header (position: sticky) was overlaying the first 45px of content.`
**Solution Implemented:** `Added HEADER_HEIGHT (45px) offset to the total container height and the transform translateY of every virtual row.`
**Refactoring Action:** `Updated DataGrid.tsx to explicitly account for header height in layout calculations.`
---
**Timestamp:** `2026-01-24 14:32:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `TypeScript Error: 'jsonStr' is possibly 'null'`
**Root Cause Analysis:** `In AnalysisView.tsx, result array iteration didn't safely handle potential null/undefined values from the runner before string manipulation.`
**Solution Implemented:** `Added explicit if (!jsonStr) return; check before processing.`
**Refactoring Action:** `Improved type safety in AnalysisView result parsing.`
---
**Timestamp:** `2026-01-24 14:55:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Failed to parse batch result: JSON parse error`
**Root Cause Analysis:** `The Llama-3.2-3B model output conversational text (e.g., "Here is the JSON:") before the actual JSON array, causing JSON.parse() to fail on the leading characters.`
**Solution Implemented:** `Implemented a Regex extractor (/\[[\s\S]*\]/) to isolate the JSON array from the response string before parsing.`
**Refactoring Action:** `Hardened JSON Parsing logic in AnalysisView to be resilient to non-JSON noise.`
---
**Timestamp:** `2026-01-24 15:05:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Analysis Hallucination (High Error Count / False Positives)`
**Root Cause Analysis:** `The 3B model hallucinated multiple issues per cell because the prompt lacked negative constraints ("If valid, output nothing") and had confusing examples.`
**Solution Implemented:** `Refined prompt to enforce "Max 1 issue per cell" and "Only flag REAL issues". Simplified examples to remove bias (e.g., removed dates from examples).`
**Refactoring Action:** `Refined Prompt Engineering for Llama-3.2-3B context window.`
---
**Timestamp:** `2026-01-24 15:19:00`
**Category:** `DEPLOYMENT`
**Status:** `SOLVED`
**Error Message:** `JSON Parser Failed on Markdown Code Blocks`
**Root Cause Analysis:** `The previous Regex match /\[[\s\S]*\]/ failed when the model wrapped the output in markdown code blocks or added newlines that confused the greedy match.`
**Solution Implemented:** `Switched to substring extraction using indexOf('[') and lastIndexOf(']'). This reliably extracts the array payload regardless of surrounding markdown.`
**Refactoring Action:** `Removed fragile Regex dependency in AnalysisView.`
---

**Timestamp:** `2026-01-25 19:15:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Unexpected token 'function'` / `Unexpected token .`
**Root Cause Analysis:** `The Llama 1B model was outputting conversational text ("Here is the code") and "Arrow Function" headers before the actual Javascript code. The simple cleanup logic failed to strip this nose, causing new Function() to crash.`
**Solution Implemented:** `Implemented a smarter parser that first looks for Markdown blocks (backticks), and if that fails, scans for the specific arrow function signature "(row) =>".`
**Refactoring Action:** `Hardened Code Extraction logic in AskWoznyView.tsx.`
---
**Timestamp:** `2026-01-25 19:30:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Search returned 0 results (False Negatives)`
**Root Cause Analysis:** `The AI generated code using Dot Notation (row.Account Manager) which returns undefined for keys with spaces, and used strict equality (===) which failed on case/whitespace mismatches.`
**Solution Implemented:** `Updated System Prompt to strictly enforce: 1. Bracket Notation (row['Key']), 2. .toLowerCase(), 3. .trim().`
**Refactoring Action:** `Refined System Prompt in useWoznyLLM.ts for robust data access.`
---
**Timestamp:** `2026-01-25 19:53:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Unexpected token '?'`
**Root Cause Analysis:** `The browser's dynamic code evaluation (new Function) environment did not support modern Optional Chaining (?.) syntax used by the AI.`
**Solution Implemented:** `Updated System Prompt to explicitly forbid ?. and mandate classical && null checks.`
**Refactoring Action:** `Downgraded generating syntax complexity in useWoznyLLM.ts for compatibility.`
---
---
**Timestamp:** `2026-01-26 22:20:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `SyntaxError: Unexpected token ':'` / `Hallucination: Filtered for 'Active' instead of 'Missing'`
**Root Cause Analysis:** `The small model overfitted to the single provided example ("Status Active") and hallucinated TypeScript syntax ((row: any)) which is invalid in browser runtime execution.`
**Solution Implemented:** `Refactored System Prompt using "The Recipe Approach" (Positive Constraints). Explicitly commanded USE STANDARD JAVASCRIPT ES5 SYNTAX and added a specific "Missing Value" example to prevent overfitting.`
**Refactoring Action:** `Updated useWoznyLLM.ts prompt logic.`
---
**Timestamp:** `2026-01-26 22:50:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `AI Query Failed for "Missing" (False Negatives)`
**Root Cause Analysis:** `The AI assumed "missing" meant empty string or null. However, the CSV Parser explicitly transforms empty values into the string literal "[MISSING]". The AI's generated code (!row['Col']) returned false because "[MISSING]" is a truthy non-empty string.`
**Solution Implemented:** `Updated System Prompt to explicitly instruct the model that missing values equal '[MISSING]'.`
**Refactoring Action:** `Updated useWoznyLLM.ts to handle sentinel values.`
---
**Timestamp:** `2026-01-26 22:55:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `AI Output Too Chatty / Persistent Hallucination`
**Root Cause Analysis:** `The previous prompt was too complex and the example provided ("Active") was being copied blindly by the model for unrelated queries. The role "Expert" also encouraged conversational explanations instead of raw code.`
**Solution Implemented:** `Overhauled System Prompt: Changed role to "Code Snippet Generator". Removed the distracting "Active" example. Added explicit "Missng vs Present" logic examples. Enforced "No Intro/Outro" rule.`
**Refactoring Action:** `Streamlined useWoznyLLM.ts prompt.`
---
**Timestamp:** `2026-01-26 23:02:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `AI Returns Markdown/Conversational Text instead of Raw Code`
**Root Cause Analysis:** `The model persistently ignored "Output Raw Code Only" instructions and returned conversational wrappers ("Here is the code...", "const rows = ..."). This caused the manual string trimming to fail.`
**Solution Implemented:** `Implemented "Defensive Engineering" (Regex Extraction). instead of relying on the prompt, the code now uses Regex to scan for markdown code blocks (backticks) or arrow function signatures ((row) => ...), discarding all surrounding text.`
**Refactoring Action:** `Hardened result parsing in useWoznyLLM.ts.`
---
**Timestamp:** `2026-01-26 23:30:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Model ignoring strict prompts (Chattiness/Creativity)`
**Root Cause Analysis:** `We were using default inference parameters (likely Temperature > 0.7), which physically forced the model to be "creative" and violate negative constraints.`
**Solution Implemented:** `Implemented 'Inference Parameter Tuning'. Updated generateText to accept an options object. Hardcoded 'temperature: 0.0' and 'max_tokens: 256' for the code generation task to enforce determinism.`
**Refactoring Action:** `Updated LLM Core to support variable inference parameters.`
---
**Timestamp:** `2026-01-27 15:30:00`
**Category:** `REFACTOR`
**Status:** `CLEANUP`
**Action:** `Removed Defensive Regex from useWoznyLLM.ts`
**Rationale:** `With Temperature 0.0 and correct Prompting now enforcing strict output, the complex regex fallback was dead code. Replaced with simple Markdown stripper for cleaner maintenance.`
**Result:** `Simplified codebase while maintaining robustness.`
---
**Timestamp:** `2026-01-27 15:40:00`
**Category:** `LOGIC_FIX`
**Status:** `SOLVED`
**Error Message:** `AI Inverted "Missing" Logic (returned present rows)`
**Root Cause Analysis:** `Ambiguity in "Show me X" prompts caused the model to default to "Show me where X exists" (existence check) rather than the requested "Show me where X is missing".`
**Solution Implemented:** `Updated prompt to explicitly distinguish between "Find MISSING" (=== '[MISSING]') and "Find PRESENT" (!== '[MISSING]'). Added clear examples for both cases.`
**Refactoring Action:** `Refined Prompt Logic in useWoznyLLM.ts`
---
**Timestamp:** `2026-01-27 17:55:00`
**Category:** `DOCS`
**Status:** `PUBLISHED`
**Action:** `Updated Small (3B) Model Guide`
**Details:** `Added sections on 'Physic of Boring' (Inference Params), 'Reasoning Gap' (Index Mapping), and '3-Layer Defense' (Translator-Enforcer-SafetyNet).`
**Impact:** `Codified the learnings from the 'Chatty AI' debugging session.`
---
**Timestamp:** `2026-01-27 18:45:00`
**Category:** `DOCS`
**Status:** `PUBLISHED`
**Action:** `Refined Small Model Guide Philosophy`
**Details:** `Replaced 'Recipe Approach' with 'Pattern-Based Engineering' (Few-Shot Prompting). This reflects our finding that 1B models respond better to pattern completion than rule compliance.`
**Impact:** `Documentation now aligns with the V3.0 Prompt Architecture.`
---
**Timestamp:** `2026-01-28 15:30:00`
**Category:** `PERFORMANCE`
**Status:** `AUDIT_COMPLETE`
**Action:** `Performance & Architecture Review`
**Details:** `Confirmed NO heavy AI loop exists. Analysis is pure deterministic JS. Bottleneck is Main Thread UI blocking during initial upload sync analysis.`
**Impact:** `Confirmed architecture supports >20k rows logic-wise, but locked to 5k hard limit for UI responsiveness per user request.`
---
**Timestamp:** `2026-01-28 15:45:00`
**Category:** `UI_UX`
**Status:** `PUBLISHED`
**Action:** `Added Dataset Dimensions to Report`
**Details:** `Added 'X Rows x Y Columns' badge to Executive Report header. Implemented Hard Blocking for uploads >5000 rows with clear error messaging.`
**Impact:** `Improved user transparency regarding dataset size and system limits.`
---
**Timestamp:** `2026-01-28 16:00:00`
**Category:** `LOGIC_FIX`
**Status:** `SOLVED`
**Action:** `Updated Auto-Fix Dictionary`
**Details:** `Added 'borough' to the Title Case whitelist in data-quality.ts.`
**Impact:** `Auto-fix now correctly normalizes Borough names (e.g., 'brooklyn' -> 'Brooklyn').`

---
**Timestamp:** `2026-01-29 18:00:00`
**Category:** `FEATURE`
**Status:** `PUBLISHED`
**Action:** `Implemented Global "Ignored Columns" Visibility`
**Details:** `Added "GlobalVisibilityToggle" (Eye Icon) to header. Allows users to completely hide ignored columns from the Workshop Grid, Issue Counts, and CSV Exports. Implemented filtering logic in WorkshopView and DiffView.`
**Impact:** `Users can now curate the dataset by "Ignoring" irrelevant columns, resulting in a cleaner UI and exported file.`

---
**Timestamp:** `2026-01-29 18:15:00`
**Category:** `BUG_FIX`
**Status:** `SOLVED`
**Error Message:** `Review & Export Tab ignored hidden columns`
**Root Cause Analysis:** `The DiffView component was reading raw state.columns instead of the filtered list. It also used an internal export function instead of the shared utility.`
**Solution:** `Updated DiffView to inherit global visibility settings and reuse downloadCleanCsv. Also swapped UI layout to show "Cleaned Output" on top (primary) and "Original Source" on bottom (primary download action is top).`
**Refactoring Action:** `Unified Export & Visibility Logic across views.`

---
**Timestamp:** `2026-01-31 09:30:00`
**Category:** `INTEGRATION`
**Status:** `SOLVED`
**Error Message:** `Unknown task type: cluster-texts`
**Root Cause Analysis:** `The UI was trying to call the "cluster-texts" task on the ML Worker, but the worker code had only been partially updated (missing the actual message handler in the switch statement), causing it to throw an "Unknown task" error.`
**Solution Implemented:** `Updated src/lib/workers/ml-worker.ts to explicitly handle the 'cluster-texts' message type and route it to the handleClusterTexts function.`
**Refactoring Action:** `Completed ML Worker implementation for clustering.`
---
**Timestamp:** `2026-01-31 09:45:00`
**Category:** `EVAL`
**Status:** `SOLVED`
**Error Message:** `Search failure: "show cluster 1" returned 0 results.`
**Root Cause Analysis:** `The LLM (Ask Wozny) was unaware of newly created columns (like "Account Manager Group") and their values ("Cluster 1") because the prompt context was static. Additionally, strict casing in the generated code caused failures when users typed "cluster 1" vs "Cluster 1".`
**Solution Implemented:** `Implemented "Dual Approach": 1. Updated useWoznyLLM.ts to inject a live schema summary (including unique values for categorical columns) into the System Prompt. 2. Implemented a "FuzzyRowProxy" in AskWoznyView.tsx to handle case-insensitive property access during filtering.`
**Refactoring Action:** `Enhanced Ask Wozny intelligence with Context Re-hydration and Fuzzy Logic.`
---
**Timestamp:** `2026-01-31 10:00:00`
**Category:** `FEATURE`
**Status:** `PUBLISHED`
**Action:** `Implemented "About Wozny" Tab`
**Details:** `Added a dedicated About page explaining the "Local-First" mission and the 3 Layers of Intelligence (Analyst, Brain, Assistant). Added a HelpCircle icon to the main navigation.`
**Impact:** `Improved user onboarding and transparency about privacy/architecture.`

---
**Timestamp:** `2026-01-31 10:40:00`
**Category:** `UI_UX`
**Status:** `PUBLISHED`
**Action:** `Enhanced About Page & Workflow`
**Details:** `Refactored About Page layout to be side-by-side (Text Left, Actions Right) for better visibility. Updated "How It Works" workflow to explicitly separate "Review Insights" (Step 2) and "Ask Wozny" (Step 3). Set "About" as the default landing tab.`

---
**Timestamp:** `2026-01-31 11:43:00`
**Category:** `FEATURE`
**Status:** `PUBLISHED`
**Action:** `Implemented "Smart Split" Action`
**Details:** `Added regex-based column splitting (Street/City/State/Zip) to the Workshop Grid header. Uses a pattern-first waterfall logic with UI feedback.`
---
**Timestamp:** `2026-01-31 13:10:00`
**Category:** `BUG_FIX`
**Status:** `SOLVED`
**Error Message:** `[Missing]` appeared as literal text in extracted columns instead of the red "Missing" label.
**Root Cause Analysis:** `The Title Casing formatter was converting [MISSING] to [Missing]. The DataGrid/Analysis logic was doing case-sensitive checks for [MISSING], missing the title-cased tag. This caused the UI to render the string literal instead of the special italicized label.`
**Solution Implemented:** `Updated DataGrid.tsx and data-quality.ts to perform case-insensitive checks for [MISSING]. Also instructed autoFixRow to skip any value wrapped in brackets [].`
**Refactoring Action:** `Standardized Missing Value detection across UI and Logic layers.`

---
**Timestamp:** `2026-01-31 13:20:00`
**Category:** `BUG_FIX`
**Status:** `SOLVED`
**Error Message:** `Auto-Fix converted state codes (NY) to title case (Ny) in extracted columns.`
**Root Cause Analysis:** `The Auto-Fix logic was too aggressive, applying title-casing to all columns regardless of whether an issue was detected. It also didn't recognize Address_State as a state column.`
**Solution Implemented:** `1. Refactored autoFixRow to ONLY touch columns with detected FORMAT issues. 2. Updated state detection to include Address_State. 3. Enforced strict Uppercasing for state fixes.`
**Refactoring Action:** `Implemented 'Surgical Auto-Fix' to prevent regressions on valid data.`
---
**Timestamp:** `2026-01-31 13:30:00`
**Category:** `UI_UX`
**Status:** `PUBLISHED`
**Action:** `Implemented "Sample-Based Dynamic Column Auto-Sizing"`
**Details:** `Created a high-performance measurement engine using HTML5 Canvas to calculate optimal column widths based on real data (sampling first 100 rows). Integrated into useWoznyStore and DataGrid. Automatically adjusts on upload, split, or column addition.`
**Impact:** `Eliminates the "Squinting/Scrolling" problem. Columns like 'Street' now expand to fit their content perfectly while 'Zip' stays compact.`
---
**Timestamp:** `2026-01-31 13:35:00`
**Category:** `UI_UX`
**Status:** `PUBLISHED`
**Action:** `Implemented Multi-Line Header Wrapping`
**Details:** `Increased HEADER_HEIGHT to 56px and enabled text wrapping (line-clamp-2) in DataGrid columns. This prevents truncation of long column names like 'Address_Street' or 'Account_Manager'.`
**Impact:** `Improved header readability for narrow columns.`
---
**Timestamp:** `2026-01-31 14:30:00`
**Category:** `LOGIC_FIX`
**Status:** `SOLVED`
**Action:** `Implemented Date Normalization (Temporal Remediation)`
**Details:** `Created a normalizeDate helper in data-quality.ts that handles mixed formats (e.g., '26-Dec-2023', '05/03/2024') using Date.parse and regex fallbacks. Integrated into autoFixRow to convert malformed dates to YYYY-MM-DD standard.`
**Impact:** `Auto-Fix now supports reliable date standardization.`
---
**Timestamp:** `2026-01-31 14:32:00`
**Category:** `UI_UX`
**Status:** `SOLVED`
**Action:** `Expanded Auto-Fix Whitelist for Categorical Columns`
**Details:** `Added 'method', 'type', 'status', 'category', 'payment', and 'role' to the Title Case whitelist in autoFixRow. This ensures columns like 'Payment Method' (e.g., cash -> Cash) are correctly normalized.`
**Impact:** `Improved Auto-Fix coverage for common non-PII spreadsheet columns.`
---
**Timestamp:** `2026-01-31 14:34:00`
**Category:** `UI_UX`
**Status:** `SOLVED`
**Action:** `Implemented Smart Typography (Underscore Wrapping & Selection)`
**Details:** `Inserted zero-width spaces (\u200B) after underscores in headers to enable browser wrapping for snake_case column names. Removed 'select-none' to restore native text selection for headers.`
**Impact:** `Significantly improved header readability and user utility.`
