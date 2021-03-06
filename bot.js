//add to guild: https://discordapp.com/oauth2/authorize?&client_id=530439718823788544&scope=bot&permissions=8
//programming idead: a todo list like Nils has, hangman, tic tac toe(AI?), a text based game like in BIG???, his noen nevne depressed
//poppe den ut ett inspirational quote, ett roast system så den velge ut en bra roast fra databasen og sikte den på den du @-e
//Programmer en ting som lar noen sende en command og det botten svare til noen andre. Eks: "!send @ting !nut"
//Programmer en sansynlighet for at boten poppe ut en random melding i reaksjon på hver eneste melding(5%-10% sannsynlighet)
 
//for joining calls and stuff
const FFMPEG = require('ffmpeg');

//Important genereral stuff
const Discord = require('discord.js');
const client = new Discord.Client();

//api for general communication and stuff
const http = require('http');
const https = require('https');

//for db stuff
const mysql = require('mysql');
var connection = mysql.createConnection(process.env.JAWSDB_URL);
connection.connect();

//for directory stuff
const fs = require('fs');

client.on('ready', () => {
	client.users.fetch(myId).then(returned => {
		client.myUser = returned;
	});
	client.user.setPresence({ status: 'online', game: { name: '!help' } });
	//Initiate countdowns
	runSQL("SELECT * FROM countdown;").then(returned => {
		returned.forEach(row => {
			client.setTimeout(function(row){
				client.users.fetch(row.id).then(user => {
					user.send(row.message)
					runSQL("DELETE FROM countdown WHERE id = '"+row.id+"' AND due = '"+row.due+"';").then(returned =>{});
				});
			}, new Date(row.due).getTime()-new Date().getTime(), row);
		});
	});
	//the weekly timer
	let d = new Date();
	d.setDate(d.getDate() + (8 - d.getDay())%7);
	if(d.getDay() !== 1 || d.getHours() < 7){
		d.setHours(7, 0, 0, 0);
		let onejan = new Date(d.getFullYear(), 0, 1);
		let week = Math.ceil((((d - onejan)/86400000) + onejan.getDay() + 1) / 7 ).toString();
		client.setTimeout(function(week){
			client.channels.get("636242416453812318").send("@everyone God morgen! Det er uke "+week+", ha en fin mandag.\n(husk å refresh boligsøknad for de av dere som skal det)");
		}, d.getTime()-Date.now(), week);
	}
	//do stuff to see if people in the database and update if they aren't
	runSQL("SELECT id FROM people").then(returned => {
		client.users.cache.forEach(user => {
			if(!user.bot && returned.every(row => {return row.id !== user.id})){
				tellMe("Fix a name for: "+user.username);
				runSQL("INSERT INTO people (id, navn) VALUES ('"+user.id+"', '"+user.username+"');");
			}
		});
	});
	console.log('I am ready!');
	client.users.fetch(myId).then(user => {
		if(user.presence.status === "online"){
			tellMe("I'm back");
		}
	});
});

//sendhttpRequest
function sendhttpRequest(link){
	return new Promise(function(resolve, reject){
		http.get(link, (resp) => {
			let data = '';
			resp.on('data', (chunk) => {
				data += chunk;
			});
			resp.on('end', () => {
				if(data.startsWith("<!DOCTYPE html>")){
					reject(data);
				}else{
					resolve(JSON.parse(data));
				}
			});
		}).on("error", (err) => {
			console.log("http error: " + err.message);
		});
	});
}


//sendhttpsRequest
function sendhttpsRequest(options){
	return new Promise(function(resolve, reject){
		https.request(options, (resp) => {
			let data = '';
			resp.on('data', (chunk) => {
				data += chunk;
			});
			resp.on('end', () => {
				if(data.startsWith("<!DOCTYPE html>")){
					reject(data);
				}else{
					resolve(JSON.parse(data));
				}
			});
		}).on("error", (err) => {
			console.log("https error: " + err.message);
		}).end();
	});
}

//stuff to print spell requests
function formatSpellData(data){
	let info = "";
	let con, ritual;
	if(data["concentration"] === "no"){con = "not "}else{con = ""}
	if(data["ritual"] === "no"){ritual = "not "}else{ritual = ""}
	info += (data["name"]+" is a "+data["level"]+". level "+data["school"]["name"]+` spell.
It has a casting time of `+data["casting_time"]+", its "+ritual+"a ritual and a range of "+data["range"]+`.
Its duration is `+data["duration"].toLowerCase()+" and it is "+con+
"concentration. Its component(s) are "+data["components"].join(" ")+`
It can be found here: `+data["page"]);
	for(let i = 0; i<data["desc"].length; i++){
		info += "\n"+data["desc"][i];
	}
	return info;
}

//Stuff to deal with d&d spell requests
function getSpellThings(spellName){
	return new Promise(function(resolve, reject){
		sendhttpRequest('http://www.dnd5eapi.co/api/spells/?name='+spellName).then(returned => {
			sendhttpRequest(returned["results"][0]["url"]).then(returned2 => {
				resolve(formatSpellData(returned2))
			});
		} , returned => {
			reject(returned);
		});
	});
}

//stuff to interact with database using mysql
function runSQL(query){
	try{
		return new Promise(function(resolve, reject){
			connection.query(query, function(err, rows, fields) {
				if (err) console.log(err);
				resolve(rows);
			});
		});
	}catch(e){
		console.log(e);
		return null;
	}
}

function rollDice(dice){
	return Math.floor(Math.random()*dice)+1
}

function tellMe(message){
	return client.myUser.send(message);
}

//function to split text into words, and symbols, so that I can replace the words perfectly
function splitSymbols(text){
	let answer = [];
	let letters = "";
	let symbols = "";
	let isLetter;
	text.split("").forEach(character => {
		isLetter = character.match(/[a-z]|æ|ø|å/i);
		if(isLetter && !letters){
			answer.push(symbols);
			symbols = "";
		}else if(!isLetter && !symbols){
			answer.push(letters);
			letters = "";
		}
		if(isLetter){
			letters += character;
		}else{
			symbols += character;
		}
	});
	answer.push(letters+symbols);
	return answer;
}

//function to split the text into 1900 character long parts so discord can deal with it
function splitText(text){
	let returnValue = []
	if(text.length > 1900){
		for(let a = 0; a < text.length/1900; a++){
			returnValue.push(text.slice(a*1900, (a+1)*1900));
		}
	}else{
		returnValue.push(text);
	}
	return returnValue;
}

//function to get definition object
function define(word, lang="en"){
	return new Promise(function(resolve, reject){
		sendhttpsRequest({host: "googledictionaryapi.eu-gb.mybluemix.net",
				  path: "/?define="+word+"&lang="+lang, 
				  method: "GET"}).then(returned => {
			if(returned[0]){
				returned = returned[0];
			}
			resolve(returned);
		}, returned => {
			reject(returned);
		});
	});
}

//valid commands
const publicCommands = [];
const privateCommands = [];
runSQL("SELECT keyword FROM commands WHERE admin=FALSE;").then(returned => {
	returned.forEach(element => {
		publicCommands.push(element.keyword);
	});
});

runSQL("SELECT keyword FROM commands WHERE admin=TRUE;").then(returned => {
	returned.forEach(element => {
		privateCommands.push(element.keyword);
	});
});

const adminIDs = [];
runSQL("SELECT id FROM people WHERE admin=TRUE").then(returned => {
	returned.forEach(row => {
		adminIDs.push(row.id);
	});
});

//controll variables
const myId = "265570029792133129";
const botId = "530439718823788544";
var iDecide = false;

//valid names for the sitat command
const validNames = [];
runSQL("SELECT DISTINCT navn FROM sitat").then(returned => {
	returned.forEach(element => {
		validNames.push(element.navn);
	});
});

//valid files for the play command
const clipNames = [];
fs.readdir("./data/", function(err, items){
	items.forEach(item => {
		clipNames.push(item.slice(0, -4));
	});
});
var connected = false;

//The main thing
client.on('message', message => {
	if(message.content[0] === "!" && !(iDecide && !adminIDs.includes(message.author.id))){//general commands
		let command = message.content.slice(1).split(" ");
		let keyword = command[0];
		if(publicCommands.includes(keyword)){
			//public commands
			runSQL("SELECT navn FROM people WHERE id='"+message.author.id+"';").then(returned => {
				let name = returned[0].navn;
				if(message.guild !== null){
					console.log("Attempting to run public command "+message.content+" on the server "+
					message.guild.name+" for "+name);
					if(message.author.id !== myId){
						let str = name+" is running command "+ message.content+" on server "+message.guild.name;
						client.myUser.dmChannel.fetchMessage(client.myUser.dmChannel.lastMessageID).then(lastMessage => {
							if(lastMessage.content.startsWith(str)){
								let num = parseInt(lastMessage.content.replace(str, "").slice(1, -1)) || 1;
								num++;
								lastMessage.edit(str+"("+num.toString()+")");
							}else{
								tellMe(str);
							}
						});
					}
				}else{
					console.log("Attempting to run public command "+message.content+" in a dm for "+name);
					if(message.author.id !== myId){
						let str = name+" is running command "+ message.content+" through a DM";
						client.myUser.dmChannel.fetchMessage(client.myUser.dmChannel.lastMessageID).then(lastMessage => {
							if(lastMessage.content.startsWith(str)){
								let num = parseInt(lastMessage.content.replace(str, "").slice(1, -1)) || 1;
								num++;
								lastMessage.edit(str+"("+num.toString()+")");
							}else{
								tellMe(str);
							}
						});
					}
				}
			});
			switch(keyword){
				//various stuff
				case "help":
					if(publicCommands.includes(command[1]) || (privateCommands.includes(command[1]) && 
					message.author.id===myId)){
						runSQL("SELECT description FROM commands WHERE keyword='"+command[1]+
						"';").then(returned => {
							message.reply(command[1]+" has this description:\n"+returned[0].description);
						});
					}else if(command[1]){
						message.reply("I did not recognice the command "+command[1]);
					}else{
						message.reply("All public commands: "+publicCommands.join(", ")+"\n"+
							     "Write !help [a command] to see that command's description.");
					}
					break;
				case "prepare":
					message.react("%E2%8F%AF").then(messageReaction => {
						messageReaction.on = function(){
							message.content = message.content.replace("!prepare ", "");
							client.emit("message", message);
						}
					});
					break;
				case "count":
					runSQL("UPDATE count SET count=(count+1);").then(returned => {});
					runSQL("SELECT * FROM count").then(returned => {
						message.reply("The count is now at "+returned[0].count);
					}, returned => {
						message.reply("Counting failed. Contact administrators");
						tellMe("Count error");
					});
					break;
				case "openPM":
					if(command[1] === undefined){
						tellMe(message.author.username+" has opened a PM");
						message.author.send("Hello there");
					}else{
						client.users.fetch(command[1]).then(user => {
							user.send("Hi there!\nThis message was sent to you by "+message.author.username)
						});
					}
					break;
				//argumentless
				case "magic8ball":
					runSQL("SELECT ball FROM ball ORDER BY RAND() LIMIT 1;").then(returned => {
						message.reply(returned[0].ball);
					});
					break;
				case "fish":
					let roll = Math.floor(Math.random()*20)+1;
					if(roll === 20){
						message.reply("You rolled a natural twenty. Fetching keyword. . .");
						runSQL("SELECT triggers FROM reply ORDER BY RAND() LIMIT 1;").then(function(returned){
							if(message.guild !== null){
								message.author.send("Your keyword is: "+returned[0].triggers);
							}else{
								message.reply("Your keyword is: "+returned[0].triggers);
							}
						});
					}else{
						message.reply("You rolled a nat "+roll+", which sadly is not enough for anything.");
					}
					break;
				case "picOfTheDay":
					sendhttpsRequest({host: "api.nasa.gov",
							  path: "/planetary/apod?api_key=hZLeoMoQXjEAaUqCzM2ZGmaylTCkND4oMCnGxuPD", 
							  method: "GET"}).then(returned => {
						message.reply("**"+returned.title+"**\n"+returned.explanation);
						message.reply({files:[returned.url]});
					});
					break;
				//argumented
				case "spell":
					getSpellThings(command.slice(1).join("+")).then(returned => {
						splitText(returned).forEach(function(item){
							message.reply(item);
						});
					}, returned => {
						message.reply("Couldn't find that spell.");
					});
					break;
				case "sitat":
					let name = command.slice(1).join(" ");
					if(validNames.includes(name)){
						runSQL("SELECT sitat, navn FROM sitat WHERE navn='"+name+
						"' ORDER BY RAND() LIMIT 1;").then(function(returned){
							message.reply(returned[0].navn+": "+returned[0].sitat);
						});
					}else if(name === "navn"){
						runSQL("SELECT DISTINCT navn FROM sitat;").then(function(returned){
							let names = [];
							returned.forEach(function(name){
								names.push(name.navn);
							})
							message.reply("Vi har sitat fra: "+names.join(", "));
						});
					}else if(name){
						 message.reply("Couldn't find that person (please use capital letters)");
					}else{
						runSQL("SELECT sitat, navn FROM sitat ORDER BY RAND() LIMIT 1;")
						.then(function(returned){
							message.reply(returned[0].navn+": "+returned[0].sitat);
						});
					}
					break;
				case "remindMe":
					runSQL("INSERT INTO countdown VALUES ('"+message.author.id+"', '"+command[1]+
							"', '"+command.slice(2).join(" ")+"');").then(function(){
						message.reply("I will be shure to message you that in "+
						(new Date(command[1]).getTime()-new Date().getTime())/1000+" seconds.");
						client.setTimeout(function(id, due, message){
							client.users.fetch(id).then(user => {
								user.send(message)
								runSQL("DELETE FROM countdown WHERE id = '"+id+
								       "' AND due = '"+due+"';").then(returned => {});
							});
						}, new Date(command[1]).getTime()-new Date().getTime(), 
								message.author.id, command[1], command.slice(2).join(" "));
					});
					break;
				case "def":
					if(command[1]){
						define(command[1], command[2]).then(returned => {
							let response = "**"+returned.word+"**\n";
							for(meaning in returned.meaning){
								returned.meaning[meaning].forEach((word, index) => {
									response += "**"+meaning+"**: "+
										word.definition+"\n";
									if(word.example){response += "Example: "+word.example+"\n";}
								});
							}
							if(returned.phonetic){response += "Uttale: "+returned.phonetic}
							if(returned.origin){response += "\nOrigin: "+returned.origin}
							if(returned.pronunciation){
								response += "\nLydfil: ";
								message.reply(response, {files: [returned.pronunciation]})
							}else{
								message.reply(response);
							}
						}, returned => {
							message.reply("Couldn't find that word.");
						});
					}else{
						message.reply("Please follow !def with a word to define");
					}
					break;
				case "tell":
					if(Number.isNaN(parseInt(command[1]))){
						runSQL("SELECT id FROM people WHERE navn='"+command[1]+"';").then(idOfReciever=>{
							runSQL("SELECT navn FROM people WHERE id='"+message.author.id+"';").then(nameOfSender=>{
								client.users.fetch(idOfReciever[0].id).then(user => {
									user.send(nameOfSender[0].navn+" just sent you the following message:\n"+
										  command.slice(2).join(" "));
								});
							});
						});
					}else{
						if(client.channels.get(command[1])){
							runSQL("SELECT navn FROM people WHERE id='"+message.author.id+"';").then(nameOfSender=>{
								client.channels.get(command[1]).send(nameOfSender[0].navn+
									" just sent the following message here:\n"+command.slice(2).join(" "));
							});
						}
					}
					break;
			}
		}else if(privateCommands.includes(keyword) && adminIDs.includes(message.author.id)){
			//private commands
			if(message.guild !== null){
				console.log("Attempting to run private command "+message.content+" on the server "+
				message.guild.name+" for "+message.author.username);
			}else{
				console.log("Attempting to run private command "+message.content+" in a dm for "+
					    message.author.username);
			}
			switch(keyword){
				case "play":
					if(command[1] === "list"){
						tellMe("We have the following clips to offer: ");
						clipNames.forEach(clipName => {
							tellMe(clipName).then(message => {
								message.react("%E2%8F%AF").then(messageReaction => {
									messageReaction.on = function(){
										if(connected){
											client.voice.connections.first().play("./data/"+clipName+".mp3");
										}
									}
									messageReaction.off = function(){
										if(client.voice.connections.first().dispatcher){
											client.voice.connections.first().dispatcher.end();
										}
									}
								});
							});
							
						});
					}else if(command[1] === "stop"){
						if(client.voiceConnections.first().dispatcher){
							client.voiceConnections.first().dispatcher.end();
						}else{
							message.reply("I am not currently playing a clip");
						}
					}else if(clipNames.includes(command[1])){
						client.voice.connections.first().play("./data/"+command[1]+".mp3");
					}else{
						message.reply("Couldn't find that clip");
					}
					break;
				/*case "say":
					if(connected){
						command.slice(1).forEach(word => {
							define(word).then(returned => {
								let link = returned.pronunciation;
								console.log(link, typeof(link));
								client.voiceConnections.first().playArbitraryInput(link);
								console.log(link, typeof(link));
							}, returned => {
								message.reply("Couldn't find the word: "+word);
							});
						});
					}else{
						message.reply("Bot is not in a call");
					}
					//client.voiceConnections.first().playFile("./National - Anthem.mp3");
					break;*/
				case "me":
					message.channel.send("Bot controll claimed by Jakob!");
					iDecide = true;
					break;
				case "us":
					message.channel.send("Bot retaken by the people!");
					iDecide = false;
					break;
				case "suicide":
					client.destory();
					process.exit();
					break;
				case "runSQL":
					try{
						runSQL(command.slice(1).join(" ")).then(returned =>{
							//console.log(returned);
							if(returned.length > 0){
								console.log(returned[0]);
								let returnString = Object.keys(returned[0]).join("\t\t") + "\n";
								returned.forEach(function(item, index){
									returnString += Object.values(item).join("\t\t") + "\n";
									//tellMe(JSON.stringify(item));
								});
								returnString = returnString.replace(/\*/g, "\*");
								splitText(returnString).forEach(chunk => {
									message.reply(chunk);
								});
							}
						});
					}catch(e){
						message.reply("Something went wrong. error message: "+e)
					}
					break;
				case "test":
					tellMe("@everyone God morgen! Det er uke [week], ha en fin mandag.\n(husk å refresh boligsøknad for de av dere som skal det)");
					
					/*if(command[1] === "set"){
						process.env[command[2]] = command[3];
						tellMe("Set property"+command[2]+" with value "+command[3]);
					}else if(command[1] === "get"){
						tellMe(process.env[command[2]]);
					}*/
					/*client.channels.get("530443400185643016").join().then(connection => {
						console.log("connected");
						connection.playFile("./National - Anthem.mp3");
					}).catch(console.error);
					*/
					//client.voiceConnections.first().playArbitraryInput("https://github.com/jlien11/Test-Platform/raw/master/National%20-%20Anthem.mp3");
					/*sendhttpRequest("http://open.spotify.com/track/6rqhFgbbKwnb9MLmUQDhG6").then(returned => {
						console.log(returned);
					});
					https://developer.spotify.com/documentation/web-api/
					https://developer.spotify.com/documentation/web-api/reference-beta/
					https://api.spotify.com/v1/tracks/6gf5PPir6CwXMF991iOHI6?Authorization=
					*/
					//client.voiceConnections.first().playArbitraryInput("https://github.com/jlien11/Test-Platform/raw/master/National%20-%20Anthem.mp3");
					/*define(command[1]).then(returned => {
						console.log(returned);
						//client.voiceConnections.first().playArbitraryInput(returned.pronunciation);
					}, returned => {});*/
					//client.voiceConnections.first().playArbitraryInput("https://github.com/jlien11/Test-Platform/raw/master/poodllfile5cfd8a3d3bd561%20(1).mp3");
					//message.react(":play_pause:").then(returned => {});
					break;
			}
		}
	}else if(!message.author.bot){
		if(message.channel.type === "dm" && message.author.id !== myId){//tellMe when bot pmed
			tellMe(message.author.username+" just wrote this to me:\n"+message.content);
		}
		//Phrases from reply database
		let cleanMessage = message.content.toLowerCase().replace("'", "\\'");
		message.mentions.users.forEach(user => {
			cleanMessage = cleanMessage.replace(user.id, "");
		});
		runSQL("SELECT responses FROM reply WHERE 0 < LOCATE(triggers, '"+cleanMessage+"');").then(returned => {
			for(let i = 0; i < returned.length; i++){
				splitText(returned[i].responses).forEach(function(item){
					message.channel.send(item);
				});
			}
		});
	}
});

//:play_pause: kode er messageReaction.emoji.identifier === "%E2%8F%AF"
//could be usefull later clipNames.includes(messageReaction.message.content)
client.on("messageReactionAdd", (messageReaction, user) => {
	if(messageReaction.me && messageReaction.count > 1){
		messageReaction.on();
	}
});

client.on("messageReactionRemove", (messageReaction, user) => {
	if(messageReaction.me && messageReaction.off){
		messageReaction.off();
	}
});

client.on("voiceStateUpdate", (oldState, newState) => {
	if(oldState.id === myId && oldState.channel === null && newState.channel !== null){
		newState.channel.join().then(voiceConnection => {
			console.log("Successfully joined "+voiceConnection.channel.name+" on "+voiceConnection.channel.guild.name);
			connected = true;
		});
	}else if(oldState.id === myId && oldState.channel !== null && newState.channel === null){
		oldState.channel.leave();
		console.log("Successfully left the voicechannel.");
		connected = false;
	}
	
	/*if(newMember.id === "265570029792133129" && oldMember.voiceChannel === undefined && newMember.voiceChannel !== undefined){
		newMember.voiceChannel.join().then(connection => {
			console.log("Successfully joined "+connection.channel.name+" on "+connection.channel.guild.name);
			connected = true;
		});
	}else if(newMember.id === "265570029792133129" && oldMember.voiceChannel !== undefined && 
	newMember.voiceChannel === undefined){
		oldMember.voiceChannel.leave();
		console.log("Successfully left the voicechannel.");
		connected = false;
	}*/
});

// THIS  MUST  BE  THIS  WAY
client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
