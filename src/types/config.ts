export interface ISessionConfig {
  sessionDuration: number; // 20-90 (minutes)
  maxVideos: number; // 5-15
  idleTimeout: number; // 5-15 (minutes)
  accountId?: string;
}
export interface ISearchStateConfig extends IEvaluateSearchVideoConfig {
  probInputCorrect: number;
  keywords: string[];
}

export interface IEvaluateSearchVideoConfig {
  probSearchVideoGood: number;
  probWatchIfGoodSearch: number;
  probWatchIfBadSearch: number;
}

export interface IEvaluateWatchDirectVideoConfig {
  probDirectVideoGood: number;
  probWatchIfGoodDirect: number;
  probWatchIfBadDirect: number;
}

export interface IWatchVideoConfig {
  skipAd: number;
  skipAdDelay: number;
  adjustVolume: number;
  interestingSection: number;
  boringSection: number;
  tabInactive: number;
  continueWatching: number;
  watchToEnd: number;
  pauseDuration: number;
  rewindTime: number;
  skipTime: number;
  minWatchPercentage: number;
  isVolumeIncreasing: string;
  watchPercentage: number;
  hoverSubscribeDelay: number;
  likeVideo: number;
  commentVideo: number;
  subscribeChannel: number;
  noInteraction: number;
  hoverLikeDelay: number;
  editComment: number;
  completeComment: number;
  enableNotifications: number;
  skipNotifications: number;
}

export interface IWatchVideoResult {
  reason?: string;
  videoInfo?: any;
  watchedSeconds?: number;
  watchedPercentage?: number;
  allowInteraction?: boolean;
  error?: any;
}

export interface IAppConfig {
  probHomeBrowsing: number;
  probSearch: number;
  probWatchDirect: number;
  probChannelBrowse: number;
  probEndSessionNow: number;
}

export interface IEvaluateHomeVideoConfig {
  probHomeVideoGood: number;
  probWatchIfGoodHome: number;
  probWatchIfBadHome: number;
}

export interface IHomeConfig extends IEvaluateHomeVideoConfig {
  probCheckNotifications: number;
  probPauseOnVideo: number;
  probMaxScroll: number;
}

export interface IDetermineActionConfig extends IWatchVideoConfig {
  watchSuggested: number;
  backToSearchResults: number;
  newSearch: number;
  viewCurrentChannel: number;
  endSessionEarly: number;
}

export interface IChannelConfig {
  probScrollChannelVideo: number;
  probReadChannelInfo: number;
  probPickChannelVideo: number;
}

export type Action =
  | "None"
  | "watchVideo"
  | "homeBrowsing"
  | "endNow"
  | "viewChannel"
  | "Search"
  | "newSearch"
  | "Error"
  | "Like"
  | "Comment"
  | "Subscribe"
  | "CheckNoti"
  | "WatchVidBad"
  | "WatchVidGood"
  | "SkipAd"
  | "clickHome"
  | "playVideo"
  | "skipWatchVideo"
  | "endHomeBrowseEarly"
  | "WatchDirect"
  | "endSession";

export type StateName =
  | "MainProcess"
  | "Search"
  | "WatchVideo"
  | "Home"
  | "Channel"
  | "HomeBrowsing"
  | "WatchDirect"
  | "EndSession";
export interface IResultState {
  action: Action;
  data?: any;
  error?: any;
  stateName?: StateName;
}
