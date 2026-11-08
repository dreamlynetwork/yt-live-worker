# yt-live-worker

A tiny Cloudflare Worker that serves a full-screen YouTube player page.

```
https://yt-live.<your-subdomain>.workers.dev/?video_id=g4n1ecRt_AQ
```

## Parameters
| Param | Description |
|-------|-------------|
| `video_id` / `v` | 11-char YouTube ID, or a full YouTube URL |
| `channel` | Channel ID (`UC...`) or `@handle`: plays that channel's current live stream |
| `mute=0` | Try unmuted autoplay (browsers may block it) |

Uses YouTube's official embed player, so videos with embedding disabled will not play.

## Run locally
```
npm install
npm run dev
```

## Deploy
```
npx wrangler login
npm run deploy
```

### Auto-deploy with GitHub Actions
Add these repo secrets (Settings > Secrets and variables > Actions):
- `CLOUDFLARE_API_TOKEN` (template: "Edit Cloudflare Workers")
- `CLOUDFLARE_ACCOUNT_ID`

Every push to `main` deploys.

## License
MIT
