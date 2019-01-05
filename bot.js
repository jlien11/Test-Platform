//The good stuff: 
//send message: message.channel.send("");
//reply to command message.reply("");

const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log('I am ready!');
});

var i = false;
client.on('message', message => {
    if (message.content === '!trist') {
        message.reply('Jakob er trist!');
    }else if(message.content === "!turn_on"){
        message.reply("turned on");
        i = true;
    }else if(message.content === "!turn_off"){
        message.reply("turned off");
        i = false;
    }else if(message.content === "!print"){
        message.reply(i);
    }else if(message.content === "!test1"){
        console.log("Im here now")
        message.channel.send("did this get through?")
    }
});

// THIS  MUST  BE  THIS  WAY
client.login(process.env.BOT_TOKEN);//BOT_TOKEN is the Client Secret
