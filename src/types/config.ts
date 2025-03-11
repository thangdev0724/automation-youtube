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

export interface IHomeStateConfig {
  homeToSearch: number;
  homeToVideo: number;
  checkNotifications: number;
  scrollHome: number;
  stopScrollingToWatchVideo: number;
  continueScrolling: number;
  homeVideoToSearch: number;
  clickHomeVideo: number;
  endHomeBrowsing: number;
}

export interface IDetermineActionConfig extends IWatchVideoConfig {
  watchSuggested: number;
  backToSearchResults: number;
  newSearch: number;
  viewCurrentChannel: number;
  endSessionEarly: number;
}

export interface IChannelConfig {
  channelToVideo: number;
  channelToSearch: number;
  channelToHome: number;
  viewChannelInfo: number;
  viewChannelVideos: number;
  selectChannelVideo: number;
  switchChannelTab: number;
  leaveChannel: number;
}
