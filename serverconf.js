//const sqlite3 = require('sqlite3').verbose();
//const db = new sqlite3.Database('./modlog.sqlite');
const db = require('sqlite');

const serverconf = new Map();
const default_conf = require('./auth.json').default_server_conf;

exports.init = (bot) => {
  db.open('./modlog.sqlite').then(() => db.all('SELECT * FROM server_configs')).then( rows => {
    for(const row of rows) serverconf.set(row.server_id, row);
    for(const guild of bot.guilds) {
      if(!serverconf.has(guild.id)) {
        this.add(guild).then( conf => {
          serverconf.set(guild.id, conf);
        });
      }
    }
  }).catch(console.error);
};

exports.add = (server) => {
  return new Promise( (resolve, reject) => {
    if(serverconf.has(server.id)) return reject(`Server is already in the configurations`);
    db.open('./modlog.sqlite').then(() => {
      db.run(`INSERT INTO "server_configs" (server_id, server_name) VALUES (?, ?)`, [server.id, server.name]).then ( ()=> {
        resolve({server_id: server.id, server_name: server.name});
      }).catch(reject);
    });
  });
};

exports.remove = (server) => {
  return new Promise( (resolve, reject) => {
    if(!serverconf.has(server.id)) return reject();
    db.open('./modlog.sqlite').then( () => {
      db.run(`DELETE FROM "server_configs" WHERE server_id = ?`, [server.id]).then( () => {
        resolve();
      }).catch(reject);
    });
  });
};

exports.has = (serverid) => {
  return serverconf.has(serverid);
};

exports.get = (serverid) => {
  if(serverconf.has(serverid)) {
    let server_conf = serverconf.get(serverid);
  	const conf = {};
  	if(server_conf) {
      for(let key in server_conf) {
        if(server_conf[key]) {
          conf[key] = server_conf[key];
        } else {
          conf[key] = default_conf[key];
        }
      }
  	}
  	return conf;
  }
  else return default_conf;
};

exports.set = (server, key, value) => {
  return new Promise( (resolve, reject) => {
    
    //fml
    value = value.replace(/[';]/g, '');
    key = key.replace(/[';]]/g, '');
    
    let serverid = server.id;
    if(!serverconf.has(serverid)) {
     reject(`:x: The server ${serverid} not found while trying to set ${key} to ${value}`);
     return;
    }
    
    var thisconf = serverconf.get(server.id);
    if(!(key in thisconf)) {
     reject(`:x: The key \`${key}\` was not found in the configuration for ${server.name}.`);
     return;
    }

    if(["server_id", "server_name"].includes(key)) reject(`:x: The key \`${key}\` is read-only.`);
    if(key === "ban_level" && parseInt(value, 10) < 3) reject(`:x: The key \`ban_level\` must be higher than 2.`);
    if(["ban_level", "kick_level", "warn_level"].includes(key)) {
      value = parseInt(value, 10);
      if(value < 1) reject(`:x: The key \`${key}\` value must be numeric.`);
    }
    if(key === "get_global_bans") {
      value = JSON.parse(value);
      if(!typeof value === "boolean") reject(`:x: The key \`${key}\` value must resolve to boolean.`);
    }
    if(key === "mod_role") {
      if(!server.roles.exists("id", value)) reject(`:x: The key \`${key}\` must be a correct Role ID for this server.`);
    }
    
    thisconf[key] = value;
    serverconf.set(serverid, thisconf);
    
    if(isNaN(value)) value = `'${value}'`;
    let query = `UPDATE "server_configs" SET ${key} = ${value} WHERE server_id = '${serverid}'`;
    //console.log(query);
    
    db.open('./modlog.sqlite').then(() => {
      db.run(`UPDATE "server_configs" SET ${key} = ${value} WHERE server_id = '${serverid}'`).then ( ()=> {
        resolve(`Done! :thumbsup:`);
      }).catch((e) => {
        console.error(e);
        reject(`Could not update database key.`);
      });
    });
  });
};
//{$key: key, $value: value, $serverid: serverid}