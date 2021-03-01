const { RichEmbed } = require("discord.js");
const STRINGS = require("../strings.json");

// constants
const EMBED_COLOR_SUCCESS = "#FED7B0";
const EMBED_COLOR_ERROR   = "#FF0000";
const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";
const AVATAR_URL_DEV  = "https://cdn.discordapp.com/avatars/763736231812399115/6bbef49611cc60cb295ccceba74095ea.png?size=256";

// command handlers
const COMMANDS = {

    "info": async (args, lib, ctx) => {
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
    }

};

//-----------------------------------------------------------------------------//

let lib = null;

function getCommandContext(msg, config) {
    let ctx = {
        // is the current message in a server text channel?
        isServer: msg.member != null && msg.member != undefined,
        // is the user that sent the message a bot author?
        isBotDev: config.global.editor_usernames.indexOf(msg.author.tag) > -1,
        // other general values
        channel: msg.channel,
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
        ctx.config = lib.config.forServer(ctx.isServer ? ctx.server.id : null, ctx.isServer ? lib.db : null);
        // check if prefix matches
        if(!msg.content.startsWith(ctx.config.getPrefix())) {
            return;
        }
        // find the matching command
        let args = msg.content.trim().split(" ");
        let cmdName = args[1].toLowerCase();
        if(COMMANDS[cmdName]) {
            // run command with arguments and context
            await COMMANDS[cmdName](args.splice(1), lib, Object.freeze(ctx));
        } else {
            // TODO: format properly with embed
            msg.channel.send("command not found!");
        }
    },

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