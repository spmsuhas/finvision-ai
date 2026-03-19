/**
 * FinVision AI — AI Advisor (Phase 5)
 * ============================================================
 * Integrates Firebase AI Logic (Google Gemini) SDK for:
 *   1. Executive summary generation from trajectory JSON
 *   2. Conversational Q&A about the user's financial plan
 *   3. RAG pipeline: Firestore vector search → Gemini context injection
 *
 * System persona: Senior certified financial analyst specialised
 * in Indian personal finance, taxation, and wealth management.
 */

// Phase 5 — full Firebase AI Logic SDK implementation.

/**
 * System instruction for the Gemini model.
 * Enforces financial analyst persona and Indian financial context.
 */
const SYSTEM_INSTRUCTION = `
You are FinVision AI — an elite, certified financial analyst (CFP) with 20+ years of experience
specialised exclusively in Indian personal finance, taxation, and long-term wealth management.

Your knowledge base covers:
- Indian Income Tax Act: Old & New Regime (Section 115BAC), capital gains, LTCG/STCG
- SEBI-regulated instruments: Mutual Funds, ELSS, NPS, EPF, PPF, SGBs
- Macroeconomic projections from Goldman Sachs, Vanguard, J.P. Morgan, McKinsey
- FY 2025-26 tax slabs, exemptions, and deductions

Rules:
1. Always quote amounts in Indian Rupees (₹) using Indian numbering (Lakhs, Crores).
2. Be specific; cite section numbers (e.g., Section 80C, Section 87A).
3. Never hallucinate tax rates or figures — if uncertain, clearly state "verify with a CA".
4. Keep responses concise (under 250 words for chat; 400 words for summaries).
5. Always end chat responses with 1 actionable next step.
`.trim();

/**
 * Generate an AI executive summary for the user's plan.
 * @param {Object} planState  - Full application state (trajectory + tax + goals)
 * @returns {Promise<string>} Formatted advisory text
 */
export async function generateExecutiveSummary(planState) {
  // Phase 5 — Firebase AI Logic SDK call
  console.info('[AIAdvisor] Phase 5: Gemini summary generation pending.');
  return 'AI summary generation will be available in Phase 5 after Firebase AI Logic integration.';
}

/**
 * Send a user chat message and receive an AI response.
 * @param {string} userMessage
 * @param {Array<{role: string, content: string}>} history  - Chat history
 * @param {Object} planState  - Injected as system context
 * @returns {Promise<string>} AI response text
 */
export async function sendChatMessage(userMessage, history, planState) {
  // Phase 5 — Gemini multi-turn chat with plan JSON as context
  console.info('[AIAdvisor] Phase 5: Gemini chat pending.');
  return 'AI chat will be enabled in Phase 5. Please complete your financial details and check back.';
}

/**
 * Perform a RAG lookup in Firestore vector store and inject context.
 * @param {string} query  - User query for semantic search
 * @returns {Promise<string>} Relevant context to inject into prompt
 */
export async function fetchRAGContext(query) {
  // Phase 5 — Firestore KNN vector search
  return '';
}
