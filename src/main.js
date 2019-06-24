const Discord = require("discord.js");
const fs = require("fs");

const Commands = require("./command.js");

// define functions
 
function initBot() {
	// check config
	let config = require("../config.json");
	if(!config || !config.auth || !config.auth.token) {
		console.error("[ERROR] You must define a token! Please see data/config_default.json for a reference.");
		return;
	}

	// create client
	let client = new Discord.Client();
	registerClientEvents(client, config);
	client.login(config.auth.token);
	console.log("[Client] Attempting login to Discord...");

	// register commands
	Commands.register();

	// register safe exit
	process.on("SIGINT", () => {
		console.log("[Bot] Shutting down...");
		client.destroy().then(() => {
			console.log("[Client] Disconnected successfully!");
		}, (err) => {
			console.error("[Client] Failed to disconnect from Discord: " + err);
		}).then(() => {
			process.exit(); // kills the process
		});
	});
	if(process.platform === "win32") { // workaround to detect SIGINT on Windows
		let rl = require("readline").createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.on("SIGINT", () => {
			process.emit("SIGINT");
		});
	}
}

function registerClientEvents(client, config) {
	client.on("ready", () => {
		console.log("[Client] Successfully logged in to Discord!");
	});
	client.on("message", (message) => {
		Commands.parse(message, config.prefix);
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
			process.exit(-1);
		});
	} else {
		callback();
	}
}

// bootstrap the bot
checkConfig(initBot);