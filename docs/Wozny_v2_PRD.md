# **Wozny v2 - The AI Data Workshop PRD**

**Project:** Wozny - Data Janitor (v2 Evolution)
**Owner:** Michelle Brooks
**Date:** January 26, 2026

---

## **Problem: The "Zero-Error" Anxiety**

Executive Assistants in marketing companies are forced to spend critical time manually auditing unstandardized client lists. This is not just tedious; it is high-stakes.

### **The Pain: "Defensive Data Cleaning"**
EAs operate under a **zero-error mandate**. A single data slip—like a misspelled name on an invitation or a duplicate holiday card—disproportionately damages their executive's reputation.

Currently, EAs are trapped in a cycle of "Defensive Data Cleaning": spending hours manually scrolling through Excel rows, not because they want to, but because they are **terrified** of the professional embarrassment caused by someone else's sloppy data entry. This manual process is:
1.  **Mentally Exhausting:** Staring at rows of "Sarah Johnson" vs "S. Johnson" for hours.
2.  **Unscalable:** As lists grow, manual spotting becomes impossible.
3.  **Demeaning:** Senior staff doing data entry work.

---

## **Proposed Solution: The AI-Powered Workshop**

**Wozny is no longer just a "Flagging" tool; it is a "Fixing" Workshop.**
It combines **Deterministic Analysis** (hard logic for finding errors) with **Generative AI** (Ask Wozny) to allow the EA to explore, find, and fix data issues using natural language, without leaving the tool.

### **Core Philosophy: "The Architect & The Worker"**
To maintain data privacy and accuracy:
*   **The AI (Architect):** Never sees the data rows. It only sees column headers and user requests. It writes code to find what the user wants.
*   **The Browser (Worker):** Executes the code on the local data.
*   **Result:** Data never leaves the browser in a way that risks hallucination errors. The user stays in control.

---

## **Key Features & Requirements**

### **1. The Analysis Engine (Deterministic)**
*   **Ingestion:** Support CSV/Excel.
*   **Instant Scan:** Automatically detect:
    *   **Missing Values:** "Cell A5 is empty."
    *   **Duplicates:** "Row 10 and 55 are 100% identical."
    *   **Formatting Issues:** "Phone number is missing area code."

### **2. "Ask Wozny" (The AI Search)**
*   **Natural Language Querying:** User types *"Show me all contacts where the Account Manager is Sarah Johnson"*.
*   **Blind Execution:** The AI generates a script to find these rows without reading them.
*   **Safety:** Handles casing (`sarah` vs `Sarah`) and whitespace (`Sarah `) automatically.
*   **Deep Filtering:** Allows queries complex for humans but easy for AI (e.g., *"Show users in NY missing an email"*).

### **3. The Workshop (Bulk Action)**
*   **Seamless Hand-off:** Users can "Send" their search results from "Ask Wozny" directly to "The Workshop".
*   **Bulk Editing:**
    *   *Action:* Select a column (e.g., "Account Manager").
    *   *Input:* Type new value ("Sarah Johnson").
    *   *Apply:* Update 50 rows instantly.
*   **User Selection:** A dedicated space for the user's custom "Problem Sets" that don't fit standard categories.
*   **No Auto-Delete:** Unlike logic-based filters, User Selections remain visible until explicitly cleared, allowing for careful review.

### **4. Export & Trust**
*   **Clean Export:** One-click download of the fixed dataset.
*   **Logic:** The export always reflects the current *live* state of the Workshop.
*   **Confidence:** The user knows exactly what changed because they authorized every Bulk Edit.

---

## **Success Metrics**

| Goal | Metric | Target |
| :--- | :--- | :--- |
| **Reduction in Anxiety** | **"Send to Workshop" Usage** | > 80% of sessions involve a Bulk Edit action. |
| **Speed to Results** | **Time to Export** | < 5 minutes from Upload to Clean Export. |
| **Search Accuracy** | **No-Result Queries** | < 10% of "Ask Wozny" queries return 0 results (due to syntax). |

---

## **Evolution from v1**
*   **Removed:** "Delegation Reports" (Agent-specific PDFs) are de-prioritized. The EA can now fix the data faster than they can delegate it.
*   **Added:** "Interactive Workshop". The tool is now a workspace, not just a scanner.
*   **Added:** "Generative AI". Replacing manual filtering UI with natural language.
