import { getMessaging, getToken, isSupported as mIsSupported } from "firebase/messaging";
import { getAnalytics, logEvent, isSupported as aIsSupported } from "firebase/analytics";
import { getRemoteConfig, fetchAndActivate, getValue, isSupported as rIsSupported } from "firebase/remote-config";
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";

export const getWebMessaging = (app: any) => getMessaging(app);
export const getWebToken = getToken;
export const isMessagingSupported = mIsSupported;

export const getWebAnalytics = (app: any) => getAnalytics(app);
export const logAnalyticsEvent = logEvent;
export const isAnalyticsSupported = aIsSupported;

export const getWebRemoteConfig = (app: any) => getRemoteConfig(app);
export const fetchRC = fetchAndActivate;
export const getRCValue = getValue;
export const isRCSupported = rIsSupported;

export const getWebAuth = (app: any) => getAuth(app);
export const webSignInWithCustomToken = signInWithCustomToken;
export const webSignOut = signOut;
