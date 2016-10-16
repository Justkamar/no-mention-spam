/*----------------------/
/  MODULES AND IMPORTS  /
/----------------------*/

// Required external modules
const moment = require("moment");
const util = require("util");
const request = require('superagent');

// Load server configuration modules (database interaction)
const confs = require('./serverconf.js');

// Get Discord.js dependency
const Discord = require('discord.js');
const bot = new Discord.Client({fetch_all_members: true});

// some DB things are still done here. Let's load it (removed in the future)
const db = require('sqlite');
db.open('./modlog.sqlite');

const settings = require('./auth.json');


/*----------------------/
/  MENTION HANDLING     /
/----------------------*/

// H-DAT: Heuristic Decay Algorithm Thingy
const slowmode = new Map();
var ratelimit = 7000;

bot.on('message', message => {
  if(!message.guild) return;
  if(!message.member) return;
  if(!message.guild.member(bot.user).hasPermission("BAN_MEMBERS")) return;
  if(message.member.hasPermission("MANAGE_MESSAGES")) return;

	var conf = confs.get("default");
	if(message.guild) {
	  conf = confs.get(message.guild);
	}
	
	if(message.mentions.users.size > 0) console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}][MENTION][s${message.guild.id}][u${message.author.id}][m${message.mentions.users.size}] ${message.guild.name}/${message.channel.name}/${message.author.username} : [${message.mentions.users.first().id}]`);

  let entry = slowmode.get(message.author.id);
  if(!entry) {
    entry = {id: message.author.id, count: 0};
    slowmode.set(message.author.id, entry);
  }
  entry.count += message.mentions.users.size;

  if(entry.count > conf.ban_level) {
    console.log(`[${message.guild.name}] ${message.author.username} spamming mentions x${entry.count}`);
    ban_member(message, "ban").then( () => {
      message.channel.sendMessage(`:no_entry_sign: User ${message.author.username} has just been banned for mentionning too many users. :hammer: 
  Users that have been mentioned, we apologize for the annoyance. Please don't be mad!`);
      console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}][${message.author.id}] Banned ${message.author.username} from ${message.guild.name}`);
    })
    .catch(e => {
      console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}][${message.author.id}] Tried to ban ${message.author.username} from ${message.guild.name} but he has a higher role.`);
    });
  }

  setTimeout(()=> {
    entry.count -= message.mentions.users.size;
    if(entry.count <= 0) slowmode.delete(message.author.id);
  }, ratelimit);
	
  if(parseInt(conf.ban_level, 10) > 0 && message.mentions.users.size >= parseInt(conf.ban_level, 10)) {

    ban_member(message, "ban").then( () => {
      message.channel.sendMessage(`:no_entry_sign: User ${message.author.username} has just been banned for mentionning too many users. :hammer: 
  Users that have been mentioned, we apologize for the annoyance. Please don't be mad!`);
      log_action("BANNED", message.guild.id, `Banned ${message.author.username} from ${message.guild.name} for mentioning too many users (${message.mentions.users.size}).`);
    })
    .catch(e => {
      log_action("BAN FAIL", message.guild.id, `Tried to ban ${message.author.username} from ${message.guild.name} but they have a higher role.`);
    });

    return;
  }

  if(parseInt(conf.kick_level, 10) > 0 && message.mentions.users.size >= parseInt(conf.kick_level, 10)) {
    let kick_msg = `[${moment().format("YYYY-MM-DD HH:mm:ss")}][${message.author.id}] ${message.author.username} has been kicked for using too many mentions.`;

    ban_member(message, "kick").then( () => {
      log_action("KICKED", message.guild.id, `Kicked ${message.author.username} from ${message.guild.name} for mentioning too many users (${message.mentions.users.size}).`);
      if(conf.modlog_channel) {
        message.guild.channels.get(conf.modlog_channel).sendMessage(kick_msg)
        .catch(console.error);
      }
    })
    .catch(e => {
      log_action("KICK FAIL", message.guild.id, `Tried to kick ${message.author.username} from ${message.guild.name} but they have a higher role.`);
    });
  }
});



/*----------------------/
/  COMMAND HANDLING     /
/----------------------*/

bot.on('message', message => {
  if(message.author.bot) return;

	var conf = confs.get("default");
	if(message.guild) {
	  conf = confs.get(message.guild);
	}
	
  if(!message.guild) {
    log_action("PM", message.author.id, message.author.username, message.content);
  }
	
  if(!message.content.startsWith(conf.prefix) && !message.content.startsWith(settings.default_server_conf.prefix)) return;
  
  let command = message.content.split(" ")[0];
  if(command.startsWith(conf.prefix)) command = command.replace(conf.prefix, "");
  if(command.startsWith(settings.default_server_conf.prefix)) command = command.replace(settings.default_server_conf.prefix, "");
  var params = message.content.split(" ");
	if(["info", "help", "invite", "conf", "eval"].indexOf(command) < 0) return;

  if(command === "info") {
    return message.channel.sendMessage(`Hi ${message.author.username}!
    I'm no-mention-spam and I protect you against mention spams!
    I am currently on ${bot.guilds.size} servers, and was created by LuckyEvie#4611 (139412744439988224)
    Check out the \`help\` and \`invite\` commands!`);
  }
  
  if(command === "invite") {
    return message.channel.sendMessage(`To invite this bot:
    <https://discordapp.com/oauth2/authorize?client_id=219487222913695754&scope=bot&permissions=4>`);
  }

  if(command === "help") {
    return message.channel.sendMessage(help_message);
  }

  // eh, I have to put this before server check so I can do private evals. So sue me.
  if(message.author.id === settings.ownerid && command === "eval") {
    try {
      var suffix = params.splice(1).join(" ");
      var evaled = eval(suffix);
      
      if(evaled instanceof Object)
        evaled = JSON.stringify(evaled);
      
      message.channel.sendMessage("```xl\n" + clean(evaled) + "\n```");   
    } catch(err) {
      message.channel.sendMessage("`ERROR` ```xl\n" + clean(err) + "\n```");
    }
    return;
  }

  if(!message.guild) {
    return message.author.sendMessage(`Configuration commands must be used inside a server you share with the bot.`);
  }

  // check perms
  // MOD Commands
  try{ 
    //console.log(conf.mod_role);
    let mod_role = conf.mod_role ? conf.mod_role : null;
    let server_owner = message.guild.owner.id;
    var perm_level = 0;
    if(mod_role && message.member.roles.exists("id", mod_role)) perm_level = 1;
    if(message.author.id === "68396159596503040") perm_level = 1; // I see you, Carbonitex (Matt).
    if(message.author.id === server_owner) perm_level = 2;
    if(message.author.id === settings.ownerid) perm_level = 3;
  } catch (e) {
    console.error(`Error while catching roles and perms: ${e}`);
  }
  log_action("CONF", message.author.id, `${message.author.username} in ${message.guild.name}`, message.content);
  return message.reply(`Due to a possible bug in the conf system it is disabled until further notice.
**Your server is still protected** but conf remains default or your previously set values for the time being. Apologies for the inconvenience.`);
/*
  if(perm_level < 1) return;
  // MOD_ROLE COMMANDS
  //console.log(params);
  let conf_cmd = "";
  if(["get", "set", "view"].includes(params[1])) conf_cmd = params[1];
  //console.log(conf_cmd);
  
  if(command == "conf" && conf_cmd == "get") {
    if(!conf[params[2]]) return message.reply(`Key \`${params[2]}\` not found in server configuration.`);
    return message.reply(`Configuration key \`${params[2]}\` currently set to \`${conf[params[2]]}\``);
  }
  
  if(command == "conf" && conf_cmd == "set") {
    if(params[2] === "mod_role" && perm_level < 2) return message.reply(`\`${params[2]}\` can *only* be set by the server owner!`);
    confs.set(message.guild, params[2], params.slice(3).join(" "))
    .then((e) => message.reply(e))
    .catch((e) => {
      message.reply(e);
      console.error(e);
    });
  }
  if(command == "conf" && (conf_cmd == "view" || conf_cmd == "")) {
    return message.channel.sendMessage(make_conf(conf, message));
  }
*/  
  
});

bot.login(settings.token);

/*-----------------/
/  GENERIC EVENTS  /
/-----------------*/

bot.once('ready', () => {
  bot.user.setStatus('online', "Say: spambot.info");
	confs.init(bot);
  log_action("READY", bot.user.id, `Ready to kick spammer's asses on ${bot.guilds.size} guilds.`);
  post_dbots_server_count();
  setInterval(()=> {
    post_carbonitex_server_count();
  }, 3600000);
});

bot.on('guildCreate', (guild) => {
  if(!guild.available) return;
  log_action("GUILD CREATE", guild.id, guild.name);
  confs.add(guild).catch(console.error);
  let server_owner = guild.owner;
  server_owner.sendMessage(`Hi ${server_owner.user.username}! Sorry to bother you!
I'm a bot, see, that can only be configured, initially, by the server owner, to prevent tampering.
Please use \`spambot.help\` on your server to get a list of owner/mod commands. 
YOU are the only one who can set the \`mod_role\` configuration (name or id of role).
Anyone with the role will be able to set the rest of the options.
**IMPORTANT NOTE**: Without *Ban Member* privilege, I can't function, I'm useless, and I will leave your server.`);
});


bot.on('guildDelete', (guild) => {
  if(!guild.available) return;
  log_action("GUILD DELETE", guild.id, guild.name);
  confs.remove(guild).catch(console.error);
});

bot.on('error', (error) => {
  console.error(error.status, error.Error);
  //console.error(error);
})


/*----------------------/
/  "GLOBAL" FUNCTIONS   /
/----------------------*/

function log_action(type, id, message, details) {
  let time = moment().format("YYYY-MM-DD HH:mm:ss");
  details = details && details.length > 0 ? `\n \`\`\`${details}\`\`\`` : "";
  return console.log(`\`[${time}][${id}][${type}]\` ${message}${details}`);
}

function ban_member(message, type) {
  return new Promise( (resolve, reject) => {
    db.run(`INSERT INTO "modlog" (user_id, username, user_dump, mention_count, message_content, server_id, server_name, channel_id, channel_name, log_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [message.author.id, message.author.username, util.inspect(message.author), message.mentions.users.size, message.content, message.guild.id, message.guild.name, message.channel.id, message.channel.name, type]).then ( ()=> {
    }).catch(console.error);

    // Add to Discord Global Ban list
    //if(settings.dbans.url) post_global_ban(message);

    message.member.ban(1).then( member=> {
      if(type === "kick") {
        message.guild.unban(member.user.id);
      }
      resolve();
    })
    .catch(reject);
  });
}

function ban_from_all(id) {
  bot.guilds.forEach(g=>g.ban(id));
}

function user_in_servers(id, channel) {
  let user = bot.users.get(id);
  let servers = bot.guilds.filter(g=>g.members.has(id)).map(g=>g.name);
  if(servers.length > 0) {
    channel.sendMessage(`[USER FOUND] [${user.username}]: \n \`\`\`${servers.join("\n")}\`\`\``);
  } else {
    channel.sendMessage(`USER NOT FOUND IN ANY SERVER`);
  }
}

function clean(text) {
  if (typeof(text) === "string") {
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  }
  else {
      return text;
  }
}

function post_global_ban(message) {
  request
  .post(settings.dbots.url + "/user")
  .send({"id": message.author.id, "mentionCount": message.mentions.users.size, "notes": `Automatic ban by @no-mention-spam on ${message.guild.name}/#${message.channel.name}`})
  .set('Authorization', settings.dbots.key)
  .set('Accept', 'application/json')
  .end(err => {
      if (err) return console.error(err);
  });
}

function post_dbots_server_count() {
  request
  .post(`https://bots.discord.pw/api/bots/219487222913695754/stats`)
  .send(`{"server_count": ${bot.guilds.size}}`)
  .type('application/json')
  .set('Authorization', settings.dbots.key)
  .set('Accept', 'application/json')
  .end(err => {
      if (err) return console.error(err);
  });
}

function post_carbonitex_server_count() {
  request
  .post(`https://www.carbonitex.net/discord/data/botdata.php`)
  .send(`{"key": "${settings.carbon.key}", "servercount": ${bot.guilds.size}}`)
  .type('application/json')
  .set('Accept', 'application/json')
  .end(err => {
      if (err) return console.error(err);
  });
}

const help_message = `\`\`\`xl
COMMAND HELP

spambot.info   - Displays basic bot info and invite link.
spambot.invite - Displays bot invite link and server link.
spambot.help   - Displays this help (no, really!)

Server Owner / mod_role useable only: 
spambot.conf - Configure the server settings
  conf get <Key>
    'displays the current configuration value'
  conf set <Key> <Value>
    'modifies the value for your server.'
  conf view
    'displays the current server configuration.'
    
Example:
  spambot.conf set ban_level 10
  spambot.conf set prefix >
  >invite

Available configuration keys: 
  prefix - <String> (false to reset)
    'custom server prefix. the "spambot." prefix always works regardless.'
  kick_level - <Int> (0 to disable, Default 10)
    'mention count at which to kick the user from the server.'
  ban_level - <Int> (min 2, Default 15)
    'mention count at which to ban the user. Removes 1 day of messages.'
  mod_role - <RoleName> (false to disable)
    'the name of the role that has permission to change config besides the server owner.'
  modlog_channel - <ChannelID>
    'the ID of the channel where mod logs should be posted (warn/kick/ban). Bans always trigger a message regardless.'
  get_global_bans - <Boolean> (true/false)
    'set to "true" to automatically ban known spammers from your server.'
\`\`\``;

function make_conf(conf, message) {
  return `\`\`\`xl
CURRENT SERVER CONFIGURATION
This is your current server configuration.
Name: ${message.guild.name}
Owner: ${message.guild.owner.user.username}

prefix         : ${conf.prefix}
kick_level     : ${conf.kick_level}
ban_level      : ${conf.ban_level}
mod_role       : ${conf.mod_role}
modlog_channel : ${conf.modlog_channel}
get_global_bans: ${conf.get_global_bans}
\`\`\``;
}
