const axios = require('axios');
const db = require('../config/database');

class SMSService {
  static async sendDeliveryConfirmation(customer, delivery) {
    try {
      const message = `Your order of ${delivery.litres}L at Ksh ${delivery.price_per_litre}/L has been delivered. Total balance: Ksh ${delivery.new_balance}. Pay via Paybill ${process.env.BUSINESS_PAYBILL}, A/C ${customer.paybill_account}.`;

      return await this.sendSMS(customer.phone, message, delivery.id);
    } catch (error) {
      console.error('Failed to send delivery confirmation SMS:', error);
      throw error;
    }
  }

  static async sendPaymentConfirmation(customer, payment) {
    try {
      const message = `Payment of Ksh ${payment.amount} received. New balance: Ksh ${payment.new_balance}. Thank you for your business!`;

      return await this.sendSMS(customer.phone, message, null, payment.id);
    } catch (error) {
      console.error('Failed to send payment confirmation SMS:', error);
      throw error;
    }
  }

  static async sendSMS(phoneNumber, message, deliveryId = null, paymentId = null) {
    try {
      // Log SMS attempt
      const [smsLog] = await db('sms_logs')
        .insert({
          id: require('uuid').v4(),
          customer_id: deliveryId ? (await db('deliveries').where('id', deliveryId).first()).customer_id : null,
          delivery_id: deliveryId,
          payment_id: paymentId,
          phone_number: phoneNumber,
          message: message,
          status: 'pending',
          created_at: new Date()
        })
        .returning('*');

      // Send SMS via Africa's Talking API
      const response = await this.sendViaAfricaTalking(phoneNumber, message);

      // Update SMS log
      await db('sms_logs')
        .where('id', smsLog.id)
        .update({
          status: 'sent',
          api_response: JSON.stringify(response.data),
          sent_at: new Date(),
          updated_at: new Date()
        });

      return response.data;

    } catch (error) {
      // Log failure
      await db('sms_logs')
        .where('id', smsLog.id)
        .update({
          status: 'failed',
          api_response: JSON.stringify(error.response?.data || error.message),
          updated_at: new Date()
        });

      // Retry logic (1 retry)
      if (smsLog.retry_count === 0) {
        await db('sms_logs')
          .where('id', smsLog.id)
          .update({
            retry_count: 1,
            status: 'retry'
          });

        // Wait 5 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const retryResponse = await this.sendViaAfricaTalking(phoneNumber, message);
          
          await db('sms_logs')
            .where('id', smsLog.id)
            .update({
              status: 'sent',
              api_response: JSON.stringify(retryResponse.data),
              sent_at: new Date(),
              updated_at: new Date()
            });

          return retryResponse.data;
        } catch (retryError) {
          await db('sms_logs')
            .where('id', smsLog.id)
            .update({
              status: 'failed',
              api_response: JSON.stringify(retryError.response?.data || retryError.message),
              updated_at: new Date()
            });
        }
      }

      throw error;
    }
  }

  static async sendViaAfricaTalking(phoneNumber, message) {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!username || !apiKey) {
      throw new Error('Africa\'s Talking credentials not configured');
    }

    const url = `https://api.africastalking.com/version1/messaging`;

    const data = {
      username: username,
      to: phoneNumber,
      message: message,
      from: process.env.BUSINESS_NAME || 'MILKDEL'
    };

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'apiKey': apiKey
    };

    const response = await axios.post(url, new URLSearchParams(data), { headers });

    if (response.data.SMSMessageData.Recipients[0].status !== 'Success') {
      throw new Error(`SMS delivery failed: ${response.data.SMSMessageData.Recipients[0].statusCode}`);
    }

    return response;
  }

  static async getSMSLogs(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      let query = db('sms_logs')
        .select([
          'sms_logs.*',
          'customers.name as customer_name'
        ])
        .leftJoin('customers', 'sms_logs.customer_id', 'customers.id');

      // Apply filters
      if (filters.status) {
        query = query.where('sms_logs.status', filters.status);
      }

      if (filters.date_from) {
        query = query.where('sms_logs.created_at', '>=', filters.date_from);
      }

      if (filters.date_to) {
        query = query.where('sms_logs.created_at', '<=', filters.date_to);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count('* as total');
      const [{ total }] = await countQuery;

      // Get paginated results
      const logs = await query
        .orderBy('sms_logs.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        logs,
        pagination: {
          page,
          limit,
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Failed to fetch SMS logs:', error);
      throw error;
    }
  }
}

module.exports = SMSService;
