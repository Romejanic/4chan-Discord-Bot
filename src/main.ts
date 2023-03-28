import { SlasherClient, SlasherEvents } from 'discord.js-slasher';
import Stats from './stats';
import './lib/config';
import './lib/db';
import { SubscriptionService } from './subscribed';
import Commands from './commands';
import sendEvent from './lib/monitoring';
import { ActivityType, Events, GatewayIntentBits, Partials } from 'discord.js';

const client = new SlasherClient({
    useAuth: true,
    intents: [
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ],
    partials: [ Partials.Channel ]
});
const stats = new Stats();
const scheduled = new SubscriptionService(client, stats);

// create event listeners
client.on(SlasherEvents.CommandCreate, ctx => Commands.execute(ctx, stats, scheduled));
client.on(Events.MessageCreate, Commands.warning);

client.on(Events.GuildDelete, (guild) => {
    // remove subscription if the client is kicked or
    // the server is deleted
    scheduled.removeSubscription(guild.id);
});

// init the bot
(async () => {
    const start = Date.now();

    // load stats from file
    await stats.load();

    // log into bot
    await client.login();
    console.log("[Bot] Logged into Discord (" + client.user.tag + ")");

    // set status
    client.user.setActivity("Try /browse now!", {
        type: ActivityType.Playing
    });

    // send monitor message
    sendEvent("started", [
        { name: "User", value: `<@${client.user.id}>` },
        { name: "Startup time", value: `${Date.now()-start}ms` }
    ]);

    // add exit listener for monitoring
    process.on("beforeExit", code => {
        sendEvent(code === 0 ? "stopped" : "crashed", [
            { name: "Exit code", value: String(code) }
        ]);
    });

})();
