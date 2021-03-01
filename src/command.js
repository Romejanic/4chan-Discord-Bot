const COMMANDS = {

    "info": async (args, lib, ctx) => {

    }

};

//-----------------------------------------------------------------------------//

let lib = null;

function getCommandContext(msg, config) {
    console.log(msg.member, typeof msg.member);
    let ctx = {
        isServer: typeof msg.member !== "undefined",
        isBotDev: config.global.editor_usernames.indexOf(msg.author.tag) > -1
    };
    ctx.isDM = !ctx.isServer;
    if(ctx.isServer) {
        ctx.server = {
            id: msg.guild.id,
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