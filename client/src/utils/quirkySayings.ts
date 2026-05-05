import { type PendingAction } from "../types/game";

// ────────────────────────────────────────────────────────────────────
// Bot-name classifier — used to pick the right voice for the
// quirky-saying when an action is initiated. The short-form lists
// below must mirror the surnames present in BOT_NAMES (server's
// utils/bot-names.ts). Real (human) players don't match either list
// and are randomly assigned per-action for variety.
// ────────────────────────────────────────────────────────────────────

const SOCIALIST_BOT_NAMES = [
  // Utopians / early
  "Owen",
  "Fourier",
  "Saint-Simon",
  "Proudhon",
  "Blanqui",
  "Weitling",
  "Tristan",
  // Marxist canon
  "Marx",
  "Engels",
  "Bebel",
  "Kautsky",
  "Luxemburg",
  "Lenin",
  "Trotsky",
  "Stalin",
  "Gramsci",
  "Kollontai",
  "Bukharin",
  "Preobrazhensky",
  "Lunacharsky",
  "Zinoviev",
  "Kamenev",
  "Dzerzhinsky",
  "Zetkin",
  "Liebknecht",
  "Debs",
  "De Leon",
  // 20th-century heads of state
  "Khrushchev",
  "Brezhnev",
  "Andropov",
  "Gorbachev",
  "Tito",
  "Hoxha",
  "Honecker",
  "Gomulka",
  "Kadar",
  "Ceaușescu",
  "Kim Il-sung",
  "Ortega",
  "Bishop",
  "Chávez",
  "Morales",
  "Palme",
  "Sandino",
  "Marcos",
  // Anarchist
  "Bakunin",
  "Kropotkin",
  "Goldman",
  "Malatesta",
  "Cleyre",
  "Makhno",
  // Council / left communists
  "Pannekoek",
  "Rühle",
  "Pankhurst",
  "Mattick",
  "Bordiga",
  // Western Marxism / Frankfurt
  "Lukacs",
  "Korsch",
  "Benjamin",
  "Adorno",
  "Horkheimer",
  "Marcuse",
  "Fromm",
  "Habermas",
  "Lefebvre",
  "Althusser",
  "Poulantzas",
  "Balibar",
  "Rancière",
  "Badiou",
  "Žižek",
  "Jameson",
  "Anderson",
  // Anti-colonial / Third-Worldist
  "Fanon",
  "Cabral",
  "Sankara",
  "Lumumba",
  "Nkrumah",
  "Nyerere",
  "Rodney",
  "Amin",
  "Mao",
  "Ho Chi Minh",
  "Guevara",
  "Castro",
  "Allende",
  "Mariátegui",
  "Roy",
  "Bhagat Singh",
  // Black radical
  "James",
  "Du Bois",
  "Robinson",
  "Hall",
  "Davis",
  "Marable",
  "Carmichael",
  "Newton",
  // Feminist Marxists
  "Federici",
  "Selma James",
  "Mies",
  "Vogel",
  "Hartmann",
  "Hartsock",
  "Dalla Costa",
  // Eco-Marxism
  "Foster",
  "Malm",
  "Kovel",
  "Salleh",
  // Contemporary
  "Harvey",
  "Wood",
  "Wright",
  "Chibber",
  "Dean",
  "Varoufakis",
  "Sunkara",
  "Mike Davis",
  "Klein",
];

const CAPITALIST_BOT_NAMES = [
  // Industrial / robber barons
  "Rockefeller",
  "Carnegie",
  "Vanderbilt",
  "Morgan",
  "Ford",
  "Mellon",
  "Gould",
  "Frick",
  "Sage",
  "Harriman",
  "Hill",
  "Fisk",
  "Stanford",
  "Field",
  "Hughes",
  // Finance dynasties
  "Rothschild",
  "Belmont",
  // Neoliberal era
  "Friedman",
  "Hayek",
  "Greenspan",
  "Thatcher",
  "Reagan",
  "Pinochet",
  "Kissinger",
  // Contemporary
  "Bezos",
  "Musk",
  "Thiel",
  "Zuckerberg",
  "Ellison",
  "Page",
  "Brin",
  "Gates",
  "Buffett",
  "Koch",
  "Adelson",
  "Mercer",
  "Schwarzman",
  "Dalio",
];

function getPlayerType(name: string): "socialist" | "capitalist" | "neutral" {
  if (SOCIALIST_BOT_NAMES.some((n) => name.includes(n))) return "socialist";
  if (CAPITALIST_BOT_NAMES.some((n) => name.includes(n))) return "capitalist";
  // Randomly assign neutral players (real humans) to socialist or capitalist for fun
  return Math.random() > 0.5 ? "socialist" : "capitalist";
}

export function getQuirkySaying(
  actionType: PendingAction["type"],
  sourceName: string,
  useSocialistTheme: boolean,
): string | null {
  if (!useSocialistTheme) return null;

  const playerType = getPlayerType(sourceName);

  const sayings: Record<
    PendingAction["type"],
    Record<"socialist" | "capitalist" | "neutral", string[]>
  > = {
    rent: {
      socialist: [
        `Comrade ${sourceName} requires a contribution to the state fund!`,
        `The collective needs your share, comrade!`,
        `${sourceName} is collecting the mandatory state levy.`,
        `From each according to ability — to ${sourceName} according to need.`,
        `${sourceName} taxes the petite bourgeoisie. Surplus value, returned.`,
        `The five-year plan demands its quota.`,
        `Pay your dues to the people's bank, citizen.`,
        `${sourceName}'s soviet has voted: levy approved.`,
        `Workers of the world, pay this rent.`,
        `The kolkhoz of ${sourceName} bills you for the season.`,
      ],
      capitalist: [
        `Those greedy capitalist pigs are stealing our hard-earned wages again!`,
        `${sourceName} is exploiting the working class for profit!`,
        `Another extortionate rent hike from the bourgeoisie!`,
        `Landlord ${sourceName} demands their pound of flesh.`,
        `Capital begets capital — and they want yours.`,
        `${sourceName} privatizes the gains, socializes the losses.`,
        `The robber baron ${sourceName} extracts your surplus value.`,
        `Trickle-down? More like sucked-up. Pay ${sourceName}.`,
        `${sourceName}'s portfolio bills you for the privilege of living.`,
        `Rentier capitalism, alive and bleeding you. Pay.`,
      ],
      neutral: [
        `The state demands its due from you.`,
        `Time to pay your fair share to the collective.`,
        `${sourceName} calls in the rent.`,
        `Your contribution is requested.`,
        `The ledger awaits.`,
      ],
    },
    debtCollector: {
      socialist: [
        `Party dues must be paid to Comrade ${sourceName}!`,
        `The Politburo has ordered a wealth redistribution.`,
        `The vanguard requires fresh cadres — and your capital.`,
        `${sourceName} is collecting on a debt to the people.`,
        `A revolutionary tax has been levied upon you.`,
        `Cheka of ${sourceName} arrives to settle accounts.`,
        `The committee finds your account in arrears, comrade.`,
        `${sourceName} executes the wealth tax. No exemptions.`,
      ],
      capitalist: [
        `The capitalist ${sourceName} is shaking you down!`,
        `More extortion from the ruling class!`,
        `Debt collector ${sourceName} comes for what's owed.`,
        `${sourceName}'s lawyers are at the door.`,
        `Pay up or be foreclosed.`,
        `Loan shark ${sourceName} sends their compliments.`,
        `${sourceName} will repossess what you cannot pay for.`,
        `Indebted by birth, billed by ${sourceName}.`,
      ],
      neutral: [
        `Your mandatory contribution has been requested.`,
        `${sourceName} wants their cut.`,
        `Settle accounts.`,
        `${sourceName} calls. Bring \$5M.`,
      ],
    },
    birthday: {
      socialist: [
        `Celebrate Comrade ${sourceName}'s Hero of Labor award!`,
        `A state-mandated celebration for ${sourceName}!`,
        `${sourceName} is awarded the Order of Lenin — gifts in order.`,
        `The collective fêtes Comrade ${sourceName}.`,
        `May Day comes early for ${sourceName}!`,
        `Solidarity tribute requested for ${sourceName}'s birthday.`,
        `${sourceName} reaches another year of the struggle. Contribute.`,
        `The Komsomol throws a parade. You're funding it.`,
      ],
      capitalist: [
        `The bourgeois ${sourceName} demands gifts from the workers!`,
        `Another lavish party funded by our sweat and tears.`,
        `${sourceName}'s yacht christening — you're paying.`,
        `The plutocrat ${sourceName} expects tribute.`,
        `Celebrate ${sourceName}'s tax-deductible birthday!`,
        `${sourceName}'s estate hosts a gala. Workers pay the catering.`,
        `Champagne for ${sourceName}, austerity for everyone else.`,
      ],
      neutral: [
        `A collective celebration requires your contribution.`,
        `${sourceName} is having a birthday. Pay up.`,
        `Birthday tribute, mandatory.`,
      ],
    },
    slyDeal: {
      socialist: [
        `Comrade ${sourceName} is requisitioning state property for the greater good.`,
        `A strategic reallocation of resources by ${sourceName}.`,
        `The party expropriates one of your holdings, comrade.`,
        `${sourceName} reclaims a deed for the collective.`,
        `Land redistribution: ${sourceName} edition.`,
        `Decree №${Math.floor(Math.random() * 900 + 100)}: parcel transferred to ${sourceName}.`,
        `${sourceName} serves you with a notice of socialist requisition.`,
      ],
      capitalist: [
        `The imperialist ${sourceName} is plundering our resources!`,
        `Capitalist theft in broad daylight!`,
        `${sourceName} stages a hostile takeover of one parcel.`,
        `The robber baron ${sourceName} pockets a deed.`,
        `Primitive accumulation continues — ${sourceName}'s turn.`,
        `${sourceName} forecloses on a single property. Sweet deal.`,
        `Eminent domain for one — courtesy of ${sourceName}'s lobbyists.`,
      ],
      neutral: [
        `Your property has been selected for requisition.`,
        `${sourceName} pinches one of yours.`,
        `One deed, redistributed. ${sourceName}'s turn.`,
      ],
    },
    forceDeal: {
      socialist: [
        `The central planning committee has ordered a resource swap with ${sourceName}.`,
        `A mutually beneficial exchange mandated by the state.`,
        `${sourceName} initiates a comradely swap (for the plan).`,
        `Gosplan rebalances your holdings with ${sourceName}'s.`,
        `A collective reshuffling is in order.`,
        `${sourceName} proposes barter under socialist principles. You accept.`,
        `The five-year plan requires this exchange.`,
      ],
      capitalist: [
        `A hostile corporate takeover by ${sourceName}!`,
        `They call it a trade, we call it exploitation!`,
        `${sourceName}'s lawyers force the trade.`,
        `Buyout at gunpoint — ${sourceName} swaps a deed.`,
        `The merger isn't optional, comrade.`,
        `${sourceName}'s accountants manufacture this exchange.`,
        `A trade only the capitalist comes out of clean.`,
      ],
      neutral: [
        `A mandatory resource exchange has been initiated.`,
        `${sourceName} forces a swap.`,
        `Trade incoming, like it or not.`,
      ],
    },
    dealBreaker: {
      socialist: [
        `The state is nationalizing your collective for Comrade ${sourceName}!`,
        `Your monopoly has been seized for the glory of the revolution!`,
        `${sourceName} expropriates your monopoly for the people.`,
        `Industrial sector nationalized. ${sourceName} is the new commissar.`,
        `The Soviet of ${sourceName} claims your trust.`,
        `Decree of nationalization served by ${sourceName}.`,
        `The kulaks are dispossessed; ${sourceName} signs the papers.`,
      ],
      capitalist: [
        `The monopolist ${sourceName} is crushing the competition!`,
        `Absolute capitalist greed! They're taking everything!`,
        `${sourceName} corners the market — your set is theirs.`,
        `The trust ${sourceName} swallows your firm whole.`,
        `Antitrust laws? Not this turn.`,
        `${sourceName} has been buying up shares; today they collect.`,
        `Vertical integration achieved. ${sourceName} owns it all.`,
      ],
      neutral: [
        `Your assets are being nationalized by decree.`,
        `${sourceName} grabs the whole set.`,
        `Three deeds, one new owner.`,
      ],
    },
  };

  const options = sayings[actionType][playerType];
  return options[Math.floor(Math.random() * options.length)];
}
