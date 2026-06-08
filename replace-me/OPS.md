# replace-me — Operations

## URLs

| Environment | URL |
|---|---|
| Local dev | http://localhost:5200/replace-me/ |
| Production | https://work.fail.academy/replace-me/ |
| Punchlist tool | https://work.fail.academy/replace-me/punchlist/ |

---

## Dev Server

Port **5200**, locked via `strictPort: true` in `vite.config.ts`.

```bash
# Start manually
/Users/louisc/.vite-plus/bin/vp dev

# From project root
cd /Users/louisc/replace-me/replace-me && /Users/louisc/.vite-plus/bin/vp dev
```

---

## LaunchAgent (auto-start + restart on failure)

Plist location:
```
~/Library/LaunchAgents/academy.fail.work.replace-me.plist
```

### Commands

```bash
# Load (start now + start on login)
launchctl load ~/Library/LaunchAgents/academy.fail.work.replace-me.plist

# Unload (stop now + disable on login)
launchctl unload ~/Library/LaunchAgents/academy.fail.work.replace-me.plist

# Check status
launchctl list | grep replace-me

# Restart
launchctl unload ~/Library/LaunchAgents/academy.fail.work.replace-me.plist
launchctl load ~/Library/LaunchAgents/academy.fail.work.replace-me.plist
```

### Logs

```bash
# Live stdout
tail -f /Users/louisc/replace-me/replace-me/logs/server.out.log

# Live stderr
tail -f /Users/louisc/replace-me/replace-me/logs/server.err.log

# Both
tail -f /Users/louisc/replace-me/replace-me/logs/server.*.log
```

Crash recovery: restarts after **10 seconds** (`ThrottleInterval`).
Only restarts on failure — a clean exit (e.g. manual stop) does not trigger restart.

---

## Cloudflare Tunnel

Tunnel name: **ollama-m4-server**
Tunnel ID: `e6b33a24-7c00-4a45-9150-97f5fbd2a3d4`

Config file:
```
~/.cloudflared/config.yml
```

Relevant ingress entry:
```yaml
- hostname: work.fail.academy
  service: http://localhost:5200
```

Tunnel is managed as a system LaunchDaemon:
```bash
# Restart tunnel
sudo launchctl unload /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

---

## TypeScript

```bash
# Type check (no emit)
cd /Users/louisc/replace-me/replace-me
/Users/louisc/.vite-plus/js_runtime/node/24.16.0/bin/node \
  node_modules/typescript/lib/tsc.js --noEmit
```

---

## Adding a New Tool

1. Create `src/<toolname>/main.ts` and `src/<toolname>/<toolname>.css`
2. Create `<toolname>/index.html` (copy `punchlist/index.html`, update script src)
3. Add entry to `vite.config.ts` under `build.rollupOptions.input`
4. Add entry to the `tools` array in `src/main.ts`
