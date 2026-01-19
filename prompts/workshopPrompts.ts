
import { Category, Difficulty, Question } from '../types';

/**
 * GENERATOR PROMPTS
 */
export const getCategoryGeneratorPrompt = (
  category: Category,
  difficulty: Difficulty,
  refinement: string = "",
  positiveExamples: Question[] = []
) => {
  const categorySpecifics: Record<string, string> = {
    [Category.HISTORY]: "Zaměř se na klíčové historické milníky, osobnosti a diplomatické souvislosti. U obtížnosti HARD se vyhýbej prostým letopočtům v možnostech.",
    [Category.ARTS]: "Zaměř se na vizuální umění, literární směry, architekturu a hudební teorii/dějiny. Hledej fascinující příběhy vzniku děl.",
    [Category.GEOGRAPHY]: "Zaměř se na geomorfologii, kulturní geografii, demografii a unikátní přírodní úkazy. Vyhni se prostému 'v jakém státě leží město X'.",
    [Category.SPORT]: "Zaměř se na olympijskou historii, technické aspekty sportů, legendární výkony a etiku sportu.",
    [Category.CZECH]: "Zaměř se na české reálie, národní obrození, moderní dějiny a kulturní specifika ČR.",
    [Category.WORLD]: "Zaměř se na globální politiku, mezinárodní vztahy, světové náboženství a ekologii.",
    [Category.TRIVIA]: "Zaměř se na vědu, techniku, biologii a všeobecný kulturní přehled."
  };

  const examplesBlock = positiveExamples.length > 0 
    ? `\nZDE JSOU PŘÍKLADY OTÁZEK, KTERÉ UŽIVATEL SCHVÁLIL (inspiruj se jejich kvalitou a stylem):\n${JSON.stringify(positiveExamples.map(e => ({ text: e.text, options: e.options, explanation: e.explanation })))}\n`
    : "";

  return `
Jsi špičkový specialista na oblast "${category}". Tvým úkolem je vytvořit 1 otázku pro hru Archiv Vědění.
OBTÍŽNOST: ${difficulty}
KATEGORIE: ${category}

SPECIFIKA PRO TUTO KATEGORII:
${categorySpecifics[category] || "Vytvoř zajímavou otázku vyžadující skutečné znalosti."}

OBECNÁ PRAVIDLA:
1. Odpovědi A, B, C, D musí být stručné a jasné.
2. Správná odpověď musí být fakticky nezpochybnitelná.
3. Vysvětlení musí přinášet přidanou hodnotu.
4. U obtížnosti HARD nesmí být v možnostech jména, data ani názvy míst - použij popisy.
${examplesBlock}
${refinement ? `ZOHLEDNI ZPĚTNOU VAZBU OD LIDSKÉHO KONTROLORA: "${refinement}"` : ""}

Vrať JSON:
{
  "text": "...",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "...",
  "hint": "...",
  "keyEntity": "...",
  "wikipediaSearchQuery": "..."
}
`;
};

/**
 * EVALUATOR AGENTS
 */

export const UNIQUENESS_EVALUATOR_PROMPT = (questionText: string, existingContext: string) => `
Jsi Agent pro Unikátnost. Tvým úkolem je posoudit, zda je nová otázka originální vzhledem k existujícím otázkám.
NOVÁ OTÁZKA: "${questionText}"
EXISTUJÍCÍ KONTEXT:
${existingContext}

Pravidla:
- Pokud je otázka příliš podobná (stejný fakt, jen jiné znění), dej skóre pod 5.
- Pokud přináší nový pohled nebo zcela jiné téma, dej skóre 8-10.

Vrať JSON:
{
  "score": 0-10,
  "feedback": "Proč je/není unikátní",
  "passed": true/false
}
`;

export const DISTRACTOR_EVALUATOR_PROMPT = (question: any) => `
Jsi Agent pro Distraktory (špatné možnosti). Posuď kvalitu možností u této otázky.
OTÁZKA: "${question.text}"
MOŽNOSTI: ${JSON.stringify(question.options)}
SPRÁVNÁ: ${question.options[question.correctIndex]}

Pravidla:
1. Působí špatné možnosti věrohodně (nejsou vtipné nebo nesmyslné)?
2. Jsou všechny možnosti podobného typu (např. všechno jsou panovníci)?
3. Nejsou v možnostech gramatické chyby?
4. U obtížnosti HARD: Jsou to popisy, nikoliv jména?

Vrať JSON:
{
  "score": 0-10,
  "feedback": "Detailní rozbor věrohodnosti matoucích odpovědí",
  "passed": true/false
}
`;

export const LEVEL_EVALUATOR_PROMPT = (question: any, difficulty: string) => `
Jsi Agent pro Úroveň (Level). Posuď, zda obtížnost odpovídá zadání "${difficulty}".
OTÁZKA: "${question.text}"
OBTÍŽNOST: "${difficulty}"

Kritéria:
- CHILD: Velmi jednoduché, pro děti.
- EASY: Základní škola, všeobecně známé ikony.
- MEDIUM: Maturitní úroveň, hlubší zájem.
- HARD: Expertní úroveň, specifické detaily, popisné možnosti.

Vrať JSON:
{
  "score": 0-10,
  "feedback": "Zdůvodnění, proč obtížnost sedí nebo ne",
  "passed": true/false
}
`;

/**
 * PROMPT REFINER (META-PROMPT)
 */
export const PROMPT_REFINEMENT_PROMPT = (
  batchResults: any[], 
  positiveExamples: Question[], 
  negativeExamples: { question: Question; feedback: string }[],
  globalFeedback: string, 
  currentRefinement: string
) => `
Jsi Inženýr Promptů. Tvým úkolem je vytvořit novou "Systémovou instrukci" pro AI generátor otázek na základě analýzy schválených a zamítnutých příkladů a zpětné vazby od člověka.

--- ANALÝZA DÁVKY ---
Posledních 20 pokusů: ${JSON.stringify(batchResults)}

--- POZITIVNÍ PŘÍKLADY (Toto uživatel CHCE): ---
${JSON.stringify(positiveExamples.map(e => e.text))}

--- NEGATIVNÍ PŘÍKLADY (Toto uživatel ODMÍTL s vysvětlením): ---
${JSON.stringify(negativeExamples.map(e => ({ text: e.question.text, reason: e.feedback })))}

--- CELKOVÁ ZPĚTNÁ VAZBA: ---
"${globalFeedback}"

--- DOSAVADNÍ INSTRUKCE: ---
"${currentRefinement}"

TVŮJ ÚKOL:
Navrhni krátkou (max 2-3 věty), údernou instrukci pro AI generátor, která syntetizuje vše výše uvedené. 
Cílem je eliminovat chyby z negativních příkladů a posílit kvality z pozitivních příkladů.
Pište v češtině.

Vrať pouze text nové instrukce.
`;
