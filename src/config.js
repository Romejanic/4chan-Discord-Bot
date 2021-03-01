const fs = require("fs");
const configs = {};

if(!configs.globalConfig) {
    if(!fs.existsSync("config.json")) {
        console.log("[Config] No global config! Copying the template...");
        fs.copyFileSync("data/config_default.json", "config.json", fs.constants.COPYFILE_EXCL);
        console.log("!!! PLEASE READ !!!");
        console.log("The default config has been copied to config.json in the bot main directory.");
        console.log("Please edit it and add your bot token, before running the bot again.");
        process.exit(0);
    } else {
        console.log("[Config] Reading global config from file");
        configs.globalConfig = require("../config.json");
    }
}

module.exports = {

    global: configs.globalConfig

};