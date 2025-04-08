import { SlasherClient } from 'discord.js-slasher';
import Stats from './stats';
import './lib/config';
import './lib/db';
import { SubscriptionService } from './subscribed';
import Commands from './commands';
import { ActivityType, Partials } from 'discord.js';

const client = new SlasherClient({
    intents: [
        "Guilds",
        "GuildMessages",
        "DirectMessages"
    ],
    partials: [ Partials.Channel ]
});
const stats = new Stats();
const scheduled = new SubscriptionService(client, stats);

// create event listeners
client.on("command", ctx => Commands.execute(ctx, stats, scheduled));
client.on("messageCreate", Commands.warning);

client.on("guildDelete", (guild) => {
    // remove subscription if the client is kicked or
    // the server is deleted
    scheduled.removeSubscription(guild.id);
});

client.on("error", (err) => {
    console.error("[Client] Error:", err);
});

// init the bot
(async () => {
    // load stats from file
    await stats.load();

    // log into bot
    await client.login();
    console.log("[Bot] Logged into Discord (" + client.user.tag + ")");

    // set status
    client.user.setActivity("Try /browse now!", {
        type: ActivityType.Playing
    });

})();
