// Opt-in: without UMAMI_WEBSITE_ID set, nothing is sent. Previously this
// fell back to a hardcoded website ID, which meant every local `bun dev`
// run and every self-hosted copy of the Docker image reported into the
// project's Umami account and burned its event quota.
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || "";
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

/**
 * Umami Cloud bills every event *and* every event-data property as one event
 * against the monthly quota, so a game that fired 4 events each carrying the
 * 8-field settings blob cost ~22 events, not 4. Keep `data` empty unless a
 * property earns its place.
 */
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
