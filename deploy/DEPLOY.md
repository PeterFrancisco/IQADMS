# IQADMS deploy checklist (PC ↔ pqad)

Use this **every time** you ship changes. Do not push secrets.

---

## 1. On your PC — before you push

Ask yourself:

| Question | Usually |
|----------|---------|
| **What am I pushing?** | Committed changes in `frontend/`, `backend/`, `deploy/` only |
| **What must NOT be pushed?** | `backend/IQADMS.API/appsettings.json` (SMTP, DB password), `.env`, `.env.production` with secrets |
| **Did I run/build locally?** | Optional: `npm run build`, `dotnet build` |
| **Any new EF migration in the repo?** | If yes, pqad will apply it on API start (see below) |

```powershell
cd C:\p\IQADMS
git status
git diff
git log -3 --oneline
# commit if needed (only when you intend to)
git push origin <your-branch>
```

---

## 2. On pqad — after pull

Ask yourself:

| Question | Usually |
|----------|---------|
| **What branch?** | Same branch you pushed |
| **Backend changed?** | Pull → restart API |
| **New migration files?** | Auto-applied when API starts (`Migrate()` in `Program.cs`) — or run manually (step 3) |
| **Frontend changed?** | `npm run build` → copy to `/var/www/iqadms` |
| **nginx config changed?** | Copy conf → `nginx -t` → reload |
| **Only data/config on server?** | Edit `appsettings.json` on pqad only; never rely on git for secrets |

```bash
cd ~/IQADMS
git pull

# --- Frontend (if any UI change) ---
cd frontend/iqadms-frontend
npm install   # only if package.json changed
npm run build
cp -a dist/. /var/www/iqadms/
chown -R nginx:nginx /var/www/iqadms

# --- nginx (only if deploy/nginx/iqadms-pqad.conf changed) ---
# cp ~/IQADMS/deploy/nginx/iqadms-pqad.conf /etc/nginx/http.d/iqadms.conf
# nginx -t && rc-service nginx reload

# --- API (if any backend change) ---
# Stop old process (tmux or pkill), then:
cd ~/IQADMS/backend/IQADMS.API
dotnet run
# Or: dotnet publish -c Release -o ~/iqadms-api && run published DLL
```

---

## 3. Migrate (database)

Ask yourself:

| Question | Action |
|----------|--------|
| **Did someone add a new file under `Migrations/`?** | Yes → need API restart (auto-migrate) or manual command |
| **API fails on startup with migration error?** | Fix on PC, push migration, pull on pqad, restart API |

**Automatic (default):** starting `IQADMS.API` runs pending migrations.

**Manual (optional):**

```bash
cd ~/IQADMS/backend/IQADMS.API
dotnet ef database update
# requires dotnet-ef tool if not installed
```

---

## 4. Smoke tests on pqad

```bash
curl -s "http://127.0.0.1:5173/api/Auth/check-email?email=test@test.com"
curl -s -o /dev/null -w "login: %{http_code}\n" "http://127.0.0.1:5173/login"
ss -tlnp | grep -E '5173|5135'
```

- `/api/...` → JSON  
- `/login` → **200**  
- nginx on **5173**, API on **127.0.0.1:5135**

---

## 5. Live site (IoT Lab / Cloudflare)

No extra git step. Same pqad stack; public URL must reach **pqad:5173** (nginx with `/api` → 5135). Coordinate with IoT Lab if 502 or HTML on `/api`.

### Docker deploy (recommended for pqad / IoT Lab)

For a monitored, restart-friendly stack (same public port **5173**), see **[docker/README.md](docker/README.md)**:

```bash
cd ~/IQADMS/deploy/docker
cp .env.example .env   # set secrets on server only
docker compose up -d --build
```

---

## Quick “every time” script (mental)

1. **PC:** `git push` — what commits? secrets excluded?  
2. **pqad:** `git pull` — which branch?  
3. **Migrate?** — new `Migrations/*.cs` → restart API  
4. **Frontend?** — `build` + `cp` to `/var/www/iqadms`  
5. **Backend?** — restart `dotnet`  
6. **nginx?** — only if conf changed  
7. **Test** — curl API + login page  

---

## 6. Email: Gmail works, Outlook does not

IQADMS sends through **your configured SMTP** (often `smtp.gmail.com` + a Gmail app password). If mail arrives at **Gmail**, the app and pqad SMTP are working.

**Microsoft Outlook / Microsoft 365** (many `@school.edu` mailboxes) filters external senders more aggressively:

| Check | Action |
|--------|--------|
| **User mailbox** | Junk Email, **Other** tab (Focused inbox) |
| **Work/school tenant** | IT **Quarantine** / Defender — release the IQADMS `From` address |
| **Safe senders** | Outlook on the web → Settings → Mail → Junk email → Safe senders |
| **Long-term** | Send from an **@yourdomain.edu** mailbox (M365 or Google Workspace SMTP) with proper SPF/DKIM |

Optional in pqad `appsettings.json`: `"ReplyTo": "pqad@yourdomain.edu"` under `SmtpSettings`.

**In-app notifications** still work when Outlook blocks email; use those until IT whitelists the sender.
