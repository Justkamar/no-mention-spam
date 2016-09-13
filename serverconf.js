//const sqlite3 = require('sqlite3').verbose();
//const db = new sqlite3.Database('./modlog.sqlite');
const db = require('sqlite');

const serverconf = new Map();
const default_conf = require('./auth.json').default_server_conf;

exports.init = (bot) => {
  db.open('./modlog.sqlite').then(() => db.all('SELECT * FROM server_configs')).then( rows => {
    require('fs').writeFile('./dump.txt', require('util').inspect(rows));
    for(const row of rows) {
      serverconf.set(row.server_id, row);
    }
    bot.guilds.forEach(guild => {
      if(!serverconf.has(guild.id)) {
        this.add(guild).then( conf => {
          // nope.
        }).catch(console.error);
      }
    });
  }).catch(console.error);
};

exports.add = (server) => {
  return new Promise( (resolve, reject) => {
    if(serverconf.has(server.id)) return reject(`Server is already in the configurations`);
    //console.log(`INSERT INTO "server_configs" (server_id, server_name) VALUES ('${server.id}', '${server.name}')`)
    db.open('./modlog.sqlite').then(() => {
      db.run(`INSERT INTO "server_configs" (server_id, server_name) VALUES ('${server.id}', '${server.name}')`).then ( () => {
        let conf = default_conf;
        conf.server_id = server.id;
        conf.server_name = server.name;
        serverconf.set(server.id, conf);
        resolve();
      }).catch(reject);
    });
  });
};

exports.remove = (server) => {
  return new Promise( (resolve, reject) => {
    if(!serverconf.has(server.id)) return reject();
    db.open('./modlog.sqlite').then( () => {
      db.run(`DELETE FROM "server_configs" WHERE server_id = ?`, [server.id])
        .then(() => {
          serverconf.delete(server.id);
          resolve();
        })
        .catch(reject);
    });
  });
};

exports.has = (serverid) => {
  return serverconf.has(serverid);
};

exports.get = (server) => {
  if(serverconf.has(server.id)) {
    let server_conf = serverconf.get(server.id);
  	const conf = {};
  	if(server_conf) {
      for(let key in server_conf) {
        if(server_conf[key]) {
          conf[key] = server_conf[key];
        } else {
          conf[key] = default_conf[key];
        }
      }
      conf["default"] = false;
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
    if(!serverconf.has(server.id)) {
     reject(`:x: The server ${serverid} not found while trying to set ${key} to ${value}`);
     return;
    }
    
    var thisconf = serverconf.get(server.id);
    if(!(key in thisconf)) {
     reject(`:x: The key \`${key}\` was not found in the configuration for ${server.name}.`);
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
      const role = server.roles.exists("name", String(value));
      const role_by_id = server.roles.exists("id", String(value));
      if(role) {
        console.log(`Found role by name!`);
        value = server.roles.find("name", value).id;
      } else
      if(role_by_id) {
        console.log(`Found role by ID!`);
        value = value; // ¯\_(ツ)_/¯
      } else {
        console.error(`Role not found`);
        return reject(`:x: Could not find the specified role. Note: roles are case-sensitive`);
      }
    }
    
    //console.log(`Trying to set ${key} to ${value} in : \n${JSON.stringify(thisconf)}`)
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

process.on('uncaughtException', (err) => {
  let errorMsg = err.stack.replace(new RegExp(`${__dirname}\/`, 'g'), './');
  // bot.getDMChannel('175008284263186437').then(DMChannel => {
  //   bot.createMessage(DMChannel.id, `\`UNCAUGHT EXCEPTION\`\n\`\`\`sh\n${errorMsg}\n\`\`\``);
  // }).catch(error);
 console.error(errorMsg);
});