/**
 * Pool of fun bot names themed around monopoly, business, and capitalism
 */
export const BOT_NAMES = [
  // Marxist Canon
  "Karl Marx",
  "Friedrich Engels",
  "Rosa Luxemburg",
  "Vladimir Lenin",
  "Leon Trotsky",
  "Antonio Gramsci",
  "Alexandra Kollontai",
  "Nikolai Bukharin",

  // Western Marxism / Theory
  "Georg Lukacs",
  "Karl Korsch",
  "Louis Althusser",
  "Nicos Poulantzas",
  "Walter Benjamin",
  "Herbert Marcuse",
  "Henri Lefebvre",
  "C.L.R. James",

  // Anti-Colonial / Global Marxism
  "Frantz Fanon",
  "Amilcar Cabral",
  "Thomas Sankara",
  "Mao Zedong",
  "Ho Chi Minh",
  "Che Guevara",

  // Industrial Capitalists
  "John D. Rockefeller",
  "Andrew Carnegie",
  "Cornelius Vanderbilt",
  "J.P. Morgan",
  "Henry Ford",
  "Andrew Mellon",
  "Jay Gould",
  "Henry Clay Frick",

  // Financial Capital / Neoliberal Era
  "Milton Friedman",
  "Friedrich Hayek",
  "Alan Greenspan",
  "Margaret Thatcher",
  "Ronald Reagan",
  "Jeff Bezos",
  "Elon Musk",
  "Peter Thiel",
];

/**
 * Get a random bot name that hasn't been used yet in the current game
 */
export function getRandomBotName(usedNames: string[]): string {
  const availableNames = BOT_NAMES.filter((name) => !usedNames.includes(name));

  // If all names are used, fall back to numbered bots
  if (availableNames.length === 0) {
    const botCount = usedNames.filter((name) => name.startsWith("Bot ")).length;
    return `Bot ${botCount + 1}`;
  }

  const randomIndex = Math.floor(Math.random() * availableNames.length);
  return availableNames[randomIndex]!;
}
