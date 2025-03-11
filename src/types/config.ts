export interface ISearchStateConfig {
  correctSearchTypo: number;
  hoverThumbnail: number;
  continueScrollResults: number;
  clickVideoAfterHover: number;
  continueScrollAfterHover: number;
  searchToVideo: number;
  searchToHome: number;
  scrollUp: number;
  endSearch: number;
  continueScrollAgain: number;
  continueScrollAfterScrollUp: number;
  hoverAfterScrollUp: number;
  searchKeywords: string[];
  specificKeyword: string;
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
}
