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
                        removal_time: undefined
                    });
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
    }

};