/**
 * FinVision AI — AI Advisor (Phase 5)
 * ============================================================
 * Dual-path Gemini integration:
 *   Path A: Firebase AI Logic SDK (firebase/ai) — when Firebase is configured
 *   Path B: Direct Gemini REST API — when VITE_GEMINI_API_KEY is set
 *   Fallback: Graceful offline message
 */

import { firebaseApp, isFirebaseConfigured } from '../firebase/config.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_REST_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MODEL_NAME = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are FinVision AI — an elite, certified financial analyst (CFP) with 20+ years
of experience specialised exclusively in Indian personal finance, taxation, and long-term wealth management.

Your knowledge base covers:
- Indian Income Tax Act FY 2025-26: Old & New Regime (Section 115BAC), Sec 87A rebate, LTCG/STCG
- SEBI-regulated instruments: Mutual Funds, ELSS, NPS, EPF, PPF, SGBs, Direct Equity
- Macroeconomic projections from Goldman Sachs, Vanguard, J.P. Morgan, McKinsey

Rules:
1. Always quote amounts in Indian Rupees (₹) using Indian numbering: Lakhs (L), Crores (Cr).
2. Be specific — cite section numbers (e.g., Section 80C, Section 87A, Section 24b).
3. Never hallucinate tax rates or figures. If uncertain, say "verify with a CA".
4. Keep responses under 250 words for chat; 400 words for summaries.
5. Always end chat responses with exactly 1 actionable next step prefixed "➤ Next Step:".`.trim();

/** Compact plan snapshot — send only what Gemini needs, not the full 70-row table */
function _buildPlanContext(planState) {
  const tc = planState.taxComparison;
  const rows = planState.trajectory ?? [];
  const retireRow = rows.find(r => r.age === planState.retirementAge);
  const terminalRow = rows[rows.length - 1];
  const depletionAge = rows.find(r => r.closingBalance < 0)?.age ?? 'Never';

  return JSON.stringify({
    profile: {
      age: planState.currentAge,
      retirementAge: planState.retirementAge,
      monthlyIncome: planState.monthlyIncome,
      monthlyExpenses: planState.monthlyExpenses + planState.monthlyMedicalPremium + planState.monthlyEMI,
      equityPct: planState.equityPercent,
      debtPct: planState.debtPercent,
    },
    corpus: {
      current: planState.currentEquity + planState.currentDebt + planState.currentEPF,
      atRetirement: retireRow?.closingBalance ?? 0,
      terminal: terminalRow?.closingBalance ?? 0,
      depletionAge,
    },
    planHealth: planState.planHealth,
    goals: (planState.goals ?? []).map(g => ({
      name: g.name, type: g.type, year: g.targetYear, value: g.todayValue,
    })),
    tax: tc ? {
      grossSalary: tc.newRegime?.grossIncome,
      newRegimeTax: tc.newRegime?.totalTax,
      oldRegimeTax: tc.oldRegime?.totalTax,
      recommended: tc.recommended,
      saving: tc.saving,
    } : null,
  }, null, 2);
}

/* ─── Firebase AI Logic path (Path A) ───────────────────────── */
let _aiModel = null;

async function _getFirebaseAIModel() {
  if (_aiModel) return _aiModel;
  if (!isFirebaseConfigured || !firebaseApp) return null;
  try {
    const { getAI, getGenerativeModel } = await import('firebase/ai');
    const ai = getAI(firebaseApp);
    _aiModel = getGenerativeModel(ai, {
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    return _aiModel;
  } catch {
    return null;
  }
}

/* ─── Direct REST path (Path B) ─────────────────────────────── */
async function _callGeminiREST(prompt, history = []) {
  if (!GEMINI_API_KEY) return null;

  const contents = [
    ...history.map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const res = await fetch(`${GEMINI_REST_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
      generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Generate an AI executive summary for the user's plan.
 * @param {Object} planState
 * @returns {Promise<string>}
 */
export async function generateExecutiveSummary(planState) {
  const context = _buildPlanContext(planState);
  const prompt = `Analyse this Indian financial plan and produce a concise executive summary covering:
1. Corpus trajectory assessment (is the user on track?)
2. Top 2 tax optimisation opportunities
3. Goal feasibility (which goals are at risk?)
4. 3 specific, prioritised action points

Plan data:
${context}`;

  // Path A — Firebase AI Logic
  const model = await _getFirebaseAIModel();
  if (model) {
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  // Path B — Direct REST
  const restResult = await _callGeminiREST(prompt);
  if (restResult !== null) return restResult;

  return [
    '⚠️ AI advisor not configured.',
    '',
    'To enable Gemini AI, set one of these in your .env.local:',
    '  • VITE_GEMINI_API_KEY=your_key   (direct Gemini API)',
    '  • VITE_FIREBASE_API_KEY + Firebase AI Logic enabled in console',
    '',
    'Get a free Gemini API key at: aistudio.google.com',
  ].join('\n');
}

/**
 * Send a chat message and receive an AI response.
 * @param {string} userMessage
 * @param {Array<{role:string, content:string}>} history
 * @param {Object} planState
 * @returns {Promise<string>}
 */
export async function sendChatMessage(userMessage, history, planState) {
  const context = _buildPlanContext(planState);
  const contextualPrompt = history.length === 0
    ? `[User's financial plan context]\n${context}\n\n[Question] ${userMessage}`
    : userMessage;

  // Path A — Firebase AI Logic (maintain session chat)
  const model = await _getFirebaseAIModel();
  if (model) {
    const chat = model.startChat({
      history: history.map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });
    const result = await chat.sendMessage(
      history.length === 0 ? contextualPrompt : userMessage
    );
    return result.response.text();
  }

  // Path B — Direct REST
  const augmentedHistory = history.length === 0
    ? []
    : [{ role: 'user', content: `[Plan context]\n${context}` }, { role: 'ai', content: 'Understood. I have reviewed your financial plan. How can I help?' }, ...history];

  const restResult = await _callGeminiREST(contextualPrompt, augmentedHistory);
  if (restResult !== null) return restResult;

  return 'AI chat is not configured. Add VITE_GEMINI_API_KEY to your .env.local to enable it.';
}

/**
 * Perform a RAG lookup (stub — Firestore vector search is a paid feature).
 * @param {string} _query
 * @returns {Promise<string>}
 */
export async function fetchRAGContext(_query) {
  return '';
}
