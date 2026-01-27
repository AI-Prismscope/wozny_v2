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
