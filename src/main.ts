import { SlasherClient } from 'discord.js-slasher';
import { Intents } from 'discord.js';
import Stats from './stats';
import './lib/config';
import './lib/db';
import Commands from './commands';

const client = new SlasherClient({
    useAuth: true,
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES
    ],
    partials: [ "CHANNEL" ]
});
const stats = new Stats();

// create event listeners
client.on("command", Commands.execute);
client.on("messageCreate", Commands.warning);

// init the bot
(async () => {
    // load stats from file
    await stats.load();

    // log into bot
    await client.login();
    console.log("[Bot] Logged into Discord (" + client.user.tag + ")");

})();