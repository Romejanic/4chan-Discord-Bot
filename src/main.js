const Discord = require("discord.js");
const fs = require("fs");

const Commands = require("./command");
const GuildConfig = require("./guild-config");
const Utils = require("./utils");

// define functions
 
function initBot() {
	// check config
	let config = require("../config.json");
	// copy new config entries (if needed)
	let template = require("../data/config_default.json");
	// check if there's any new config keys, and if so write the file out
	if(Utils.matchTemplate(config, template)) {
		let json = JSON.stringify(config, null, 4);
		fs.writeFile("config.json", json, (err) => {
			if(err) {
				console.error("[Config] Failed to write config file!\n", err);
			}
		});
	}
	// check that a bot token has been given
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
	Commands.loadStrings();

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
		let pfx = config.prefix;
		if(message.channel.type === "text") {
			let cfg = config.guilds.getConfigForGuild(message.guild.id);	
			if(cfg.prefix) {
				pfx = cfg.prefix;
			}
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
			process.exit(0);
		});
	} else {
		// copy default strings if they don't exist already
		fs.exists("strings.json", (exists) => {
			if(!exists) {
				let inn = fs.createReadStream("data/strings_default.json");
				let out = fs.createWriteStream("strings.json");
				inn.pipe(out);
				inn.on("end", () => {
					callback();
				});
			} else {
				fs.readFile("data/strings_default.json", (err, data) => {
					if(err) {
						console.error("[Config] Failed to read default strings file!", err);
					} else {
						fs.readFile("strings.json", (err, data1) => {
							if(err) {
								console.error("[Config] Failed to read current strings file!", err);
							} else {
								let template = JSON.parse(data.toString());
								let current = JSON.parse(data1.toString());
								if(Utils.matchTemplate(current, template, "strings")) {
									let json = JSON.stringify(current, null, 4);
									fs.writeFile("strings.json", json, (err) => {
										console.error("[Config] Failed to write new strings to file!", err);
									});
								}
							}
						});
					}
				});
				callback();
			}
		});
	}
}

// bootstrap the bot
checkConfig(initBot);