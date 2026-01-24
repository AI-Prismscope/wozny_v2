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
