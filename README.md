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
- XP, inventory, quests, NPC dialogue, random encounters, session recaps, and titles
- **Combat Automation:** Damage rolls auto-apply to HP, XP auto-awards, real-time state sync to all players

## Combat Automation

The bot now automatically handles combat state changes so players focus on fun, not bookkeeping:

- **Damage Auto-Apply:** Roll damage with `/roll 1d6 damage:true --target @player` to instantly deduct HP
- **HP Broadcasts:** All HP changes broadcast to the web viewer in real-time
- **XP Auto-Award:** Use `/xp @player 100` and all players see the award and any level-ups immediately
- **Real-Time Sync:** Damage, heals, deaths, and level-ups appear instantly on the web map viewer (no refresh needed)
- **Death Checks:** Target HP drops to 0 → auto-applies "Unconscious" condition

### Combat Automation Examples

```
/roll 1d6+3 damage:true --target @goblin    # Auto-applies 1d6+3 damage to goblin
/roll 2d8 heal:true --target @wizard        # Auto-heals wizard for 2d8 HP
/hp CampaignName 25 @player                 # Manually set HP, broadcasts change
/xp CampaignName 100 @player                # Award 100 XP, broadcasts level-up if applicable
```

All state changes sync to connected web viewers via SSE (Server-Sent Events) so players see:
- Damage/heal applied with attacker/healer names
- HP bars updating in real-time
- XP awards and level-ups
- Defeat indicators

## Voice Listening (AI Combat Interpretation)

The bot can join your voice channel and listen to player speech, automatically interpreting combat actions and updating game state in real-time.

### How It Works

1. DM joins voice channel and runs `/listen start <campaign>`
2. Bot joins and starts listening
3. Players speak naturally: "I attack the goblin!" or "I heal the rogue!"
4. AI interprets the speech and determines:
   - What action was taken (attack/heal/spell/dodge)
   - Who the target is (goblin, rogue, etc)
   - Hit/miss and damage rolled
   - XP rewards if enemy defeated
5. Game state updates **automatically** — damage deducts from HP, heals restore HP, XP awarded
6. All players see the narrative and results on the web map viewer in real-time
7. DM runs `/listen stop <campaign>` when done

### Voice Examples

```
Player 1: "I swing my sword at the goblin!"
→ AI interprets attack, rolls 1d20 vs AC, generates 8 damage
→ Goblin HP: 25 → 17 (automatic)
→ All players see: "⚔️ Player 1 attacks Goblin! Damage: 8, HP: 25 → 17"

Player 2: "I cast healing word on the rogue!"
→ AI interprets healing spell, generates 10 healing
→ Rogue HP: 5 → 15 (automatic)
→ All players see: "✨ Healing word restores 10 HP to Rogue! HP: 5 → 15"

[Goblin defeated]
→ AI awards 100 XP to attacker
→ All players see: "📈 Player 1 gains 100 XP! 🎉 **LEVEL UP!** Now level 5!"
```

### Voice Commands

- `/listen start <campaign>` — Start listening in your current voice channel (DM only)
- `/listen stop <campaign>` — Stop listening in a campaign (DM only)
- `/listen status [campaign]` — Check which campaigns are listening

### Voice Requirements

- **DEEPGRAM_API_KEY** environment variable must be set ([Sign up for free](https://console.deepgram.com/))
- **AI_API_KEY** for AI combat interpretation
- Bot must have permission to join voice channels

### Voice Setup

1. Sign up for a free Deepgram account: https://console.deepgram.com/
2. Copy your API key and add to `.env`:
   ```
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```
3. Make sure `AI_API_KEY` is set (for AI interpretation)
4. Invite bot to your Discord server with these permissions:
   - `CONNECT` (join voice channels)
   - `SPEAK` (speak in voice channels)

## Commands

- `/create-campaign <name>` create a campaign
- `/join-campaign <id|name>` join a campaign
- `/role auto|choose <name?>` manage player roles
- `/roll <expr> [mode] [campaign] [damage-type] [target] [is-crit]` roll dice with optional auto-damage/heal; use damage-type `damage` or `heal` with target to auto-apply
- `/listen start|stop|status [campaign]` manage voice channel listening for AI combat interpretation
- `/initiative <campaign> [value]` add or show initiative
- `/initiative-advance <campaign>` advance the turn order
- `/initiative-clear <campaign>` clear initiative
- `/hp <campaign> [value] [player]` set or show HP (DM can set for other players, broadcasts changes)
- `/condition-add`, `/condition-remove`, `/condition-list`
- `/map-create`, `/map-list`, `/map-place`, `/map-move`, `/map-remove`
- `/ai-campaign`, `/ai-trailer`, `/ai-character`
- `/xp [player]`, `/inventory`, `/loot-add`, `/quest-board`, `/npc-create`, `/npc-talk`, `/random-encounter`, `/session-recap`, `/award-title`
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
- `GUILD_ID` or `GUILD_IDS` for fast guild-specific slash command registration
- `PORT` (optional, defaults to 3000)
- `AI_API_KEY` (required for AI generation and voice interpretation)
- `AI_BASE_URL` (optional, defaults to an OpenAI-compatible endpoint)
- `AI_MODEL` (optional, defaults to `gpt-4o-mini`)
- `DEEPGRAM_API_KEY` (optional but required for voice listening; get free key at https://console.deepgram.com/)

If you want slash commands to appear immediately in a new server, invite the bot with both the `bot` and `applications.commands` scopes, then set `GUILD_ID` to that server ID or add it to `GUILD_IDS`. When guild IDs are set, the bot syncs commands to those guilds and clears global commands so Discord does not show duplicates. If no guild IDs are set, it falls back to global command registration.

## AI Notes

The AI commands are written against an OpenAI-compatible chat-completions endpoint. If your provider uses a different base URL, set `AI_BASE_URL` to match it. The bot also has safe local fallbacks so the commands still work while you are configuring the API.

Voice listening uses Deepgram for transcription and your AI provider for action interpretation. Both APIs are called in real-time during voice chat, so keep monitor your usage and costs.

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

If you want to register commands to multiple servers, use `GUILD_IDS` with a comma-separated list of guild IDs.

4. Deploy using the provided `Dockerfile`:

```bash
flyctl deploy
```

Notes
- Fly.io has a free allowance suitable for small bots; check Fly's account limits for current free tier details.
- If you prefer Oracle Cloud Always Free, create an OCI account and provision a small VM, install Node.js, clone this repo, and run `npm install` + `npm start` (or run the container with Docker). Oracle requires a free account signup with a credit card.

Keeping the bot alive

Hosting providers differ in how they treat idle containers. This repo includes a small `/health` HTTP endpoint so uptime monitors or the platform itself can keep the container alive.
