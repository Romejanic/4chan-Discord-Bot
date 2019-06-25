# Command Help
This document acts as a guide for how to use the commands in the bot.

All commands are preceded by the prefix of the bot, which is configured in either the `config.json` file or the `+4chan config` command. By default, this prefix is `+4chan`, and will be used in this document hereafter.

## List of Commands
- `+4chan help` - Provides a list of command and a simple explaination of their function.
- `+4chan random [board]` - Gets a random post from the default board configured in the config file. Alternatively, the user can provide the name of a board (e.g. b, v, vg, etc) and the post will be sourced from that board instead.
- `+4chan post <id> <board>` - Gets the top level (OP) post of the thread with the given ID on the given board. This does not work with replies, only threads (what appear when you scroll down a board).
- `+4chan config` - Allows you to configure the behaviour of the bot on a per-server basis. This allows for you to somewhat customize the bot and change how it behaves in a way that suits your server.
  - `+4chan config prefix [set/clear] [new prefix]` - Allows you to use a custom command prefix for the server. Passing this command with no arguments prints the current prefix, `set` allows you to change the prefix and `clear` will reset the custom prefix to the global default.
  - `+4chan config restrict [#channel/clear]` - Allows you to restrict the bot to certain channels to prevent spam. Passing this command with no arguments lists all channels which the bot can interact with. By passing a reference to a channel name (e.g. #my-awesome-channel) it will toggle whether or not that channel can be used by the bot. Using the `clear` subcommand will reset the permissions and allow the bot to use all channels again.  
- `+4chan debug <reload>` - A debug command which can be used to assist development of the bot. This command consists of certain 'subcommands' which perform certain tasks. **NOTE:** In order to use this command, you must set your tag in the config file (name and discriminator) so that the bot recognizes you as a developer.
  - `+4chan debug reload` - Reloads the strings from the `strings.json` file. Allows you to change the text used by the bot without restarting the program.