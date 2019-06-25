# Command Help
This document acts as a guide for how to use the commands in the bot.

## List of Commands
All commands are preceded by the prefix of the bot, which is configured in the `config.json` file. By default, this prefix is `+4chan`, and will be used in this document hereafter.

- `+4chan help` - Provides a list of command and a simple explaination of their function.
- `+4chan random [board]` - Gets a random post from the default board configured in the config file. Alternatively, the user can provide the name of a board (e.g. b, v, vg, etc) and the post will be sourced from that board instead.
- `+4chan debug <reload>` - A debug command which can be used to assist development of the bot. This command consists of certain 'subcommands' which perform certain tasks. **NOTE:** In order to use this command, you must set your tag in the config file (name and discriminator) so that the bot recognizes you as a developer.
  - `+4chan debug reload` - Reloads the strings from the `strings.json` file. Allows you to change the text used by the bot without restarting the program.