
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

Aplikace je postavena jako **React SPA sestavovaná pomocí Vite**. AI požadavky vyřizuje serverová funkce `/api/ai`; klíče poskytovatelů se neposílají do prohlížeče.

### Tech Stack
- **Core**: React 19, Vite.
- **Jazyk**: TypeScript (TSX).
- **Styling**: Tailwind CSS (CDN runtime pro rapid prototyping).
- **AI Integrace**: Serverová funkce pro Gemini a OpenAI; prohlížeč používá pouze `/api/ai`.
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

### Lokální spuštění a ověření

Použijte Node.js 22.15 nebo novější a npm:

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Samotný Vite spouští frontend. Bez serverové funkce funguje místní archiv a hlas prohlížeče; zvolený AI hlas se při chybě vrátí k prohlížeči.

### Nasazení na Vercel

Nasaďte celý projekt včetně `api/`, `server/` a `vercel.json`. Build příkaz je `npm run build`, výstupní složka `dist`. Samostatné nahrání složky `dist` na statický hosting AI funkce nezpřístupní.

V serverovém prostředí Vercelu nastavte tajné proměnné `GEMINI_API_KEY`, `OPENAI_API_KEY` a `APP_ACCESS_CODE`. Klíče poskytovatelů nezadávejte do aplikace ani do veřejných proměnných Vite. Přístupový kód musí mít alespoň 20 tisknutelných znaků ASCII (bez diakritiky). Přístupový kód zadejte jednou v **Nastavení → Parametry Hry → Kód pro AI funkce**; zůstane v localStorage tohoto prohlížeče a odešle se v hlavičce `x-app-access` s každým AI požadavkem.

Bez platného kódu server vrátí 401 a poskytovatele nezavolá. Aplikace odkáže do Nastavení a hlasové funkce použijí prohlížeč, pokud je dostupný. Není-li `APP_ACCESS_CODE` nastavený, server vrátí 503. Stejně odmítne příliš krátký kód nebo kód se znaky mimo tisknutelné ASCII, i při povolené výjimce pro otevřený přístup. Otevřený přístup lze výslovně povolit pouze nastavením `ALLOW_OPEN_AI_ENDPOINT=1`; pro veřejné nasazení tuto výjimku nepoužívejte. Výjimka platí pouze při nenastaveném kódu; nastavený kód má přednost.

Každá instance funkce účtuje všechny pokusy včetně chybných kódů do tokenových zásobníků s kapacitou 30 požadavků a obnovou 30/minutu a kapacitou 300 s obnovou 300/hodinu. Samostatný zásobník povolí nejvýše 5 chybných kódů za 15 minut od prvního neúspěchu. Další pokusy ze stejné adresy v tomto intervalu vrátí 429 ještě před porovnáním kódu, i se správným kódem. Poskytovatel se nezavolá. Odpověď 429 tohoto omezovače obsahuje `code: "rate_limited"`; aplikace zobrazí krátké české upozornění a neopakuje požadavek ani nemění model.

IPv4 adresy mají vlastní zásobník; IPv6 adresy sdílejí zásobník podle prefixu /64. Mapa uchovává nejvýše 10 000 klientů; při naplnění odstraní nejdéle nepoužitý záznam a přijme nového klienta. Limit je **v paměti jedné instance, nikoli globální**; studený start, další instance i odstranění záznamu znamenají nový zásobník. Server používá první IP z `x-forwarded-for` a **spoléhá na to, že Vercel tuto hlavičku přepíše důvěryhodnou klientskou adresou**. Při jiném hostingu musí důvěryhodná proxy zajistit totéž; klientem dodané hlavičce nelze věřit. Kontrola Origin slouží pouze jako ochrana proti CSRF.

Server má celkový limit 12 sekund pro předčítání a přepis a 40 sekund pro generování i posuzování. Klient čeká na generování 43 sekund. Funkce Vercelu ponechává `maxDuration: 45`, tedy rezervu pro zpracování odpovědi.

Jeden požadavek na předčítání přijímá nejvýše 600 znaků; aplikace delší otázky a výsledky rozdělí a postupně přehraje všechny části. Nahrávka smí mít nejvýše 2 MB. Generování i posuzování používají pevné serverové šablony s typovanými, omezenými herními parametry. Vlastní prompty, konfigurace poskytovatele a neznámé operace server odmítá. Zpřesnění instrukce dílny vrací JSON s polem `refinement` do 1000 znaků a nejvýše 1024 výstupními tokeny; verdikt soudce má limit 500 znaků a 512 tokenů. Server délky ověřuje i v odpovědi poskytovatele.

V **Nastavení → Parametry Hry** jsou volby **Prohlížeč / AI hlas**, **Prohlížeč / AI rozpoznávání** a jazyk hlasu. Výchozí je prohlížeč a čeština. AI přepis se vloží do odpovědi, kterou lze před posouzením upravit. Při selhání AI rozpoznávání je třeba odpověď zopakovat do mikrofonu prohlížeče, pokud jej prohlížeč podporuje.

Podrobný přehled změn, ověření a omezení je v [předávací zprávě k AI hlasům](docs/report-ai-voices.md).

---

## 📜 Licence a Data
Tento projekt je určen pro zábavní a edukativní účely. Veškerá herní data (historie, banka otázek, profily) jsou uložena **lokálně** v prohlížeči uživatele. Smazání mezipaměti prohlížeče povede ke ztrátě dat (doporučujeme využít funkci Export/Import v nastavení).

---
*"Scientia Potentia Est"*
