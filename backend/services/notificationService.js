// Service de notifications (SMS et Push)
// À compléter avec Twilio et Firebase plus tard

const notificationService = {
  async sendSMS(phoneNumber, message) {
    console.log(`[SMS] À ${phoneNumber}: ${message}`);
    // TODO: Intégrer Twilio
    return true;
  },

  async sendPushNotification(deviceToken, title, body, data = {}) {
    console.log(`[PUSH] À ${deviceToken}: ${title} - ${body}`);
    // TODO: Intégrer Firebase
    return true;
  },

  async notifyAlert(alert, recipients) {
    const message = `⚠️ ALERTE: ${alert.message}`;
    
    for (const recipient of recipients) {
      if (recipient.telephone) {
        await this.sendSMS(recipient.telephone, message);
      }
      if (recipient.firebase_token) {
        await this.sendPushNotification(recipient.firebase_token, 'Alerte Agro-Pastorale', alert.message);
      }
    }
  }
};

module.exports = notificationService;