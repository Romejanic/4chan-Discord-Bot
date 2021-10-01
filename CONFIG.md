# Configuration Options
The bot comes with a variety of configuration options which are available to be changed. These are accessible through the `/config` command on a server.

To change any of these options, a user will require the `Manage Server` permission on the respective Discord server. These config options are also not available in DM channels.

## Default Board
The default board is the board which is used by the `/random` command when the user does not provide a board option to the command. It will be validated against the list of boards available on 4chan, so you cannot set an invalid board as the default.

**Default:** `/g/ - Technology`

|Command|Option|Description|
|-------|------|-----------|
|/config default_board set &lt;board&gt;|`board`: which board to set as default|Sets the default board to the option provided. This is simply the board name (e.g. `b`, `x`, `/v/`).|
|/config default_board get|none|Gets the current default board set for your server. Also indicates if this board is the global default or not.|
|/config default_board reset|none|Resets the default board to the global default (currently the `/g/` board).|

## Removal Time
By default, each 4chan post in a server will be sent with a red 'Remove' button attached to it. This allows the sender of the command to remove the post without admin intervention if they do not like the content.

This option allows you to change how long the user has to click this button and remove the message. It also allows you to disable the button if you do not want to allow it.

**Default:** `120 seconds`

|Command|Option|Description|
|-------|------|-----------|
|/config removal_time set &lt;seconds&gt;|`seconds`: how long to make the interval|Sets the removal time interval. This can be any number of seconds between 10 and 300. Setting this time to 0 will disable the remove button.|
|/config removal_time get|none|Gets the current number of seconds which the removal time is active for.|
|/config removal_time reset|none|Resets the removal time to the global default (currently 120 seconds).|

## Allowed Channels
By default, the bot has access to all text channels in the server. If a board is marked as NSFW, it will require the user to send the command in a NSFW channel to view the board's posts. However you can also choose to restrict the bot's activity to a set of channels on your server.

**Default:** `all text channels`
|Command|Option|Description|
|-------|------|-----------|
|/config allowed_channels toggle &lt;channel&gt;|`channel`: a text channel or channel category on your server|Toggles the bot's access to the given channel. If a category is passed, it will toggle all text channels in that category.|
|/config allowed_channels get|none|Gets the list of channels which the bot has access to.|
|/config allowed_channels reset|none|Resets the list of channels so that the bot can again access all text channels.|

## Subscriptions
The bot allows for subscribing to a board. When provided with a time interval and a target channel, the bot will periodically pull a random post from the board and post it to the channel!

This will continue indefinitely unless it is disabled by an admin, the bot is kicked from the server or the channel is deleted.

The required options are the channel and the interval. The channel can be any text or announcement channel on the server. The interval is a number in minutes (from 1 minute up to 10,080 minutes (i.e. 7 days)).

A board can also be optionally passed. If no board is given, it will use the server's default board instead. **PLEASE NOTE** that if the default board changes, so will the board that the subscription pulls from!

**Default:** `not enabled`
|Command|Option|Description|
|-------|------|-----------|
|/config subscribe set &lt;channel&gt; &lt;interval&gt; [board]|`channel`: a text or announcement channel on your server. `interval`: the interval in minutes between posts. `board`: optionally the board to pull posts from|Sets a new subscription to the given channel and with the time interval. Optionally a board can be provided, if not the server's default board will be used.|
|/config subscribe get|none|Gets information about the current subscription.|
|/config subscribe reset|none|Disables the subscription and stops posts being sent to the channel.|

## Other issues
If you have a suggestion for a new config options please [create an issue](https://github.com/Romejanic/4chan-Discord-Bot/issues/new/choose) with the `Enhancement` tag and I will consider adding it!

If you run into an unexpected issue with your config (e.g. locking the bot in a deleted channel) and you can't fix it with these commands, please send me a message on the [support server](https://discord.gg/fawJ2dTxFS) so I can manually reset your config.

Thanks for reading!