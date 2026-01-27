# Guide to Prompting Small (3B) Models
*Learnings from Wozny v2 Development*

Working with small parameter models (1B - 3B) requires a fundamentally different approach than working with large frontier models (GPT-4, Claude 3.5 Sonnet). These models obey instructions differently and are prone to specific types of errors.

## Core Philosophy: "Pattern-Based Engineering"

**Don't tell the model what to do. Show it what you want.**

Small models (1B-3B) are effectively "Pattern Completion Engines". They struggle with complex logical rules (Negative Constraints) but excel at mimicking a rhythm.

### Level 1: The Recipe Approach (Rule-Based)
*Good for 8B+ models.*
"Do not use markdown. Output raw code only."

### Level 2: The Pattern Match Approach (Few-Shot)
*Mandatory for 1B models.*
Instead of rules, provide multiple examples that establish a rigid pattern. The model will naturally complete the pattern without needing to "think" about rules.

### ✅ The "G.O.A.T." Prompt Structure
```javascript
const systemPrompt = `
You are a JavaScript Logic Generator.
Task: Convert user requests into raw arrow functions.

DATA REFERENCE:
- Missing string: "[MISSING]"

EXAMPLES:
Input: "show rows with missing data in telephone"
Output: (row) => row["telephone"] === "[MISSING]"

Input: "filter for Certification_Renewal_Date missing"
Output: (row) => row["Certification_Renewal_Date"] === "[MISSING]"

Input: "find blank entries in Ethnicity"
Output: (row) => row["Ethnicity"] === "[MISSING]"
`;
```
**Why this works:** Checks for "Pattern Completion" rather than "Instruction Following".

---

## Key Learnings & Pitfalls

### 1. The Overfitting Trap
**Problem:** Small models latch onto training examples too tightly.
*   *Scenario:* You give an example `(row) => row.state === 'NY'`.
*   *User Query:* "Show active users."
*   *Model Result:* `(row) => row.status === 'Active' && row.state === 'NY'` (It unhelpfully adds the example logic).

**Solution:** Use abstract or neutral examples in your system prompt that are unrelated to the likely user queries.
*   *Better Example:* `(row) => row['Status'] === 'ExampleValue'`

### 2. "Blind" Code Hallucination
**Problem:** The model sees headers but not data rows. It tends to hallucinate "ideal" versions of data.
*   *Scenario:* User asks for "Sarah Johnson" (lowercase input).
*   *Model Assumption:* "Names are capitalized." -> Checks for `'Sarah Johnson'`.
*   *Data Reality:* Data might be messy (`SARAH JOHNSON`, `s. johnson`).

**Solution:** Enforce "Blind Robustness" rules.
1.  **Always Lowercase:** comparisons: `row['Col'].toLowerCase() === val.toLowerCase()`
2.  **Always Trim:** `row['Col'].trim()`
3.  **Assume Nothing:** Never assume data is clean.

### 3. Syntax Safety (The "ES5" Rule)
**Problem:** Fancy modern syntax can confuse the model or the runtime environment if not perfectly executed.
*   *Issue:* Optional chaining (`?.`) caused parser errors in some contexts or was applied inconsistently by the model.
*   *Issue:* Dot notation (`row.Account Manager`) fails on spaces.

**Solution:** Enforce simple, explicit syntax.
*   **Force Bracket Notation:** Explicitly command `row['Column Name']`. The model often defaults to camelCase (`row.accountManager`) which doesn't exist in CSV data.
*   **Force Explicit Null Checks:** Use `row['Col'] && ...` instead of `?.`. It is verbose but harder for a small model to mess up.

### 4. Explicit Quoting
**Problem:** Small models often treat string keys as variables.
*   *Model Error:* `row[Account Manager]` (Syntax Error)
*   *Requirement:* `row['Account Manager']`

**Solution:** Add a specific rule: "**KEYS MUST BE QUOTED**".

### 5. Architectural Strategy: Minimalism & Scope
**Principle:** Minimize the model's surface area. Small models hallucinate when asked to *process* or *remember* data. They excel at *translation*.

*   **The "Architect vs. Worker" Pattern:**
    *   **The Model is the Architect:** It sees only the *blueprint* (Column Headers) and the *Goal* (User Query). Its ONLY job is to write a precise instruction (Script).
    *   **The Browser/Runtime is the Worker:** It takes the instruction and applies it to the massive, messy dataset.
*   **Why this works:**
    *   If you give a model 100 rows of data, it will get bored, hallucinate, or overlook items.
    *   If you give it the *schema* and ask for a filter function, it has zero opportunity to "guess" the data values (hallucinating "Sarah" instead of "sarah").
*   **Rule of Thumb:** Never ask a small model to "Find X in this list". Ask it to "Write code to find X".

### 6. The Safety Net: Defensive Engineering
**Principle:** Prompts are suggestions, not laws. Small models *will* eventually disobey even the best prompt ("No Markdown", "No Variables").
**Finding from Wozny V2:** The prompt explicitly forbade markdown, but the model added it anyway. It forbade `const`, but the model added it anyway.

*   **Don't Fix it in the Prompt, Fix it in the Code:**
    *   **Regex Extraction:** Always look for the pattern you want (e.g. `(row) => ...`) inside the response. Ignore the rest.
    *   **Aggressive Cleaning:** Build a parser that strips markdown ticks matching `` ``` ``, strips `const/let/var`, and trims whitespace before execution.
    *   **Redundancy:** The Prompt asks for clean code. The Parser *ensures* clean code. This double-layer is required for stability.

## Summary Checklist for New Prompts

1.  [ ] **Action-Oriented:** Are all rules "Do this"?
2.  [ ] **Abstract Examples:** Do examples avoid specific business logic?
3.  [ ] **Robustness:** Does the prompt enforce `.trim()` and `.toLowerCase()`?
4.  [ ] **Syntax Guardrails:** Does it enforce `['Bracket Notation']`?
5.  [ ] **Defensive Parser:** Is the client code ready for Markdown/Chatty responses?

## 7. The Physics of "Boring": Inference Parameters
Even with a perfect prompt, a small model set to "Creative Mode" (Temperature 0.7+) will disobey you to be "helpful" or "varied". You MUST control the physics of generation.

### The "Execution Engine" Config
For code generation tasks where only ONE answer is correct, use this configuration:

```javascript
const params = {
  temperature: 0.0,      // DETERMINISTIC. Removes "creative" fluff.
  top_p: 0.1,           // OPTIONAL: Forces focus on top 10% probability tokens.
  frequency_penalty: 0, // Don't penalize repetition (code needs repetition).
  presence_penalty: 0,  // Don't force new topics.
  max_tokens: 256,      // HARD STOP. Prevents long explanations/test scripts.
};
```

**Why it works:**
*   **Temperature 0.0:** The model picks the #1 most likely token every time. If your prompt says "OUTPUT RAW CODE", the most likely token is `(`, not "Sure".
*   **Max Tokens:** Physically prevents the model from writing a novel after the code.
