import {
    ButtonInteraction, EmbedFieldData, GuildChannel,
    GuildMember, Message, MessageActionRow, MessageButton,
    MessageEmbed, WebhookEditMessageOptions
} from "discord.js";
import { CommandContext } from "discord.js-slasher";
import * as config from './lib/config';
import format from './lib/str-format';
import Stats from "./stats";
import * as chan from './lib/4chan-api';

// load strings
const STRINGS: { [key: string]: string } = require("../strings.json");

// define commonly used constants
const EMBED_COLOR_NORMAL = "#FED7B0";
const EMBED_COLOR_ERROR   = "#FF0000";
const EMBED_COLOR_SUCCESS = "#00FF00";
const EMBED_COLOR_LOADING = "#BBBBBB";
const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";
const AVATAR_URL_DEV = "https://cdn.discordapp.com/avatars/763736231812399115/6bbef49611cc60cb295ccceba74095ea.png?size=256";
const CMD_HELP_IMAGE = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=64";
const CMD_HELP_URL = "https://github.com/Romejanic/4chan-Discord-Bot/blob/master/COMMANDS.md";

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
        let exists = await chan.validateBoard(board);
        if(!exists) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            await ctx.edit(embed);
            return;
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
        }

    },

    "post": async(ctx, lib) => {
        await ctx.defer();

        // resolve board
        let board  = chan.getBoardName(ctx.options.getString("board", true));
        let exists = await chan.validateBoard(board);

        // validate the board
        if(!exists) {
            let embed = new MessageEmbed()
                .setColor(EMBED_COLOR_ERROR)
                .setTitle(STRINGS["random_noboard"])
                .setDescription(format(STRINGS["random_noboard_desc"], board));
            await ctx.edit(embed);
            return;
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
    }

};

/**
 * Sends a 4chan post to the given context as a formatted embed
 */
async function sendPost(post: chan.ChanPost, ctx: CommandContext, lib: Libs): Promise<void> {
    // preprocess the text a little bit
    let postText = unescape(post.text.length > 2000 ? post.text.substring(0, 2000) + "..." : post.text);
    postText = postText.replace(/<br>/gi, "\n");
    postText = postText.replace("</span>", "");
    postText = postText.replace("<span class=\"quote\">", "");
        
    // create basic embed
    let embed = new MessageEmbed()
        .setColor(EMBED_COLOR_NORMAL)
        .setTitle(format(STRINGS["post_title"], post.id, post.author))
        .setDescription(format(STRINGS["post_desc"], postText, post.permalink))
        .setImage(post.image)
        .addField(STRINGS["post_submitted"], post.timestamp);
    let data: WebhookEditMessageOptions = { embeds: [embed] };

    // add removal instructions and buttons on a server
    if(ctx.isServer) {
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
    if(ctx.isServer) {
        // determine removal time from config
        let removal_time = lib.config.getRemovalTime();

        // create collector for button presses
        const filter  = (i: ButtonInteraction) => i.customId === "post_remove";
        const collect = ctx.channel.createMessageComponentCollector({ filter, message, time: removal_time * 1000 });

        collect.on("collect", async (btn) => {
            // check the user clicking the button is the sender
            let channel = btn.channel as GuildChannel;
            let isAdmin = (btn.member as GuildMember).permissionsIn(channel).has("ADMINISTRATOR");
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

export default {

    // executes a command from the given context
    execute: async (ctx: CommandContext, stats: Stats) => {
        let dev = process.argv.includes("-dev");
        try {
            // find the command
            if(COMMANDS[ctx.name]) {
                // run it
                let cfg = await config.forServer(ctx.isServer ? ctx.server.id : null)
                await COMMANDS[ctx.name](ctx, { stats, dev, config: cfg });
                // if it succeeded, increase the stats
                stats.servedRequest(ctx);
            }
        } catch(e) {
            // if in dev environment, print the error
            if(dev) console.error(e);
            // notify the user that something went wrong
            let embed = new MessageEmbed()
                .setTitle("Error running command!")
                .setDescription("An error occurred while running this command!\nPlease [contact the developer](https://github.com/Romejanic/4chan-Discord-Bot/issues/new/) and send this code:\n```\n" + e + "\n```")
                .setColor(EMBED_COLOR_ERROR);
            if(ctx.command.replied) await ctx.edit(embed);
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
            await msg.channel.send({ embeds: [embed] });
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

// declare command handlers helper type
type Libs = {
    dev: boolean,
    stats: Stats,
    config: config.ServerConfig
};
type CommandHandlers = {
    [name: string]: (ctx: CommandContext, lib?: Libs) => Promise<any>
};