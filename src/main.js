const { Client } = require("discord.js");
const config = require("./lib/config");
const command = require("./command");
const db = require("./lib/db");
const Stats = require("./stats");

let client = new Client();
let stats = new Stats();

// add client event listeners
client.on("message", (msg) => {
    if(msg.author.id === client.user.id) return;
    // send message off to command parser
    command.parse(msg).catch((e) => {
        command.onCommandError(e, msg.channel);
    });
});
client.on("error", (err) => {
    console.error("[Bot] Unexpected error:", err);
});

// attempt to log into bot account
client.login(config.global.auth.token).then(() => {
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