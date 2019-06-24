const Discord = require("discord.js");
const fs = require("fs");

if(!fs.existsSync("config.json")) {
	console.log("[ERROR] No config file found!");
	console.log("[ERROR] Please edit the config.json file and add your bot token");

	let inn = fs.createReadStream("data/config_default.json");
	let out = fs.createWriteStream("config.json");
	inn.pipe(out);
	inn.on("end", () => {
		process.exit();
	});
} else {
	initBot();
}

function initBot() {
	let config = require("config.json");
	console.log(config.auth);
}
