import { Colors, Embed, EmbedBuilder, Message, MessageReaction, User } from "discord.js";
import { getHotReloadable } from "../loader.js";
import { eco, getUser, itemString } from "../util.js";

const prefix = ";"

async function handleCommand(msg: Message) {
    let hr = getHotReloadable()
    let { parseCommand, convertArgs } = hr.commands
    let { getUser, progressionInfo, getUnlockedItems } = hr.eco
    let u = await getUser(msg.author)
    if (Date.now() > u.messageCooldown) {
        u.messageCooldown = Date.now() + 10 * 1000

    }
    let prevTaxes = u.taxes
    let progress = u.progression
    let d = parseCommand(msg.content.slice(prefix.length), u.aliases)
    if (!d) return msg.reply(`Bruh`)
    let { command: cmd, args } = d
    if (cmd.devOnly && msg.author.id != "602651056320675840") return await msg.reply("Bruh")
    if (cmd.name in u.cooldowns && cmd.cooldown) {
        if (Date.now() < (u.cooldowns[cmd.name] ?? 0)) {
            let time = Math.ceil(((u.cooldowns[cmd.name] ?? 0) - Date.now()) / 1000)
            return await msg.reply(`Please wait ${time} seconds before using this command.`)
        }
    }
    if (cmd.precondition && !(await cmd.precondition(msg))) return
    u.cooldowns[cmd.name] = Date.now() + (cmd.cooldown ?? 0)
    try {
        let converted = await convertArgs(args, cmd.args, msg.client)
        console.log(converted)
        await cmd.run(msg, ...converted)
        if (u.progression > progress) {
            let unlocks = getUnlockedItems(progress, u.progression)
            let info = progressionInfo[u.progression]
            let embed = new EmbedBuilder()
                .setTitle(`Progression: ${info.title}`)
                .setDescription(info.description)
            if (unlocks.size > 0) {
                embed.addFields({ name: "Items Unlocked", value: unlocks.map((_, k) => itemString(k)).join("\n") })
            }
            await msg.reply({
                embeds: [embed]
            })
        }
        if (u.taxes > prevTaxes && u.taxes >= u.money.points / 8n) {
            await msg.reply(`Pay your taxes.`)
        }
    } catch (err) {
        console.error(err)
        if (!(err instanceof Error)) {
            return await msg.reply(`Unknown error.`)
        }
        let embed = new EmbedBuilder()
            .setTitle(err.name)
            .setDescription(err.message)
            .setColor(Colors.Red)
        await msg.reply({ embeds: [embed] })
    }
}

export default [
    async function messageCreate(msg: Message) {
        try {
            if (msg.author.bot) return;
            if (!msg.content.startsWith(prefix)) return;
            await handleCommand(msg);

        } catch (err) {
            console.error(err)
        }
    },
    async function messageUpdate(oldMsg: Message, msg: Message) {
        try {
            if (msg.author.bot) return;
            if (!oldMsg.content.startsWith(prefix)) return;
            if (!msg.content.startsWith(prefix)) return;
            await handleCommand(msg);

        } catch (err) {
            console.error(err)
        }
    },
    async function messageReactionAdd(reaction: MessageReaction, user: User) {
        if (user.id == reaction.message.author?.id) return
        if (!reaction.message.author) return
        console.log("h")
        let u = await getUser(reaction.message.author)
        u.money.points += 750n * u.getMul()
    }
]