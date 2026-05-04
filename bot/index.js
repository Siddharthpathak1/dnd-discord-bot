require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

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
  if (!guildId) {
    console.log('GUILD_ID not set; skipping guild command registration. Use global registration if needed.');
    return;
  }
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('Registering application (/) commands to guild', guildId);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Commands registered.');
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
  app.get('/health', (req, res) => res.send({ status: 'ok', uptime: process.uptime() }));
  app.get('/', (req, res) => res.send('DND Discord Bot is running'));
  app.listen(PORT, () => console.log(`Health server listening on ${PORT}`));
} catch (e) {
  // express not installed; health server is optional
}
