const { Client } = require("discord.js");
const config = require("./lib/config");
const command = require("./command");

let client = new Client();

client.on("message", (msg) => {
    // send message off to command parser
    command.parse(msg).catch((e) => {
        console.error("[Bot] Error while processing command!\n", e);
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
command.initLib(config, null);
command.parse = command.parse.bind(command);