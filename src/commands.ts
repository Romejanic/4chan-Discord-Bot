import { Message, MessageEmbed } from "discord.js";
import { CommandContext } from "discord.js-slasher";
import * as config from './lib/config';
import format from './lib/str-format';

// load strings
const STRINGS = require("../strings.json");

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

    "4chan": async (ctx) => {
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
                    .addField(STRINGS["info_memory"], (100 * heapUsed / heapTotal).toFixed(1) + "%", true);
                    // .addField(STRINGS["info_stats_total"], lib.stats.totalServed, true)
                    // .addField(STRINGS["info_stats_daily"], lib.stats.getDailyAverage(), true)
                    // .addField(STRINGS["info_stats_today"], lib.stats.todayServed, true);;
                break;
            case "help":
                embed.setTitle("Help");
                break;
            default:
                break;
        }

        await ctx.reply(embed);
    }

};

export default {

    // executes a command from the given context
    execute: async (ctx: CommandContext) => {
        try {
            if(COMMANDS[ctx.name]) {
                await COMMANDS[ctx.name](ctx);
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
type CommandHandlers = {
    [name: string]: (ctx: CommandContext) => Promise<any>
};