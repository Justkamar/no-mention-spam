const db = require('sqlite')
db.open('./modlog.sqlite');

const guildconf = new Map();
const default_conf = require('./auth.json').default_server_conf;

exports.init = (bot) => {
  db.all('SELECT * FROM server_configs').then( rows => {
    for(const row of rows) { 
      guildconf.set(row.server_id, row);
    }
    bot.guilds.forEach(guild => {
      if(!guildconf.has(guild.id)) {
        console.log(`Guild ${guild.name} (${guild.id}) isn't in the database. Adding.`);
        this.add(guild).then(conf => guildconf.set(guild.id, conf)).catch(console.error);
      }
    });
  })
  .catch( (e) => console.error(`Error on init: ${e}`));
};

exports.add = (guild) => {
  return new Promise( (resolve, reject) => {
    if(guildconf.has(guild.id)) return reject(`guild is already in the configurations`);
    let server_name = guild.name.replace("'", "''", 'g');
    db.run(`INSERT INTO server_configs (server_id, server_name) VALUES (?, ?)`, [guild.id , server_name]).then ( () => {
      let conf = default_conf;
      conf.server_id = guild.id;
      conf.server_name = guild.name;
      guildconf.set(guild.id, conf);
      resolve(conf);
    }).catch(reject);
  });
};

exports.remove = (guild) => {
  return new Promise( (resolve, reject) => {
    if(!guildconf.has(guild.id)) return reject();
    db.run(`DELETE FROM server_configs WHERE server_id = ?`, [guild.id])
      .then(() => {
        guildconf.delete(guild.id);
        resolve();
      })
      .catch(reject);
  });
};

exports.has = (guildid) => {
  return guildconf.has(guildid);
};

exports.get = (guild) => {
  if(guildconf.has(guild.id)) {
    let guild_conf = guildconf.get(guild.id);
    const conf = {};
    for(let key in guild_conf) {
      if(guild_conf[key]) conf[key] = guild_conf[key];
      else conf[key] = default_conf[key];
    }
    conf.default = false;
    return conf;
  }
  else return default_conf;
};

exports.set = (guild, key, value) => {
  return new Promise( (resolve, reject) => {
    
    value = value.replace("'", "''", 'g');
    
    let guildid = guild.id;
    if(!guildconf.has(guild.id)) {
     reject(`:x: The guild ${guildid} not found while trying to set ${key} to ${value}`);
     return;
    }
    
    var thisconf = guildconf.get(guild.id);
    if(!(key in thisconf)) {
     reject(`:x: The key \`${key}\` was not found in the configuration for ${guild.name}.`);
     return;
    }

    if(["server_id", "server_name"].includes(key)) return reject(`:x: The key \`${key}\` is read-only.`);
    if(key === "ban_level" && parseInt(value, 10) < 3) return reject(`:x: The key \`ban_level\` must be higher than 2.`);
    if(["ban_level", "kick_level", "warn_level"].includes(key)) {
      if(isNaN(value)) { 
        return reject(`:x: The key \`${key}\` value must be numeric.`);
      } else if(parseInt(value) < 1) {
        value = "false";
      } else {
        value = parseInt(value);
      }
    }
    if(key === "get_global_bans") {
      if(!typeof JSON.parse(value) === "boolean") return reject(`:x: The key \`${key}\` value must resolve to boolean.`);
    }
    if(key === "mod_role") {
      const role = guild.roles.exists("name", String(value));
      const role_by_id = guild.roles.exists("id", String(value));
      if(role) {
        console.log(`Found role by name!`);
        value = guild.roles.find("name", value).id;
      } else
      if(role_by_id) {
        console.log(`Found role by ID!`);
        value = value; // ¯\_(ツ)_/¯
      } else {
        console.error(`Role not found`);
        return reject(`:x: Could not find the specified role. Use ID or role name (not a mention). Role names are case sensitives.`);
      }
    }
    
    if(key === "modlog_channel") {
      const chan_by_name = guild.channels.exists("name", String(value));
      const chan_by_id = guild.channels.exists("id", String(value));
      if(chan_by_name) {
        value = guild.channels.find("name", value).id
      } else
      if (chan_by_id) {
        value = value; // ¯\_(ツ)_/¯
      } else {
        console.error(`Channel not found`);
        return reject(`:x: Could not find the specified channel. Use ID or name without the #`);
      }
    }
    
    thisconf[key] = value;
    guildconf.set(guildid, thisconf);
    
    if(isNaN(value)) value = `'${value}'`;
    let query = `UPDATE server_configs SET ${key} = ${value} WHERE server_id = '${guildid}'`;

    db.run(`UPDATE server_configs SET ${key} = ${value} WHERE server_id = '${guildid}'`).then ( ()=> {
      resolve(`Done! :thumbsup:`);
    }).catch((e) => {
      console.error(`Could not set value: ${e}`);
      reject(`Could not update database key.`);
    });
  });
};
