/**
 * Pool of bot names. Two camps — figures of the Marxist /
 * socialist tradition and figures of capitalism — used both as
 * cosmetic flavor and as a classifier in the client's quirky-saying
 * generator (see client/src/utils/quirkySayings.ts; the short-form
 * surnames there must stay in sync).
 *
 * Goal: cover the canon broadly — utopians + early socialists,
 * Russian/Soviet, Western Marxism / Frankfurt School, council
 * communists, anti-colonial / Third-Worldist, Black radicals,
 * feminist Marxists, eco-Marxists, Latin American, contemporary —
 * paired against the corresponding eras of capital (industrialists,
 * robber barons, finance, neoliberalism, tech).
 */
export const BOT_NAMES = [
  // ── Utopian socialists / early communists ──
  "Robert Owen",
  "Charles Fourier",
  "Henri de Saint-Simon",
  "Pierre-Joseph Proudhon",
  "Louis Auguste Blanqui",
  "Wilhelm Weitling",
  "Flora Tristan",

  // ── Marxist canon ──
  "Karl Marx",
  "Friedrich Engels",
  "August Bebel",
  "Karl Kautsky",
  "Rosa Luxemburg",
  "Vladimir Lenin",
  "Leon Trotsky",
  "Joseph Stalin",
  "Antonio Gramsci",
  "Alexandra Kollontai",
  "Nikolai Bukharin",
  "Yevgeni Preobrazhensky",
  "Anatoly Lunacharsky",
  "Grigory Zinoviev",
  "Lev Kamenev",
  "Felix Dzerzhinsky",
  "Clara Zetkin",
  "Karl Liebknecht",
  "Eugene Debs",
  "Daniel De Leon",

  // ── 20th-century socialist heads of state ──
  "Nikita Khrushchev",
  "Leonid Brezhnev",
  "Yuri Andropov",
  "Mikhail Gorbachev",
  "Josip Broz Tito",
  "Enver Hoxha",
  "Erich Honecker",
  "Wladyslaw Gomulka",
  "Janos Kadar",
  "Nicolae Ceaușescu",
  "Kim Il-sung",
  "Daniel Ortega",
  "Maurice Bishop",
  "Hugo Chávez",
  "Evo Morales",
  "Olof Palme",
  "Augusto César Sandino",
  "Subcomandante Marcos",

  // ── Anarchist/communist tradition ──
  "Mikhail Bakunin",
  "Pyotr Kropotkin",
  "Emma Goldman",
  "Errico Malatesta",
  "Voltairine de Cleyre",
  "Nestor Makhno",

  // ── Council communists / left communists ──
  "Anton Pannekoek",
  "Otto Rühle",
  "Sylvia Pankhurst",
  "Paul Mattick",
  "Amadeo Bordiga",

  // ── Western Marxism / Frankfurt School / theory ──
  "Georg Lukacs",
  "Karl Korsch",
  "Walter Benjamin",
  "Theodor Adorno",
  "Max Horkheimer",
  "Herbert Marcuse",
  "Erich Fromm",
  "Jürgen Habermas",
  "Henri Lefebvre",
  "Louis Althusser",
  "Nicos Poulantzas",
  "Étienne Balibar",
  "Jacques Rancière",
  "Alain Badiou",
  "Slavoj Žižek",
  "Fredric Jameson",
  "Perry Anderson",

  // ── Anti-colonial / Third-Worldist ──
  "Frantz Fanon",
  "Amilcar Cabral",
  "Thomas Sankara",
  "Patrice Lumumba",
  "Kwame Nkrumah",
  "Julius Nyerere",
  "Walter Rodney",
  "Samir Amin",
  "Mao Zedong",
  "Ho Chi Minh",
  "Che Guevara",
  "Fidel Castro",
  "Salvador Allende",
  "José Carlos Mariátegui",
  "M. N. Roy",
  "Bhagat Singh",

  // ── Black radical tradition ──
  "C.L.R. James",
  "W.E.B. Du Bois",
  "Cedric Robinson",
  "Stuart Hall",
  "Angela Davis",
  "Manning Marable",
  "Stokely Carmichael",
  "Huey P. Newton",

  // ── Feminist Marxists / social reproduction ──
  "Silvia Federici",
  "Selma James",
  "Maria Mies",
  "Lise Vogel",
  "Heidi Hartmann",
  "Nancy Hartsock",
  "Maria Rosa Dalla Costa",

  // ── Eco-Marxism ──
  "John Bellamy Foster",
  "Andreas Malm",
  "Joel Kovel",
  "Ariel Salleh",

  // ── Contemporary ──
  "David Harvey",
  "Ellen Meiksins Wood",
  "Erik Olin Wright",
  "Vivek Chibber",
  "Jodi Dean",
  "Yanis Varoufakis",
  "Bhaskar Sunkara",
  "Mike Davis",
  "Naomi Klein",

  // ── Industrial capitalists / robber barons ──
  "John D. Rockefeller",
  "Andrew Carnegie",
  "Cornelius Vanderbilt",
  "J.P. Morgan",
  "Henry Ford",
  "Andrew Mellon",
  "Jay Gould",
  "Henry Clay Frick",
  "Russell Sage",
  "Edward Harriman",
  "James J. Hill",
  "James Fisk",
  "Leland Stanford",
  "Cyrus Field",
  "Howard Hughes",

  // ── Finance / banking dynasty ──
  "Mayer Rothschild",
  "Nathan Rothschild",
  "August Belmont",
  "David Rockefeller",
  "John Pierpont Morgan Jr.",

  // ── Neoliberal era ──
  "Milton Friedman",
  "Friedrich Hayek",
  "Alan Greenspan",
  "Margaret Thatcher",
  "Ronald Reagan",
  "Augusto Pinochet",
  "Henry Kissinger",

  // ── Contemporary capitalists ──
  "Jeff Bezos",
  "Elon Musk",
  "Peter Thiel",
  "Mark Zuckerberg",
  "Larry Ellison",
  "Larry Page",
  "Sergey Brin",
  "Bill Gates",
  "Warren Buffett",
  "Charles Koch",
  "Sheldon Adelson",
  "Robert Mercer",
  "Steve Schwarzman",
  "Ray Dalio",
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
