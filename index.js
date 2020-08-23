const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer');

const configBuffer = fs.readFileSync(path.join(__dirname, 'config.json'))
const config = JSON.parse(configBuffer.toString())
const LOGFILE = `likes.log`
const TIMEOUT = Number(config.delayPerAction * 1000)

class Bot {
  constructor(email, password) {
    this.likes = 0
    this.BASE_URL = 'https://instagram.com'
    this.email = email
    this.tags = config.tags
    this.password = password
    this.run();
  }
  getRandomTag() {
    return this.tags[Math.floor(Math.random() * this.tags.length)];
  }
  async run() {
    await this.init();
    await this.login();
    for (let i of Array(config.actions)) {
      await this.exploreTag();
      await this.page.waitFor(TIMEOUT)
    }
  }
  async init() {
    this.browser = await puppeteer.launch({ headless: false })
    this.page = await this.browser.newPage()
  }
  async login() {
    await this.page.goto(this.BASE_URL)
    await this.page.waitFor(`input[name="username"]`)
    await this.page.type(`input[name="username"]`, this.email, { delay: 50 })
    await this.page.type(`input[name="password"]`, this.password, { delay: 50 })
    await this.page.click(`button[type="submit"]`, { delay: 50 })
    await this.page.waitFor(`[aria-label="Home"]`)
  }
  async likePost(linkText) {
    const noLike = await this.page.$$(`article section:nth-child(1) button svg[aria-label="Like"]`)
    if (noLike) {
      try {
        await this.page.click(`article section:nth-child(1) button`)
        this.likes++
        if (linkText) {
          const p = path.join(__dirname, LOGFILE)
          fs.appendFileSync(p, `${linkText.trim()}\n`)
        }
        console.log('Likes:', this.likes)
      }
      catch {
        console.log('[*] Like error')
      }
    }
    await this.page.waitFor(1000)
  }
  async exploreTag() {
    const mostRecent = `h2:nth-child(2) + div a`
    await this.page.goto(`https://www.instagram.com/explore/tags/${this.getRandomTag()}/`)
    await this.page.waitFor(mostRecent)
    const images = await this.page.$$(mostRecent)
    // like first 3 images
    if (images?.length >= 3) {
      for (let img of [...images.slice(0, 3)]) {
        const link = await img.getProperty('href')
        const linkText = await link.jsonValue()
        img.click()
        await this.page.waitFor(`[role="dialog"] > div > button`)
        await this.page.waitFor(2000)
        await this.likePost(linkText)
        // close dialog 
        await this.page.click(`[role="dialog"] > div > button`)
        await this.page.waitFor(1000)
      }
    }
  }
}

const b = new Bot(config.email, config.password);