const fs = require("fs");
const configs = {};

// load the global config file
if(!configs.globalConfig) {
    if(!fs.existsSync("config.json")) {
        console.log("[Config] No global config! Copying the template...");
        fs.copyFileSync("data/config_default.json", "config.json", fs.constants.COPYFILE_EXCL);
        console.log("!!! PLEASE READ !!!");
        console.log("The default config has been copied to config.json in the bot main directory.");
        console.log("Please edit it and add your bot token and database login before running the bot again.");
        process.exit(0);
    } else {
        console.log("[Config] Reading global config from file");
        configs.globalConfig = require("../../config.json");
    }
}

// per-server config class
class ServerConfig {

    id;
    db;

    // config options
    default_board = undefined;
    prefix = undefined;
    restricted_channels = undefined;
    removal_time = undefined;

    constructor(id, db) {
        this.id = id;
        this.db = db;
        if(db) this.#fetchConfig();
    }

    #fetchConfig() {
        // TODO: fetch from database
        console.log("fetching config for " + this.id);
    }

    #saveConfig() {
        if(!db) return;
        // TODO: save changes to database
    }

    getDefaultBoard() {
        if(this.default_board) {
            return this.default_board;
        }   
        return configs.globalConfig.default_board;
    }

    getPrefix() {
        return this.prefix ? this.prefix : configs.globalConfig.prefix;
    }

    isChannelValid(id) {
        let channels = this.#getRestrictedChannels();
        if(!channels) {
            return true;
        }
        return channels.indexOf(id) > -1;
    }

    #getRestrictedChannels() {
        return this.restricted_channels ? this.restricted_channels : undefined;
    }

    getRemovalTime() {
        return this.removal_time ? this.removal_time : configs.globalConfig.removal_default_timeout;
    }

}
configs.servers = {};

// Export the relevant objects/methods
module.exports = {

    global: configs.globalConfig,
    forServer: (id, db) => {
        if(!configs.servers[id]) {
            configs.servers[id] = new ServerConfig(id, db);
        }
        return configs.servers[id];
    }

};