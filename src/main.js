const Discord = require("discord.js");
const fs = require("fs");

const Commands = require("./command");
const GuildConfig = require("./guild-config");

// define functions
 
function initBot() {
	// check config
	let config = require("../config.json");
	if(!config || !config.auth || !config.auth.token) {
		console.error("[ERROR] You must define a token! Please see data/config_default.json for a reference.");
		return;
	}

	// load guild config
	config.guilds = GuildConfig;
	config.guilds.load();

	// create client
	let client = new Discord.Client();
	registerClientEvents(client, config);
	client.login(config.auth.token);
	console.log("[Client] Attempting login to Discord...");

	// register commands
	Commands.register(config);

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
		let cfg = config.guilds.getConfigForGuild(message.guild.id);
		let pfx = config.prefix;
		if(cfg.prefix) {
			pfx = cfg.prefix;
		}
		Commands.parse(message, pfx, config);
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