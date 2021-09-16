# I've migrated to slash commands!

As you have likely noticed, the old commands with `+4chan` or your server's custom prefix no longer work. Instead, the bot has now migrated to Discord's new slash commands, and from now on all old commands using `+4chan` will cease to work.

## What are slash commands?
Slash commands are a new way for Discord bots to create commands. Rather than each bot having its own prefix, all commands begin with a `/`, and typing it will bring up a list of bots and their commands in Discord.

While I'm sure it sucks to have to relearn some commands, slash commands are a good thing! They allow us to create a better user experience because Discord will automatically validate your input and give you hints on how to type the command, so there's no confusion when figuring out how to use a particular command.

Not only that but it allows us to better integrate our bots into Discord and streamline your experience (e.g. having buttons you can press instead of reactions).

## But why?
Discord has made a lot of changes under the hood recently targeted towards bots.

Discord is actually **requiring** all bots to migrate to slash commands by April 2022. This is because Discord is restricting access to reading messages after that date.

The way most bots work is scanning every new message in the server for the prefix, and then acting accordingly by following up with another message.

Discord is changing this, so you have to apply to Discord and give them a good reason why your bot should be allowed to read all messages. And unfortunately, command prefixes aren't a good reason anymore. This is because Discord expects all bots to begin using slash commands.

## But X bot supports both!
A lot of bots (like the late Rythm and Groovy) supported both their original commands and the new slash commands, as an inbetween solution. I was considering doing this for 4chan, and if there's enough demand I still might.

However, I couldn't end up justifying doing this, because ultimately it would take a lot of extra (and sorta messy) code to make this work with my new command system, especially to support a feature which will only work for another 7 months.

I'd then end up having to refactor my bot and change it back to how it is now. I'd rather set up a clean codebase now which I can keep using long into the future.

## Conclusion
Unfortunately this means the end for `+4chan`, but I hope that you can adjust to the new commands and agree with me that they are good improvements to the bot.

And with the new interactions API, I'm hoping to improve the bot and make it even more user friendly that it already is! I've already started to incorporate it in some ways, but there's more to come!

Thanks everyone :D