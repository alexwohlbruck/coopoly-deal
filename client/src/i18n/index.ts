import { create } from "zustand";
import { en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

export interface Translations {
  lobby: {
    title: string;
    subtitle: string;
    welcomeBack: string;
    welcomeBackName: string; // "Welcome back, {name}" — uses {name} placeholder
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
  };
  waiting: {
    roomCode: string;
    players: string;
    startGame: string;
    addBot: string;
    waitingForPlayers: string;
    needMorePlayers: string;
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
    rentCharge: string;
    debtDemand: string;
    birthdayPay: string;
    stealProperty: string;
    swapProperty: string;
    stealSet: string;
    pay: string;
    payNothing: string;
    selectCards: string;
    cantPay: string;
    accept: string;
  };
  finished: {
    youWin: string;
    playerWins: string;
    completedSets: string;
    wins: string;
    losses: string;
    streak: string;
    rematch: string;
    leave: string;
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
    dedicatedToBody: string;
    originalGame: string;
    originalGameBody: string;
    music: string;
    musicBody: string;
    openSource: string;
    frontend: string;
    backend: string;
    analytics: string;
    iconsBy: string; // small caption appended to lucide-react entry
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
  };
}

const translations: Record<Locale, Translations> = {
  en,
  es,
};

interface I18nStore {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
}

export const useI18n = create<I18nStore>((set) => ({
  locale: "en",
  t: translations.en,
  setLocale: (locale) => set({ locale, t: translations[locale] }),
}));
