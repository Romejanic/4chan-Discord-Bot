const COMMANDS = {

    "info": async (args, lib, ctx) => {

    }

};

//-----------------------------------------------------------------------------//

let lib = null;

function getCommandContext(msg, config) {
    let ctx = {
        // is the current message in a server text channel?
        isServer: msg.member != null && msg.member != undefined,
        // is the user that sent the message a bot author?
        isBotDev: config.global.editor_usernames.indexOf(msg.author.tag) > -1
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

    initLib: (config, db) => {
        lib = {
            config, db
        };
    },

    parse: async function(msg) {
        let ctx = getCommandContext(msg, lib.config);
        console.log(ctx);
    },

};