import request from "requestv2"


let settings = FileLib.read("StarMod","./settings.json")

if (settings) {
    settings = JSON.parse(settings)
}

else {
    settings = {"enable": true, "apikey": "", "gay": false, "mode": "both", "position": "head", "size": 12, "grow": false, "walls": false, "shadow": false, "box": true}
}

let skywarsLevelDict = {}
let bedwarsLevelDict = {}
let rateLimitList = []
let keychecked = false
let modeDict = null

register("worldLoad", worldLoad)
register("step", getPlayers)
register("renderWorld", renderTag)


register("chat", (event) => {
    let unformattedMessage = ChatLib.removeFormatting(ChatLib.getChatMessage(event))
    settings["apikey"] = unformattedMessage.substring(20)
    ChatLib.chat("§6§lStar§e§lMod§7 API key has been set!")
    FileLib.write("StarMod","./settings.json", JSON.stringify(settings, null, 4))
}).setCriteria("&aYour new API key is &r&b").setParameter('start')


function worldLoad() {
    if (!keychecked && settings["enable"]) {
        if (settings["apikey"]) {
            request("https://api.hypixel.net/key?key=" + settings["apikey"])
                .catch(function(response) {
                    if (response == '{"success":false,"cause":"Invalid API key"}')
                        ChatLib.chat("§6§lStar§e§lMod§f API key is set but not valid, set with '/api new' or '/starmod apikey'.")

                })
        }
        
        else {
            ChatLib.chat("§e§lStar§6§l§lMod§f API key is not set! set with '/api new' or '/starmod apikey'.")
        }

        keychecked = true
    }

    // Clear names that failed fetching from API

    for (key in skywarsLevelDict) {
        if (skywarsLevelDict[key] == "§d§l[API]") {
            delete skywarsLevelDict[key]
        }
    }

    for (key in bedwarsLevelDict) {
        if (bedwarsLevelDict[key] == "§d§l[API]") {
            delete bedwarsLevelDict[key]
        }
    }
}


const ChatComponentText = Java.type("net.minecraft.util.ChatComponentText")

function getPlayers() {
    if (settings["enable"]) {

        rateLimitList = rateLimitList.filter(time => time + 60000 > Date.now())

        if (ChatLib.removeFormatting(Scoreboard.getLines().length > 4 && Scoreboard.getTitle()) == "SKYWARS" && Scoreboard.getLineByIndex(2).toString().includes("Mode")) { // If player in skywars game
            modeDict = skywarsLevelDict
        }

        else if (ChatLib.removeFormatting(Scoreboard.getLines().length > 4 && Scoreboard.getTitle()) == "BED WARS" && !Scoreboard.getLineByIndex(2).toString().includes("Total")) { // If player in bedwars game
            modeDict = bedwarsLevelDict
        }

        else {
            modeDict = null
            return
        }

        let formattedplayers = []
        TabList.getNames().forEach(name => {
            formattedplayers.push(name)
        })

        let unformattedplayers = []
        TabList.getUnformattedNames().forEach(name => {
            unformattedplayers.push(name)
        })

        let nameFormatDict = {}
        unformattedplayers.forEach((unformattedplayers, i) => {
            nameFormatDict[unformattedplayers] = formattedplayers[i]
        })

        Client.getConnection().func_175106_d().forEach(entity => { // player
            if ([0, 1].includes(entity.func_178853_c())) { // ping
                unFormattedName = entity.func_178845_a().getName()

                if (entity.func_178853_c() == 0) {
                    nameFormatDict[Player.getName()] = nameFormatDict[unFormattedName]
                    unFormattedName = Player.getName()
                }

                if (unFormattedName in modeDict) {
                    if (["both", "tablist"].includes(settings["mode"])) {
                        if (!nameFormatDict[unFormattedName].includes(modeDict[unFormattedName])) {
                            if (settings["gay"]) {
                                if (nameFormatDict[unFormattedName].split(" ").length > 1) {
                                    let brokenName = splitWithTail(nameFormatDict[unFormattedName], " ", 1)
                                    newName = new ChatComponentText(modeDict[unFormattedName] + " " + brokenName[0] + " " + colourizeText(["§c","§6","§e","§a","§b","§d","§5"], ChatLib.removeFormatting(brokenName[1])))
                                }
                                else {
                                    newName = new ChatComponentText(modeDict[unFormattedName] + " " + colourizeText(["§c","§6","§e","§a","§b","§d","§5"], ChatLib.removeFormatting(nameFormatDict[unFormattedName])))
                                }

                            }
                            else {
                                newName = new ChatComponentText(modeDict[unFormattedName] + " " + nameFormatDict[unFormattedName])
                            }
                            
                            entity.func_178859_a(newName)
                        }

                        else {
                            if (entity.func_178850_i()) { // has team
                                teamFormat = entity.func_178850_i().func_96668_e() // team format

                                let brokenName = splitWithTail(nameFormatDict[unFormattedName], " ", 1)

                                if (settings["gay"]) {
                                    if (!nameFormatDict[unFormattedName].includes(ChatLib.removeFormatting(teamFormat))) {
                                        newName = new ChatComponentText(brokenName[0] + " " + teamFormat + brokenName[1]) // [level] + " " + team beginning + "everything after that"
                                        entity.func_178859_a(newName)
                                    }
                                }

                                else {
                                    if (!nameFormatDict[unFormattedName].includes(teamFormat)) {
                                        newName = new ChatComponentText(brokenName[0] + " " + teamFormat + ChatLib.removeFormatting(brokenName[1])) // [level] + " " + team beginning + "everything after that"
                                        entity.func_178859_a(newName)
                                    }
                                }
                            }
                        }
                    }
                }

                else {
                    getfromAPI(unFormattedName)
                }
            }
        })
    }
}


function getfromAPI(username) {
    if (rateLimitList.length < 96) {
        modeDict[username] = "" // Set to nothing to prevent other threads from running this multiple times.
        rateLimitList.push(Date.now())
        request("https://api.hypixel.net/player?key=" + settings["apikey"] +"&name=" + username)
        .then(function(response) {
            var data = JSON.parse(response)
            try {
                skywarsLevelDict[username] = skywarsColourAndFormat(~~getSkywarsLevel(data.player.stats.SkyWars.skywars_experience))
            }

            catch (error) {
                if (error == 'TypeError: Cannot read property "stats" from null') {
                    skywarsLevelDict[username] = "§c§l[NICKED]"
                }

                else {
                    skywarsLevelDict[username] = "§d§l[OTHER]" // If the data can't be found in the API e.g. They haven't yet played a game.
                }
            }

            try {
                bedwarsLevelDict[username] = bedwarsColourAndFormat(getLevelForExp(data.player.stats.Bedwars.Experience)) // Gets experience instead of just level as the nick detector won't work. 
            }

            catch (error) {
                if (error == 'TypeError: Cannot read property "stats" from null') {
                    bedwarsLevelDict[username] = "§c§l[NICKED]"
                }

                else {
                    bedwarsLevelDict[username] = "§d§l[OTHER]" // If the data can't be found in the API e.g. They haven't yet played a game.
                }
            }
        })
        .catch(function() { // if JSON parse fails. e.g. If packet is dropped or if ratelimited.
            skywarsLevelDict[username] = "§d§l[API]"
            bedwarsLevelDict[username] = "§d§l[API]"
            })
    }
}


function renderTag() {
    if (modeDict && settings["enable"] && ["both", "player"].includes(settings["mode"])) {
        World.getAllPlayers().forEach(entity => {
            if (entity.getName() in modeDict) {
                let str = modeDict[entity.getName()]

                if (entity.getName() === Player.getName() || str == '') return // Don't draw tag on your player or blank string.
                if (!settings["walls"] && entity.getEntity().func_82150_aj()) return // If player isn't using walls dont draw an invis players tag.

                let position

                if (settings["position"] == "feet") {
                    position = -0.5
                }
            
                else {
                    position = 2.65
                }

                const partialTicks = Tessellator.getPartialTicks()

                x = (entity.getLastX() + (entity.getX() - entity.getLastX()) * partialTicks) - (Player.getPlayer().field_70142_S + (Player.getPlayer().field_70165_t-Player.getPlayer().field_70142_S) * partialTicks)
                y = (entity.getLastY() + (entity.getY() - entity.getLastY()) * partialTicks) - (Player.getPlayer().field_70137_T + (Player.getPlayer().field_70163_u-Player.getPlayer().field_70137_T) * partialTicks)
                z = (entity.getLastZ() + (entity.getZ() - entity.getLastZ()) * partialTicks) - (Player.getPlayer().field_70136_U + (Player.getPlayer().field_70161_v-Player.getPlayer().field_70136_U) * partialTicks)
                drawString(str, x, y, z, position, settings["size"], settings["grow"], settings["walls"], settings["shadow"], settings["box"])
            }
        })
    }
}


const GL11 = Java.type("org.lwjgl.opengl.GL11")
const tessellator = Java.type("net.minecraft.client.renderer.Tessellator").func_178181_a()
const DefaultVertexFormats = Java.type("net.minecraft.client.renderer.vertex.DefaultVertexFormats")

const renderManager = Renderer.getRenderManager()
const fontRenderer = Renderer.getFontRenderer()
const worldRenderer = tessellator.func_178180_c()

function drawString(str, x, y, z, position, scale, grow, walls, shadow, box) {
    let size

    if (grow) {
        let camDistance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2)) // Get distance from camera to player.

        if (camDistance < 10) {
            size = 10
        }

        else {
            size = camDistance
        }
    }
    
    else {
        size = 10
    }

    
    if (position > 0) {
       position += size / 500 * scale // set orign point to bottom


    }

    else {
        position -= size / 4096 * scale // set orign point to top
    }

    lScale = size / 4096 * scale

    GL11.glPushMatrix()
    GL11.glTranslatef(x, y + position, z)
    GL11.glRotatef(-renderManager.field_78735_i, 0.0, 1.0, 0.0)
    GL11.glRotatef(renderManager.field_78732_j, 1.0, 0.0, 0.0)
    GL11.glScalef(-lScale, -lScale, lScale)

    if (walls) {
        GL11.glDisable(GL11.GL_DEPTH_TEST)
    }

    GL11.glDisable(GL11.GL_LIGHTING)
    GL11.glEnable(GL11.GL_BLEND)
    GL11.glBlendFunc(GL11.GL_SRC_ALPHA, GL11.GL_ONE_MINUS_SRC_ALPHA)

    let textWidth = fontRenderer.func_78256_a(str)

    if (box) {
        let tagWidth = textWidth / 2
        net.minecraft.client.renderer.GlStateManager.func_179090_x()
        worldRenderer.func_181668_a(7, DefaultVertexFormats.field_181706_f)
        worldRenderer.func_181662_b((-tagWidth - 2), (-1), 0.01).func_181666_a(0.0, 0.0, 0.0, .25).func_181675_d()
        worldRenderer.func_181662_b((-tagWidth - 2), 8, 0.01).func_181666_a(0.0, 0.0, 0.0, .25).func_181675_d()
        worldRenderer.func_181662_b((tagWidth + 1), 8, 0.01).func_181666_a(0.0, 0.0, 0.0, .25).func_181675_d()
        worldRenderer.func_181662_b((tagWidth + 1), (-1), 0.01).func_181666_a(0.0, 0.0, 0.0, .25).func_181675_d()
        tessellator.func_78381_a()
        net.minecraft.client.renderer.GlStateManager.func_179098_w()
    }
    fontRenderer.func_175065_a(str, -textWidth / 2, 0, Renderer.color(255,255,255,255), shadow)
    GL11.glPopMatrix()

    if (walls) {
        GL11.glEnable(GL11.GL_DEPTH_TEST)
    }
}


register('command', ...args => {
    if (args[0] == "toggle") {
        settings["enable"] = !settings["enable"]
        if (settings["enable"]) {
            ChatLib.chat("§6§lStar§e§lMod §ahas been set to §lenabled§a.")
        }
        else {
            ChatLib.chat("§6§lStar§e§lMod §chas been set to §ldisabled§c.")
        }
    }

    else if (args.length == 2 && args[0] == "mode" && ["both", "tablist", "player"].includes(args[1])) {
        settings["mode"] = args[1]
        ChatLib.chat("§6§lStar§e§lMod§7 Mode has been set to §f§l" + args[1] + '§7.')
    }

    else if (args.length == 2 && args[0] == "apikey") {
        settings["apikey"] = args[1]
        ChatLib.chat("§6§lStar§e§lMod§7 API key has been set!")
    }

    else if (args[0] == "gay") {
        settings["gay"] = !settings["gay"]
        if (settings["gay"]) {
            ChatLib.chat("§6§lStar§e§lMod§7 " + colourizeText(["§c","§6","§e","§a","§b","§d","§5"],"Gay mode has been set to") +  " §a§lenabled§b.")
        }
        else {
            ChatLib.chat("§6§lStar§e§lMod§7 " + colourizeText(["§c","§6","§e","§a","§b","§d","§5"],"Gay mode has been set to") +  " §c§ldisabled§d.")
        }
    }


    else if (args[0] == "tag") {
        if (args.length == 3 && args[1] == "position" && ["head", "feet"].includes(args[2])) {
            settings["position"] = args[2]
            ChatLib.chat("§6§lStar§e§lMod§7 Tag position has been set to §f§l" + args[2] + '§7.')
        }

        else if (args.length == 3 && args[1] == "size" && !isNaN(args[2]) && args[2] >= 0 ) {
            settings["size"] = args[2]
            ChatLib.chat("§6§lStar§e§lMod§7 Tag size has been set to §f§l" + args[2] + '§7.')
        }

        else if (args.length == 2 && args[1] == "grow") {
            settings["grow"] = !settings["grow"]
            if (settings["grow"]) {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag grow has been set to §a§lenabled§7.")
            }
            else {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag grow has been set to §c§ldisabled§7.")
            }
        }

        else if (args.length == 2 && args[1] == "walls") {
            settings["walls"] = !settings["walls"]
            if (settings["walls"]) {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag show through walls set to §a§lenabled§7.")
            }
            else {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag show through walls set to §c§ldisabled§7.")
            }
        }

        else if (args.length == 2 && args[1] == "shadow") {
            settings["shadow"] = !settings["shadow"]
            if (settings["shadow"]) {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag shadow has been set to §a§lenabled§7.")
            }
            else {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag shadow has been set to §c§ldisabled§7.")
            }
        }

        else if (args.length == 2 && args[1] == "box") {
            settings["box"] = !settings["box"]
            if (settings["box"]) {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag box has been set to §a§lenabled§7.")
            }
            else {
                ChatLib.chat("§6§lStar§e§lMod§7§7 Tag box has been set to §c§ldisabled§7.")
            }
        }

        else {
            ChatLib.chat(colourizeText(["§6§m","§e§m"], ChatLib.getChatBreak()))
            ChatLib.chat(new Message(ChatLib.getCenteredText("§6§lPlayer tag options")))
            ChatLib.chat(colourizeText(["§6§m","§e§m"], ChatLib.getChatBreak()))
            ChatLib.chat("  &6/starmod tag position [position] &7- &eEither 'head' or 'feet'.")
            ChatLib.chat("  &6/starmod tag size [number] &7- &eSets the size of the tags.")
            ChatLib.chat("  &6/starmod tag grow &7- &eToggles if tags grow in distance.")
            ChatLib.chat("  &6/starmod tag walls &7- &eToggles if tags show through walls.")
            ChatLib.chat("  &6/starmod tag shadow &7- &eToggles drop shadow on tags.")
            ChatLib.chat("  &6/starmod tag box &7- &eToggles box around tags.")
            ChatLib.chat(colourizeText(["§6§m","§e§m"], ChatLib.getChatBreak()))
        }

    }


    else {
        ChatLib.chat(colourizeText(["§c§m","§6§m","§e§m","§a§m","§b§m","§d§m","§5§m"], ChatLib.getChatBreak()))
        ChatLib.chat(new Message(ChatLib.getCenteredText("§6§lStar§e§lMod§7")))
        ChatLib.chat(colourizeText(["§c§m","§6§m","§e§m","§a§m","§b§m","§d§m","§5§m"], ChatLib.getChatBreak()))
        ChatLib.chat("  &6/starmod toggle &7- &eToggles on and off the mod.")
        ChatLib.chat("  &6/starmod mode [mode] &7- &eEither 'tablist', 'player' or 'both'.")
        ChatLib.chat("  &6/starmod apikey [apikey] &7- &eAdd your API key.")
        ChatLib.chat("  &6/starmod help &7- &eView this settings page.")
        ChatLib.chat("  &6/starmod tag &7- &eView the tag settings page.")
        ChatLib.chat("  &6/starmod gay &7- " + colourizeText(["§c","§6","§e","§a","§b","§d","§5"],"Toggles on and off rainbow tablist."))
        ChatLib.chat(colourizeText(["§c§m","§6§m","§e§m","§a§m","§b§m","§d§m","§5§m"], ChatLib.getChatBreak()))
    }

    FileLib.write("StarMod","./settings.json", JSON.stringify(settings, null, 4))
}).setName('starmod').setName('sm')


function skywarsColourAndFormat(level) {
    if (level >= 100) {
        return colourizeText(["§c§l","§6§l","§e§l","§a§l","§b§l","§d§l","§5§l"], "[" + level + "✰]")
    }
    if (level >= 50) {
        return colourizeText(["§c","§6","§e","§a","§b","§d","§5"], "[" + level + "✰]")
    }
    
    if (level >= 45) {
        return "§5[" + level + "✰]"
    }

    if (level >= 40) {
        return "§9[" + level + "✰]"
    }

    if (level >= 35) {
        return "§d[" + level + "✰]"
    }

    if (level >= 30) {
        return "§4[" + level + "✰]"
    }

    if (level >= 25) {
        return "§3[" + level + "✰]"
    }

    if (level >= 20) {
        return "§2[" + level + "✰]"
    }
    
    if (level >= 15) {
        return "§b[" + level + "✰]"
    }

    if (level >= 10) {
        return "§6[" + level + "✰]"
    }
    
    if (level >= 5) {
        return "§f[" + level + "✰]"
    }

    return "§7[" + level + "✰]"
}


function bedwarsColourAndFormat(level) {
    if (level >= 2900) {
        return colourizeText(["§e","§6","§c", "§4"], "[" + level + "⚝]", true)
    }

    if (level >= 2900) {
        return colourizeText(["§b","§3","§9", "§1"], "[" + level + "⚝]", true)
    }

    if (level >= 2800) {
        return colourizeText(["§a","§2","§6", "§e"], "[" + level + "⚝]", true)
    }

    if (level >= 2700) {
        return colourizeText(["§e","§f","§8"], "[" + level, true)  + "⚝]"
    }

    if (level >= 2600) {
        return colourizeText(["§4","§c","§d", "§5"], "[" + level + "⚝]", true)
    }

    if (level >= 2500) {
        return colourizeText(["§f","§a","§2", "§8"], "[" + level, true) + "⚝]"
    }

    if (level >= 2400) {
        return colourizeText(["§b","§f","§7", "§8"], "[" + level + "⚝]", true)
    }

    if (level >= 2300) {
        return colourizeText(["§5","§d","§6"], "[" + level, true) + "§e⚝]"
    }
    
    if (level >= 2200) {
        return colourizeText(["§6", "§f", "§b"], "[" + level, true) + "§3⚝]"
    }

    if (level >= 2100) {
        return colourizeText(["§f","§e","§6"], "[" + level, true) + "⚝]"
    }

    if (level >= 2000) {
        return colourizeText(["§8","§7","§f","§f","§7","§7","§8"], "[" + level + "✪]")
    }

    if (level >= 1900) {
        return "§7[§5" + level + "§8✪§7]"
    }

    if (level >= 1800) {
        return "§7[§9" + level + "§1✪§7]"
    }

    if (level >= 1700) {
        return "§7[§d" + level + "§5✪§7]"
    }

    if (level >= 1600) {
        return "§7[§c" + level + "§4✪§7]"
    }

    if (level >= 1500) {
        return "§7[§3" + level + "§9✪§7]"
    }

    if (level >= 1400) {
        return "§7[§a" + level + "§2✪§7]"
    }

    if (level >= 1300) {
        return "§7[§b" + level + "§3✪§7]"
    }

    if (level >= 1200) {
        return "§7[§e" + level + "§6✪§7]"
    }

    if (level >= 1100) {
        return "§7[§f" + level + "§7✪]"
    }

    if (level >= 1000) {
        return colourizeText(["§c","§6","§e","§a","§b","§d","§5"], "[" + level + "✫]")
    }

    if (level >= 900) {
        return "§5[" + level + "✫]"
    }

    if (level >= 800) {
        return "§9[" + level + "✫]"
    }

    if (level >= 700) {
        return "§d[" + level + "✫]"
    }

    if (level >= 600) {
        return "§4[" + level + "✫]"
    }

    if (level >= 500) {
        return "§3[" + level + "✫]"
    }

    if (level >= 400) {
        return "§2[" + level + "✫]"
    }

    if (level >= 300) {
        return "§b[" + level + "✫]"
    }

    if (level >= 200) {
        return "§6[" + level + "✫]"
    }

    if (level >= 100) {
        return "§f[" + level + "✫]"
    }

    return "§7[" + level + "✫]"
}


function colourizeText(colours, str, double = false) {
    let tempstring = ''

    if (double) {
        inc = .5
    }

    else {
        inc = 1
    }

    for (let i = 0, x = 0; i < str.length; i++, x += inc) {
        if (x == colours.length) x = 0
        tempstring += colours[~~x] + str[i]
    }

    return tempstring
}


// https://stackoverflow.com/questions/5582248/split-a-string-only-the-at-the-first-n-occurrences-of-a-delimiter
function splitWithTail(str, delim, count){
    let arr = str.split(delim),
        result = arr.splice(0, count)

    result.push(arr.join(' ')) // result is ["Split", "this,", "but not this"]
    return result
}


// Taken from https://hypixel.net/threads/skywars-level-from-api.1912987/post-19293045
function getSkywarsLevel(xp) {
    let xps = [0, 20, 70, 150, 250, 500, 1000, 2000, 3500, 6000, 10000, 15000]
	if (xp == undefined) {
		return 1;
	}
    if (xp >= 15000) {
        return (xp - 15000) / 10000 + 12;
    } else {
        for(i = 0; i < xps.length; i++) {
            if(xp < xps[i]) {
                return i + (xp - xps[i-1]) / (xps[i] - xps[i-1]);
            }
        }
    }
}


// Taken from https://hypixel.net/threads/calculate-bedwars-level-from-exp-javascript.2022078/post-15211250
const EASY_LEVELS = 4;
const EASY_LEVELS_XP = 7000;
const XP_PER_PRESTIGE = 96 * 5000 + EASY_LEVELS_XP;
const LEVELS_PER_PRESTIGE = 100;
const HIGHEST_PRESTIGE = 10;

function getExpForLevel(level){
    if(level == 0) return 0;

    var respectedLevel = getLevelRespectingPrestige(level);
    if(respectedLevel > EASY_LEVELS){
        return 5000;
    }

    switch(respectedLevel){
        case 1:
            return 500;
        case 2:
            return 1000;
        case 3:
            return 2000;
        case 4:
            return 3500;
    }
    return 5000;
}


function getLevelRespectingPrestige(level){
    if(level > HIGHEST_PRESTIGE * LEVELS_PER_PRESTIGE){
        return level - HIGHEST_PRESTIGE * LEVELS_PER_PRESTIGE;
    }
    else {
        return level % LEVELS_PER_PRESTIGE;
    }
}


function getLevelForExp(exp){
    var prestiges = Math.floor(exp / XP_PER_PRESTIGE);
    var level = prestiges * LEVELS_PER_PRESTIGE;
    var expWithoutPrestiges = exp - (prestiges * XP_PER_PRESTIGE);

    for(let i = 1; i <= EASY_LEVELS; ++i){
        var expForEasyLevel = getExpForLevel(i);
        if(expWithoutPrestiges < expForEasyLevel){
            break;
        }
        level++;
        expWithoutPrestiges -= expForEasyLevel;
    }
    //returns players bedwars level, remove the Math.floor if you want the exact bedwars level returned
    return level + Math.floor(expWithoutPrestiges / 5000); 
}