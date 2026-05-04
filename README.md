# D&D Discord Bot (Roll20 + Beyond20 friendly)

This is an MVP Discord bot to help run D&D games. It supports campaign creation, role assignment (auto or self-select), dice rolling, initiative tracking, and HP management. It is Roll20- and Beyond20-friendly; Roll20 Pro is required for deep API integration (optional).

Quick start

1. Create a bot application on the Discord Developer Portal and copy its token, client ID, and a guild ID for testing.
2. Create a `.env` file with:

```
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_dev
```

3. Install dependencies and run:

```bash
npm install
npm start
```

Files
- `bot/` — main bot code and command handlers
- `data/db.json` — simple JSON storage for campaigns and players

Next steps
- Add Roll20 API script and deployment instructions (will require Roll20 Pro)
- Add optional web dashboard

Containerized deployment (free hosting)

I recommend Fly.io for free, always-on containers that can run a persistent Discord bot process. Another always-free option is Oracle Cloud Free Tier (requires account & signup). Below are short instructions for Fly.io.

Fly.io quick deploy

1. Install `flyctl` from https://fly.io/docs/hands-on/install-flyctl/
2. Login and create an app:

```bash
flyctl auth login
flyctl apps create my-dnd-bot
```

3. Set environment variables (replace values):

```bash
flyctl secrets set DISCORD_TOKEN=your_token CLIENT_ID=your_client_id GUILD_ID=your_guild_id
```

4. Deploy using the provided `Dockerfile`:

```bash
flyctl deploy
```

Notes
- Fly.io has a free allowance suitable for small bots; check Fly's account limits for current free tier details.
- If you prefer Oracle Cloud Always Free, create an OCI account and provision a small VM, install Node.js, clone this repo, and run `npm install` + `npm start` (or run the container with Docker). Oracle requires a free account signup with a credit card.

Keeping the bot alive

Hosting providers differ in how they treat idle containers. This repo includes a small `/health` HTTP endpoint so uptime monitors or the platform itself can keep the container alive.
