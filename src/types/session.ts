type Percentage = number; // 0-100

export interface ISessionConfig {
  sessionDuration: number; // 20-90 (minutes)
  maxVideos: number; // 5-15
  idleTimeout: number; // 5-15 (minutes)
  loginWithCookie: Percentage;
  loginWithoutCaptcha: Percentage;
  loginWithCaptcha: Percentage;
  homeToSearch: Percentage;
  homeToVideo: Percentage;
  checkNotifications: Percentage;
  scrollHome: Percentage;
  stopScrollingToWatchVideo: Percentage;
  continueScrolling: Percentage;
  homeVideoToSearch: Percentage;
  clickHomeVideo: Percentage;
  endHomeBrowsing: Percentage;
  searchToVideo: Percentage;
  searchToHome: Percentage;
  correctSearchTypo: Percentage;
  completeSearch: Percentage;
  hoverThumbnail: Percentage;
  continueScrollResults: Percentage;
  clickVideoAfterHover: Percentage;
  continueScrollAfterHover: Percentage;
  endSearch: Percentage;
  scrollUp: Percentage;
  continueScrollAgain: Percentage;
  hoverAfterScrollUp: Percentage;
  continueScrollAfterScrollUp: Percentage;
  videoLoadingTime: number; // 100-400 (ms)
  adProbability: Percentage;
  noAdProbability: Percentage;
  skipAd: Percentage;
  skipAdDelay: number; // seconds
  adjustVolume: Percentage;
  watchContinuously: Percentage;
  interestingSection: Percentage;
  boringSection: Percentage;
  tabInactive: Percentage;
  continueWatching: Percentage;
  watchToEnd: number; // 80-95 (percentage)
  pauseDuration: number; // 1-3 (seconds)
  rewindTime: number; // 10-20 (seconds)
  skipTime: number; // 20-60 (seconds)
  minWatchPercentage: Percentage;
  likeVideo: number; // 10-15 (percentage)
  commentVideo: number; // 2-3 (percentage)
  subscribeChannel: number; // 3-5 (percentage)
  noInteraction: number; // 80-85 (percentage)
  hoverLikeDelay: number; // 1-3 (seconds)
  editComment: Percentage;
  completeComment: Percentage;
  hoverSubscribeDelay: number; // 1-2 (seconds)
  enableNotifications: Percentage;
  skipNotifications: Percentage;
  watchSuggested: Percentage;
  backToSearchResults: Percentage;
  newSearch: Percentage;
  viewCurrentChannel: Percentage;
  endSessionEarly: Percentage;
  channelToVideo: Percentage;
  channelToSearch: Percentage;
  channelToHome: Percentage;
  viewChannelInfo: Percentage;
  viewChannelVideos: Percentage;
  selectChannelVideo: Percentage;
  switchChannelTab: Percentage;
  leaveChannel: Percentage;
  closeTab: Percentage;
  navigateToOtherPage: Percentage;
  logout: Percentage;
  updateSheet: boolean;
  createLogFile: boolean;
  logFilePath: string;
  sheetUpdateFrequency: "afterSession" | string;
}
