import { Client, TextChannel, MessageEmbed } from "discord.js";
import { EventEmitter } from 'events';
import { Subscription } from "./lib/config";
import * as db from './lib/db';
import { forServer as configOf } from "./lib/config";
import * as chan from './lib/4chan-api';
import format from './lib/str-format';
import { EMBED_COLOR_NORMAL, STRINGS } from "./commands";

export type SubscriptionList  = { [server: string]: Subscription };
export type SubscriptionTimes = { [server: string]: number };

export class SubscriptionService {

    private subscriptions: SubscriptionList = {};
    private ticker: SubscriptionTimes = {};

    private lock = false;
    private lockEvents = new EventEmitter();

    private readonly client: Client;

    // private interval: NodeJS.Timer = null;

    constructor(client: Client) {
        this.client = client;
        this.init();
    }

    private async init() {
        // load subscriptions from database
        this.subscriptions = await db.getSubscriptions();

        // tick every minute (60s * 1000ms)
        setInterval(this.tickMinute.bind(this), 60 * 1000);
        console.log("[Subscribe] Started subscribed post loop");
    }

    private tickMinute() {
        // place a lock on the data, any modifications can wait
        // until after the messages are sent out
        this.lock = true;

        // loop through each server
        let sent = 0;
        for(let server in this.subscriptions) {
            // increase ticker for this server
            if(!this.ticker[server]) {
                this.ticker[server] = 1;
            } else {
                this.ticker[server]++;
            }

            // if we reach the server's interval, send
            // a new post
            if(this.ticker[server] === this.subscriptions[server].getInterval()) {
                this.sendPost(this.subscriptions[server], server);
                this.ticker[server] = 0;
                sent++;
            }
        }

        debugMessage("[Subscribe] Processed " + Object.keys(this.subscriptions).length + " subscriptions, sent " + sent);

        // frees the lock on any awaiting promises
        this.lock = false;
        this.lockEvents.emit("unlock");
    }

    private async sendPost(sub: Subscription, server: string) {
        // resolve the server
        let guild = this.client.guilds.resolve(server);
        if(!guild) {
            // the guild can't be resolved (maybe the bot was kicked?)
            // so remove it from the list
            debugMessage("[Subscribe] Removing subscription (id = " + server + ", reason = server)");
            return await this.removeSubscription(server);
        }

        // resolve the channel
        let channelId = sub.getChannel();
        let channel = guild.channels.resolve(channelId) as TextChannel;
        if(!channel) {
            // the channel can't be resolved (maybe it was deleted?)
            // so remove it from the list
            debugMessage("[Subscribe] Removing subscription (id = " + server + ", reason = channel)");
            return await this.removeSubscription(server);
        }

        // resolve the board
        let board = sub.getBoard();
        if(!board) {
            // try and get the server default board
            board = (await configOf(server)).getDefaultBoard();
        }

        // validate the board
        const [ exists, nsfw ] = await chan.validateBoard(board);
        if(!exists || (nsfw && !channel.nsfw)) {
            debugMessage("Invalid board, doesn't exist or NSFW status doesn't match");
            return;
        }

        try {
            await sendRandomPost(channel, board);
        } catch(e) {
            // message couldn't be sent, just ignore it (unless dev)
            debugMessage("Failed to send scheduled post!\n" + e);
        }
    }

    public async removeSubscription(server: string) {
        // if there's no subscription don't bother waiting
        if(!this.subscriptions[server]) {
            return;
        }

        // if there's a lock, wait for it
        await this.awaitLock();
        delete this.subscriptions[server];
        delete this.ticker[server];
    }

    public async addSubscription(server: string, sub: Subscription) {
        // if there's a lock, wait for it
        await this.awaitLock();
        // reset the ticker only if the new interval is shorter
        // (so it doesn't disrupt the timing of posts)
        if(this.subscriptions[server] && sub.getInterval() < this.subscriptions[server].getInterval()) {
            this.ticker[server] = 0;
        }
        // update the subscription
        this.subscriptions[server] = sub;
    }

    /**
     * returns a promise which resolves when the
     * lock on the class is freed
     */
    private awaitLock(): Promise<void> {
        if(!this.lock) return Promise.resolve();
        return new Promise((resolve) => {
            this.lockEvents.once("unlock", resolve);
        });
    }

}

async function sendRandomPost(channel: TextChannel, board: string) {
    let post = await chan.getRandomPost(board);
    let postText = chan.processPostText(post);

    // create basic embed
    let embed = new MessageEmbed()
        .setColor(EMBED_COLOR_NORMAL)
        .setTitle(format(STRINGS["post_title"], post.id, post.author))
        .setDescription(format(STRINGS["post_desc"], postText, post.permalink))
        .setFooter(STRINGS["post_scheduled_footer"])
        .setImage(post.image)
        .addField(STRINGS["post_submitted"], post.timestamp);

    // send message to channel
    await channel.send({ embeds: [embed] });
}

function debugMessage(msg: any) {
    if(process.argv.includes("-dev")) {
        console.log(msg);
    }
}