const { SlasherClient } = require("discord.js-slasher");
const { Intents } = require("discord.js");
const config = require("./lib/config");
const command = require("./command");
const db = require("./lib/db");
const Stats = require("./stats");

let client = new SlasherClient({ useAuth: true, intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES ] });
let stats = new Stats();

// add client event listeners
client.on("messageCreate", (msg) => {
    if(msg.author.id === client.user.id) return;
    // if user tries to use prefixed commands, tell them
    // about slash commands instead
    command.parse(msg).catch((e) => {
        command.onCommandError(e, msg.channel);
    });
});
client.on("command", (ctx) => {
    command.execute(ctx);
});
client.on("error", (err) => {
    console.error("[Bot] Unexpected error:", err);
});

// attempt to log into bot account
client.login().then(() => {
    console.log("[Bot] Logged in! Ready to go!");
}).catch((err) => {
    console.error("[Bot] Failed to login with token!\n", err);
});

// load stats from file
stats.load().catch((e) => {
    console.error("[Stats] Failed to load stats!", e);
});

// pass necessary values to command handler
console.log("[Bot] Logging in with token...");
command.initLib(config, db, client, stats);