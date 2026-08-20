import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ar } from "./ar";
import { bn } from "./bn";
import { de } from "./de";
import { en } from "./en";
import { es } from "./es";
import { fil } from "./fil";
import { fr } from "./fr";
import { hi } from "./hi";
import { id } from "./id";
import { mr } from "./mr";
import { ptBR } from "./pt-BR";
import { ta } from "./ta";
import { te } from "./te";
import { ur } from "./ur";
import { vi } from "./vi";

export type Locale =
  | "en"
  | "es"
  | "hi"
  | "bn"
  | "mr"
  | "ta"
  | "te"
  | "fr"
  | "pt-BR"
  | "de"
  | "ur"
  | "ar"
  | "fil"
  | "vi"
  | "id";

export interface Translations {
  lobby: {
    title: string;
    subtitle: string;
    welcomeBack: string;
    welcomeBackName: string;
    createRoom: string;
    joinRoom: string;
    enterCode: string;
    enterName: string;
    join: string;
    back: string;
    orJoin: string;
    roomCodePlaceholder: string;
    buyMeACoffee: string;
    madeWithLoveBy: string;
    credits: string;
    scanQrTitle: string;
    scanQrHint: string;
    joiningRoom: string;
    yourName: string;
    joinGame: string;
  };
  waiting: {
    roomCode: string;
    players: string;
    startGame: string;
    addBot: string;
    waitingForPlayers: string;
    needMorePlayers: string;
    leaveRoom: string;
    waitingRoom: string;
    scanToJoin: string;
    scanToJoinClose: string;
    clickToEnlarge: string;
    copyLink: string;
    copyLinkHint: string;
    copied: string;
    cpu: string;
    youHost: string;
    host: string;
    you: string;
    player: string;
    removePlayer: string;
    needPlayers: string;
    waitingForMore: string;
  };
  game: {
    yourTurn: string;
    cardsPlayed: string;
    endTurn: string;
    discard: string;
    discardPrompt: string;
    deck: string;
    discardPile: string;
    playCard: string;
    addToBank: string;
    playAsProperty: string;
    useAction: string;
    selectColor: string;
    selectPlayer: string;
    selectProperty: string;
    selectYourProperty: string;
    selectCompleteSet: string;
    waitingForResponses: string;
    playing: string;
    resign: string;
    settings: string;
    resignConfirm: string;
    resignDescription: string;
    leave: string;
    table: string;
    timesUp: string;
    cannotPlay: string;
    changeWildcardColor: string;
    assignWildcardColor: string;
    decideLater: string;
    groupWithRainbow: string;
    playAsColor: string;
    addToExistingSet: string;
    startNewSet: string;
    howManyRainbow: string;
    pickCardsToDiscard: string;
    hoverHint: string;
    newSet: string;
    noProperties: string;
    empty: string;
    selectCardsToPayWith: string;
    dev: string;
    wildcardFlipInstruction: string;
    wildcardAssignInstruction: string;
    incompleteSetPrompt: string;
    /** Empty-state on a player's property row. */
    noSetsPlayed: string;
    /** Touch equivalent of `hoverHint`, shown under the hand on mobile. */
    dragHint: string;
  };
  actions: {
    passGo: string;
    slyDeal: string;
    forceDeal: string;
    dealBreaker: string;
    debtCollector: string;
    birthday: string;
    justSayNo: string;
    doubleTheRent: string;
    house: string;
    hotel: string;
    rent: string;
  };
  prompts: {
    /** Full sentences — the old postfix fragments ("is charging rent!")
     *  couldn't work in verb-final languages, where the name has to sit
     *  inside the clause rather than in front of it.
     *  Slots: {name} {amount} {card} {accept} {action} {rent} {property} {steal} */
    rentCharge: string;
    debtDemand: string;
    birthdayPay: string;
    stealProperty: string;
    swapProperty: string;
    stealSet: string;
    jsnCounterYours: string;
    jsnCounter: string;
    someone: string;
    pay: string;
    payNothing: string;
    selectCards: string;
    cantPay: string;
    accept: string;
    action: string;
    yourCompleteSet: string;
    yourCard: string;
    actionPlayedAgainstYou: string;
  };
  finished: {
    youWin: string;
    playerWins: string;
    completedSets: string;
    wins: string;
    losses: string;
    streak: string;
    rematch: string;
    changePlayers: string;
    leave: string;
    share: string;
    shareCopied: string;
    shareTitle: string;
    sharePreviewLabel: string;
    shareOnX: string;
    shareOnBluesky: string;
    shareOnThreads: string;
    shareCopy: string;
    shareNative: string;
    winner: string;
    rank: string;
    gameOver: string;
    finalStandings: string;
    set: string;
    completeSets: string;
    noProperties: string;
    bank: string;
    players: string;
  };
  settings: {
    title: string;
    theme: string;
    handLimit: string;
    language: string;
    soundEffects: string;
    backgroundMusic: string;
    haptics: string;
    soundTheme: string;
    unlimited: string;
    save: string;
    credits: string;
  };
  credits: {
    title: string;
    dedicatedTo: string;
    dedicatedToName: string;
    dedicatedToBody: string;
    originalGame: string;
    originalGameBody: string;
    music: string;
    musicBody: string;
    openSource: string;
    frontend: string;
    backend: string;
    analytics: string;
    iconsBy: string;
    madeBy: string;
  };
  rules: {
    eyebrow: string;
    title: string;
    close: string;
    gotIt: string;
    dialecticalLens: string;
    dialecticalLensSwitchOn: string;
    dialecticalLensSwitchOff: string;
    overview: string;
    setup: string;
    turnStructure: string;
    drawPhase: string;
    playPhase: string;
    discardPhase: string;
    winning: string;
    propertySets: string;
    keyActionCards: string;
    keyDirectiveCards: string;
    paymentRules: string;
    propertyWildcards: string;
  };
  common: {
    you: string;
    bank: string;
    properties: string;
    cards: string;
    sets: string;
    turn: string;
    next: string;
    sourceCode: string;
    cancel: string;
    rules: string;
    gameRules: string;
    current: string;
    best: string;
    completesSet: string;
    back: string;
    add: string;
    player: string;
    players: string;
    stolen: string;
    /** Trails a count: "3 players online". */
    online: string;
    move: string;
    moves: string;
    /** Bare verb "steal", used where the Co-Opoly swap needs "expropriate". */
    steal: string;
  };
  gameSettings: {
    title: string;
    hostOnly: string;
    maxHandSize: string;
    turnTimer: string;
    allowDuplicateSets: string;
    allowDuplicateSetsHint: string;
    wildcardFlipCountsAsMove: string;
    wildcardFlipHint: string;
    botSpeed: string;
    slow: string;
    normal: string;
    fast: string;
    instant: string;
    hostOnlyNote: string;
    movesPerTurn: string;
    movesPerTurnHint: string;
    setsToWin: string;
    setsToWinHint: string;
    requireHouseBeforeHotel: string;
    requireHouseBeforeHotelHint: string;
    drawCardsPerTurn: string;
    drawCardsPerTurnHint: string;
    ruleSet: string;
    customRuleSet: string;
    saveAsRuleSet: string;
    deleteRuleSet: string;
    ruleSetName: string;
    custom: string;
  };
  socialist: {
    title: string;
    subtitle: string;
    rulesTitle: string;
    player: string;
    players: string;
    property: string;
    properties: string;
    bank: string;
    rent: string;
    rents: string;
    action: string;
    steal: string;
    stolen: string;
    shift: string;
    comply: string;
    contribute: string;
    selectResources: string;
    nothingToContribute: string;
    stateAssetSets: string;
    generalAssetWildcards: string;
    counterIntelligence: string;
    directive: string;
    actionPlayedAgainstYou: string;
    yourCompleteSet: string;
    removePlayer: string;
    needPlayers: string;
    waitingForMore: string;
    /** Co-Opoly renames two of the property colors. */
    colors: { railroad: string; utility: string };
    /** Co-Opoly renames every card. Same keys as top-level `cardTypes`. */
    cardTypes: CardTypeLabels;
    /** Co-Opoly rewording of the rent dialog. */
    birthdayPay: string;
    swapProperty: string;
    /** Co-Opoly overrides for the two sentences whose verb can't be swapped
     *  by placeholder — inflection differs too much between languages. */
    stealProperty: string;
    overview: string;
    collectLevyTitle: string;
    levyFlavor: string;
    /** Co-Opoly variants of the card-face descriptions. */
    cardFaces: { stealOneProperty: string; stealFullSet: string; everyonePays: string; blockAction: string };
  };
  /** Property colors, as printed on the card band and in the rent table. */
  colors: {
    brown: string;
    lightBlue: string;
    pink: string;
    orange: string;
    red: string;
    yellow: string;
    green: string;
    darkBlue: string;
    railroad: string;
    utility: string;
    rainbow: string;
  };
  cardTypes: CardTypeLabels;
  /** Text printed on the card art itself. */
  cardFaces: {
    action: string;
    deal: string;
    money: string;
    property: string;
    wildcard: string;
    anyColor: string;
    set: string;
    drawTwo: string;
    stealOneProperty: string;
    swapProperties: string;
    stealFullSet: string;
    everyonePays: string;
    payFive: string;
    blockAction: string;
  };
  /**
   * Rules-modal body copy. `{name}` slots are filled at render time and
   * `<b>…</b>` marks the emphasised run — see `i18n/format.tsx`. The whole
   * sentence is one string so verb-final languages (Hindi, Tamil, Telugu,
   * Urdu) can put the emphasis where their grammar needs it.
   *
   * Slots in scope: {game} {player} {players} {property} {properties}
   * {bank} {action} {rent} {rents} {steal} {n} {max} {diffColors}
   */
  rulesBody: {
    overview: string;
    setupShuffle: string;
    setupDeal: string;
    setupDrawPile: string;
    setupFirstPlayer: string;
    drawPhase: string;
    playPhase: string;
    discardPhase: string;
    /** Substituted into `discardPhase` as {max} when the limit is off. */
    unlimitedCards: string;
    /** Appended to the win condition as {diffColors} when duplicate sets are off. */
    ofDifferentColors: string;
    winning: string;
    winningSetsOnTable: string;
    tableColor: string;
    tableSet: string;
    houseHotelNote: string;
    cardPassGo: string;
    cardSlyDeal: string;
    cardForceDeal: string;
    cardDealBreaker: string;
    cardDebtCollector: string;
    cardBirthday: string;
    cardJustSayNo: string;
    cardDoubleRent: string;
    payPayerDecides: string;
    payOnTableOnly: string;
    payMoneyToBank: string;
    payPropertyToArea: string;
    payNoChange: string;
    wildDual: string;
    wildMulti: string;
    wildMoveDuringTurn: string;
    wildNoValue: string;
  };
  /** Card-action dialog helper copy. */
  cardActions: {
    playRentCards: string;
    rentIntro: string;
    base: string;
    multiplier: string;
    total: string;
    upTo: string;
    giveFromYourSets: string;
    pickWhatHurtsLeast: string;
    eachRowShows: string;
    eachCardShows: string;
    unassignedDecideLater: string;
    movesLeft: string;
    onlyPropertyCards: string;
    incompleteSetDropHint: string;
    justSayNoOnlyInResponse: string;
  };
  /** Small chrome/controls strings that aren't part of a larger screen. */
  ui: {
    close: string;
    nextOpponent: string;
    previousOpponent: string;
    noOpponent: string;
    noOpponents: string;
    scrollToSwitch: string;
    yourSetsAndBank: string;
    /** Desktop variant with the completed-set count. */
    yourSetsCompleteBank: string;
    /** "{name}'s table" — a template because the possessive is English-only. */
    playersTable: string;
    /** "{name}'s turn". */
    playersTurn: string;
    /** Opponent stat line: complete sets + hand size. */
    oppStats: string;
    swipe: string;
    waiting: string;
    playMusic: string;
    pauseMusic: string;
    nextTrack: string;
    reconnecting: string;
  };
}

/** Shared shape for the standard and Co-Opoly card-name tables. */
export interface CardTypeLabels {
  money: string;
  property: string;
  wildProperty: string;
  rent: string;
  wildRent: string;
  passGo: string;
  slyDeal: string;
  forceDeal: string;
  dealBreaker: string;
  debtCollector: string;
  birthday: string;
  justSayNo: string;
  doubleRent: string;
  house: string;
  hotel: string;
}

const translations: Record<Locale, Translations> = {
  en,
  es,
  hi,
  bn,
  mr,
  ta,
  te,
  fr,
  "pt-BR": ptBR,
  de,
  ur,
  ar,
  fil,
  vi,
  id,
};

/**
 * Picker metadata. Labels are endonyms so a speaker recognizes their own
 * language without reading English. Order: English, then the Indian
 * languages (largest slice of the player base after English), then the
 * rest by rough player count.
 */
export const LOCALES: ReadonlyArray<{
  code: Locale;
  label: string;
  /** Only set for right-to-left scripts; drives <html dir>. */
  dir?: "rtl";
}> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ur", label: "اردو", dir: "rtl" },
  { code: "bn", label: "বাংলা" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "fil", label: "Filipino" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
];

/** "rtl" for Urdu and Arabic, "ltr" otherwise. */
export function directionOf(locale: Locale): "ltr" | "rtl" {
  return LOCALES.find((l) => l.code === locale)?.dir ?? "ltr";
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && value in translations;
}

/**
 * Resolve one BCP 47 tag to a supported locale. Tries the full tag first
 * ("pt-BR"), then the base language, so "hi-IN" → hi and "pt-PT" → pt-BR
 * (an imperfect but readable fallback, better than English).
 */
function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  const exact = LOCALES.find((l) => l.code.toLowerCase() === lower);
  if (exact) return exact.code;
  const base = lower.split("-")[0];
  return LOCALES.find((l) => l.code.toLowerCase().split("-")[0] === base)?.code ?? null;
}

/** First supported language in the browser's preference list, else English. */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const match = tag && matchLocale(tag);
    if (match) return match;
  }
  return "en";
}

// Keeps <html lang> in step with the UI so screen readers pick the right
// voice and the browser hyphenates/line-breaks with the right rules.
function applyDocumentLang(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  // `dir` on <html> flips the whole document: text alignment, flex/grid
  // direction for logical properties, and scrollbar side. Components that
  // hard-code left/right still need per-case attention, but this is the
  // switch everything else keys off.
  document.documentElement.dir = directionOf(locale);
}

interface I18nStore {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

const detected = detectLocale();

export const useI18n = create<I18nStore>()(
  persist(
    (set) => ({
      locale: detected,
      t: translations[detected],
      setLocale: (locale) => {
        applyDocumentLang(locale);
        set({ locale, t: translations[locale] });
      },
    }),
    {
      name: "coopoly-locale",
      // Only the choice is stored; `t` is derived on rehydrate so a locale
      // file edit never has to fight a stale copy in localStorage.
      partialize: (state) => ({ locale: state.locale }),
      merge: (persisted, current) => {
        const saved = (persisted as { locale?: unknown } | null)?.locale;
        // A manual override wins over detection; an unknown code (locale
        // removed since it was saved) falls back to detection.
        const locale = isLocale(saved) ? saved : current.locale;
        applyDocumentLang(locale);
        return { ...current, locale, t: translations[locale] };
      },
    },
  ),
);

// Read back through the store rather than reusing `detected`: by this point
// persist() has already rehydrated, so getState() is the locale actually in
// effect. Using `detected` here would clobber a saved override with the
// browser's language — and since the Indic CSS fixes key off html:lang(),
// that would silently disable them.
applyDocumentLang(useI18n.getState().locale);
