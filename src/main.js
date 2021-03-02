const { Client } = require("discord.js");
const config = require("./lib/config");
const command = require("./command");
const db = require("./lib/db");

let client = new Client();

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

client.login(config.global.auth.token).then(() => {
    console.log("[Bot] Logged in! Ready to go!");
}).catch((err) => {
    console.error("[Bot] Failed to login with token!\n", err);
});

console.log("[Bot] Logging in with token...");
command.initLib(config, db, client);