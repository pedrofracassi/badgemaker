const Telegram = require('node-telegram-bot-api')
const { createCanvas, loadImage, ImageData } = require('canvas')
const RGBQuant = require('rgbquant')

const quants = {
  res: new RGBQuant({
    colors: require('./palettes.json').resistance.length,
    palette: require('./palettes.json').resistance
  }),
  enl: new RGBQuant({
    colors: require('./palettes.json').enlightened.length,
    palette: require('./palettes.json').enlightened
  })
}

const factions = {}

if (!process.env.TELEGRAM_TOKEN) {
  console.error('TELEGRAM_TOKEN environment variable is missing. Can\'t start.')
  process.exit(0)
}

const bot = new Telegram(process.env.TELEGRAM_TOKEN, { polling: true })

bot.on('message', async (msg) => {
  if (msg.photo) {
    if (factions[msg.chat.id]) {
      console.log(`Generating badge for ${msg.from.first_name} (${msg.from.username})...`)
      bot.sendChatAction(msg.chat.id, 'upload_photo').catch(console.error)
      const pictureCanvas = createCanvas(585, 585)
      const pictureCtx = pictureCanvas.getContext('2d')
      const { file_path } = await bot.getFile(msg.photo[msg.photo.length - 1].file_id)
      const picture = await loadImage(`https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file_path}`)
      pictureCtx.drawImage(picture, 0, 0, 585, 585)
      quants[factions[msg.chat.id]].sample(pictureCanvas)
      quants[factions[msg.chat.id]].palette(true)
      const reduced = new ImageData(new Uint8ClampedArray(quants[factions[msg.chat.id]].reduce(pictureCanvas)), 585)
      pictureCtx.putImageData(reduced, 0, 0)
      const finalCanvas = createCanvas(960, 960)
      const finalCtx = finalCanvas.getContext('2d')
      const frame = await loadImage(`./frames/${factions[msg.chat.id]}.png`)
      finalCtx.drawImage(pictureCanvas, 125, 125, 710, 710)
      finalCtx.drawImage(frame, 0, 0, 960, 960)
      factions[msg.chat.id] = null
      bot.sendPhoto(msg.chat.id, finalCanvas.toBuffer('image/png', { quality: 1 }))
    } else {
      bot.sendMessage(msg.chat.id, 'You have to tell me the faction first. Type /res or /enl to choose!').catch(console.log)
    }
  }
})

bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(msg.chat.id, 'Type /res or /enl to get started!').catch(console.log)
})

bot.onText(/\/(res|enl)/, async (msg, match) => {
  factions[msg.chat.id] = match[1]
  bot.sendMessage(msg.chat.id, 'Great! Now send me the picture you want to make the badge with. Square ones are  highly recommended, as rectangular ones will get squished.').catch(console.log)
})
