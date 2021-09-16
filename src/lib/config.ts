import { Channel, Guild } from 'discord.js';
import format from './str-format';
import * as fs from 'fs';
import * as db from './db';

// define configs type and structure
const configs: {
    globalConfig: any,
    servers: {
        [id: string]: ServerConfig
    }
} = {
    globalConfig: undefined,
    servers: {}
};

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
export class ServerConfig {

    private id: string;
    private requiresInsert = false;

    // config options
    private default_board: string = undefined;
    private prefix: string = undefined;
    private restricted_channels: string[] = undefined;
    private removal_time: number = undefined;

    constructor(id: string) {
        this.id = id;
    }

    async fetch() {
        let config = await db.getConfigForServer(this.id);
        // copy config keys into class
        this.default_board = config.default_board;
        this.prefix = config.prefix;
        this.removal_time = config.removal_time;
        this.requiresInsert = config.new_config || false;
        // get list of restricted channels
        if(config.restricted) {
            this.restricted_channels = await db.getRestrictedChannels(this.id);
        } else {
            this.restricted_channels = undefined;
        }
    }

    private async commit(key: string, value: any) {
        if(this.requiresInsert) {
            await db.createConfigForServer(this.id);
            this.requiresInsert = false;
        }
        await db.editServerConfig(this.id, key, value);
    }

    getDefaultBoard(): string {
        if(this.default_board) {
            return this.default_board;
        }   
        return configs.globalConfig.default_board;
    }

    getPrefix() {
        return this.prefix ? this.prefix : configs.globalConfig.prefix;
    }

    isChannelValid(id: string) {
        let channels = this.getAllowedChannels();
        if(!channels || channels.length <= 0) {
            return true;
        }
        return channels.indexOf(id) > -1;
    }

    getAllowedChannels() {
        return this.restricted_channels ? this.restricted_channels : undefined;
    }

    getAllowedChannelsText(guild) {
        return this.restricted_channels ? this.restricted_channels
            .map(c=>guild.channels.get(c)) // map channel ids to their objects
            .filter(c=>c != null)          // remove any that don't exist anymore
            .map(c=>`#${c.name}`)          // convert to names
            .join("\n") : "";
    }

    getRemovalTime(): number {
        if(this.removal_time === -1) return 0;
        return this.removal_time ? this.removal_time : configs.globalConfig.removal_default_timeout;
    }

    getDisplayValue(option: string, strings: any, guild?: Guild) {
        const formatDefault = (val, original) => original ? val : format(strings["config_help_default"], val);
        switch(option) {
            case "default_board":
                return formatDefault(`/${this.getDefaultBoard()}/`, this.default_board ? `/${this.default_board}/` : null);
            case "prefix":
                return formatDefault(this.getPrefix(), this.prefix);
            case "removal_time":
                return formatDefault(this.getRemovalTime(), this.removal_time);
            case "allowed_channels":
                if(!this.restricted_channels || this.restricted_channels.length <= 0) {
                    return formatDefault(strings["config_restricted_channels_desc_none"], null);
                } else {
                    let channels = this.restricted_channels
                        .map(id => guild.channels.resolve(id))
                        .map(c => `#${c.name}`)
                        .join("\n");
                    return format(strings["config_restricted_channels_desc_list"], channels);
                }
            default:
                return "??";
        }
    }

    async setDefaultBoard(board: string) {
        this.default_board = board;
        await this.commit("default_board", board);
    }

    async setPrefix(prefix: string) {
        this.prefix = prefix;
        await this.commit("prefix", prefix);
    }

    async setRemovalTime(time: number) {
        this.removal_time = time;
        await this.commit("removal_time", time);
    }

    async clearAllowedChannels() {
        this.restricted_channels = null;
        await db.clearAllowedChannels(this.id);
        await this.commit("restricted", false);
    }

    async toggleChannel(channel: Channel) {
        // should we add the channel?
        if(!this.restricted_channels || this.restricted_channels.indexOf(channel.id) < 0) {
            // update on database
            await db.setChannelAllowed(this.id, channel.id, true);
            // either push the value to array or create array
            if(this.restricted_channels) this.restricted_channels.push(channel.id);
            else {
                this.restricted_channels = [ channel.id ];
                await this.commit("restricted", true);
            }

            return true;
        }
        // should we remove the channel?
        else {
            // remove from array and database
            this.restricted_channels.splice(this.restricted_channels.indexOf(channel.id), 1);
            await db.setChannelAllowed(this.id, channel.id, false);
            // if channel list is empty, update database and clear variable
            if(this.restricted_channels.length <= 0) {
                this.restricted_channels = undefined;
                await this.commit("restricted", false);
            }

            return false;
        }
    }

}

// Export global config and methods for retrieving server config

export const global = configs.globalConfig;

export async function forServer(id: string) {
    if(!configs.servers[id]) {
        configs.servers[id] = new ServerConfig(id);
        if(id) {
            await configs.servers[id].fetch();
        }
    }
    return configs.servers[id];
};

export async function clearServers() {
    configs.servers = {};
};