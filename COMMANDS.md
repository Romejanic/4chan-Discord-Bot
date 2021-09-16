# Command Help
This document acts as a guide for how to use the commands in the bot.

All commands are available in Discord by typing `/` and clicking on the 4chan icon on the left side of the popup box. Typing `/4chan help` will provide a list of these commands and helpful information.

## List of Commands
- `/4chan help` - Provides a list of command and a simple explaination of their function.
- `/4chan info` - Provides a list of command and a simple explaination of their function.
- `/random [board]` - Gets a random post from the default board configured in the config file. Alternatively, the user can provide the name of a board (e.g. b, v, vg, etc) and the post will be sourced from that board instead. A board can be given with or without slashes (e.g. /b/, b, /b or b/).
- `/post <id> <board>` - Gets the top level (OP) post of the thread with the given ID on the given board. This does not work with replies, only threads (what appear when you scroll down a board).
- `/boards` - Gets a list of valid boards on 4chan which can be used by the bot. It will show 8 boards at at time, with arrow buttons under the message to scroll through the list. This list is cached but will update every 20 minutes so it is consistently up to date with 4chan.
- `/config ...` - Allows you to configure the behaviour of the bot on a per-server basis. This allows for you to somewhat customize the bot and change how it behaves in a way that suits your server. For a guide on using this command [please click here](./CONFIG.md).