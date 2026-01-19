import { Category, Difficulty, Question } from '../types';

export const STARTER_QUESTIONS: Partial<Question>[] = [
  // --- Dětská obtížnost (CHILD) ---
  {
    text: "Jaké zvířátko nosí na zádech domeček?",
    options: ["Pes", "Šnek", "Kočka", "Ptáček"],
    correctIndex: 1,
    explanation: "Šnek si svůj domeček (ulitu) nosí všude s sebou, aby se do něj mohl schovat před nebezpečím.",
    hint: "Leze velmi pomalu.",
    keyEntity: "Šnek",
    wikipediaSearchQuery: "Hlemýžď zahradní",
    category: Category.TRIVIA,
    difficulty: Difficulty.CHILD
  },
  {
    text: "Jakou barvu má obvykle sluníčko?",
    options: ["Modrou", "Zelenou", "Žlutou", "Červenou"],
    correctIndex: 2,
    explanation: "Sluníčko svítí žlutě a dává nám světlo a teplo.",
    hint: "Je to barva pampelišky.",
    keyEntity: "Slunce",
    wikipediaSearchQuery: "Slunce",
    category: Category.GEOGRAPHY,
    difficulty: Difficulty.CHILD
  },
  {
    text: "Jak se jmenuje naše hlavní město?",
    options: ["Brno", "Praha", "Ostrava", "Plzeň"],
    correctIndex: 1,
    explanation: "Praha je největší město v České republice a protéká jí řeka Vltava.",
    hint: "Je tam Pražský hrad.",
    keyEntity: "Praha",
    wikipediaSearchQuery: "Praha",
    category: Category.CZECH,
    difficulty: Difficulty.CHILD
  },

  // --- Všeobecný přehled (TRIVIA) ---
  {
    text: "Jaký je chemický symbol pro kyslík?",
    options: ["N", "Hg", "O", "H"],
    correctIndex: 2,
    explanation: "Chemické symboly jsou zkratky prvků v periodické tabulce. O pochází z latinského Oxygenium.",
    hint: "Hledej první písmeno názvu.",
    keyEntity: "kyslík",
    wikipediaSearchQuery: "kyslík",
    category: Category.TRIVIA,
    difficulty: Difficulty.EASY
  },
  {
    text: "Jaká je hodnota pH čisté neutrální vody?",
    options: ["3", "14", "0", "7"],
    correctIndex: 3,
    explanation: "Stupnice pH popisuje kyselost a zásaditost roztoků. Hodnota 7 je střed stupnice.",
    hint: "Je to střed stupnice pH.",
    keyEntity: "pH",
    wikipediaSearchQuery: "pH",
    category: Category.TRIVIA,
    difficulty: Difficulty.MEDIUM
  },

  // --- Dějiny a Historie (HISTORY) ---
  {
    text: "Kdo byl prvním československým prezidentem?",
    options: ["Václav Havel", "Edvard Beneš", "Tomáš Garrigue Masaryk", "Antonín Novotný"],
    correctIndex: 2,
    explanation: "Masaryk stál v čele státu od vzniku Československa v roce 1918.",
    hint: "Přezdívalo se mu „Prezident Osvoboditel“.",
    keyEntity: "Tomáš Garrigue Masaryk",
    wikipediaSearchQuery: "Tomáš Garrigue Masaryk",
    category: Category.HISTORY,
    difficulty: Difficulty.EASY
  },
  {
    text: "V jakém roce proběhla sametová revoluce?",
    options: ["1968", "1989", "1993", "1945"],
    correctIndex: 1,
    explanation: "Sametová revoluce v listopadu 1989 ukončila komunistický režim v Československu.",
    hint: "Konec osmdesátých let.",
    keyEntity: "Sametová revoluce",
    wikipediaSearchQuery: "Sametová revoluce",
    category: Category.HISTORY,
    difficulty: Difficulty.MEDIUM
  },

  // --- Sport a Výkony (SPORT) ---
  {
    text: "Který sport je spojen s Wimbledonem?",
    options: ["Fotbal", "Hokej", "Tenis", "Basketbal"],
    correctIndex: 2,
    explanation: "Wimbledon je nejstarší a nejslavnější tenisový turnaj na světě, hraje se na trávě.",
    hint: "Hraje se s raketou.",
    keyEntity: "Wimbledon",
    wikipediaSearchQuery: "Wimbledon (tenisový turnaj)",
    category: Category.SPORT,
    difficulty: Difficulty.EASY
  },

  // --- Geografie (GEOGRAPHY) ---
  {
    text: "Který oceán je největší na světě?",
    options: ["Atlantský", "Indický", "Tichý", "Severní ledový"],
    correctIndex: 2,
    explanation: "Tichý oceán (Pacifik) pokrývá více než třetinu zemského povrchu.",
    hint: "Leží mezi Asií a Amerikou.",
    keyEntity: "Tichý oceán",
    wikipediaSearchQuery: "Tichý oceán",
    category: Category.GEOGRAPHY,
    difficulty: Difficulty.EASY
  },

  // --- Umění a Kultura (ARTS) ---
  {
    text: "Kdo namaloval Monu Lisu?",
    options: ["Michelangelo", "Leonardo da Vinci", "Pablo Picasso", "Josef Lada"],
    correctIndex: 1,
    explanation: "Mona Lisa je nejslavnější obraz renesančního umělce Leonarda da Vinciho.",
    hint: "Italský génius, který navrhoval i letadla.",
    keyEntity: "Mona Lisa",
    wikipediaSearchQuery: "Mona Lisa",
    category: Category.ARTS,
    difficulty: Difficulty.EASY
  },
  {
    text: "Jak se jmenuje literární dílo o psu, které napsal Karel Čapek?",
    options: ["Bílá nemoc", "Dášeňka čili život štěněte", "Válka s mloky", "R.U.R."],
    correctIndex: 1,
    explanation: "Dášeňka je půvabná knížka s fotografiemi a kresbami o dospívání foxteriéra.",
    hint: "Jméno pejska začíná na D.",
    keyEntity: "Dášeňka",
    wikipediaSearchQuery: "Dášeňka čili život štěněte",
    category: Category.ARTS,
    difficulty: Difficulty.EASY
  },
  {
    text: "Jak se nazývá literární žánr, který vypráví příběh ve verších a často má epický rozsah?",
    options: ["Fejeton", "Haiku", "Epos", "Sonet"],
    correctIndex: 2,
    explanation: "Eposy patří k nejstarším formám literatury a často vyprávějí o hrdinských činech nebo osudech celých národů.",
    hint: "Například Homérova Odyssea.",
    keyEntity: "Epos",
    wikipediaSearchQuery: "Epos",
    category: Category.ARTS,
    difficulty: Difficulty.MEDIUM
  }
];