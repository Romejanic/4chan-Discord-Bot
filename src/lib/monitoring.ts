import { ColorResolvable, EmbedFieldData, MessageEmbed, WebhookClient } from "discord.js";

const AVATAR_URL = "https://cdn.discordapp.com/avatars/592655834568327179/f0ae1e42b1dbb8a2f4df48ddf60d80b9.png?size=256";

const webhook = require("../../config.json").monitor_webhook;
const enabled = typeof webhook === "string";

const client = enabled ? new WebhookClient({ url: webhook }) : null;

type EventType = "started" | "stopped" | "crashed";

const colorMap: { [key in EventType]: ColorResolvable } = {
    started: "GREEN",
    stopped: "YELLOW",
    crashed: "RED"
};

export default function sendEvent(type: EventType, context: EmbedFieldData[] = []) {
    if(!enabled || !client) return;
    client.send({
        embeds: [
            new MessageEmbed()
                .setTitle(`4chan bot ${type}`)
                .setDescription(`The bot has ${type}.`)
                .setColor(colorMap[type])
                .setThumbnail(AVATAR_URL)
                .addFields(context.map(f => { return { ...f, inline: true }}))
                .setTimestamp(Date.now())
        ]
    });
}
