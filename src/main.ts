import { SlasherClient } from 'discord.js-slasher';
import { Intents } from 'discord.js';
import Stats from './stats';

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
client.on("command", (ctx) => {
    // pass directly to command handler
    ctx.reply("it's working!");
});
client.on("messageCreate", (msg) => {
    // pass onto warning about slash commands
    console.log(msg.content);
});

// init the bot
(async () => {
    // load stats from file
    await stats.load();

    // log into bot
    await client.login();
    console.log("[Bot] Logged into Discord (" + client.user.tag + ")");

})();