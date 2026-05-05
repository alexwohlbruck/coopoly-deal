const UMAMI_WEBSITE_ID =
  process.env.UMAMI_WEBSITE_ID || "55098436-d592-4e49-b350-9b9b9a09d07b";
const UMAMI_API_URL =
  process.env.UMAMI_API_URL || "https://cloud.umami.is/api/send";
const UMAMI_HOSTNAME = process.env.UMAMI_HOSTNAME || "coopoly-deal";
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== "false";
const ANALYTICS_DEBUG = process.env.ANALYTICS_DEBUG === "true";

// Umami's collector runs the User-Agent through `isbot` and silently drops
// anything that looks bot-like (including "Mozilla/5.0 (compatible; ...)"
// since that matches the Googlebot pattern). For server-to-server tracking
// we have to send a plain real-browser UA — verified to pass the filter.
const SERVER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type EventData = Record<string, string | number | boolean>;

export function track(eventName: string, data?: EventData): void {
  if (!ANALYTICS_ENABLED || !UMAMI_WEBSITE_ID) return;

  fetch(UMAMI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": SERVER_USER_AGENT,
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
  })
    .then(async (res) => {
      if (!ANALYTICS_DEBUG) return;
      const body = await res.text();
      console.log(`[analytics] ${eventName} → ${res.status} ${body.slice(0, 120)}`);
      if (body.includes("beep")) {
        console.warn("[analytics] Umami flagged the request as a bot — events being dropped");
      }
    })
    .catch((err) => {
      if (ANALYTICS_DEBUG) console.error(`[analytics] ${eventName} failed:`, err);
    });
}
