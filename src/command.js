const {RichEmbed, Attachment} = require("discord.js");
const chan = require("./4chan-api");
const fs = require("fs");
const unescape = require("unescape");

let strings = require("../strings.json");
const commands = {};

function parseCommand(message, prefix) {
    if(message.author.bot) {
        return;
    }
    if(message.content.substring(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
        let argumentText = message.content.substring(prefix.length).trim();
        let arguments    = argumentText.split(" ");

        if(arguments.length > 0 && arguments[0]) {
            let commandName = arguments[0].toLowerCase();
            arguments.splice(0, 1);

            for(let cmd in commands) {
                if(cmd === commandName) {
                    commands[cmd](message, arguments);
                    return;
                }
            }

            commandNotFound(commandName, prefix, message);
        } else {
            noCommandEntered(message);
        }
    }
}

function registerCommands(config) {
    // help
    commands["help"] = (message, args) => {
        const embed = new RichEmbed();
        embed.setAuthor(strings["help_title"], "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64", "https://github.com/Romejanic/4chan-Discord-Bot");
        embed.setColor("#FED7B0");
        for(let cmd in commands) {
            embed.addField(`${config.prefix} ${cmd}`, strings[cmd+"_help"]);
        }
        embed.setFooter("Created by @memedealer#6607 | Find me on GitHub!");
        message.channel.send(embed);
    };
    // random
    commands["random"] = (message, args) => {
        let board = config.default_board;
        if(args.length > 0) {
            board = args[0];
            if(board.startsWith("/")) {
                board = board.substring(1, board.length);
            }
            if(board.endsWith("/")) {
                board = board.substring(0, board.length - 1);
            }
        }
        
        if(board === "help") {
            message.channel.send(strings["random_helpmsg"].format(config.prefix));
        }

        chan.getRandomPost(board).then((post) => {
            let postText = unescape(post.text.length > 2000 ? post.text.substring(0, 2000) + "..." : post.text);
            if(postText.indexOf("<br>") > -1) {
                postText = postText.replace("<br>", "\n");
            }
        
            let embed = new RichEmbed()
                .setColor("#FED7B0")
                .setTitle(strings["post_title"].format(post.id, post.author))
                .setDescription(strings["post_desc"].format(postText, post.permalink))
                .setImage(post.image)
                .addField(strings["post_submitted"], post.timestamp);
            message.channel.send(embed);
        }, (reason) => {
            if(reason.board_not_found) {
                message.channel.send(strings["random_noboard"].format(reason.board_not_found));
            } else { 
                message.channel.send(strings["random_error"].format(reason));
            }
        });
    };
    // debug
    commands["debug"] = (message, args) => {
        if(message.author.tag !== config.editor_username) {
            message.channel.send(strings["editor_required"]);
            return;
        }
        let subCommands = ["reload"];
        if(args.length <= 0) {
            message.channel.send(`${strings["debug_nocmd"]}\n${subCommands.join("\n")}`);
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
                    strings = require("../strings.json");
                    break;
                default:
                    message.channel.send(strings["debug_unknown"].format(args[0]));
                    break;
            }
        }
    };
}

function commandNotFound(command, prefix, message) {
    message.channel.send(strings["command_not_found"].format(command, prefix));
}
function noCommandEntered(message) {
    message.channel.send(strings["no_command_entered"]);
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
    register: registerCommands
};