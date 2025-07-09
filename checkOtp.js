const axios = require('axios');
const { log } = console;

class OtpService {
  constructor() {
    this.apiConfig = {
      baseURL: process.env.API_BASE_URL,
      timeout: parseInt(process.env.API_TIMEOUT),
      maxRetries: parseInt(process.env.MAX_RETRIES)
    };
  }

  async fetchWithRetry(number, attempt = 1) {
    try {
      const response = await axios.get('/smsbox', {
        params: { number },
        timeout: this.apiConfig.timeout
      });

      if (!response.data?.data) {
        throw new Error('Invalid API response structure');
      }

      return this.parseResponse(number, response.data.data[0]);

    } catch (error) {
      if (attempt >= this.apiConfig.maxRetries) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 2000));
      return this.fetchWithRetry(number, attempt + 1);
    }
  }

  parseResponse(number, data) {
    return {
      success: true,
      number,
      time: data.date || new Date().toLocaleString('bn-BD'),
      otp: data.otp?.toString()?.trim() || null,
      message: data.sms || 'No message content',
      meta: {
        service: 'facebook',
        receivedAt: new Date().toISOString()
      }
    };
  }

  async fetchOtp(number) {
    try {
      return await this.fetchWithRetry(number);
    } catch (error) {
      log(`Final attempt failed for ${number}:`, error.message);
      return {
        success: false,
        number,
        error: error.message.includes('404') 
          ? 'Number not found in system' 
          : 'Temporary API issue'
      };
    }
  }
}

module.exports = new OtpService();
