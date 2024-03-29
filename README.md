# 4chan-Discord-Bot
A bot which pulls random posts off 4chan.

[Click to invite to your server](https://discordapp.com/api/oauth2/authorize?client_id=592655834568327179&permissions=124992&scope=bot%20applications.commands)

[Visit the official support server!](https://discord.gg/fawJ2dTxFS)

[View on top.gg (Discord Bots List)](https://top.gg/bot/592655834568327179)

# Reporting Bugs
Please report bugs in the [Issues](https://github.com/Romejanic/4chan-Discord-Bot/issues/new/choose) tab of this page or the `#4chan-bug-reports` channel of the [support server](https://discord.gg/fawJ2dTxFS). If you are a developer and would like to try and fix some of these bugs, you may fork the repository and open a pull request to help.

# How to use
For help or a list of commands, type `/4chan help`.

To get a random post off /g/, type `/random`.

To get a random post off another board, type `/random <board>` (e.g. `+4chan /v/`).

# Commands
|Command|Description|
|-------|-----------|
|/4chan help|Lists all commands and their usage.|
|/4chan info|Gets information about bot version and system info.|
|/random [board]|Gets a random post from the default board or a specified board.|
|/post &lt;id&gt; &lt;board&gt;|Gets the OP post of the thread with the given ID from the given board.|
|/browse [board] [id]|Opens a browser for the specified board.|
|/boards|Gets a list of available boards you can use.|
|/config|Allows you to configure the behaviour of the bot for your server (available to server admins only). [See here for more info](./CONFIG.md)|

# Getting Started with Development
You will need
- NodeJS
- MySQL server
- A Discord application token for a bot

To install the project,
1) Use the [init.sql](init.sql) file to set up your database.
2) Run the following commands:
```shell
$ git clone https://github.com/Romejanic/4chan-Discord-Bot.git
$ cd 4chan-Discord-Bot
$ npm install      # this will download the dependancies
$ npm run build    # compile the typescript source
$ npm start        # this will generate a config file
$ nano config.json # edit the config and add your token and db login
$ npm run dev      # you can now run the bot in dev mode
```

To run the bot asynchronously (without blocking the terminal), you can use
```shell
$ npm i -g pm2     # install pm2
$ npm run async    # start the bot
```

If you're actively developing the bot, you can run Typescript in watch mode with:
```shell
$ tsc -w
```

To migrate the legacy `guild-config.json` to your MySQL database, run the migration tool through npm:
```shell
$ nano config.json # ensure your database login is correct
$ npm run migrate  # run the migration tool
```