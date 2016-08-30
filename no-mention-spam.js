const Discord = require('discord.js');
const bot = new Discord.Client();
const token = require('./auth.json').token;
const sqlite = require('sqlite3');

const prefix = "🚫";

bot.on('ready', () => {
  console.log(`Ready to kick spammer's asses on ${bot.guilds.size} guilds.`);
});

bot.on('message', message => {
  if(message.mentions.users.size > 25) {
    message.guild.member(message.author).ban(1).then(() => console.log(`Banned ${message.author.username} from ${message.guild.name}`));
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
  
});

bot.login(token);