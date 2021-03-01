const { Client } = require("discord.js");

let client = new Client();

client.on("message", (msg) => {
    console.log(msg.content);
});

client.on("error", (err) => {
    console.error("[Bot] Unexpected error:", err);
});

client.login(require("../config.json").auth.token).then(() => {
    console.log("[Bot] Logged in! Ready to go!");
}).catch((err) => {
    console.error("[Bot] Failed to login with token!\n", err);
});

console.log("[Bot] Logging in with token...");