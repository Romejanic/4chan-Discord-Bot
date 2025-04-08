import { createPool } from 'mysql2/promise';
import { SubscriptionList } from '../subscribed';
import { loadGlobalConfig, Subscription } from './config';

const auth = loadGlobalConfig().db || {};

const pool = createPool({
    user: auth.user,
    password: auth.pass,
    host: auth.host,
    port: auth.port,
    database: auth.database,
    connectionLimit: 15
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

export async function getConfigForServer(id: string): Promise<ServerConfigDb> {
    let sql = "SELECT default_board,prefix,restricted,removal_time,subscribed_board,subscribed_time,subscribed_channel FROM server_config WHERE id = ?";
    const [rows] = await pool.query(sql, [ id ]);
    if(rows[0].length <= 0) {
        return {
            // send default config if not in database
            default_board: undefined,
            prefix: undefined,
            restricted: false,
            removal_time: undefined,
            subscribed_board: undefined,
            subscribed_channel: undefined,
            subscribed_time: undefined,
            new_config: true
        };
    } else {
        return rows[0];
    }
};

export async function getRestrictedChannels(id: string): Promise<string[]> {
    const [rows] = await pool.query("SELECT channel FROM server_allowed_channels WHERE server = ?", [ id ]);
    return rows[0].map(r => r.channel);
};

export async function createConfigForServer(id: string) {
    await pool.query("INSERT INTO server_config (id,restricted) VALUES (?, 0)", [ id ]);
};

export async function editServerConfig(id: string, key: string, value: any) {
    await pool.query(`UPDATE server_config SET ${key} = ? WHERE id = ?`, [ value, id ]);
};

export async function clearAllowedChannels(id: string) {
    await pool.query("DELETE FROM server_allowed_channels WHERE server = ?", [ id ]);
};

export async function setChannelAllowed(id: string, channel: string, allowed: boolean) {
    let sql = allowed ? "INSERT INTO server_allowed_channels (server, channel) VALUES (?,?)"
                        : "DELETE FROM server_allowed_channels WHERE server = ? AND channel = ?";
    await pool.query(sql, [ id, channel ]);
};

export async function updateSubscription(id: string, sub: Subscription) {
    let data = {
        subscribed_channel: sub ? sub.getChannel() : null,
        subscribed_time: sub ? sub.getInterval() : null,
        subscribed_board: sub ? sub.getBoard() : null
    };
    let sql = "UPDATE server_config SET ? WHERE id = ?";
    await pool.query(sql, [ data, id ]);
}

export async function clearSubscription(id: string) {
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
    const sql = "SELECT id,subscribed_channel,subscribed_time,subscribed_board,default_board FROM server_config WHERE subscribed_channel IS NOT NULL";
    const [rows] = await pool.query(sql);
    const results = rows[0] as SubscriptionDb[];
    let out: SubscriptionList = {};

    for(let sub of results) {
        let board = sub.subscribed_board ? sub.subscribed_board : sub.default_board;
        out[sub.id] = new Subscription(sub.subscribed_channel, sub.subscribed_time, board);
    }

    return out;
}
