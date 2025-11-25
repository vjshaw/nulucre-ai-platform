import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/.well-known/x402-services.json', (req, res) => {
  res.json({
    version: '1.0',
    merchant: {
      name: 'Nulucre',
      address: process.env.MERCHANT_WALLET_ADDRESS,
      network: process.env.NETWORK || 'base-sepolia',
      supportedTokens: ['USDC']
    },
    services: [
      {
        id: 'market-intelligence',
        endpoint: '/api/v1/data/market-intelligence',
        method: 'GET',
        description: 'Real-time market intelligence',
        pricing: { amount: '0.005', currency: 'USDC', unit: 'per_request' }
      }
    ]
  });
});

app.get('/api/v1/data/market-intelligence', (req, res) => {
  res.status(402).json({
    error: 'Payment Required',
    message: 'This endpoint requires x402 payment',
    paymentRequired: {
      amount: '0.005',
      currency: 'USDC',
      network: 'base-sepolia',
      merchantAddress: process.env.MERCHANT_WALLET_ADDRESS
    }
  });
});

app.listen(PORT, () => {
  console.log('🚀 Nulucre Server running on port', PORT);
  console.log('📡 Network:', process.env.NETWORK || 'base-sepolia');
  console.log('💰 Merchant:', process.env.MERCHANT_WALLET_ADDRESS);
  console.log('📖 Service Discovery: http://localhost:' + PORT + '/.well-known/x402-services.json');
});
