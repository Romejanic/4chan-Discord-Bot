import {
    ButtonInteraction, CategoryChannel, EmbedFieldData, GuildChannel,
    GuildMember, Message, MessageActionRow, MessageButton,
    MessageEmbed, NewsChannel, TextChannel, WebhookEditMessageOptions
} from "discord.js";
import { CommandContext } from "discord.js-slasher";
import * as config from './lib/config';
import format from './lib/str-format';
import Stats from "./stats";
import * as chan from './lib/4chan-api';
import { SubscriptionService } from "./subscribed";

// load strings
export const STRINGS: { [key: string]: string } = require("../strings.json");

// define commonly used constants
export const EMBED_COLOR_NORMAL = "#FED7B0";
export const EMBED_COLOR_ERROR   = "#FF0000";
export const EMBED_COLOR_SUCCESS = "#00FF00";
const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";
const AVATAR_URL_DEV = "https://cdn.discordapp.com/avatars/763736231812399115/6bbef49611cc60cb295ccceba74095ea.png?size=256";
const CMD_HELP_IMAGE = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64";
const CMD_HELP_URL = "https://github.com/Romejanic/4chan-Discord-Bot/blob/master/COMMANDS.md";

enum ChannelTypeNames {
    GUILD_TEXT = "Text Channel",
    GUILD_VOICE = "Voice Channel",
    GUILD_CATEGORY = "Category",
    GUILD_NEWS = "Announcement Channel",
    GUILD_STORE = "Store Channel",
    GUILD_NEWS_THREAD = "Announcement Thread",
    GUILD_PUBLIC_THREAD = "Public Thread",
    GUILD_PRIVATE_THREAD = "Private Thread",
    GUILD_STAGE_VOICE = "Stage Channel",
}

// define command handlers
const COMMANDS: CommandHandlers = {

    "4chan": async (ctx, lib) => {
        let embed = new MessageEmbed().setColor(EMBED_COLOR_NORMAL);

        switch(ctx.options.getSubcommand(true)) {
            case "info":
                let version = require("../package.json").version;
                let { heapUsed, heapTotal } = process.memoryUsage();
                embed.setTitle(STRINGS["info_title"])
                    .setDescription(STRINGS["info_desc"])
                    .setFooter(STRINGS["info_footer"])
                    .setThumbnail(!lib.dev ? AVATAR_URL : AVATAR_URL_DEV)
                    .addField(STRINGS["info_version"], version, true)
                    .addField(STRINGS["info_build_type"], STRINGS["info_dev_build_" + lib.dev], true)
                    .addField(STRINGS["info_used_in"], format(STRINGS["info_servers"], ctx.client.guilds.cache.size), true)
                    .addField(STRINGS["info_node"], process.version, true)
                    .addField(STRINGS["info_os"], process.platform, true)
                    .addField(STRINGS["info_memory"], (100 * heapUsed / heapTotal).toFixed(1) + "%", true)
                    .addField(STRINGS["info_stats_total"], (lib.stats.totalServed+1).toLocaleString(), true)
                    .addField(STRINGS["info_stats_daily"], lib.stats.getDailyAverage().toLocaleString(), true)
                    .addField(STRINGS["info_stats_today"], (lib.stats.todayServed+1).toLocaleString(), true);
                break;
            case "help":
                embed
                    .setFooter(STRINGS["help_footer"])
                    .setAuthor(STRINGS["help_title"], CMD_HELP_IMAGE, CMD_HELP_URL)
                    .addField(STRINGS["help_cmd"], STRINGS["help_help"], false)
                    .addField(STRINGS["info_cmd"], STRINGS["info_help"], false)
                    .addField(STRINGS["boards_cmd"], STRINGS["boards_help"], false)
                    .addField(STRINGS["random_cmd"], STRINGS["random_help"], false)
                    .addField(STRINGS["post_cmd"], STRINGS["post_help"], false);
                break;
            default:
                break;
        }

        await ctx.reply(embed);
    },

    "boards": async (ctx) => {
        await ctx.defer();

        // get the board list
        let cache  = await chan.getCachedBoards();
        let boards = cache.boards;
        let names  = Object.keys(boards);

        let updateMins = Math.floor((Date.now() - cache.updated) / 60000);

        // create embed and buttons
        let embed = new MessageEmbed()
            .setColor(EMBED_COLOR_NORMAL)
            .setTitle(STRINGS["boards_title"])
            .setFooter(format(STRINGS["boards_updated"], updateMins));
        let backButton = new MessageButton()
            .setStyle(1)
            .setCustomId("boards_back")
            .setEmoji(STRINGS["boards_back"]);
        let nextButton = new MessageButton()
            .setStyle(1)
            .setCustomId("boards_next")
            .setEmoji(STRINGS["boards_next"]);
        let countButton = new MessageButton()
            .setStyle(2)
            .setCustomId("boards_count")
            .setDisabled(true);

        // create function for populating list
        let boardsPerPage = 8;
        let currPage = 0;
        let pages = Math.ceil(names.length / boardsPerPage);

        function populateList(pageNo: number) {
            currPage = pageNo;
            let idx = pageNo * boardsPerPage;
            let end = Math.min(names.length - 1, idx + boardsPerPage);
            let arr = names.slice(pageNo * boardsPerPage, end);
        
            // set fields
            let fields: EmbedFieldData[] = arr.map(n => {
                return {
                    name: `/${n}/`,
                    value: "`" + boards[n].title + "`" + (boards[n].nsfw ? " (NSFW)" : ""),
                    inline: false
                };
            });
            embed.setFields(fields);

            // enable/disable buttons
            backButton.setDisabled(pageNo === 0);
            nextButton.setDisabled(pageNo === pages - 1);
            countButton.setLabel(format(STRINGS["boards_pages"], pageNo+1, pages));
        }
        populateList(0);

        // send the initial message
        let data: WebhookEditMessageOptions = {
            embeds: [ embed ],
            components: [
                new MessageActionRow().addComponents(backButton, countButton, nextButton)
            ]
        };
        let message = await ctx.edit(data);

        // create message component collector to detect when the buttons
        // are pressed
        const filter  = (i: ButtonInteraction) => [backButton.customId, nextButton.customId].includes(i.customId);
        const collect = ctx.channel.createMessageComponentCollector({ message, filter, time: 5 * 60 * 1000 });

        collect.on("collect", async (btn: ButtonInteraction) => {
            if(btn.customId === "boards_back" && currPage > 0) {
                populateList(currPage - 1);
            }
            if(btn.customId === "boards_next" && currPage < pages - 1) {
                populateList(currPage + 1);
            }
            data.components = [
                new MessageActionRow().addComponents(backButton, countButton, nextButton)
            ];
            await btn.update(data);
        });

        collect.on("end", async () => {
            // remove buttons once time expires
            data.components = [];
            embed.setFooter("Page " + countButton.label);
            await ctx.edit(data);
        });
    },

    "random": async (ctx, lib) => {
        // defer the response
        await ctx.defer();

        // decide which board to use
        let board = lib.config.getDefaultBoard();
        if(ctx.options.getString("board")) {
            board = ctx.options.getString("board");
        }
        board = chan.getBoardName(board);

        // check if board exists
        const [ exists, nsfw ] = await chan.validateBoard(board);
        if(!exists) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            await ctx.edit(embed);
            return;
        }

        // if the board is NSFW, check if this is a NSFW channel first
        if(!ctx.isDM && nsfw && !(ctx.channel as TextChannel).nsfw) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["nsfw_required"])
                .setDescription(format(STRINGS["nsfw_required_desc"], board));
            return await ctx.edit(embed);
        }

        try {
            // get a random post from 4chan and send it
            let post = await chan.getRandomPost(board);
            await sendPost(post, ctx, lib);
        } catch(err) {
            // notify the user of the error
            let embed = new MessageEmbed().setColor(EMBED_COLOR_ERROR);
            if(err.board_not_found) {
                embed
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            } else {
                embed
                .setTitle(STRINGS["random_error"])
                .setDescription(format(STRINGS["random_error_desc"], err));
            }
            await ctx.edit(embed);
            if(process.argv.includes("-dev")) {
                console.error(err);
            }
        }

    },

    "post": async(ctx, lib) => {
        await ctx.defer();

        // resolve board
        let board = chan.getBoardName(ctx.options.getString("board", true));
        const [ exists, nsfw ] = await chan.validateBoard(board);

        // validate the board
        if(!exists) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            await ctx.edit(embed);
            return;
        }
        
        // if the board is NSFW, check if this is a NSFW channel first
        if(!ctx.isDM && nsfw && !(ctx.channel as TextChannel).nsfw) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["nsfw_required"])
                .setDescription(format(STRINGS["nsfw_required_desc"], board));
            return await ctx.edit(embed);
        }

        try {
            // get the post from 4chan and send it
            let id   = ctx.options.getInteger("id", true);
            let post = await chan.getPost(id, board);
            await sendPost(post, ctx, lib);

        } catch(err) {
            // send appropriate error message to user
            let embed = new MessageEmbed().setColor(EMBED_COLOR_ERROR);
            if(err.post_not_found) {
                embed
                .setTitle(STRINGS["post_nopost"])
                .setDescription(format(STRINGS["post_nopost_desc"], err.post_not_found, board));
            } else {
                embed
                .setTitle(STRINGS["post_error"])
                .setDescription(format(STRINGS["random_error_desc"], err));
            }
            await ctx.edit(embed);
        }
    },

    "browse": async (ctx, lib) => {
        // defer the response
        await ctx.defer();

        // decide which board to use
        let board = lib.config.getDefaultBoard();
        if(ctx.options.getString("board")) {
            board = ctx.options.getString("board");
        }
        board = chan.getBoardName(board);

        // check if board exists
        const [ exists, nsfw ] = await chan.validateBoard(board);
        if(!exists) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            await ctx.edit(embed);
            return;
        }

        // if the board is NSFW, check if this is a NSFW channel first
        if(!ctx.isDM && nsfw && !(ctx.channel as TextChannel).nsfw) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["nsfw_required"])
                .setDescription(format(STRINGS["nsfw_required_desc"], board));
            return await ctx.edit(embed);
        }

        // gets a list of threads from the board
        const pages = await chan.getPagesFromBoard(board);
        const threads: chan.ApiPost[] = pages.reduce((arr, page) => {
            arr.push(...page.threads); return arr;
        }, []);

        // create buttons
        let back = createButton("browse_back", STRINGS["boards_back"]);
        let next = createButton("browse_next", STRINGS["boards_next"]);
        let up   = createButton("browse_up", STRINGS["browse_up"]);
        let down = createButton("browse_down", STRINGS["browse_down"]);
        
        let embed = new MessageEmbed()
            .setColor(EMBED_COLOR_NORMAL)
            .setAuthor(format(STRINGS["browse_title"], board), AVATAR_URL)
            .setFooter(STRINGS["browse_instructions"]);

        // create function to update the embed with the current thread
        let currThread: number;
        let currReply: number;
        let post: chan.ChanPost;
        let replies: chan.ChanReply[];

        async function setThread(thread: number, reply: number) {
            // clear replies if changing thread and
            // change post if changing thread
            if(currThread !== thread) {
                replies = undefined;
                post = chan.getPostFromThread(threads[thread], board);
            }

            // update current index
            currThread = thread;
            currReply = reply;

            // convert thread to chan post
            if(reply === 0) {
                // set embed to post
                let text = chan.processPostText(post);
                embed
                    .setTitle(format(STRINGS["post_title"], post.id, post.author))
                    .setDescription(format(STRINGS["post_desc"], text, post.permalink))
                    .setImage(post.image)
                    .setFields([
                        {
                            name: STRINGS["post_submitted"], value: post.timestamp, inline: true
                        },
                        {
                            name: STRINGS["browse_thread"], inline: true,
                            value: format(STRINGS["boards_pages"], thread+1, threads.length)
                        },
                        {
                            name: STRINGS["browse_replies"], value: String(post.replyCount), inline: true
                        }
                    ]);
            } else {
                // fetch the replies from 4chan if needed
                if(!replies) {
                    replies = await chan.getRepliesFromThread(post, board);
                }
                let data = replies[reply-1];
                let text = chan.processPostText(data);

                // set embed to reply
                embed
                    .setTitle(format(STRINGS["post_title"], data.id, data.author))
                    .setDescription(format(STRINGS["post_desc_reply"], text, data.permalink))
                    .setImage(data.image ? data.image : null)
                    .setFields([
                        {
                            name: STRINGS["post_submitted"], value: data.timestamp, inline: true
                        },
                        {
                            name: STRINGS["browse_thread"], inline: true,
                            value: format(STRINGS["boards_pages"], thread+1, threads.length)
                        },
                        {
                            name: STRINGS["browse_reply"], inline: true,
                            value: format(STRINGS["boards_pages"], reply, post.replyCount)
                        }
                    ]);
            }

            // disable unusable buttons
            back.setDisabled(thread <= 0);
            next.setDisabled(thread >= threads.length-1);
            up.setDisabled(reply <= 0);
            down.setDisabled(reply >= post.replyCount);
        }
        await setThread(0,0);
        
        // send the embed
        let message = await ctx.edit({
            embeds: [embed],
            components: [new MessageActionRow().addComponents(
                back,up,down,next
            )]
        });

        // add interaction collector
        const filter = (i: ButtonInteraction) => [
            back.customId, next.customId,
            up.customId, down.customId
        ].includes(i.customId);
        const collect = ctx.channel.createMessageComponentCollector({ message, filter, time: 15 * 60 * 1000 });

        collect.on("collect", async (i) => {
            // check if the user is the same as op
            if(i.user.id !== ctx.user.id) {
                let embed = new MessageEmbed()
                    .setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["browse_notop"])
                    .setDescription(STRINGS["browse_notop_desc"]);
                return await i.reply({ embeds: [embed], ephemeral: true });
            }

            // decide what to do based on button id
            switch(i.customId) {
                case "browse_back":
                    if(currThread > 0) {
                        await setThread(currThread-1, 0);
                    }
                    break;
                case "browse_next":
                    if(currThread < threads.length - 1) {
                        await setThread(currThread+1, 0);
                    }
                    break;
                case "browse_up":
                    if(currReply > 0) {
                        await setThread(currThread, currReply-1);
                    }
                    break;
                case "browse_down":
                    if(!replies || currReply < replies.length) {
                        await setThread(currThread, currReply+1);
                    }
                    break;
                default:
                    break;
            }

            // update the post
            await i.update({
                embeds: [embed],
                components: [new MessageActionRow().addComponents(
                    back,up,down,next
                )]
            });
        });

        collect.on("end", async () => {
            embed.setFooter(STRINGS["browse_time_limit"]);
            await ctx.edit({
                embeds: [embed],
                components: []
            });
        });
    },

    "config": async(ctx, lib) => {
        // check if we're on a server
        if(!ctx.isServer) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["config_notserver"])
                .setDescription(STRINGS["config_notserver_desc"]);
            return await ctx.reply(embed, !ctx.isDM);
        }

        // check if the sender is an admin
        if(!ctx.server.member.permissions.has("MANAGE_GUILD")) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["config_notadmin"])
                .setDescription(STRINGS["config_notadmin_desc"]);
            return await ctx.reply(embed, true);
        }

        // get property and action to change
        await ctx.defer();
        let prop = ctx.options.getSubcommandGroup(true);
        let action = ctx.options.getSubcommand(true);

        switch(prop) {
            case "default_board":
                if(action === "set") {
                    // get board name and validate it
                    let board  = chan.getBoardName(ctx.options.getString("board", true));
                    let exists = await chan.validateBoard(board);
                    
                    if(!exists) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["random_noboard"])
                            .setDescription(format(STRINGS["random_noboard_desc"], board));
                        await ctx.edit(embed);
                        return;
                    }

                    // set the board and alert the user
                    try {
                        await lib.config.setDefaultBoard(board);
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["config_changed"])
                            .setDescription(format(STRINGS["config_default_board_set"], lib.config.getDefaultBoard()));
                        await ctx.edit(embed);
                    } catch(e) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_error"])
                            .setDescription(format(STRINGS["config_unknown_error_desc"], e));
                        await ctx.edit(embed);
                        return;
                    }
                } else if(action === "reset") {
                    // reset the config and alert user
                    try {
                        await lib.config.setDefaultBoard(null);
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["config_cleared"])
                            .setDescription(format(STRINGS["config_default_board_clear"], lib.config.getDefaultBoard()));
                        await ctx.edit(embed);
                    } catch(e) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_error"])
                            .setDescription(format(STRINGS["config_unknown_error_desc"], e));
                        await ctx.edit(embed);
                        return;
                    }
                } else if(action === "get") {
                    // send embed
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_NORMAL)
                        .setTitle(STRINGS["config_default_board_title"])
                        .setDescription(format(STRINGS["config_default_board_description"], lib.config.getDisplayValue("default_board", STRINGS)));
                    await ctx.edit(embed);
                }
                break;
            case "removal_time":
                if(action === "set") {
                    // get new number of seconds
                    let seconds = ctx.options.getInteger("seconds", true);

                    // validate user input
                    if(seconds !== 0 && (seconds < 10 || seconds > 300)) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_invalid"])
                            .setDescription(format(STRINGS["config_removal_time_invalid"], seconds));
                        return await ctx.edit(embed);
                    }

                    // -1 denotes that removal is disabled
                    if(seconds === 0) {
                        seconds = -1;
                    }

                    // set the board and alert the user
                    try {
                        await lib.config.setRemovalTime(seconds);
                        let desc = seconds == -1
                            ? STRINGS["config_removal_time_disabled"]
                            : format(STRINGS["config_removal_time_set"], lib.config.getRemovalTime());
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["config_changed"])
                            .setDescription(desc);
                        await ctx.edit(embed);
                    } catch(e) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_error"])
                            .setDescription(format(STRINGS["config_unknown_error_desc"], e));
                        await ctx.edit(embed);
                        return;
                    }
                } else if(action === "reset") {
                    // reset the config and alert user
                    try {
                        await lib.config.setRemovalTime(null);
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["config_cleared"])
                            .setDescription(format(STRINGS["config_removal_time_clear"], lib.config.getRemovalTime()));
                        await ctx.edit(embed);
                    } catch(e) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_error"])
                            .setDescription(format(STRINGS["config_unknown_error_desc"], e));
                        await ctx.edit(embed);
                        return;
                    }
                } else if(action === "get") {
                    // send embed
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_NORMAL)
                        .setTitle(STRINGS["config_removal_time_title"])
                        .setDescription(format(STRINGS["config_removal_time_description"], lib.config.getDisplayValue("removal_time", STRINGS)));
                    await ctx.edit(embed);
                }
                break;
            case "allowed_channels":
                if(action === "toggle") {
                    // get the selected channel
                    let selectedChannel = ctx.options.getChannel("channel", true) as GuildChannel;
                    let channels: TextChannel[] = [];

                    // validate the channel and get a list of selected channels
                    if(selectedChannel.type === "GUILD_TEXT") {
                        // add the channel as a text channel
                        channels.push(selectedChannel as TextChannel);
                    } else if(selectedChannel.type === "GUILD_CATEGORY") {
                        // add all text channels in the category
                        let category = selectedChannel as CategoryChannel;
                        channels.push(
                            ...category.children
                                .filter(c => c.type === "GUILD_TEXT")
                                .map(c => c as TextChannel)
                        );
                    } else {
                        // invalid channel type, show error
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_restricted_channels_invalid"])
                            .setDescription(format(STRINGS["config_restricted_channels_invalid_desc"], ChannelTypeNames[selectedChannel.type].toLowerCase()));
                        return await ctx.edit(embed);
                    }

                    // if channel list is empty, then the category had no valid channels
                    if(channels.length < 1) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_restricted_channels_invalid"])
                            .setDescription(format(STRINGS["config_restricted_channels_invalid_category"], selectedChannel.name));
                        return await ctx.edit(embed);
                    }

                    // toggle each channel in the config and sort them into each array
                    const [wasAllowed, wasDisallowed] = await partitionArray(channels, async (c) => {
                        return await lib.config.toggleChannel(c);
                    });

                    // convert lists to human-readable text
                    let channelListString = "";
                    if(wasAllowed.length > 0) {
                        let allowedString = wasAllowed.map(c => `#${c.name}`).join("\n");
                        channelListString += format(STRINGS["config_restricted_channels_toggle_true"], allowedString, STRINGS["plural_" + (wasAllowed.length > 1)]);
                    }
                    if(wasDisallowed.length > 0) {
                        if(channelListString.length > 0) channelListString += "\n";
                        let disallowedString = wasDisallowed.map(c => `#${c.name}`).join("\n");
                        channelListString += format(STRINGS["config_restricted_channels_toggle_false"], disallowedString, STRINGS["plural_" + (wasDisallowed.length > 1)]);
                    }

                    // create embed and reply
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_SUCCESS)
                        .setTitle(STRINGS["config_changed"])
                        .setDescription(channelListString);
                    await ctx.edit(embed);

                } else if(action === "reset") {
                    // reset the config and alert user
                    try {
                        await lib.config.clearAllowedChannels();
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_SUCCESS)
                            .setTitle(STRINGS["config_cleared"])
                            .setDescription(STRINGS["config_restricted_channels_reset"]);
                        await ctx.edit(embed);
                    } catch(e) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_unknown_error"])
                            .setDescription(format(STRINGS["config_unknown_error_desc"], e));
                        await ctx.edit(embed);
                        return;
                    }
                } else if(action === "get") {
                    // send embed
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_NORMAL)
                        .setTitle(STRINGS["config_restricted_channels_title"])
                        .setDescription(lib.config.getDisplayValue("allowed_channels", STRINGS, ctx.server.guild));
                    await ctx.edit(embed);
                }
                break;
            case "subscribe":
                if(action === "set") {
                    // validate the channel
                    let channel = ctx.options.getChannel("channel", true);
                    if(channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS") {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_subscribe_invalid_channel"])
                            .setDescription(format(STRINGS["config_subscrive_invalid_channel_desc"], ChannelTypeNames[channel.type]));
                        return await ctx.edit(embed);
                    }

                    // validate the interval
                    let interval = ctx.options.getInteger("time", true);
                    if(interval < 1 || interval > 10080) {
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_subscribe_invalid_interval"])
                            .setDescription(STRINGS["config_subscribe_invalid_interval_desc"]);
                        return await ctx.edit(embed);
                    }

                    // validate the board
                    let board = ctx.options.getString("board");
                    let defaultBoard = true;
                    if(board) {
                        board = chan.getBoardName(board);
                        defaultBoard = false;
                    } else {
                        board = lib.config.getDefaultBoard();
                    }

                    // validate the board and ensure the nsfw status matches
                    const [ exists, nsfw ] = await chan.validateBoard(board);
                    if(!exists) {
                        // the board does not exist
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_subscribe_invalid_board"])
                            .setDescription(format(STRINGS["random_noboard_desc"], board));
                        return await ctx.edit(embed);
                    } else if(nsfw && !(channel as TextChannel | NewsChannel).nsfw) {
                        // the board is nsfw but the target channel is not nsfw
                        let embed = new MessageEmbed()
                            .setColor(EMBED_COLOR_ERROR)
                            .setTitle(STRINGS["config_subscribe_invalid_channel"])
                            .setDescription(format(STRINGS["config_subscribe_invalid_channel_nsfw"], board));
                        return await ctx.edit(embed);
                    }

                    // update the subscription
                    await lib.config.setSubscriptionData(channel, interval, defaultBoard ? null : board);
                    lib.subscribed.addSubscription(ctx.server.id, lib.config.getSubscription());

                    // notify the user
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_SUCCESS)
                        .setTitle(STRINGS["config_subscribe_done"])
                        .setDescription(format(STRINGS["config_subscribe_done_desc"], board));
                    if(defaultBoard) {
                        embed.addField(STRINGS["config_subscribe_note"], STRINGS["config_subscribe_note_desc"]);
                    }
                    await ctx.edit(embed);
                } else if(action === "get") {
                    // create embed from data
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_NORMAL)
                        .setTitle(STRINGS["config_subscribe_title"])
                        .setDescription(STRINGS["config_subscribe_desc"]);
                    let data = lib.config.getSubscription();
                    if(data) {
                        // add channel field to the embed
                        embed.addField(STRINGS["config_subscribe_channel"], format(STRINGS["config_subscribe_channel_value"], data.getChannel()), true);

                        // get correct display interval
                        let mins = data.getInterval();
                        let displayInterval = "";
                        if(mins > 60) {
                            // calculate hours and mins in hour
                            let hrs = Math.floor(mins / 60);
                            mins %= 60;

                            // generate format string
                            displayInterval = format(STRINGS["config_subscribe_interval_value_hr"], hrs, STRINGS["plural_" + (hrs > 1)]) + " ";
                        }
                        if(mins > 0) {
                            displayInterval += format(STRINGS["config_subscribe_interval_value_min"], mins, STRINGS["plural_" + (mins > 1)]);
                        }
                        embed.addField(STRINGS["config_subscribe_interval"], displayInterval.toLowerCase(), true);

                        // get correct display for board value
                        let board: string;
                        if(data.getBoard()) {
                            board = format(STRINGS["config_subscribe_board_value"], data.getBoard());
                        } else {
                            board = format(STRINGS["config_help_default"], format(STRINGS["config_subscribe_board_value"], lib.config.getDefaultBoard()));
                        }
                        embed.addField(STRINGS["config_subscribe_board"], board, true);
                    } else {
                        // tell user it is not set
                        embed.addField(STRINGS["config_subscribe_notset"], STRINGS["config_subscribe_toset"]);
                    }

                    await ctx.edit(embed);
                } else if(action === "reset") {
                    // reset the subscription
                    let channelId = lib.config.getSubscription().getChannel();
                    await lib.config.clearSubscriptionData();
                    lib.subscribed.removeSubscription(ctx.server.id);

                    // send embed
                    let embed = new MessageEmbed()
                        .setColor(EMBED_COLOR_SUCCESS)
                        .setTitle(STRINGS["config_cleared"])
                        .setDescription(format(STRINGS["config_subscribe_reset"], channelId));
                    await ctx.edit(embed);
                }
                break;
            default:
                break;
        }
    }

};

/**
 * Sends a 4chan post to the given context as a formatted embed
 */
async function sendPost(post: chan.ChanPost, ctx: CommandContext, lib: Libs): Promise<void> {
    let postText = chan.processPostText(post);

    // create basic embed
    let embed = new MessageEmbed()
        .setColor(EMBED_COLOR_NORMAL)
        .setTitle(format(STRINGS["post_title"], post.id, post.author))
        .setDescription(format(STRINGS["post_desc"], postText, post.permalink))
        .setImage(post.image)
        .addField(STRINGS["post_submitted"], post.timestamp);
    let data: WebhookEditMessageOptions = { embeds: [embed] };

    // add removal instructions and buttons on a server
    let removalEnabled = ctx.isServer && lib.config.getRemovalTime() > 0;
    if(removalEnabled) {
        data.components = [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setCustomId("post_remove")
                    .setStyle(4)
                    .setLabel(STRINGS["post_remove"])
            )
        ];
    }

    let message = await ctx.edit(data);
    
    // if we're on a server, create a button collector for removal
    if(removalEnabled) {
        // determine removal time from config
        let removal_time = lib.config.getRemovalTime();

        // create collector for button presses
        const filter  = (i: ButtonInteraction) => i.customId === "post_remove";
        const collect = ctx.channel.createMessageComponentCollector({ filter, message, time: removal_time * 1000 });

        collect.on("collect", async (btn) => {
            // check the user clicking the button is the sender
            let channel = btn.channel as GuildChannel;
            let isAdmin = (btn.member as GuildMember).permissionsIn(channel).has("MANAGE_MESSAGES");
            if(btn.user.id !== ctx.user.id && !isAdmin) {
                await btn.reply({ embeds: [
                    new MessageEmbed()
                        .setColor(EMBED_COLOR_ERROR)
                        .setTitle(STRINGS["post_remove_notop"])
                        .setDescription(STRINGS["post_remove_notop_desc"])
                ], ephemeral: true });
                return;
            }

            // edit the embed and remove the buttons
            let remover = btn.user.id === ctx.user.id ? "op" : "admin";
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["post_removal_confirm"])
                .setDescription(format(STRINGS["post_removal_desc"], STRINGS["post_removal_" + remover]));
            data.embeds = [embed];
            data.components = [];
            await btn.update(data);
            collect.stop();
        });

        collect.on("end", async () => {
            // remove button on expiry
            data.components = [];
            if(message instanceof Message) {
                await message.edit(data);
            }
        });
    }
}

function createButton(id: string, emoji: string, red = false): MessageButton {
    return new MessageButton()
        .setCustomId(id)
        .setEmoji(emoji)
        .setStyle(red ? 4 : 1);
}

export default {

    // executes a command from the given context
    execute: async (ctx: CommandContext, stats: Stats, subscribed: SubscriptionService) => {
        let dev = process.argv.includes("-dev");
        let cfg = await config.forServer(ctx.isServer ? ctx.server.id : null);
        try {
            // if channel isn't allowed, respond with error
            if(!cfg.isChannelValid(ctx.channel.id)) {
                let embed = new MessageEmbed()
                    .setColor(EMBED_COLOR_ERROR)
                    .setTitle(STRINGS["restricted_channel"])
                    .setDescription(cfg.getDisplayValue("allowed_channels", STRINGS, ctx.server.guild));
                return await ctx.reply(embed, true);
            }

            // find the command
            if(COMMANDS[ctx.name]) {
                // run it
                await COMMANDS[ctx.name](ctx, { stats, dev, config: cfg, subscribed });
                // if it succeeded, increase the stats
                stats.servedRequest(ctx);
            }
        } catch(e) {
            // if in dev environment, print the error
            if(dev) console.error(e);
            // notify the user that something went wrong
            let embed = new MessageEmbed()
                .setTitle("Error running command!")
                .setDescription(format(STRINGS["random_error_desc"], e))
                .setColor(EMBED_COLOR_ERROR);
            if(ctx.command.replied || ctx.command.deferred) await ctx.edit(embed);
            else await ctx.reply(embed);
        }
    },

    // shows a message informing users that non-slash
    // commands are no longer supported
    warning: async (msg: Message) => {
        if(msg.author.bot) return;
        // create embed if prefix is used
        if(await startsWithPrefix(msg)) {
            let embed = new MessageEmbed()
                .setTitle("Slash commands required!")
                .setDescription("This bot has migrated to slash commands!\nType `/4chan help` for a list of commands.")
                .setColor(EMBED_COLOR_ERROR);
            let button = new MessageButton()
                .setStyle("LINK")
                .setLabel("Learn More")
                .setURL("https://github.com/Romejanic/4chan-Discord-Bot/blob/master/SLASH-COMMANDS.md");
                await msg.channel.send({ embeds: [embed], components: [new MessageActionRow().addComponents(button)] });
        }
    }

};

async function startsWithPrefix(msg: Message) {
    // if it's a dm channel, always return true
    if(msg.channel.type === "DM") return true;

    // check if prefix matches
    let prefix = (await config.forServer(msg.guild ? msg.guild.id : null)).getPrefix();
    return msg.content.startsWith(prefix);
}

async function partitionArray<T>(arr: T[], predicate: (x: T) => Promise<boolean>): Promise<[T[],T[]]> {
    let yes: T[] = [];
    let no: T[] = [];
    for(let v of arr) {
        if(await predicate(v)) yes.push(v);
        else no.push(v);
    }
    return [yes,no];
}

// declare command handlers helper type
type Libs = {
    dev: boolean,
    stats: Stats,
    config: config.ServerConfig,
    subscribed: SubscriptionService
};
type CommandHandlers = {
    [name: string]: (ctx: CommandContext, lib?: Libs) => Promise<any>
};