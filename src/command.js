
function parseCommand(message, prefix) {
    if(message.content.substring(0, prefix.length).toLowerCase() === prefix.toLowerCase()) {
        let commandText = message.content.substring(prefix.length).trim();
        message.reply("'" + commandText + "'");
    }
}

module.exports = {
    parse: parseCommand
};