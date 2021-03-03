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
    }

    async fetch() {
        let config = await this.db.getConfigForServer(this.id);
        // copy config keys into class
        this.default_board = config.default_board;
        this.prefix = config.prefix;
        this.removal_time = config.removal_time;
        // get list of restricted channels
        if(config.restricted) {
            this.restricted_channels = await this.db.getRestrictedChannels(this.id);
        } else {
            this.restricted_channels = undefined;
        }
    }

    #commit(key, value) {
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

    getDisplayValue(option, strings) {
        const formatDefault = (val, original) => original ? val : strings["config_help_default"].format(val);
        switch(option) {
            case "default_board":
                return formatDefault(`/${this.getDefaultBoard()}/`, this.default_board ? `/${this.default_board}/` : null);
            case "prefix":
                return formatDefault(this.getPrefix(), this.prefix);
            case "removal_time":
                return formatDefault(this.getRemovalTime(), this.removal_time);
            case "allowed_channels":
                if(!this.restricted_channels || this.restricted_channels.length <= 0) {
                    return formatDefault(strings["config_restricted_channels_all"], null);
                } else {
                    return strings["config_restricted_channels_count"].format(this.restricted_channels.length);
                }
            default:
                return "??";
        }
    }

}
configs.servers = {};

// Export the relevant objects/methods
module.exports = {

    global: configs.globalConfig,
    forServer: async (id, db) => {
        if(!configs.servers[id]) {
            configs.servers[id] = new ServerConfig(id, db);
            if(id) {
                await configs.servers[id].fetch();
            }
        }
        return configs.servers[id];
    },
    clearServers: async () => {
        configs.servers = {};
    }

};