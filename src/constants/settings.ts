const isDev = (): boolean => {
  return !!(
    process?.env?.NEXT_PUBLIC_NODE_ENV === "development" ||
    process?.env?.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      window.location.origin.includes("localhost"))
  );
};

const isStaging = (): boolean => {
  return !!(
    process?.env?.NEXT_PUBLIC_NODE_ENV === "staging" ||
    (typeof window !== "undefined" &&
      window.location.origin.includes("zeet.app"))
  );
};

const isOldPaperDomain = (): boolean =>
  typeof window !== "undefined" && window.location.origin.includes("paper.xyz");

export const getPaperOriginUrl = (): string => {
  if (isDev()) return "http://localhost:3000";
  if (isStaging()) {
    if (process?.env?.ZEET_DEPLOYMENT_URL) {
      return `https://${process.env.ZEET_DEPLOYMENT_URL}`;
    }

    if (typeof window !== "undefined") return window.location.origin;

    return "https://withpaper.com";
  }

  if (isOldPaperDomain()) return window.location.origin;

  return "https://withpaper.com";
};

export const PAPER_APP_URL = getPaperOriginUrl();

export const CHECKOUT_WITH_ETH_IFRAME_URL = "/sdk/2022-08-12/checkout-with-eth";
export const CHECKOUT_WITH_CARD_IFRAME_URL =
  "/sdk/2022-08-12/checkout-with-card";
export const CREATE_WALLET_IFRAME_URL = "/sdk/v2/verify-email";

export const DEFAULT_BRAND_OPTIONS = {
  colorPrimary: "#cf3781",
  colorBackground: "#ffffff",
  colorText: "#1a202c",
  borderRadius: 12,
  fontFamily: "Open Sans",
};
