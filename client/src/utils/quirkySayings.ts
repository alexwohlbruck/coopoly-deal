import { type PendingAction } from "../types/game";

const SOCIALIST_BOT_NAMES = [
  "Marx",
  "Engels",
  "Luxemburg",
  "Lenin",
  "Trotsky",
  "Gramsci",
  "Kollontai",
  "Bukharin",
  "Lukacs",
  "Korsch",
  "Althusser",
  "Poulantzas",
  "Benjamin",
  "Marcuse",
  "Lefebvre",
  "James",
  "Fanon",
  "Cabral",
  "Sankara",
  "Mao",
  "Ho Chi Minh",
  "Guevara",
];
const CAPITALIST_BOT_NAMES = [
  "Rockefeller",
  "Carnegie",
  "Vanderbilt",
  "Morgan",
  "Ford",
  "Mellon",
  "Gould",
  "Frick",
  "Friedman",
  "Hayek",
  "Greenspan",
  "Thatcher",
  "Reagan",
  "Bezos",
  "Musk",
  "Thiel",
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
      ],
      capitalist: [
        `Those greedy capitalist pigs are stealing our hard earned wages again!`,
        `${sourceName} is exploiting the working class for profit!`,
        `Another extortionate rent hike from the bourgeoisie!`,
      ],
      neutral: [
        `The state demands its due from you.`,
        `Time to pay your fair share to the collective.`,
      ],
    },
    debtCollector: {
      socialist: [
        `Party dues must be paid to Comrade ${sourceName}!`,
        `The Politburo has ordered a wealth redistribution.`,
      ],
      capitalist: [
        `The capitalist ${sourceName} is shaking you down!`,
        `More extortion from the ruling class!`,
      ],
      neutral: [`Your mandatory contribution has been requested.`],
    },
    birthday: {
      socialist: [
        `Celebrate Comrade ${sourceName}'s Hero of Labor award!`,
        `A state-mandated celebration for ${sourceName}!`,
      ],
      capitalist: [
        `The bourgeois ${sourceName} demands gifts from the workers!`,
        `Another lavish party funded by our sweat and tears.`,
      ],
      neutral: [`A collective celebration requires your contribution.`],
    },
    slyDeal: {
      socialist: [
        `Comrade ${sourceName} is requisitioning state property for the greater good.`,
        `A strategic reallocation of resources by ${sourceName}.`,
      ],
      capitalist: [
        `The imperialist ${sourceName} is plundering our resources!`,
        `Capitalist theft in broad daylight!`,
      ],
      neutral: [`Your property has been selected for requisition.`],
    },
    forceDeal: {
      socialist: [
        `The central planning committee has ordered a resource swap with ${sourceName}.`,
        `A mutually beneficial exchange mandated by the state.`,
      ],
      capitalist: [
        `A hostile corporate takeover by ${sourceName}!`,
        `They call it a trade, we call it exploitation!`,
      ],
      neutral: [`A mandatory resource exchange has been initiated.`],
    },
    dealBreaker: {
      socialist: [
        `The state is nationalizing your collective for Comrade ${sourceName}!`,
        `Your monopoly has been seized for the glory of the revolution!`,
      ],
      capitalist: [
        `The monopolist ${sourceName} is crushing the competition!`,
        `Absolute capitalist greed! They're taking everything!`,
      ],
      neutral: [`Your assets are being nationalized by decree.`],
    },
  };

  const options = sayings[actionType][playerType];
  return options[Math.floor(Math.random() * options.length)];
}
