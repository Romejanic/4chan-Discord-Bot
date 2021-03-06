# 4chan-Discord-Bot
A bot which pulls random posts off 4chan.

[Click to invite to your server](https://discordapp.com/api/oauth2/authorize?client_id=592655834568327179&permissions=124992&scope=bot)

[Visit the official support server!](https://discord.gg/5hdwzTf)

[View on top.gg (Discord Bots List)](https://top.gg/bot/592655834568327179)

# Reporting Bugs
Please report bugs in the [Issues](https://github.com/Romejanic/4chan-Discord-Bot/issues) tab of this page or the #bug-reports channel of the [support server](https://discord.gg/5hdwzTf). If you are a developer and would like to try and fix some of these bugs, you may fork the repository and open a pull request to help.

# How to use
For help or a list of commands, type `+4chan help`.
To get a random post off /b/, type `+4chan`.
To get a random post off another board, type `+4chan /<board>/` (e.g. `+4chan /v/`).

# Commands
|Command|Description|
|-------|-----------|
|+4chan help|Lists all commands and their usage.|
|+4chan random <board>|Gets a random post from the default board or a specified board.|
|+4chan post <id> <board>|Gets the OP post of the thread with the given ID from the given board.|
|+4chan info|Gets information about bot version and system info.|
|+4chan config|Allows you to configure the behaviour of the bot for your server (available to server admins only)|
|+4chan debug|Debug commands to aid development of the bot (available to bot developers only)|

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
$ npm start        # this will generate a config file
$ nano config.json # edit the config and add your token and db login
$ npm run dev      # you can now run the bot in dev mode
```

To run the bot asynchronously (without blocking the terminal), you can use
```shell
$ npm run async
```

To migrate the legacy `guild-config.json` to your MySQL database, run the migration tool through npm:
```shell
$ nano config.json # ensure your database login is correct
$ npm run migrate  # run the migration tool
```

# Project Breakdown
This is what each individual file in the root of the project does.

| File Name | Type | Description |
|-----------|------|-------------|
|package.json|JSON File|The metadata of the project. This is required for all npm projects.|
|package-lock.json|JSON File|The lock file for the modules. Don't touch this, it's autogenerated.|
|README.md|Markdown File|This file you're reading right now.|
|COMMANDS.md|Markdown file|A helpful, detailed guide to how to use commands. You can view this by type `+4chan help` into Discord and clicking the 'Command Help' header.|
|config.json|JSON File|The global configuration file for the bot. Also contains the authentication token.|
|strings.json|JSON File|A file containing all the messages which the bot can send.|
|guild-config.json|JSON File|The old per-server config file. You should use the database migration tool to move this to a database.|
|.gitignore|Git Ignore File|The gitignore file. Should be pretty self-explainatory.|
|src|Folder|The source code of the bot.|
|data|Folder|The folder containing the default `config.json` file.|
|node_modules|Folder|The heaviest object in the universe.|
