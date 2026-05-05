/**
 * Pool of bot names. Two camps — figures of the Marxist / socialist
 * tradition and figures of capitalism — used both as cosmetic flavor
 * and as a classifier in the client's quirky-saying generator (see
 * client/src/utils/quirkySayings.ts; the short-form surnames there
 * must stay in sync).
 *
 * Each entry has a weight that biases random selection toward
 * better-known figures. A weight of 1 = baseline (academics, lesser
 * leaders); 6 = top-tier household names (Marx, Lenin, Bezos…).
 * Higher weight ⇒ shows up more often.
 */
export interface WeightedName {
  name: string;
  weight: number;
}

export const BOT_NAMES: WeightedName[] = [
  // ── Utopian socialists / early communists ──
  { name: "Robert Owen", weight: 2 },
  { name: "Charles Fourier", weight: 2 },
  { name: "Henri de Saint-Simon", weight: 1 },
  { name: "Pierre-Joseph Proudhon", weight: 3 },
  { name: "Louis Auguste Blanqui", weight: 1 },
  { name: "Wilhelm Weitling", weight: 1 },
  { name: "Flora Tristan", weight: 1 },

  // ── Marxist canon ──
  { name: "Karl Marx", weight: 6 },
  { name: "Friedrich Engels", weight: 6 },
  { name: "August Bebel", weight: 1 },
  { name: "Karl Kautsky", weight: 2 },
  { name: "Rosa Luxemburg", weight: 4 },
  { name: "Vladimir Lenin", weight: 6 },
  { name: "Leon Trotsky", weight: 5 },
  { name: "Joseph Stalin", weight: 6 },
  { name: "Antonio Gramsci", weight: 4 },
  { name: "Alexandra Kollontai", weight: 2 },
  { name: "Nikolai Bukharin", weight: 2 },
  { name: "Yevgeni Preobrazhensky", weight: 1 },
  { name: "Anatoly Lunacharsky", weight: 1 },
  { name: "Grigory Zinoviev", weight: 2 },
  { name: "Lev Kamenev", weight: 1 },
  { name: "Felix Dzerzhinsky", weight: 2 },
  { name: "Clara Zetkin", weight: 2 },
  { name: "Karl Liebknecht", weight: 2 },
  { name: "Eugene Debs", weight: 3 },
  { name: "Daniel De Leon", weight: 1 },

  // ── 20th-century socialist heads of state ──
  { name: "Nikita Khrushchev", weight: 4 },
  { name: "Leonid Brezhnev", weight: 3 },
  { name: "Yuri Andropov", weight: 1 },
  { name: "Mikhail Gorbachev", weight: 5 },
  { name: "Josip Broz Tito", weight: 3 },
  { name: "Enver Hoxha", weight: 1 },
  { name: "Erich Honecker", weight: 2 },
  { name: "Wladyslaw Gomulka", weight: 1 },
  { name: "Janos Kadar", weight: 1 },
  { name: "Nicolae Ceaușescu", weight: 2 },
  { name: "Kim Il-sung", weight: 4 },
  { name: "Daniel Ortega", weight: 2 },
  { name: "Maurice Bishop", weight: 1 },
  { name: "Hugo Chávez", weight: 4 },
  { name: "Evo Morales", weight: 2 },
  { name: "Olof Palme", weight: 2 },
  { name: "Augusto César Sandino", weight: 1 },
  { name: "Subcomandante Marcos", weight: 2 },

  // ── Anarchist / communist tradition ──
  { name: "Mikhail Bakunin", weight: 3 },
  { name: "Pyotr Kropotkin", weight: 3 },
  { name: "Emma Goldman", weight: 4 },
  { name: "Errico Malatesta", weight: 1 },
  { name: "Voltairine de Cleyre", weight: 1 },
  { name: "Nestor Makhno", weight: 1 },

  // ── Council communists / left communists ──
  { name: "Anton Pannekoek", weight: 1 },
  { name: "Otto Rühle", weight: 1 },
  { name: "Sylvia Pankhurst", weight: 1 },
  { name: "Paul Mattick", weight: 1 },
  { name: "Amadeo Bordiga", weight: 1 },

  // ── Western Marxism / Frankfurt School / theory ──
  { name: "Georg Lukacs", weight: 1 },
  { name: "Karl Korsch", weight: 1 },
  { name: "Walter Benjamin", weight: 2 },
  { name: "Theodor Adorno", weight: 2 },
  { name: "Max Horkheimer", weight: 1 },
  { name: "Herbert Marcuse", weight: 2 },
  { name: "Erich Fromm", weight: 2 },
  { name: "Jürgen Habermas", weight: 2 },
  { name: "Henri Lefebvre", weight: 1 },
  { name: "Louis Althusser", weight: 2 },
  { name: "Nicos Poulantzas", weight: 1 },
  { name: "Étienne Balibar", weight: 1 },
  { name: "Jacques Rancière", weight: 1 },
  { name: "Alain Badiou", weight: 1 },
  { name: "Slavoj Žižek", weight: 3 },
  { name: "Fredric Jameson", weight: 1 },
  { name: "Perry Anderson", weight: 1 },

  // ── Anti-colonial / Third-Worldist ──
  { name: "Frantz Fanon", weight: 3 },
  { name: "Amilcar Cabral", weight: 1 },
  { name: "Thomas Sankara", weight: 2 },
  { name: "Patrice Lumumba", weight: 2 },
  { name: "Kwame Nkrumah", weight: 2 },
  { name: "Julius Nyerere", weight: 1 },
  { name: "Walter Rodney", weight: 1 },
  { name: "Samir Amin", weight: 1 },
  { name: "Mao Zedong", weight: 6 },
  { name: "Ho Chi Minh", weight: 5 },
  { name: "Che Guevara", weight: 6 },
  { name: "Fidel Castro", weight: 6 },
  { name: "Salvador Allende", weight: 4 },
  { name: "José Carlos Mariátegui", weight: 1 },
  { name: "M. N. Roy", weight: 1 },
  { name: "Bhagat Singh", weight: 2 },

  // ── Black radical tradition ──
  { name: "C.L.R. James", weight: 1 },
  { name: "W.E.B. Du Bois", weight: 3 },
  { name: "Cedric Robinson", weight: 1 },
  { name: "Stuart Hall", weight: 2 },
  { name: "Angela Davis", weight: 3 },
  { name: "Manning Marable", weight: 1 },
  { name: "Stokely Carmichael", weight: 2 },
  { name: "Huey P. Newton", weight: 2 },

  // ── Feminist Marxists / social reproduction ──
  { name: "Silvia Federici", weight: 2 },
  { name: "Selma James", weight: 1 },
  { name: "Maria Mies", weight: 1 },
  { name: "Lise Vogel", weight: 1 },
  { name: "Heidi Hartmann", weight: 1 },
  { name: "Nancy Hartsock", weight: 1 },
  { name: "Maria Rosa Dalla Costa", weight: 1 },

  // ── Eco-Marxism ──
  { name: "John Bellamy Foster", weight: 1 },
  { name: "Andreas Malm", weight: 1 },
  { name: "Joel Kovel", weight: 1 },
  { name: "Ariel Salleh", weight: 1 },

  // ── Contemporary ──
  { name: "David Harvey", weight: 2 },
  { name: "Ellen Meiksins Wood", weight: 1 },
  { name: "Erik Olin Wright", weight: 1 },
  { name: "Vivek Chibber", weight: 1 },
  { name: "Jodi Dean", weight: 1 },
  { name: "Yanis Varoufakis", weight: 2 },
  { name: "Bhaskar Sunkara", weight: 1 },
  { name: "Mike Davis", weight: 1 },
  { name: "Naomi Klein", weight: 2 },

  // ── Industrial capitalists / robber barons ──
  { name: "John D. Rockefeller", weight: 6 },
  { name: "Andrew Carnegie", weight: 5 },
  { name: "Cornelius Vanderbilt", weight: 4 },
  { name: "J.P. Morgan", weight: 5 },
  { name: "Henry Ford", weight: 6 },
  { name: "Andrew Mellon", weight: 2 },
  { name: "Jay Gould", weight: 2 },
  { name: "Henry Clay Frick", weight: 2 },
  { name: "Russell Sage", weight: 1 },
  { name: "Edward Harriman", weight: 1 },
  { name: "James J. Hill", weight: 1 },
  { name: "James Fisk", weight: 1 },
  { name: "Leland Stanford", weight: 2 },
  { name: "Cyrus Field", weight: 1 },
  { name: "Howard Hughes", weight: 4 },

  // ── Finance / banking dynasty ──
  { name: "Mayer Rothschild", weight: 2 },
  { name: "Nathan Rothschild", weight: 2 },
  { name: "August Belmont", weight: 1 },
  { name: "David Rockefeller", weight: 2 },
  { name: "John Pierpont Morgan Jr.", weight: 1 },

  // ── Neoliberal era ──
  { name: "Milton Friedman", weight: 4 },
  { name: "Friedrich Hayek", weight: 3 },
  { name: "Alan Greenspan", weight: 3 },
  { name: "Margaret Thatcher", weight: 5 },
  { name: "Ronald Reagan", weight: 6 },
  { name: "Augusto Pinochet", weight: 3 },
  { name: "Henry Kissinger", weight: 4 },

  // ── Contemporary capitalists ──
  { name: "Jeff Bezos", weight: 6 },
  { name: "Elon Musk", weight: 6 },
  { name: "Peter Thiel", weight: 4 },
  { name: "Mark Zuckerberg", weight: 5 },
  { name: "Larry Ellison", weight: 3 },
  { name: "Larry Page", weight: 3 },
  { name: "Sergey Brin", weight: 3 },
  { name: "Bill Gates", weight: 6 },
  { name: "Warren Buffett", weight: 5 },
  { name: "Charles Koch", weight: 3 },
  { name: "Sheldon Adelson", weight: 2 },
  { name: "Robert Mercer", weight: 1 },
  { name: "Steve Schwarzman", weight: 1 },
  { name: "Ray Dalio", weight: 2 },
];

/**
 * Get a random bot name that hasn't been used yet in the current
 * game. Selection is WEIGHTED — higher-weight names (Marx, Bezos,
 * Stalin, Reagan, etc.) come up more often than the deeper cuts.
 */
export function getRandomBotName(usedNames: string[]): string {
  const available = BOT_NAMES.filter((b) => !usedNames.includes(b.name));

  // If all names are used, fall back to numbered bots
  if (available.length === 0) {
    const botCount = usedNames.filter((name) => name.startsWith("Bot ")).length;
    return `Bot ${botCount + 1}`;
  }

  const totalWeight = available.reduce((sum, b) => sum + b.weight, 0);
  let r = Math.random() * totalWeight;
  for (const b of available) {
    r -= b.weight;
    if (r <= 0) return b.name;
  }
  // Fallback for floating-point edge case
  return available[available.length - 1]!.name;
}
