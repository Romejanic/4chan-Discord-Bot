const {RichEmbed} = require("discord.js");
const chan = require("./4chan-api");
const fs = require("fs");
const unescape = require("unescape");

const commands = {};
let strings;

const commandHelpImg = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64";
const commandHelpUrl = "https://github.com/Romejanic/4chan-Discord-Bot/blob/master/COMMANDS.md";

function parseCommand(message, prefix, config) {
    if(message.author.bot) {
        return;
    }
    let cfg = message.channel.type === "text" ? config.guilds.getConfigForGuild(message.guild.id) : undefined;
    if(message.content.substring(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
        if(cfg && cfg.allowedChannels && cfg.allowedChannels.indexOf(message.channel.id) < 0) {
            let allowedChannels = "";
            for(var i = 0; i < cfg.allowedChannels.length; i++) {
                let channel = message.guild.channels.get(cfg.allowedChannels[i]);
                allowedChannels += "#" + channel.name;
                if(i < cfg.allowedChannels.length - 1) {
                    allowedChannels += ", ";
                }
            }
            message.author.send(strings["restricted_channel"].format(allowedChannels, "#"+message.channel.name));
            return;
        }

        let argText = message.content.substring(prefix.length).trim();
        let args    = argText.split(" ");

        if(args.length > 0 && args[0]) {
            let commandName = args[0].toLowerCase();
            args.splice(0, 1);

            for(let cmd in commands) {
                if(cmd === commandName) {
                    commands[cmd](message, args);
                    return;
                }
            }

            commandNotFound(commandName, prefix, message);
        } else if(config.default_command && commands[config.default_command]) {
            commands[config.default_command](message, []);
        } else {
            noCommandEntered(message, prefix);
        }
    } else if(message.channel.type !== "text") {
        message.channel.send(strings["prefix_required"].format(prefix));
    }
}

function registerCommands(config) {
    // help
    commands["help"] = (message, args) => {
        const embed = new RichEmbed();
        embed.setAuthor(strings["help_title"], commandHelpImg, commandHelpUrl);
        embed.setColor("#FED7B0");
        for(let cmd in commands) {
            switch(cmd) {
                case "config":
                    if(message.channel.type !== "text" || !message.member.hasPermission("ADMINISTRATOR")) {
                        continue;
                    }
                    break;
                case "debug":
                    if(config.editor_usernames.indexOf(message.author.tag) < 0) {
                        continue;
                    }
                    break;
                default:
                    break;
            }
            embed.addField(`${getPrefix(message, config)} ${cmd}`, strings[cmd+"_help"]);
        }
        embed.setFooter("Created by @memedealer#6607 | Find me on GitHub!");
        message.channel.send(embed);
    };
    // random
    commands["random"] = (message, args) => {
        let board = config.default_board;
        if(args.length > 0) {
            board = chan.getBoardName(args[0]);
        }
        
        if(board === "help") {
            message.channel.send(strings["random_helpmsg"].format(getPrefix(message, config)));
            return;
        }

        chan.getRandomPost(board).then((post) => {
            sendPost(post, message);
        }, (reason) => {
            if(reason.board_not_found) {
                message.channel.send(strings["random_noboard"].format(reason.board_not_found));
            } else { 
                message.channel.send(strings["random_error"].format(reason));
            }
        });
    };
    // post
    commands["post"] = (message, args) => {
        if(args.length < 2) {
            message.channel.send(strings["post_usage"].format(getPrefix(message, config)));
        } else {
            let id = args[0];
            let board = chan.getBoardName(args[1]);

            chan.getPost(id, board).then((post) => {
                console.log(post);
                sendPost(post, message);
            }, (reason) => {
                if(reason.post_not_found) {
                    message.channel.send(strings["post_nopost"].format(reason.post_not_found, board));
                } else {
                    message.channel.send(strings["random_error"].format(reason));
                }
            });
        }
    };
    // config
    commands["config"] = (message, args) => {
        // check we are in a server
        if(message.channel.type !== "text") {
            message.channel.send(strings["config_notserver"]);
            return;
        }

        let cfg = config.guilds.getConfigForGuild(message.guild.id);
        if(!message.member.hasPermission("ADMINISTRATOR")) {
            message.channel.send(strings["config_notadmin"]);
        } else if(args.length <= 0) {
            message.channel.send(strings["config_keys"]);
        } else {
            let key = args[0];
            let prefix = getPrefix(message, config);
            switch(key) {
                case "prefix":
                    if(args.length == 1) {
                        let pfx = cfg.prefix ? cfg.prefix : "*none defined*";
                        message.channel.send(strings["config_prefix"].format(pfx, prefix));
                    } else if(args.length >= 2) {
                        let sub = args[1];
                        if(sub === "clear") {
                            delete cfg.prefix;
                            config.guilds.save();
                            message.channel.send(strings["config_prefix_cleared"]);
                        } else if(sub == "set") {
                            if(args.length >= 3) {
                                let arr = args.splice(2);
                                cfg.prefix = arr.join(" ");
                                config.guilds.save();
                                message.channel.send(strings["config_prefix_set"].format(cfg.prefix));
                            } else {
                                message.channel.send(strings["config_prefix_set_none"].format(prefix));
                            }
                        } else {
                            message.channel.send(strings["config_prefix_unknown"].format(sub, prefix));
                        }
                    }
                    break;
                case "restrict":
                    if(args.length == 1) {
                        let allowedChannels = "all channels";
                        if(cfg.allowedChannels && cfg.allowedChannels.length > 0) {
                            allowedChannels = "";
                            for(var i = 0; i < cfg.allowedChannels.length; i++) {
                                let channel = message.guild.channels.get(cfg.allowedChannels[i]);
                                allowedChannels += "#" + channel.name;
                                if(i < cfg.allowedChannels.length - 1) {
                                    allowedChannels += ", ";
                                }
                            }
                        }
                        message.channel.send(strings["config_restrict"].format(allowedChannels, prefix));
                    } else if(args.length >= 2) {
                        let sub = args[1];
                        if(sub.startsWith("<#") && sub.endsWith(">")) {
                            let channelId = sub.substring(2);
                            channelId = channelId.substring(0, channelId.length-1);
                            
                            let channel = message.guild.channels.get(channelId);
                            if(channel) {
                                if(!cfg.allowedChannels) {
                                    cfg.allowedChannels = [];
                                }
                                let idx = cfg.allowedChannels.indexOf(channel.id);
                                if(idx > -1) {
                                    cfg.allowedChannels.splice(idx, 1);
                                    message.channel.send(strings["config_restrict_channel"].format(`#${channel.name}`, "cannot"));
                                } else {
                                    cfg.allowedChannels.push(channel.id);
                                    message.channel.send(strings["config_restrict_channel"].format(`#${channel.name}`, "can"));
                                }
                                config.guilds.save();
                            } else {
                                message.channel.send(strings["config_restrict_nochannel"]);
                            }
                        } else if(sub === "clear") {
                            delete cfg.allowedChannels;
                            config.guilds.save();
                            message.channel.send(strings["config_restrict_cleared"]);
                        } else {
                            message.channel.send(strings["config_restrict_nosub"].format(prefix, sub));
                        }
                    }
                    break;
                default:
                    message.channel.send(strings["config_bad_key"].format(key, prefix));
                    break;
            }
        }
    };
    // debug
    commands["debug"] = (message, args) => {
        if(config.editor_usernames.indexOf(message.author.tag) == -1) {
            message.channel.send(strings["editor_required"]);
            return;
        }
        let subCommands = ["reload"];
        if(args.length <= 0) {
            message.channel.send(strings["debug_nocmd"].format(subCommands.join("\n")));
        } else {
            switch(args[0]) {
                case subCommands[0]: // reload
                    fs.readFile("strings.json", (err, data) => {
                        if(err) {
                            message.channel.send(strings["debug_error"].format(err));
                        } else {
                            let json = data.toString();
                            try {
                                strings = JSON.parse(json);
                                message.channel.send(strings["debug_reload"]);
                            } catch(e) {
                                message.channel.send(strings["debug_error"].format(err));
                            }
                        }
                    });
                    break;
                default:
                    message.channel.send(strings["debug_unknown"].format(args[0]));
                    break;
            }
        }
    };
}

function sendPost(post, message) {
    let postText = unescape(post.text.length > 2000 ? post.text.substring(0, 2000) + "..." : post.text);
    postText = postText.replace(/<br>/gi, "\n");
    postText = postText.replace("</span>", "");
    postText = postText.replace("<span class=\"quote\">", "");
        
    let embed = new RichEmbed()
        .setColor("#FED7B0")
        .setTitle(strings["post_title"].format(post.id, post.author))
        .setDescription(strings["post_desc"].format(postText, post.permalink))
        .setImage(post.image)
        .addField(strings["post_submitted"], post.timestamp);
    message.channel.send(embed);
}

function getPrefix(message, config) {
    if(message.channel.type !== "text") {
        return config.prefix;
    }
    let cfg = config.guilds.getConfigForGuild(message.guild.id);
    return cfg.prefix ? cfg.prefix : config.prefix;
}

function commandNotFound(command, prefix, message) {
    message.channel.send(strings["command_not_found"].format(command, prefix));
}
function noCommandEntered(message, prefix) {
    message.channel.send(strings["no_command_entered"].format(prefix));
}

// implement String.format as expected
// Source: https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) { 
            return typeof args[number] != 'undefined'
                        ? args[number]
                        : match;
        });
    };
}

// export the module
module.exports = {
    parse: parseCommand,
    register: registerCommands,
    loadStrings: () => {
        strings = require("../strings.json");
    }
};