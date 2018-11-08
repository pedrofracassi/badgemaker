const Telegram = require('node-telegram-bot-api')
const { createCanvas, loadImage, ImageData } = require('canvas')
const RGBQuant = require('rgbquant')

const quants = {
  resistance: new RGBQuant({
    colors: require('./palettes.json').resistance.length,
    palette: require('./palettes.json').resistance
  })
}

const canvasSize = 960

if (!process.env.TELEGRAM_TOKEN) {
  console.error('TELEGRAM_TOKEN environment variable is missing. Can\'t start.')
  process.exit(0)
}

const bot = new Telegram(process.env.TELEGRAM_TOKEN, { polling: true })

bot.on('message', async (msg) => {
  if (msg.photo) {
    // Initialize canvas
    console.log(`Generating badge for ${msg.from.first_name} (${msg.from.username})...`)
    const pictureCanvas = createCanvas(585, 585)
    const pictureCtx = pictureCanvas.getContext('2d')

    // Get the image, draw and reduce it
    const { file_path } = await bot.getFile(msg.photo[msg.photo.length - 1].file_id)
    const picture = await loadImage(`https://api.telegram.org/file/bot${process.env.TELEGRAM_TOKEN}/${file_path}`)
    pictureCtx.drawImage(picture, 0, 0, 585, 585)

    quants.resistance.sample(pictureCanvas)
    quants.resistance.palette(true)
    const reduced = new ImageData(new Uint8ClampedArray(quants.resistance.reduce(pictureCanvas)), 585)
    pictureCtx.putImageData(reduced, 0, 0)

    const finalCanvas = createCanvas(960, 960)
    const finalCtx = finalCanvas.getContext('2d')
    const frame = await loadImage('./frames/resistance.png')
    finalCtx.drawImage(pictureCanvas, 125, 125, 710, 710)
    finalCtx.drawImage(frame, 0, 0, 960, 960)

    bot.sendPhoto(msg.chat.id, finalCanvas.toBuffer('image/jpeg', { quality: 1 }))
  }
})

bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(msg.chat.id, 'Send me the picture you want to make a badge with.').catch(console.log)
})
