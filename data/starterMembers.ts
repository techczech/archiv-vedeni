export interface StarterMember {
  name: string;
  group: string;
  isChild: boolean;
}

export const STARTER_MEMBERS: StarterMember[] = [
  // Skupina Dub
  { name: "Dominik", group: "Dub", isChild: false },
  { name: "Anička", group: "Dub", isChild: false },
  { name: "Markéta", group: "Dub", isChild: false },
  
  // Skupina Lehovec
  { name: "Johanka", group: "Lehovec", isChild: false },
  { name: "Kája", group: "Lehovec", isChild: false },
  { name: "Sárinka", group: "Lehovec", isChild: true },
  { name: "Davídek", group: "Lehovec", isChild: true },
  
  // Skupina Chabry
  { name: "Bára", group: "Chabry", isChild: false },
  { name: "Vašek", group: "Chabry", isChild: false },
  { name: "Emička", group: "Chabry", isChild: true },
  { name: "Adélka", group: "Chabry", isChild: true },
  
  // Skupina Vinohrady
  { name: "Petra", group: "Vinohrady", isChild: false },
  { name: "Luboš", group: "Vinohrady", isChild: false },
  { name: "Zuzanka", group: "Vinohrady", isChild: false },
  { name: "Matouš", group: "Vinohrady", isChild: false },
  { name: "Tadeáš", group: "Vinohrady", isChild: false },
  
  // Skupina Jesenice
  { name: "Jakub", group: "Jesenice", isChild: false },
  { name: "Šárka", group: "Jesenice", isChild: false },
  { name: "Vája", group: "Jesenice", isChild: false },
  { name: "Kryštof", group: "Jesenice", isChild: false },
  
  // Skupina Praha
  { name: "Lucie", group: "Praha", isChild: false },
  { name: "Antonie", group: "Praha", isChild: false },
  { name: "Emilie", group: "Praha", isChild: false }
];
