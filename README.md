# no-mention-spam

## Introduction

Following a recent spree of "mentions attacks" on some emoji server, I created this very, *very* simple bot that will do one thing: 

If a user mentions more than 25 unique members in a single message, they are banned. 

The reasoning behind 25 users (which could be lower) is that no one should ever do that anyway, and the only instance of it ever happening is spambots that mention in the upwards of 50 users per message, as fast as they can. This disrupts the flow of conversation, and also attracts all users into the attacked servers, generally leading to more collateral spam. In extreme cases this could make the server go into "slow mode" for a while, where all operations are slowed in order for the server not to affect others on the same Discord shard. 

## Inviting the bot

The simplest way to protect yourself is to simply invite the bot to your server. To do so, click on the following link:
[http://tiny.cc/NOMentionspambot](http://tiny.cc/NOMentionspambot)

The bot only needs read permissions on any channels you want to watch, and ban permissions to remove the user. 1 day of messages is removed on ban, which is generally sufficient to remove all spammy mentions. It's fast enough that it should react after a single message. Note however that all users in that single message will still receive the mention ping, but it's still better than waking up with 1400 mentions and have to deal with "WHO PINGED ME" for days after!

## Self-hosting the bot

I understand that due to the `ban` permission, not everyone would accept a 3rd party bot on their servers. Although I can give all the assurances in the world that this bot will never, ever be used for nefarious purposes, I understand some's desires to host it themselves. 

> As a hosting I strongly recommend OVH.com which is very cheap ($3.50USD for the cheapest SSD VPS), but as long as the bot is on at all times, it shouldn't matter. 

### Pre-Requisites

Due to the bot having been written in the Discord.js#indev, it **requires Node 6 to run**. [Download it on windows](https://nodejs.org/en/) or [install it on linux](https://nodejs.org/en/download/package-manager/).

### Installing

To install it, make sure you are in a new, empty folder. Open your terminal/command prompt to that folder. Windows users, here's a trick: SHIFT+RightClick in the folder, then choose the "secret" command **Open command window here**. Magic!

Start by running the following command to download the bot's code:

`git clone https://github.com/eslachance/no-mention-spam.git`

> If you don't have `git` you can simply download the repository as a ZIP file and extract it!

You then need to install the pre-requisites including Discord.js. Simply run `npm install` from the folder.

Finally, you need to rename the files `auth.json.example` to `auth.json` edit the file to add a `token`, obtained by creating an application and bot account on the [Discord Application Page](https://discordapp.com/developers/applications/me). 

### Running the bot

Once the installation steps are complete, you can run the bot simply by executing this command in the terminal/command prompt:

`node no-mention-spam.js`

If you want the bot to run permanently, I suggest looking into [PM2](https://github.com/Unitech/pm2) to monitor/restart the bot on the system. 

## Additional Support

Honestly, I'd rather you just invite the bot to your server. But if you're having issues with the instructions above, join me on the [Discord.JS channel on Discord-API](https://discord.gg/xfp8kqk) and mention @LuckyEvie#4611 for help. I'll do my best.
