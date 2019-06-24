const Discord = require("discord.js");
const fs = require("fs");

// define functions
 
function initBot() {
	let config = require("../config.json");
	if(!config || !config.auth || !config.auth.token) {
		console.error("[ERROR] You must define a token! Please see data/config_default.json for a reference.");
		return;
	}

	let client = new Discord.Client();
	registerClientEvents(client);
	client.login(config.auth.token);
}

function registerClientEvents(client) {
	client.on("ready", () => {
		console.log("[Client] Successfully logged in to Discord!");
	});
}

function checkConfig(callback) {
	if(!fs.existsSync("config.json")) {
		console.error("[ERROR] No config file found!");
		console.error("[ERROR] Please edit the config.json file and add your bot token");

		let inn = fs.createReadStream("data/config_default.json");
		let out = fs.createWriteStream("config.json");
		inn.pipe(out);
		inn.on("end", () => {
			process.exit();
		});
	} else {
		callback();
	}
}

// bootstrap the bot
checkConfig(initBot);