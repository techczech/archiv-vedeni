
# 🏛️ Archiv Vědění: Společenská Hra

**Archiv Vědění** je interaktivní webová vědomostní aplikace pro 2 až 12 hráčů, která kombinuje atmosféru historických archivů s nejmodernější umělou inteligencí (Google Gemini).

## 🌟 Hlavní Rysy
- **AI-Powered Trivia**: Otázky jsou generovány v reálném čase pomocí modelu Google Gemini 3 Flash/Pro.
- **Vizuální Styl**: Elegantní tmavý design s patinou, využívající fonty *Playfair Display* a *Lato*.
- **Multimodální Interakce**: Podpora hlasového vstupu (mikrofon) a předčítání otázek (TTS).
- **Flexibilita**: Možnost hrát online přes AI nebo offline z místního archivu otázek.

---

## 🎮 Herní Režimy (Global)

### 1. Klasická Hra
Standardní tahová vědomostní soutěž.
- Hráči si vybírají ze 6 kategorií a 3 obtížností.
- Otázky mají formát Multiple Choice (A, B, C, D).
- K dispozici jsou záchranné kruhy: **50/50** a **Nápověda**.

### 2. Výzva (Challenge)
Strategický režim zaměřený na risk.
- Vyzyvatel přečte otázku nahlas a vybere jiného hráče ("Oběť").
- Pokud oběť odpoví správně, získává body ona.
- Pokud oběť odpoví špatně, body získává Vyzyvatel.

### 3. Soudce Gem (Judge Mode)
Hra bez nápověd a možností.
- Hráči odpovídají vlastními slovy (textem nebo hlasem).
- AI hodnotí sémantickou správnost odpovědi (0-100 %).
- Uděluje se **Bonus za hloubku vědění** (+1 až 5 bodů) za expertní detaily.

---

## 🏗️ Technická Architektura

Aplikace je postavena jako **Client-Side SPA (Single Page Application)** s důrazem na moderní webové standardy bez nutnosti složitého sestavování (No-Build / Low-Build).

### Tech Stack
- **Core**: React 19 (načítáno via ESM Import Maps).
- **Jazyk**: TypeScript (TSX).
- **Styling**: Tailwind CSS (CDN runtime pro rapid prototyping).
- **AI Integrace**: Google GenAI SDK (`@google/genai`) pro Gemini modely.
- **Persistence**: `LocalStorage` pro ukládání stavu hry, historie a banky otázek.

### Struktura Souborů
- `/components`: UI komponenty (React).
- `/services`: Logika komunikace s API a úložištěm.
  - `geminiService.ts`: Generování herních otázek a vyhodnocování.
  - `workshopService.ts`: Logika pro multi-agentní dílnu.
  - `storageService.ts`: Správa LocalStorage a záloh.
  - `ttsService.ts`: Abstrakce nad Web Speech API a Gemini TTS.
- `/prompts`: Systémové instrukce pro LLM (Few-shot learning, persona definice).

---

## 🤖 AI Agentní Pipeline (Dílna Archiváře)

Unikátní součástí aplikace je **Dílna Archiváře**, která využívá multi-agentní systém pro generování vysoce kvalitních otázek do banky.

1. **Generator Agent (Gemini 3 Pro/Flash)**:
   - Vytvoří otázku na základě kategorie, obtížnosti a "pozitivních příkladů" (Few-Shot Learning).
2. **Evaluator Agents (Tri-Check)**:
   - **Uniqueness Agent**: Kontroluje duplicitu vůči existující bance.
   - **Distractor Agent**: Hodnotí kvalitu špatných odpovědí (věrohodnost, gramatika).
   - **Level Agent**: Ověřuje, zda otázka odpovídá zvolené obtížnosti (Child/Easy/Hard).
3. **Refinement Loop**:
   - Uživatel poskytuje zpětnou vazbu k vygenerované dávce.
   - **Prompt Engineer Agent** analyzuje zamítnuté i schválené otázky a dynamicky upravuje systémovou instrukci pro další generování.

---

## 🚀 Nasazení a Spuštění

Aplikace nevyžaduje Node.js build proces (Webpack/Vite) pro vývoj, jelikož využívá nativní ES Moduly v prohlížeči.

### Požadavky
- Moderní prohlížeč (Chrome/Edge/Safari) s podporou ES Modules.
- Platný **Google Gemini API Key**.

### Lokální Spuštění
1. Otevřete kořenovou složku projektu.
2. Spusťte libovolný statický server (např. `python3 -m http.server`, `npx serve`, nebo Live Server ve VS Code).
3. Otevřete `localhost` v prohlížeči.
4. V nastavení aplikace (nebo přes dialogové okno AI Studia) zadejte API klíč.

### Statické Nasazení (Deploy)
Aplikaci lze nasadit na libovolný statický hosting (GitHub Pages, Vercel, Netlify, Firebase Hosting).

1. Nahrajte celý obsah složky na hosting.
2. Ujistěte se, že `index.html` je vstupní bod.
3. **Konfigurace API**:
   - Aplikace očekává, že prostředí poskytne API klíč (`process.env.API_KEY`).
   - V případě statického hostingu bez injekce proměnných musí uživatel zadat klíč ručně v sekci **Nastavení -> AI & Systém -> Správa API Klíče**.

---

## 📜 Licence a Data
Tento projekt je určen pro zábavní a edukativní účely. Veškerá herní data (historie, banka otázek, profily) jsou uložena **lokálně** v prohlížeči uživatele. Smazání mezipaměti prohlížeče povede ke ztrátě dat (doporučujeme využít funkci Export/Import v nastavení).

---
*"Scientia Potentia Est"*
