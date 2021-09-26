import * as mysql from 'mysql';
import { SubscriptionList } from '../subscribed';
import { Subscription } from './config';

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

export type ServerConfigDb = {
    default_board: string,
    prefix: string,
    restricted: boolean,
    removal_time: number,
    subscribed_board: string,
    subscribed_time: number,
    subscribed_channel: string,
    new_config?: boolean
};

export function getConfigForServer(id: string): Promise<ServerConfigDb> {
    return new Promise((resolve, reject) => {
        let sql = "SELECT default_board,prefix,restricted,removal_time,subscribed_board,subscribed_time,subscribed_channel FROM server_config WHERE id = ?";
        pool.query(sql, [ id ], (err, result) => {
            if(err) reject(err);
            if(result.length <= 0) {
                resolve({
                    // send default config if not in database
                    default_board: undefined,
                    prefix: undefined,
                    restricted: false,
                    removal_time: undefined,
                    subscribed_board: undefined,
                    subscribed_channel: undefined,
                    subscribed_time: undefined,
                    new_config: true
                });
            } else {
                resolve(result[0]);
            }
        });
    });
};

export function getRestrictedChannels(id: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        pool.query("SELECT channel FROM server_allowed_channels WHERE server = ?", [ id ], (err, result) => {
            if(err) reject(err);
            let channelIds = result.map(r => r.channel);
            resolve(channelIds);
        });
    });
};

export function createConfigForServer(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        pool.query("INSERT INTO server_config (id,restricted) VALUES (?, 0)", [ id ], (err) => {
            if(err) reject(err);
            resolve();
        });
    });
};

export function editServerConfig(id: string, key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
        pool.query(`UPDATE server_config SET ${key} = ? WHERE id = ?`, [ value, id ], (err) => {
            if(err) reject(err);
            resolve();
        });
    });
};

export function clearAllowedChannels(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
        pool.query("DELETE FROM server_allowed_channels WHERE server = ?", [ id ], (err) => {
            if(err) reject(err);
            resolve();
        });
    });
};

export function setChannelAllowed(id: string, channel: string, allowed: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
        let sql = allowed ? "INSERT INTO server_allowed_channels (server, channel) VALUES (?,?)"
                          : "DELETE FROM server_allowed_channels WHERE server = ? AND channel = ?";
        pool.query(sql, [ id, channel ], (err) => {
            if(err) reject(err);
            resolve();
        });
    });
};

export function updateSubscription(id: string, sub: Subscription): Promise<void> {
    return new Promise((resolve, reject) => {
        let data = {
            subscribed_channel: sub ? sub.getChannel() : null,
            subscribed_time: sub ? sub.getInterval() : null,
            subscribed_board: sub ? sub.getBoard() : null
        };
        let sql = "UPDATE server_config SET ? WHERE id = ?";
        pool.query(sql, [ data, id ], (err) => {
            if(err) reject(err);
            else resolve();
        });
    });
}

export async function clearSubscription(id: string): Promise<void> {
    return await updateSubscription(id, null);
}

type SubscriptionDb = {
    id: string,
    subscribed_channel: string,
    subscribed_time: number,
    subscribed_board?: string,
    default_board?: string
};

export async function getSubscriptions(): Promise<SubscriptionList> {
    return new Promise((resolve, reject) => {
        const sql = "SELECT id,subscribed_channel,subscribed_time,subscribed_board,default_board FROM server_config WHERE subscribed_channel IS NOT NULL";
        pool.query(sql, (err, results: SubscriptionDb[]) => {
            if(err) reject(err);
            let out: SubscriptionList = {};

            for(let sub of results) {
                let board = sub.subscribed_board ? sub.subscribed_board : sub.default_board;
                out[sub.id] = new Subscription(sub.subscribed_channel, sub.subscribed_time, board);
            }

            resolve(out);
        });
    });
}