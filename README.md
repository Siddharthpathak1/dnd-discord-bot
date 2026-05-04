# Tavern Master DND Bot

Tavern Master is a Discord bot for running D&D sessions with campaign management, dice rolls, initiative, HP, conditions, role assignment, and a lightweight visual map viewer.

## Features

- Campaign creation and join flow
- Dice rolling with advantage/disadvantage support
- Initiative, HP, conditions, roll history, and export
- Self-select or DM-assigned roles
- Free-hosted web map viewer with live token updates
- Starter campaign content for `Lumenreach Depths`
- AI campaign generation, cinematic trailers, and character sheets

## Commands

- `/create-campaign <name>` create a campaign
- `/join-campaign <id|name>` join a campaign
- `/role auto|choose <name?>` manage player roles
- `/roll <expr> [mode] [campaign]` roll dice and optionally log to campaign
- `/initiative <campaign> [value]` add or show initiative
- `/initiative-advance <campaign>` advance the turn order
- `/initiative-clear <campaign>` clear initiative
- `/hp <campaign> [value]` set or show HP
- `/condition-add`, `/condition-remove`, `/condition-list`
- `/map-create`, `/map-list`, `/map-place`, `/map-move`, `/map-remove`
- `/ai-campaign`, `/ai-trailer`, `/ai-character`
- `/campaign-seed` seed the `Lumenreach Depths` starter campaign
- `/how-to-play` step-by-step play guide
- `/help-dnd` command reference

## Visual Play Loop

1. Create or seed a campaign.
2. Open the bot web page in your browser to view maps and initiative.
3. Create a map with `/map-create`.
4. Place tokens with `/map-place` and move them with `/map-move`.
5. Use `/initiative` and `/initiative-advance` during combat.

## Starter Campaign: Lumenreach Depths

A giant underground cavern was found near a village after a mining accident. Miners vanished, mutated creatures emerged, and the Order of the Gauntlet built an outpost in the depths. A ruined steampunk city lies below, full of automaton murder bots and dangerous cavern wilderness. Adventurers are hired to explore the depths, clear monster nests, and reclaim the ruins.

## Run Locally

```bash
npm install
npm start
```

## Environment Variables

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `PORT` (optional, defaults to 3000)
- `AI_API_KEY` (required for AI generation)
- `AI_BASE_URL` (optional, defaults to an OpenAI-compatible endpoint)
- `AI_MODEL` (optional, defaults to `gpt-4o-mini`)

## AI Notes

The AI commands are written against an OpenAI-compatible chat-completions endpoint. If your provider uses a different base URL, set `AI_BASE_URL` to match it. The bot also has safe local fallbacks so the commands still work while you are configuring the API.

If you pasted a secret key into chat, rotate it before putting it into Render or `.env`.

## Hosting

The project includes a Render-friendly health endpoint and a small web UI. Point UptimeRobot at `/health` to keep the service awake.
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
