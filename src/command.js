const { RichEmbed } = require("discord.js");
const { readFile } = require("fs").promises;
const unescape = require("unescape");
const chan = require("./lib/4chan-api");

let STRINGS = require("../strings.json");

// constants
const EMBED_COLOR_NORMAL = "#FED7B0";
const EMBED_COLOR_ERROR   = "#FF0000";
const EMBED_COLOR_SUCCESS = "#00FF00";
const EMBED_COLOR_LOADING = "#BBBBBB";
const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";
const AVATAR_URL_DEV = "https://cdn.discordapp.com/avatars/763736231812399115/6bbef49611cc60cb295ccceba74095ea.png?size=256";
const CMD_HELP_IMAGE = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64";
const CMD_HELP_URL = "https://github.com/Romejanic/4chan-Discord-Bot/blob/master/COMMANDS.md";

// command handlers
const COMMANDS = {

    "help": async (args, ctx) => {
        let embed = new RichEmbed()
            .setColor(EMBED_COLOR_NORMAL)
            .setAuthor(STRINGS["help_title"], CMD_HELP_IMAGE, CMD_HELP_URL)
            .setFooter(STRINGS["help_footer"]);
        const prefix = ctx.config.getPrefix();
        for(let cmd in COMMANDS) {
            let suffix = "";
            switch(cmd) {
                case "version":
                    continue;
                case "config":
                    if(!ctx.isServer || !ctx.server.isAdmin) continue;
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
            .setColor(EMBED_COLOR_NORMAL)
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
            .addField(STRINGS["info_stats_total"], lib.stats.totalServed, true)
            .addField(STRINGS["info_stats_daily"], lib.stats.getDailyAverage(), true)
            .addField(STRINGS["info_stats_today"], lib.stats.todayServed, true);
        ctx.channel.send(embed);
    },

    "random": async(args, ctx) => {
        // if user passes 'help' as argument, show help for the command
        if(args.length > 0 && args[0].toLowerCase() === "help") {
            let embed = new RichEmbed()
                .setColor(EMBED_COLOR_NORMAL)
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

        // create embed
        let embed = new RichEmbed()
            .setColor(EMBED_COLOR_LOADING)
            .setTitle(STRINGS["post_loading"])
            .setDescription(STRINGS["post_loading_desc"]);
        let msg = await ctx.channel.send(embed);

        // get the post and send it
        chan.getRandomPost(board).then((post) => {
            sendPost(post, embed, msg, ctx, lib.config.global);
        }).catch((err) => {
            embed.setColor(EMBED_COLOR_ERROR);
            if(err.board_not_found) {
                embed
                .setTitle(STRINGS["random_noboard"])
                .setDescription(STRINGS["random_noboard_desc"].format(board));
            } else {
                embed
                .setTitle(STRINGS["random_error"])
                .setDescription(STRINGS["random_error_desc"].format(err));
            }
            msg.edit(embed);
        });
    },

    "post": async(args, ctx) => {
        // if user passes incorrect number of arguments, show help for the command
        if(args.length != 2) {
            let embed = new RichEmbed()
            .setColor(EMBED_COLOR_NORMAL)
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

        // create embed
        let embed = new RichEmbed()
            .setColor(EMBED_COLOR_LOADING)
            .setTitle(STRINGS["post_loading"])
            .setDescription(STRINGS["post_loading_desc"]);
        let msg = await ctx.channel.send(embed);

        // get post from api
        chan.getPost(id, board).then((post) => {
            sendPost(post, embed, msg, ctx, lib.config.global);
        }).catch((err) => {
            embed.setColor(EMBED_COLOR_ERROR);
            if(err.post_not_found) {
                embed
                .setTitle(STRINGS["post_nopost"])
                .setDescription(STRINGS["post_nopost_desc"].format(err.post_not_found, board));
            } else {
                embed
                .setTitle(STRINGS["post_error"])
                .setDescription(STRINGS["random_error_desc"].format(err));
            }
            msg.edit(embed);
        });
    },

    "config": async (args, ctx) => {
        let embed = new RichEmbed();
        // make sure we're on a server
        if(!ctx.isServer) {
            embed.setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["config_notserver"])
                .setDescription(STRINGS["config_notserver_desc"]);
        }
        // make sure the user is a server admin
        else if(!ctx.server.isAdmin) {
            embed.setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["config_notadmin"])
                .setDescription(STRINGS["config_notadmin_desc"]);
        }
        // if no arguments are passed, show command help
        else if(args.length <= 0) {
            embed.setColor(EMBED_COLOR_NORMAL)
                .setAuthor(STRINGS["config_help_title"], CMD_HELP_IMAGE, null)
                .setDescription(STRINGS["config_help_desc"].format(ctx.config.getPrefix()))
                .addField("default_board", ctx.config.getDisplayValue("default_board", STRINGS), true)
                .addField("prefix", ctx.config.getDisplayValue("prefix", STRINGS), true)
                .addField("removal_time", ctx.config.getDisplayValue("removal_time", STRINGS), true)
                .addField("allowed_channels", ctx.config.getDisplayValue("allowed_channels", STRINGS), true);
        }
        // otherwise, determine which property they are trying to edit
        else {
            try {
                let key = args[0].toLowerCase();
                switch(key) {
                    case "default_board":
                        if(args.length < 2) {
                            let valueString = ctx.config.getDisplayValue("default_board", STRINGS);
                            embed.setColor(EMBED_COLOR_NORMAL)
                                .setAuthor(STRINGS["config_default_board_title"], CMD_HELP_IMAGE, null)
                                .setDescription(STRINGS["config_default_board_description"].format(valueString))
                                .addField(STRINGS["config_info_set"], STRINGS["config_default_board_change_cmd"].format(ctx.config.getPrefix()))
                                .addField(STRINGS["config_info_reset"], STRINGS["config_default_board_reset_cmd"].format(ctx.config.getPrefix()));
                        } else {
                            let input = args[1].toLowerCase();
                            if(input === "clear") {
                                await ctx.config.setDefaultBoard(null);
                                embed.setColor(EMBED_COLOR_SUCCESS)
                                    .setTitle(STRINGS["config_cleared"])
                                    .setDescription(STRINGS["config_default_board_clear"].format(ctx.config.getDefaultBoard()));
                            } else {
                                let board = chan.getBoardName(input);
                                // make sure string isn't too long
                                if(board.length > 10) {
                                    embed.setColor(EMBED_COLOR_ERROR)
                                        .setTitle(STRINGS["config_invalid"])
                                        .setDescription(STRINGS["config_default_board_toolong"].format(board.length));
                                } else {
                                    await ctx.config.setDefaultBoard(board);
                                    embed.setColor(EMBED_COLOR_SUCCESS)
                                        .setTitle(STRINGS["config_changed"])
                                        .setDescription(STRINGS["config_default_board_set"].format(board));
                                }
                            }
                        }
                        break;
                    case "prefix":
                        if(args.length < 2) {
                            let valueString = ctx.config.getDisplayValue("prefix", STRINGS);
                            embed.setColor(EMBED_COLOR_NORMAL)
                                .setAuthor(STRINGS["config_prefix_title"], CMD_HELP_IMAGE, null)
                                .setDescription(STRINGS["config_prefix_description"].format(valueString))
                                .addField(STRINGS["config_info_set"], STRINGS["config_prefix_change_cmd"].format(ctx.config.getPrefix()))
                                .addField(STRINGS["config_info_reset"], STRINGS["config_prefix_reset_cmd"].format(ctx.config.getPrefix()));
                        } else {
                            let prefix = args[1].toLowerCase();
                            if(prefix === "clear") {
                                await ctx.config.setPrefix(null);
                                embed.setColor(EMBED_COLOR_SUCCESS)
                                    .setTitle(STRINGS["config_cleared"])
                                    .setDescription(STRINGS["config_prefix_clear"].format(ctx.config.getPrefix()));
                            } else if(prefix.length > 10) {
                                embed.setColor(EMBED_COLOR_ERROR)
                                .setTitle(STRINGS["config_invalid"])
                                .setDescription(STRINGS["config_prefix_toolong"].format(prefix.length));
                            } else {
                                await ctx.config.setPrefix(prefix);
                                embed.setColor(EMBED_COLOR_SUCCESS)
                                    .setTitle(STRINGS["config_changed"])
                                    .setDescription(STRINGS["config_prefix_set"].format(ctx.config.getPrefix()));
                            }
                        }
                        break;
                    case "removal_time":
                        if(args.length < 2) {
                            let valueString = ctx.config.getDisplayValue("removal_time", STRINGS);
                            embed.setColor(EMBED_COLOR_NORMAL)
                                .setAuthor(STRINGS["config_removal_time_title"], CMD_HELP_IMAGE, null)
                                .setDescription(STRINGS["config_removal_time_description"].format(valueString))
                                .addField(STRINGS["config_info_set"], STRINGS["config_removal_time_change_cmd"].format(ctx.config.getPrefix()))
                                .addField(STRINGS["config_info_reset"], STRINGS["config_removal_time_reset_cmd"].format(ctx.config.getPrefix()));
                        } else {
                            let seconds = args[1].toLowerCase();
                            if(seconds === "reset") {
                                await ctx.config.setRemovalTime(null);
                                embed.setColor(EMBED_COLOR_SUCCESS)
                                    .setTitle(STRINGS["config_cleared"])
                                    .setDescription(STRINGS["config_removal_time_clear"].format(ctx.config.getRemovalTime()));
                            } else if(isNaN(seconds) || seconds < 10 || seconds > 300) {
                                embed.setColor(EMBED_COLOR_ERROR)
                                .setTitle(STRINGS["config_invalid"])
                                .setDescription(STRINGS["config_removal_time_invalid"].format(seconds));
                            } else {
                                await ctx.config.setRemovalTime(Number(seconds));
                                embed.setColor(EMBED_COLOR_SUCCESS)
                                    .setTitle(STRINGS["config_changed"])
                                    .setDescription(STRINGS["config_removal_time_set"].format(ctx.config.getRemovalTime()));
                            }
                        }
                        break;
                    case "allowed_channels":
                        // show list of channels if no arguments are passed
                        if(args.length != 2) {
                            let desc = STRINGS["config_restricted_channels_desc_none"];
                            let channels = ctx.config.getAllowedChannels();
                            if(channels && channels.length > 0) {
                                channels = ctx.config.getAllowedChannelsText(ctx.server.guild);
                                desc = STRINGS["config_restricted_channels_desc_list"].format(channels);
                            }
                            embed.setColor(EMBED_COLOR_NORMAL)
                            .setAuthor(STRINGS["config_restricted_channels_title"], CMD_HELP_IMAGE, null)
                            .setDescription(desc)
                            .addField(STRINGS["config_restricted_channels_toggle"], STRINGS["config_restricted_channels_toggle_cmd"].format(ctx.config.getPrefix()))
                            .addField(STRINGS["config_cleared"], STRINGS["config_restricted_channels_reset_cmd"].format(ctx.config.getPrefix()));
                        } 
                        // otherwise, is the user trying to reset the channels?
                        else if(args[1].toLowerCase() === "reset") {
                            await ctx.config.clearAllowedChannels();
                            embed.setColor(EMBED_COLOR_SUCCESS)
                                .setTitle(STRINGS["config_cleared"])
                                .setDescription(STRINGS["config_restricted_channels_reset"]);
                        }
                        // attempt to toggle channel
                        else {
                            let channelTag = args[1].toLowerCase();
                            if(!channelTag.startsWith("<#") && !channelTag.endsWith(">")) {
                                embed.setColor(EMBED_COLOR_ERROR)
                                    .setTitle(STRINGS["config_invalid"])
                                    .setDescription(STRINGS["config_restricted_channels_notag"].format(ctx.config.getPrefix()));
                            } else {
                                let channel = ctx.server.guild.channels.get(channelTag.substring(2, channelTag.length-1));
                                // make sure channel exists, is a text channel and is marked as nsfw
                                if(!channel || channel.type !== "text" || !channel.nsfw) {
                                    embed.setColor(EMBED_COLOR_ERROR)
                                        .setTitle(STRINGS["config_restricted_channels_invalid"])
                                        .setDescription(STRINGS["config_restricted_channels_invalid_desc"]);
                                }
                                // channel is valid, toggle it
                                else {
                                    let enabled = await ctx.config.toggleChannel(channel);
                                    let desc = !enabled && (!ctx.config.getAllowedChannels() || ctx.config.getAllowedChannels().length < 0)
                                                ? STRINGS["config_restricted_channels_reset"] :
                                                STRINGS["config_restricted_channels_toggle_desc"].format(
                                                    STRINGS["can_" + enabled],
                                                    channel.name
                                                );
                                    embed.setColor(EMBED_COLOR_SUCCESS)
                                        .setTitle(STRINGS["success_true"])
                                        .setDescription(desc);
                                }
                            }
                        }
                        break;
                    default:
                        embed.setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_key"])
                            .setDescription(STRINGS["config_unknown_key_desc"].format(key, ctx.config.getPrefix()));
                        break;
                }
            } catch(e) {
                console.error("Error while setting config:", e);
                embed.setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["config_unknown_error"])
                    .setDescription(STRINGS["config_unknown_error_desc"].format(STRINGS["random_error_desc"].format(e)));
            }
        }
        // send embed
        ctx.channel.send(embed);
    },

    "debug": async (args, ctx) => {
        let embed = new RichEmbed();
        // register sub-commands
        const subCmds = {
            "reload_strings": async (embed) => {
                let stringData = (await readFile("strings.json")).toString();
                STRINGS = JSON.parse(stringData);
                embed.setColor(EMBED_COLOR_SUCCESS)
                    .setTitle(STRINGS["debug_reload"])
                    .setDescription(STRINGS["debug_reload_desc"]);
            },
            "dump_configs": async (embed) => {
                lib.config.clearServers();
                embed.setColor(EMBED_COLOR_SUCCESS)
                    .setTitle(STRINGS["debug_dump_config"])
                    .setDescription(STRINGS["debug_dump_config_desc"]);
            },
            "announce": async (embed) => {
                if(args.length < 4) {
                    embed.setColor(EMBED_COLOR_NORMAL)
                        .setTitle(STRINGS["debug_announce_usage"])
                        .setDescription(STRINGS["debug_announce_usage_desc"].format(
                            ctx.config.getPrefix(),
                            STRINGS["debug_announce"]
                        ));
                } else {
                    let title, desc, send;
                    // get values
                    if(args[1].toLowerCase() === "--send") {
                        title = args[2];
                        desc = args.splice(3).join(" ");
                        send = true;
                    } else {
                        title = args[1];
                        desc = args.splice(2).join(" ");
                        send = false;
                    }
                    // create embed
                    let announcement = send ? new RichEmbed() : embed;
                    announcement
                        .setColor(EMBED_COLOR_NORMAL)
                        .setAuthor(title, CMD_HELP_IMAGE, null)
                        .setDescription(desc)
                        .setThumbnail(AVATAR_URL)
                        .setFooter(STRINGS["debug_announce_" + (send ? "footer" : "preview")]);
                    // send it
                    if(send) {
                        let successNum = 0;
                        let failedNum = 0;
                        let channels = lib.client.guilds.map(g => g.systemChannel).filter(c => c != null);
                        for(let channel of channels) {
                            try {
                                await channel.send(announcement);
                                successNum++;
                            } catch(e) {
                                failedNum++;
                            }
                        }
                        embed.setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["debug_announce_sent"])
                            .setDescription(STRINGS["debug_announce_sent_desc"].format(successNum, failedNum));
                    }
                }
            }
        };
        { // section for command code so it can be collapsed
        // make sure user is a bot developer
        if(!ctx.isBotDev) {
            embed.setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["editor_required"])
                .setDescription(STRINGS["editor_required_desc"]);
        }
        // if no arguments are given, show available options
        else if(args.length < 1) {
            embed.setColor(EMBED_COLOR_NORMAL)
                .setTitle(STRINGS["debug_title"]);
            for(let cmdname in subCmds) {
                embed.addField(cmdname, STRINGS["debug_" + cmdname], false);
            }
        }
        // perform action of subcommand
        else {
            let cmd = args[0].toLowerCase();
            if(subCmds[cmd]) {
                await subCmds[cmd](embed);
            } else {
                embed.setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["debug_unknown"])
                    .setDescription(STRINGS["debug_unknown_desc"].format(cmd));
            }
        }
        // send embed
        ctx.channel.send(embed);
        }
    }

};
// add `+4chan version` alias for backwards compatability
COMMANDS["version"] = COMMANDS["info"];

function sendPost(post, embed, msg, ctx, global) {
    let postText = unescape(post.text.length > 2000 ? post.text.substring(0, 2000) + "..." : post.text);
    postText = postText.replace(/<br>/gi, "\n");
    postText = postText.replace("</span>", "");
    postText = postText.replace("<span class=\"quote\">", "");
        
    embed
        .setColor(EMBED_COLOR_NORMAL)
        .setTitle(STRINGS["post_title"].format(post.id, post.author))
        .setDescription(STRINGS["post_desc"].format(postText, post.permalink))
        .setImage(post.image)
        .addField(STRINGS["post_submitted"], post.timestamp);

    if(ctx.isServer) {
        embed.setFooter(STRINGS["post_removal_instructions"].format(global.removal_emote));
    }
    let msgPromise = msg.edit(embed);
    if(ctx.isServer) {
        msgPromise.then(msg => {
            let removalTime = ctx.config.getRemovalTime();
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
                    msg.edit(removeEmbed);
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
            // the guild object
            guild: msg.guild,
            // is the user that sent the message a server admin?
            isAdmin: msg.member.hasPermission("ADMINISTRATOR")
        };
    }
    return ctx;
}

module.exports = {

    initLib: (config, db, client, stats) => {
        lib = Object.freeze({
            config, db, client, stats
        });
    },

    parse: async function(msg) {
        console.log(msg);
        let isServer = msg.member != null && msg.member != undefined;
        let config = await lib.config.forServer(isServer ? msg.guild.id : null, lib.db);
        // check if prefix matches
        if(msg.content.startsWith(config.getPrefix()) || msg.channel.type === "DM") {
                let embed = new RichEmbed()
                    .setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["slash_required"])
                    .setDescription(STRINGS["slash_required_desc"].format(ctx.config.getPrefix()));
                msg.channel.send(embed);
            return;
        }
    },

    /**
     * @param {CommandContext} ctx 
     */
    execute: (ctx) => {
        ctx.reply("test");
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