const mysql = require("mysql");
const auth = require("../../config.json").db;

const pool = mysql.createPool({
    user: auth.user,
    password: auth.pass,
    host: auth.host,
    port: auth.port,
    database: auth.database,
    connectionLimit: 15
});

pool.on("error", (err) => {
    console.error("[DB] Unexpected database error!\n" + err);
});

module.exports = {

    getConfigForServer: (id) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT default_board,prefix,restricted,removal_time FROM server_config WHERE id = ?", [ id ], (err, result) => {
                if(err) reject(err);
                if(result.length <= 0) {
                    resolve({
                        // send default config if not in database
                        default_board: undefined,
                        prefix: undefined,
                        restricted: false,
                        removal_time: undefined,
                        new_config: true
                    }, false);
                } else {
                    resolve(result[0]);
                }
            });
        });
    },

    getRestrictedChannels: (id) => {
        return new Promise((resolve, reject) => {
            pool.query("SELECT channel FROM server_allowed_channels WHERE server = ?", [ id ], (err, result) => {
                if(err) reject(err);
                let channelIds = result.map(r => r.channel);
                resolve(channelIds);
            });
        });
    },

    createConfigForServer: (id) => {
        return new Promise((resolve, reject) => {
            pool.query("INSERT INTO server_config (id,restricted) VALUES (?, 0)", [ id ], (err) => {
                if(err) reject(err);
                resolve();
            });
        });
    },

    editServerConfig: (id, key, value) => {
        return new Promise((resolve, reject) => {
            pool.query(`UPDATE server_config SET ${key} = ? WHERE id = ?`, [ value, id ], (err) => {
                if(err) reject(err);
                resolve();
            });
        });
    },

    clearAllowedChannels: (id) => {
        return new Promise((resolve, reject) => {
            pool.query("DELETE FROM server_allowed_channels WHERE server = ?", [ id ], (err) => {
                if(err) reject(err);
                resolve();
            });
        });
    },

    setChannelAllowed: (id, channel, allowed) => {
        return new Promise((resolve, reject) => {
            let sql = allowed ? "INSERT INTO server_allowed_channels (server, channel) VALUES (?,?)"
                              : "DELETE FROM server_allowed_channels WHERE server = ? AND channel = ?";
            pool.query(sql, [ id, channel ], (err) => {
                if(err) reject(err);
                resolve();
            });
        });
    }

};