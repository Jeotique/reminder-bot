/**
 * Need to setup with a handler ?
 * https://github.com/Jeotique/devland.js-commands/tree/main/EXAMPLE
 * https://discord.gg/devland
 * https://github.com/Jeotique
 */


const Discord = require("devland.js")
const { Manager, Command } = require('devland.js-commands')
const ms = require('ms')
const mxtorie_db = require('mxtorie-db')
const db = new mxtorie_db('./db.json')
const client = new Discord.Client({
    intents: ['MESSAGE_CONTENT', 'GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES'],
    presence: {
        activities: [{
            name: "devland.js",
            type: 1,
            url: "https://twitch.tv/jeotique"
        }]
    }
})
client.commandsManager = new Manager({ defaultPrefix: '!', client: client })

client.connect("YOUR TOKEN HERE !")

client.on('ready', () => {
    console.log(`${client.user.tag} is now connected`)
    client.fetchGuilds().then(guilds => {
        console.log("I'm in " + guilds.size + " servers")
        guilds.map(guild => client.commandsManager.prefix[guild.id] = db.get(`${guild.id}_prefix`) || client.commandsManager.options.defaultPrefix)
    })
    setInterval(() => {
        db.all().filter(a => a.key.includes("_remind_")).map(element => {
            if (element.data.time > Date.now()) return
            else {
                db.delete(element.key)
                client.fetchUser(element.data.userId).then(user => {
                    user.send({
                        content: element.data.content ? element.data.content : undefined,
                        files: element.data.files ? element.data.files : undefined
                    }).then(() => console.log(`Reminder sended to ${user.tag} (${user.id})`)).catch(e => {
                        console.log(`Can't remind to ${user.tag} (${user.id})`)
                    })
                }).catch(e => {
                    console.log(`Can't remind to ${element.data.userId}`)
                })
            }
        })
    }, 2000)
})

client.on('guildAdded', guild => {
    console.log(`New server ! ${guild.name} with ${guild.member_count} users`)
    client.fetchUser(guild.ownerId).then(user => console.log(`Owner : ${user.tag} (${user.id})`))
    client.fetchGuilds().then(guilds => {
        console.log(`I'm now in ${guilds.size} servers`)
    })
    setTimeout(() => client.commandsManager.prefix[guild.id] = db.get(`${guild.id}_prefix`) || client.commandsManager.options.defaultPrefix, 150)
})
client.on('guildRemoved', guild => {
    console.log(`Lost a server... ${guild.id}`)
    client.fetchGuilds().then(guilds => {
        console.log(`I'm now in ${guilds.size} servers`)
    })
})
client.on('message', message => {
    if (message.author.bot) return
    if (!message.guildId) return message.reply(`You can use me on a server only`).catch(e => { })
    if (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) {
        let prefix = db.get(`${message.guildId}_prefix`) || client.commandsManager.options.defaultPrefix
        return message.reply(`My current prefix is : \`${prefix}\``).catch(e => { })
    }
})

let reminderCommand = new Command({
    client: client,
    name: "reminder",
    description: "Reminder in dm something later",
    startTyping: true,
    arguments: [{
        name: "time",
        type: "normal",
        required: true,
        invalidResponse: "Time invalid",
        missingResponse: "Time missing",
        long: false
    }, {
        name: "something",
        type: "normal",
        //required: true,
        invalidResponse: "The thing to remind is invalid",
        //missingResponse: "I can't remind you nothing lol :)",
        long: true
    }],
    /**
     * 
     * @param {Discord.Client} client 
     * @param {Discord.Message} message 
     * @param {string} time 
     * @param {string} something 
     */
    run: async (client, message, time, something) => {
        let parsedTime = ms(time)
        if (!parsedTime || isNaN(parsedTime)) return message.reply("The time is invalid").catch(e => { })
        if (message.attachments.size < 1 && !something) return message.reply("You must give me a text or a image to remind you").catch(e => { })
        let data = {
            userId: message.authorId,
            content: null,
            files: null,
            time: Date.now() + parsedTime
        }
        console.log(`Reminder added for ${message.author.tag} :`)
        console.log(`In : ${time}`)
        if (something) {
            data['content'] = something
            if (message.attachments.size > 0) data['files'] = message.attachments.map(attach => attach.url)
            db.set(`${message.authorId}_remind_${Date.now()}`, data)
            message.reply(`Okay ! I'll remind you this in your dm's in ${time}\n_make sure to have your dm's open_`).catch(e => { })
            console.log(`Content : ${data['content']}`)
            console.log(`Attachment : ${message.attachments.size}`)
        } else {
            data['files'] = message.attachments.map(attach => attach.url)
            db.set(`${message.authorId}_remind_${Date.now()}`, data)
            message.reply(`Okay ! I'll remind you this in your dm's in ${time}\n_make sure to have your dm's open_`).catch(e => { })
            console.log(`Attachment : ${message.attachments.size}`)
        }
    }
})

client.commandsManager.commands.set("reminder", reminderCommand)
client.commandsManager.aliases.set("remind", reminderCommand)
client.commandsManager.aliases.set("remindme", reminderCommand)
client.commandsManager.commands.set("prefix", new Command({
    client: client,
    name: "prefix",
    description: "Change the bot prefix",
    startTyping: true,
    arguments: [{
        name: "prefix",
        type: "normal",
        required: true,
        invalidResponse: "Prefix invalid",
        missingResponse: "Prefix missing",
        long: false
    }],
    permission: "MANAGE_GUILD",
    noPermissionReply: "You need the permission `manage guild`",
    /**
     * 
     * @param {Discord.Client} client 
     * @param {Discord.Message} message 
     * @param {string} prefix 
     */
    run: async (client, message, prefix) => {
        let current = client.commandsManager.prefix[message.guildId] || client.commandsManager.options.defaultPrefix
        if (current === prefix) return message.reply(`My prefix is already \`${prefix}\``)
        if(client.commandsManager.options.defaultPrefix !== prefix) db.set(`${message.guildId}_prefix`, prefix)
        else db.delete(`${message.guildId}_prefix`)
        client.commandsManager.prefix[message.guildId] = prefix
        message.reply(`My prefix is now \`${prefix}\``).catch(e => { })
    }
}))

process.on('rejectionHandled', () => { return })
process.on('unhandledRejection', () => { return })
process.on('uncaughtExceptionMonitor', () => { return })