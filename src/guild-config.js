const fs = require("fs");

const configFile = "guild-config.json";

const GuildConfig = {
    config: {},
    loading: false,
    canSave: true,

    load: function() {
        fs.exists(configFile, (exists) => {
            if(exists) {
                this.loading = true;
                fs.readFile(configFile, (err, data) => {
                    if(err) {
                        console.error("[GuildConfig] Failed to read config file! Saving has been disabled to prevent data loss.\n", err);
                        this.canSave = false;
                        return;
                    }
                    let json = data.toString();
                    this.config = JSON.parse(json);
                    this.loading = false;
                });
            }
        });
    },
    save: function() {
        if(!this.canSave) {
            return;
        }
        let json = JSON.stringify(this.config);
        fs.writeFile(configFile, json, (err) => {
            if(err) {
                console.error("[GuildConfig] Failed to save config to file!\n", err);
            }
        });
    },

    getConfigForGuild: function(guild) {
        if(this.loading) {
            return {};
        } else {
            if(!this.config[guild]) {
                this.config[guild] = {};
                this.save();
            }
            return this.config[guild];
        }
    }
};

module.exports = GuildConfig;