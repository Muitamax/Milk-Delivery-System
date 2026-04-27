const axios = require('axios');
const crypto = require('crypto');

class MpesaService {
  static async getAccessToken() {
    try {
      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        throw new Error('M-Pesa credentials not configured');
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get M-Pesa access token:', error);
      throw error;
    }
  }

  static async validateWebhookSignature(req) {
    try {
      // In production, implement proper signature validation
      // This is a placeholder for signature validation logic
      const signature = req.headers['x-mpesa-signature'];
      const body = JSON.stringify(req.body);
      
      if (!signature) {
        console.warn('No M-Pesa signature found in headers');
        return false;
      }

      // TODO: Implement actual signature validation using Safaricom public key
      // For now, we'll skip validation in development
      if (process.env.NODE_ENV === 'development') {
        return true;
      }

      // Production validation would go here
      return true;
    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  static async registerC2BUrls() {
    try {
      const accessToken = await this.getAccessToken();
      const shortcode = process.env.MPESA_SHORTCODE;
      const validationUrl = `${process.env.MPESA_CALLBACK_URL}/validate`;
      const confirmationUrl = `${process.env.MPESA_CALLBACK_URL}/confirm`;

      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
        {
          ShortCode: shortcode,
          ResponseType: 'Completed',
          ConfirmationURL: confirmationUrl,
          ValidationURL: validationUrl
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to register C2B URLs:', error);
      throw error;
    }
  }

  static async simulateC2BPayment(phoneNumber, amount, accountNumber) {
    try {
      const accessToken = await this.getAccessToken();
      const shortcode = process.env.MPESA_SHORTCODE;
      const commandId = 'CustomerPayBillOnline';

      const response = await axios.post(
        'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate',
        {
          CommandID: commandId,
          Amount: amount,
          Msisdn: phoneNumber,
          ShortCode: shortcode,
          BillRefNumber: accountNumber
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to simulate C2B payment:', error);
      throw error;
    }
  }

  static async validatePhoneNumber(phoneNumber) {
    // Validate Kenyan phone numbers for M-Pesa
    const kenyanPhoneRegex = /^\+254\d{9}$|^0\d{9}$|^254\d{9}$|^7\d{8}$/;
    return kenyanPhoneRegex.test(phoneNumber);
  }

  static formatPhoneNumber(phoneNumber) {
    // Format phone number to +254XXXXXXXXX format
    if (!phoneNumber) return null;
    
    const digits = phoneNumber.replace(/\D/g, '');
    
    if (digits.startsWith('254') && digits.length === 12) {
      return `+254${digits.slice(3)}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      return `+254${digits.slice(1)}`;
    } else if (digits.startsWith('7') && digits.length === 9) {
      return `+254${digits}`;
    }
    
    return phoneNumber;
  }

  static parseCallbackData(callbackData) {
    try {
      return {
        transactionType: callbackData.TransactionType,
        transID: callbackData.TransID,
        transTime: callbackData.TransTime,
        transAmount: parseFloat(callbackData.TransAmount),
        businessShortCode: callbackData.BusinessShortCode,
        billRefNumber: callbackData.BillRefNumber,
        invoiceNumber: callbackData.InvoiceNumber,
        orgAccountBalance: callbackData.OrgAccountBalance,
        thirdPartyTransID: callbackData.ThirdPartyTransID,
        phoneNumber: callbackData.PhoneNumber,
        firstName: callbackData.FirstName,
        middleName: callbackData.MiddleName,
        lastName: callbackData.LastName
      };
    } catch (error) {
      console.error('Failed to parse M-Pesa callback data:', error);
      throw error;
    }
  }
}

module.exports = MpesaService;
