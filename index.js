require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const otpService = require('./checkOtp');
const numbers = require('./numbers.json').numbers;

// Initialize
const bot = new TelegramBot(process.env.BOT_TOKEN, { 
  polling: true,
  filepath: false
});

// Enhanced Processing
class OtpProcessor {
  constructor() {
    this.queue = [];
    this.active = new Set();
    this.log = [];
  }

  async processNumber(number) {
    if (this.active.has(number)) return;
    
    this.active.add(number);
    const result = await otpService.fetchOtp(number);
    
    if (result.success && result.otp) {
      await this.notifySuccess(result);
    } else {
      this.logError(number, result.error);
    }

    this.active.delete(number);
  }

  async notifySuccess(data) {
    const message = `
🔐 *New OTP Received* 🔐
📱 *Number:* \`${data.number}\`
🕒 *Time:* ${data.time}
🔢 *OTP Code:* \`${data.otp}\`
📝 *Message:* ${data.message.slice(0, 100)}...
    `.trim();

    await bot.sendMessage(
      process.env.GROUP_ID, 
      message,
      { parse_mode: 'Markdown' }
    );
  }

  logError(number, error) {
    this.log.push({ number, error, timestamp: new Date() });
    console.error(`Error processing ${number}:`, error);
  }
}

// Execution
const processor = new OtpProcessor();
const processingInterval = setInterval(() => {
  numbers.forEach(num => processor.processNumber(num));
}, 15000);

// Cleanup
process.on('SIGINT', () => {
  clearInterval(processingInterval);
  console.log('Bot stopped gracefully');
  process.exit();
});
