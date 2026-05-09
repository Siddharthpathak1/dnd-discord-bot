require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const db = require('../services/db');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildIds = Array.from(
  new Set(
    [process.env.GUILD_ID, process.env.GUILD_IDS]
      .flatMap(value => (value ? value.split(',') : []))
      .map(value => value.trim())
      .filter(Boolean)
  )
);

if (!token || !clientId) {
  console.error('Please set DISCORD_TOKEN and CLIENT_ID in .env');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
client.commands = new Collection();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data) {
      commands.push(command.data);
      client.commands.set(command.data.name, command);
    }
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (guildIds.length > 0) {
      for (const guildId of guildIds) {
        console.log('Registering application (/) commands to guild', guildId);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      }
      console.log('Guild commands registered.');

      console.log('Clearing global application (/) commands to avoid duplicates');
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      console.log('Global commands cleared.');
      return;
    }

    console.log('Registering global application (/) commands');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Global commands registered.');
  } catch (err) {
    console.error('Error registering commands', err);
  }
}

client.once('ready', () => {
  console.log('Bot ready as', client.user.tag);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error executing that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
  }
});

(async () => {
  await registerCommands();
  client.login(token);
})();

// Optional lightweight health server so hosts can keep the container alive.
try {
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;
  // Serve health + static web UI for map viewer
  app.get('/health', (req, res) => res.send({ status: 'ok', uptime: process.uptime() }));
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'web')));

  // Simple Server-Sent Events (SSE) endpoint for map events
  const bus = require('../services/bus');
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const client = res;
    bus.addClient(client);
    req.on('close', () => bus.removeClient(client));
  });

  // Basic API to fetch maps and tokens
  const maps = require('../services/maps');
  app.get('/api/maps', (req, res) => res.json(maps.listMaps()));
  app.get('/api/maps/:id', (req, res) => {
    try {
      res.json(maps.getMap(req.params.id));
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });

  app.get('/api/campaigns', (req, res) => res.json(db.listCampaigns()));
  app.get('/api/campaigns/:id/initiative', (req, res) => {
    try {
      res.json(db.getInitiative(req.params.id));
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });

  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'web', 'index.html')));
  app.listen(PORT, () => console.log(`Health server listening on ${PORT}`));
} catch (e) {
  // express not installed; health server is optional
}
