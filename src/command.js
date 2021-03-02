const { RichEmbed } = require("discord.js");
const unescape = require("unescape");
const chan = require("./lib/4chan-api");
const STRINGS = require("../strings.json");

// constants
const EMBED_COLOR_SUCCESS = "#FED7B0";
const EMBED_COLOR_ERROR   = "#FF0000";
const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";
const AVATAR_URL_DEV = "https://cdn.discordapp.com/avatars/763736231812399115/6bbef49611cc60cb295ccceba74095ea.png?size=256";
const CMD_HELP_IMAGE = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64";
const CMD_HELP_URL = "https://github.com/Romejanic/4chan-Discord-Bot/blob/master/COMMANDS.md";

// command handlers
const COMMANDS = {

    "help": async (args, ctx) => {
        let embed = new RichEmbed()
            .setColor(EMBED_COLOR_SUCCESS)
            .setAuthor(STRINGS["help_title"], CMD_HELP_IMAGE, CMD_HELP_URL)
            .setFooter(STRINGS["help_footer"]);
        const prefix = ctx.config.getPrefix();
        for(let cmd in COMMANDS) {
            let suffix = "";
            switch(cmd) {
                case "version":
                    continue;
                case "config":
                    if(!ctx.isAdmin) continue;
                    break;
                case "debug":
                    if(!ctx.isBotDev) continue;
                    break;
                case "random":
                    suffix = STRINGS["random_suffix"].format(prefix);
                    break;
            }
            embed.addField(`${prefix} ${cmd}${suffix}`, STRINGS[cmd+"_help"], false);
        }
        ctx.channel.send(embed);
    },

    "info": async (args, ctx) => {
        const { version } = require("../package.json");
        const { heapUsed, heapTotal } = process.memoryUsage();
        let embed = new RichEmbed()
            .setTitle(STRINGS["info_title"])
            .setColor(EMBED_COLOR_SUCCESS)
            .setThumbnail(!ctx.isDev ? AVATAR_URL : AVATAR_URL_DEV)
            .setDescription(STRINGS["info_desc"])
            .setFooter(STRINGS["info_footer"])
            .addField(STRINGS["info_version"], version, true)
            .addField(STRINGS["info_build_type"], STRINGS["info_dev_build_" + ctx.isDev], true)
            .addField(STRINGS["info_used_in"], STRINGS["info_servers"].format(lib.client.guilds.size), true)
            .addField(STRINGS["info_node"], process.version, true)
            .addField(STRINGS["info_os"], process.platform, true)
            .addField(STRINGS["info_memory"], (100 * heapUsed / heapTotal).toFixed(1) + "%", true)
            // TODO: implement stats again
            .addField(STRINGS["info_stats_total"], "0", true)
            .addField(STRINGS["info_stats_daily"], "0", true)
            .addField(STRINGS["info_stats_today"], "0", true);
        ctx.channel.send(embed);
    },

    "random": async(args, ctx) => {
        // if user passes 'help' as argument, show help for the command
        if(args.length > 0 && args[0].toLowerCase() === "help") {
            let embed = new RichEmbed()
                .setColor(EMBED_COLOR_SUCCESS)
                .setAuthor(STRINGS["help_title"], CMD_HELP_IMAGE, CMD_HELP_URL)
                .setDescription(STRINGS["random_help"])
                .addField(STRINGS["help_usage"], STRINGS["random_helpmsg"].format(ctx.config.getPrefix()), false)
                .addField(STRINGS["random_default"], `/${ctx.config.getDefaultBoard()}/`, false);
            ctx.channel.send(embed);
            return;
        }

        // pick the board to use
        let board = ctx.config.getDefaultBoard();
        if(args.length > 0) {
            board = args[0];
        }
        board = chan.getBoardName(board);

        // get the post and send it
        chan.getRandomPost(board).then((post) => {
            sendPost(post, ctx, lib.config.global);
        }).catch((err) => {
            let embed = new RichEmbed()
                .setColor(EMBED_COLOR_ERROR);
            if(err.board_not_found) {
                embed
                .setTitle(STRINGS["random_noboard"])
                .setDescription(STRINGS["random_noboard_desc"].format(board));
            } else {
                embed
                .setTitle(STRINGS["random_error"])
                .setDescription(STRINGS["random_error_desc"].format(err));
            }
            ctx.channel.send(embed);
        });
    },

    "post": async(args, ctx) => {
        // if user passes incorrect number of arguments, show help for the command
        if(args.length != 2) {
            let embed = new RichEmbed()
            .setColor(EMBED_COLOR_SUCCESS)
            .setAuthor(STRINGS["help_title"], CMD_HELP_IMAGE, CMD_HELP_URL)
            .setDescription(STRINGS["post_help"])
            .addField(STRINGS["help_usage"], STRINGS["post_usage"].format(ctx.config.getPrefix()), false)
            .addField(STRINGS["help_example"], STRINGS["post_usage_example"].format(ctx.config.getPrefix()), false);
            ctx.channel.send(embed);
            return;
        }

        // get id and board from post
        let id = args[0];
        let board = chan.getBoardName(args[1].toLowerCase());

        // get post from api
        chan.getPost(id, board).then((post) => {
            sendPost(post, ctx, lib.config.global);
        }).catch((err) => {
            let embed = new RichEmbed()
                .setColor(EMBED_COLOR_ERROR);
            if(err.post_not_found) {
                embed
                .setTitle(STRINGS["post_nopost"])
                .setDescription(STRINGS["post_nopost_desc"].format(err.post_not_found, board));
            } else {
                embed
                .setTitle(STRINGS["post_error"])
                .setDescription(STRINGS["random_error_desc"].format(err));
            }
            ctx.channel.send(embed);
        });
    }

};
// add `+4chan version` alias for backwards compatability
COMMANDS["version"] = COMMANDS["info"];

function sendPost(post, ctx, global) {
    let postText = unescape(post.text.length > 2000 ? post.text.substring(0, 2000) + "..." : post.text);
    postText = postText.replace(/<br>/gi, "\n");
    postText = postText.replace("</span>", "");
    postText = postText.replace("<span class=\"quote\">", "");
        
    let embed = new RichEmbed()
        .setColor(EMBED_COLOR_SUCCESS)
        .setTitle(STRINGS["post_title"].format(post.id, post.author))
        .setDescription(STRINGS["post_desc"].format(postText, post.permalink))
        .setImage(post.image)
        .addField(STRINGS["post_submitted"], post.timestamp);

    let removalTime = ctx.config.getRemovalTime();
    if(ctx.isServer) {
        embed.setFooter(STRINGS["post_removal_instructions"].format(global.removal_emote));
    }
    let msgPromise = ctx.channel.send(embed);
    if(ctx.isServer) {
        msgPromise.then(msg => {
            // remove instructions after timeout interval
            let timeout = setTimeout(() => {
                embed.footer = null;
                msg.edit(embed);
            }, removalTime * 1000);
            // create reaction filter to capture reactions
            let filter = (reaction, user) => {
                return reaction.emoji.name === global.removal_emote && user.id === ctx.author.id;
            };
            msg.awaitReactions(filter, { max: 1, time: removalTime * 1000, errors: ["time"] }).then(collected => {
                // remove post if the reaction and user matches
                let reaction = collected.first();
                if(reaction.emoji.name === global.removal_emote) {
                    let removeEmbed = new RichEmbed()
                        .setColor(EMBED_COLOR_ERROR)
                        .setTitle(STRINGS["post_removal_confirm"])
                        .setDescription(STRINGS["post_removal_desc"]);
                    msg.edit("", removeEmbed);
                    clearTimeout(timeout);
                }
            }).catch(() => { /* do nothing on error */ });
        });
    }
}

//-----------------------------------------------------------------------------//

let lib = null;

function getCommandContext(msg, config) {
    let ctx = {
        // is the current message in a server text channel?
        isServer: msg.member != null && msg.member != undefined,
        // is the user that sent the message a bot author?
        isBotDev: config.global.editors.indexOf(msg.author.id) > -1,
        // other general values
        channel: msg.channel,
        author: msg.author,
        isDev: process.argv.indexOf("-dev") > -1
    };
    // if it's not a server, it must be a dm
    ctx.isDM = !ctx.isServer;
    if(ctx.isServer) {
        ctx.server = {
            // the id of the current server
            id: msg.guild.id,
            // is the user that sent the message a server admin?
            isAdmin: msg.member.hasPermission("ADMINISTRATOR")
        };
    }
    return ctx;
}

module.exports = {

    initLib: (config, db, client) => {
        lib = Object.freeze({
            config, db, client
        });
    },

    parse: async function(msg) {
        let ctx = getCommandContext(msg, lib.config);
        ctx.config = await lib.config.forServer(ctx.isServer ? ctx.server.id : null, lib.db);
        // check if prefix matches
        if(!msg.content.startsWith(ctx.config.getPrefix())) {
            return;
        }
        // get command arguments
        let args = msg.content.trim().split(" ");
        if(args.length >= 2) {
            let cmdName = args[1].toLowerCase();
            args = args.splice(2);
            // check if 2nd argument is a board name
            if(cmdName.startsWith("/") || cmdName.endsWith("/")) {
                args = [ cmdName ];
                cmdName = "random";
            }
            // check if command exists
            if(COMMANDS[cmdName]) {
                // run command with arguments and context
                await COMMANDS[cmdName](args, Object.freeze(ctx));
            } else {
                // command was not found
                let embed = new RichEmbed()
                    .setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["command_not_found"])
                    .setDescription(STRINGS["command_not_found_desc"].format(cmdName, ctx.config.getPrefix()));
                ctx.channel.send(embed);
            }
        } else if(COMMANDS[lib.config.global.default_command]) {
            // run the default command if no command is provided
            await COMMANDS[lib.config.global.default_command]([], Object.freeze(ctx));
        } else {
            // no command was entered, with no default command to fall back on
            // (due to global config this shouldn't happen)
            let embed = new RichEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["no_command_entered"])
                .setDescription(STRINGS["no_command_entered_desc"].format(ctx.config.getPrefix()));
            ctx.channel.send(embed);
        }
    },

    onCommandError: (err, channel) => {
        let embed = new RichEmbed()
            .setColor(EMBED_COLOR_ERROR)
            .setTitle(STRINGS["command_error"])
            .setDescription(STRINGS["random_error_desc"].format(err));
        channel.send(embed);
    }

};

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