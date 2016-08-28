const Discord = require('discord.js');
const bot = new Discord.Client();
const token = require('./auth.json').token;
bot.on('ready', () => {
  console.log('I am ready!');
});

bot.on('message', message => {
  if(message.mentions.users.size > 25) {
    message.guild.member(message.author).ban(1).then();
  }
});

bot.login(token);