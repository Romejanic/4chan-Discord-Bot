/**
 * Just fyi this might be some of the dodgiest code i've ever written
 * But its intended for a one-time database conversion so it doesn't matter too much
 */

const mysql = require("mysql");
const fs = require("fs");

// check the config file actually exists
if(!fs.existsSync("guild-config.json")) {
    console.log("No existing guild config file! Cancelling...");
    process.exit(1);
}

// check if database credentials exist
if(!fs.existsSync("config.json")) {
    console.log("No existing config file with database login! Cancelling...");
    process.exit(2);
}

let config = require("../config.json");
if(!config.db) {
    console.log("No existing config file with database login! Cancelling...");
    process.exit(2);
}
config = config.db;

// open mysql connection
let conn = mysql.createConnection({
    user: config.user,
    password: config.pass,
    host: config.host,
    port: config.port,
    database: config.database
});

conn.on("error", (err) => {
    console.error("Database connection error! " + err);
    process.exit(3);
});

console.log("Created database connection. Starting conversion process...");

// Conversion
(async function convert() {
    const guildConfig = require("../guild-config.json");
    for(let serverid in guildConfig) {
        process.stdout.write("Checking " + serverid + "... ");
        // skip if there are no config keys
        let config = guildConfig[serverid];
        if(Object.keys(config).length <= 0) {
            console.log("empty, skipped");
        } else {
            await commitToDatabase(config, serverid);
        }
    }
})().then(() => {
    console.log("\nDatabase conversion complete!");
    process.exit(0);
}).catch((err) => {
    console.error("Error while converting! Cancelling...", err);
    process.exit(3);
});

function commitToDatabase(config, id) {
    return new Promise((resolve, reject) => {
        let {
            prefix,
            default_board,
            removal_time,
            allowedChannels
        } = config;
        // determine which columns need to be inserted
        let values = [
            id,
            default_board ? default_board : null,
            prefix ? prefix : null,
            allowedChannels ? true : false,
            removal_time ? removal_time : null
        ];
        conn.query("INSERT INTO server_config (id,default_board,prefix,restricted,removal_time) VALUES (?,?,?,?,?)", values, async (err) => {
            if(err) reject(err);
            if(allowedChannels) {
                function addAllowedChannel(channel) {
                    return new Promise((resolve,reject) => {
                        conn.query("INSERT INTO server_allowed_channels (server,channel) VALUES (?,?)", [id,channel], (err) => {
                            if(err) reject(err);
                            resolve();
                        });
                    });
                }
                for(let channel of allowedChannels) {
                    await addAllowedChannel(channel);
                }
            }
            resolve();
            console.log("Done");
        });
    });
}