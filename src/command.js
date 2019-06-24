const strings = require("../strings.json");
const commands = {};

function parseCommand(message, prefix) {
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
        message.reply("you called for help!");
    };
    // debug
    commands["debug"] = (message, args) => {
        let authorUsername = `${message.author.username}#${message.author.discriminator}`;
        if(authorUsername !== config.editor_username) {
            message.channel.send(strings["editor_required"]);
        }
        message.reply(args.join(" "));
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