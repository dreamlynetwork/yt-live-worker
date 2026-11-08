// Cloudflare Worker: YouTube live/video player page
//
// Specific video:
//   /?video_id=g4n1ecRt_AQ
// Channel's current live stream (auto-plays whatever is live now):
//   /?channel=UCxxxxxxxxxxxxxxxxxxxxxx
//   /?channel=@handle          (resolved to a channel ID automatically)
// Optional: &mute=0  (try unmuted autoplay)

const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

async function resolveChannelId(input) {
  input = input.trim();
  if (CHANNEL_ID_RE.test(input)) return input;

  // Accept full URLs like youtube.com/channel/UC... or youtube.com/@handle
  const idInUrl = input.match(/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (idInUrl) return idInUrl[1];

  const h = input.match(/@([A-Za-z0-9._-]{1,50})/);
  const handle = h ? h[1] : /^[A-Za-z0-9._-]{1,50}$/.test(input) ? input : null;
  if (!handle) return null;

  // Resolve handle -> channel ID by reading the channel page
  try {
    const res = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
        "accept-language": "en-US,en;q=0.9",
        cookie: "CONSENT=YES+1",
      },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    const text = await res.text();
    const m =
      text.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/) ||
      text.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/) ||
      text.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function page(src) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Live</title>
<style>
  html,body{margin:0;height:100%;background:#000}
  iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
</style>
</head>
<body>
<iframe src="${src.replace(/&/g, "&amp;")}"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body>
</html>`;
}

const htmlResponse = (src) =>
  new Response(page(src), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });

const text = (msg, status = 400) =>
  new Response(msg, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const mute = url.searchParams.get("mute") === "0" ? 0 : 1;
    const opts = `autoplay=1&mute=${mute}&playsinline=1&rel=0&modestbranding=1`;

    // 1) Channel live mode
    const channelParam = url.searchParams.get("channel");
    if (channelParam) {
      const cid = await resolveChannelId(channelParam);
      if (!cid) {
        return text(
          "Could not resolve channel.\nUse ?channel=UCxxxxxxxxxxxxxxxxxxxxxx or ?channel=@handle"
        );
      }
      const src = `https://www.youtube.com/embed/live_stream?channel=${cid}&${opts}`;
      return htmlResponse(src);
    }

    // 2) Specific video mode
    const raw = url.searchParams.get("video_id") || url.searchParams.get("v") || "";
    const m = raw.match(/(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);
    const id = m ? m[1] : raw.replace(/[^A-Za-z0-9_-]/g, "");

    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
      return text(
        "Usage:\n  ?video_id=g4n1ecRt_AQ\n  ?channel=UCxxxxxxxxxxxxxxxxxxxxxx\n  ?channel=@handle"
      );
    }

    const src = `https://www.youtube.com/embed/${id}?${opts}`;
    return htmlResponse(src);
  },
};
