import { create } from "zustand";
import { en } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

export interface Translations {
  lobby: {
    title: string;
    subtitle: string;
    createRoom: string;
    joinRoom: string;
    enterCode: string;
    enterName: string;
    join: string;
    back: string;
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
    handLimit: string;
    language: string;
    unlimited: string;
  };
  common: {
    you: string;
    bank: string;
    properties: string;
    cards: string;
    sets: string;
    turn: string;
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
