import {
    ButtonInteraction, EmbedFieldData, Message,
    MessageActionRow, MessageButton, MessageEmbed,
    WebhookEditMessageOptions
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
                let dev = process.argv.includes("-dev");
                let version = require("../package.json").version;
                let { heapUsed, heapTotal } = process.memoryUsage();
                embed.setTitle(STRINGS["info_title"])
                    .setDescription(STRINGS["info_desc"])
                    .setFooter(STRINGS["info_footer"])
                    .setThumbnail(!dev ? AVATAR_URL : AVATAR_URL_DEV)
                    .addField(STRINGS["info_version"], version, true)
                    .addField(STRINGS["info_build_type"], STRINGS["info_dev_build_" + dev], true)
                    .addField(STRINGS["info_used_in"], format(STRINGS["info_servers"], ctx.client.guilds.cache.size), true)
                    .addField(STRINGS["info_node"], process.version, true)
                    .addField(STRINGS["info_os"], process.platform, true)
                    .addField(STRINGS["info_memory"], (100 * heapUsed / heapTotal).toFixed(1) + "%", true)
                    .addField(STRINGS["info_stats_total"], lib.stats.totalServed.toLocaleString(), true)
                    .addField(STRINGS["info_stats_daily"], lib.stats.getDailyAverage().toLocaleString(), true)
                    .addField(STRINGS["info_stats_today"], (lib.stats.todayServed+1).toLocaleString(), true);
                break;
            case "help":
                embed.setTitle(STRINGS["help_title"])
                    .setFooter(STRINGS["help_footer"])
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
        let boards = await chan.getBoards();
        let names = Object.keys(boards);

        // create embed and buttons
        let embed = new MessageEmbed()
            .setColor(EMBED_COLOR_NORMAL)
            .setTitle(STRINGS["boards_title"]);
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
        let pages = Math.floor(names.length / boardsPerPage);

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
    }

};

export default {

    // executes a command from the given context
    execute: async (ctx: CommandContext, stats: Stats) => {
        try {
            // find the command
            if(COMMANDS[ctx.name]) {
                // run it
                await COMMANDS[ctx.name](ctx, { stats });
                // if it succeeded, increase the stats
                stats.servedRequest();
            }
        } catch(e) {
            let embed = new MessageEmbed()
                .setTitle("Error running command!")
                .setDescription("An error occurred while running this command!\nPlease [contact the developer](https://github.com/Romejanic/4chan-Discord-Bot/issues/new/) and send this code:\n```\n" + e + "\n```")
                .setColor(EMBED_COLOR_ERROR);
            await ctx.reply(embed);
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
    stats: Stats
};
type CommandHandlers = {
    [name: string]: (ctx: CommandContext, lib?: Libs) => Promise<any>
};