const Discord = require('discord.js');
const moment = require("moment");
const bot = new Discord.Client();
const conf = require('./auth.json');
const sqlite = require('sqlite3');

const time = moment().format("YYYY-MM-DD HH:mm:ss");

const prefix = conf.prefix;
const token = conf.token;
const ownerid = conf.ownerid;

bot.on('ready', () => {
  console.log(`Ready to kick spammer's asses on ${bot.guilds.size} guilds.`);
});

bot.on('guildCreate', (guild) => {
  console.log(`New guild has been joined: ${guild.name}`);
});

bot.on('message', message => {
  if(message.mentions.users.size > 25) {
    message.guild.member(message.author).ban(1).then(() => {
      message.channel.sendMessage(`:no_entry_sign: User ${message.author.username} has just been banned for mentionning too many users. :hammer: 
Users that have been mentioned, we apologize for the annoyance. Please don't be mad!`);
      console.log(`[${time}] Banned ${message.author.username} from ${message.guild.name}`);
    });
    return;
  }
  
  if(!message.content.startsWith(prefix)) return;

  var params = message.content.split(" ");
  console.log(params[0], params[1]);
  
  if(params[1] && params[1] === "info") {
    message.reply(`
    Hi! I'm no-mention-spam and I protect you against mention spams!
    To invite me to your server click here: http://tiny.cc/NOMentionspambot
    I am currently on ${bot.guilds.size} servers, kicking spammers' asses to hell and back!`);
  }
  
  if(message.author.id !== ownerid) return;
  if(params[1] && params[1] === "eval") {
    try {
      var suffix = params.splice(2).join(" ");
      var evaled = eval(suffix);
      
      if(evaled instanceof Object)
        evaled = JSON.stringify(evaled);
      
      message.reply("```xl\n" + clean(evaled) + "\n```");   
    } catch(err) {
      message.reply("`ERROR` ```xl\n" + clean(err) + "\n```");
    }
  }
  
});

bot.login(token);

function clean(text) {
  if (typeof(text) === "string") {
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  }
  else {
      return text;
  }
}
