const UMAMI_WEBSITE_ID =
  process.env.UMAMI_WEBSITE_ID || "55098436-d592-4e49-b350-9b9b9a09d07b";
const UMAMI_API_URL =
  process.env.UMAMI_API_URL || "https://cloud.umami.is/api/send";
const UMAMI_HOSTNAME = process.env.UMAMI_HOSTNAME || "coopoly-deal";
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== "false";

type EventData = Record<string, string | number | boolean>;

export function track(eventName: string, data?: EventData): void {
  if (!ANALYTICS_ENABLED || !UMAMI_WEBSITE_ID) return;

  fetch(UMAMI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "coopoly-deal-server",
    },
    body: JSON.stringify({
      type: "event",
      payload: {
        website: UMAMI_WEBSITE_ID,
        name: eventName,
        data,
        hostname: UMAMI_HOSTNAME,
        language: "en",
        screen: "0x0",
        url: "/_server",
      },
    }),
  }).catch(() => {});
}
