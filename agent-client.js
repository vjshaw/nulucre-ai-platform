// agent-client.js - Autonomous AI Agent with x402 Payment Capabilities
import { X402Client } from '@coinbase/x402-client';
import { Wallet } from 'ethers';

/**
 * Autonomous Trading Agent
 * Demonstrates how an AI agent can:
 * 1. Discover available services
 * 2. Make autonomous payment decisions
 * 3. Execute multi-step workflows with micropayments
 * 4. Track spending and optimize costs
 */
class TradingAgent {
  constructor(config) {
    this.name = config.name || 'TradingAgent-1';
    this.wallet = new Wallet(config.privateKey);
    this.baseUrl = config.baseUrl || 'https://nulucre.com';
    this.maxDailySpend = config.maxDailySpend || 10.0; // USDC
    this.spendingToday = 0;
    this.transactions = [];
    
    // Initialize x402 client
    this.client = new X402Client({
      privateKey: config.privateKey,
      network: 'base',
      facilitatorUrl: config.facilitatorUrl,
    });
    
    this.logger = this.initLogger();
  }

  initLogger() {
    return {
      info: (msg, data) => console.log(`[${this.name}] INFO:`, msg, data || ''),
      warn: (msg, data) => console.warn(`[${this.name}] WARN:`, msg, data || ''),
      error: (msg, data) => console.error(`[${this.name}] ERROR:`, msg, data || ''),
    };
  }

  /**
   * Discover available services from the platform
   */
  async discoverServices() {
    try {
      this.logger.info('Discovering available services...');
      const response = await fetch(`${this.baseUrl}/.well-known/x402-services.json`);
      const services = await response.json();
      
      this.logger.info('Services discovered:', {
        count: services.services.length,
        totalCost: this.calculateTotalCost(services.services),
      });
      
      return services;
    } catch (error) {
      this.logger.error('Service discovery failed:', error.message);
      throw error;
    }
  }

  calculateTotalCost(services) {
    return services.reduce((sum, s) => sum + parseFloat(s.pricing.amount), 0);
  }

  /**
   * Check if agent has sufficient budget for a payment
   */
  canAfford(amount) {
    const remaining = this.maxDailySpend - this.spendingToday;
    return remaining >= amount;
  }

  /**
   * Execute payment and track spending
   */
  async executePayment(endpoint, amount, method = 'GET', data = null) {
    if (!this.canAfford(amount)) {
      throw new Error(`Insufficient budget. Remaining: ${this.maxDailySpend - this.spendingToday} USDC`);
    }

    const startTime = Date.now();
    
    try {
      let response;
      
      if (method === 'GET') {
        response = await this.client.get(`${this.baseUrl}${endpoint}`);
      } else if (method === 'POST') {
        response = await this.client.post(`${this.baseUrl}${endpoint}`, data);
      }
      
      const duration = Date.now() - startTime;
      
      // Track transaction
      const transaction = {
        timestamp: new Date().toISOString(),
        endpoint,
        amount,
        duration: `${duration}ms`,
        status: 'success',
        requestId: response.headers?.['x-request-id'],
      };
      
      this.transactions.push(transaction);
      this.spendingToday += amount;
      
      this.logger.info('Payment successful:', {
        endpoint,
        cost: `${amount} USDC`,
        remaining: `${(this.maxDailySpend - this.spendingToday).toFixed(3)} USDC`,
      });
      
      return response.data;
    } catch (error) {
      this.logger.error('Payment failed:', {
        endpoint,
        error: error.message,
      });
      
      this.transactions.push({
        timestamp: new Date().toISOString(),
        endpoint,
        amount,
        status: 'failed',
        error: error.message,
      });
      
      throw error;
    }
  }

  /**
   * Autonomous workflow: Analyze market and make trading decision
   */
  async analyzeMarketAndDecide(symbol) {
    this.logger.info(`Starting market analysis for ${symbol}...`);
    
    try {
      // Step 1: Fetch market intelligence ($0.005)
      this.logger.info('Step 1: Fetching market data...');
      const marketData = await this.executePayment(
        `/api/v1/data/market-intelligence?symbol=${symbol}`,
        0.005
      );
      
      this.logger.info('Market data received:', {
        price: marketData.data.price,
        trend: marketData.data.signals.trend,
      });
      
      // Step 2: Decide if deeper analysis is needed
      if (marketData.data.signals.strength > 0.7) {
        this.logger.info('Strong signal detected, requesting sentiment analysis...');
        
        // Fetch news/social media data (hypothetical)
        const newsText = await this.getMarketNews(symbol);
        
        // Step 3: Get sentiment analysis ($0.02)
        const sentiment = await this.executePayment(
          '/api/v1/models/sentiment-analysis',
          0.02,
          'POST',
          { text: newsText }
        );
        
        this.logger.info('Sentiment analysis:', {
          sentiment: sentiment.data.sentiment,
          score: sentiment.data.score,
        });
        
        // Step 4: If sentiment is positive and trend is bullish, get price prediction
        if (sentiment.data.sentiment === 'positive' && marketData.data.signals.trend === 'bullish') {
          this.logger.info('Conditions favorable, requesting price prediction...');
          
          // Step 5: Get AI price prediction ($0.10)
          const prediction = await this.executePayment(
            '/api/v1/models/price-prediction',
            0.10,
            'POST',
            { 
              symbol,
              timeframe: '24h',
              features: {
                sentiment: sentiment.data.score,
                volume: marketData.data.volume,
                volatility: marketData.data.signals.volatility,
              }
            }
          );
          
          this.logger.info('Price prediction:', {
            current: prediction.data.currentPrice,
            predicted: prediction.data.predictedPrice,
            change: `${prediction.data.change.toFixed(2)}%`,
            confidence: `${(prediction._meta.confidence * 100).toFixed(1)}%`,
          });
          
          // Step 6: Make trading decision
          const decision = this.makeDecision(marketData, sentiment, prediction);
          
          return {
            symbol,
            decision,
            confidence: prediction._meta.confidence,
            totalSpent: 0.005 + 0.02 + 0.10,
            analysis: {
              marketData,
              sentiment,
              prediction,
            },
          };
        }
      }
      
      // Not enough confidence to proceed with expensive predictions
      return {
        symbol,
        decision: 'HOLD',
        reason: 'Signal not strong enough for deep analysis',
        totalSpent: 0.005,
      };
      
    } catch (error) {
      this.logger.error('Analysis workflow failed:', error);
      throw error;
    }
  }

  /**
   * Simple decision-making logic
   */
  makeDecision(marketData, sentiment, prediction) {
    const priceChange = prediction.data.change;
    const confidence = prediction._meta.confidence;
    
    if (priceChange > 5 && confidence > 0.7 && sentiment.data.sentiment === 'positive') {
      return 'BUY';
    } else if (priceChange < -5 && confidence > 0.7) {
      return 'SELL';
    } else {
      return 'HOLD';
    }
  }

  /**
   * Simulate getting market news (in reality would call another service)
   */
  async getMarketNews(symbol) {
    return `${symbol} shows strong momentum. Institutional investors are accumulating. 
    Technical indicators suggest breakout potential. Volume increasing significantly.`;
  }

  /**
   * Batch analysis for multiple symbols (cost-optimized)
   */
  async analyzeBatch(symbols) {
    this.logger.info(`Starting batch analysis for ${symbols.length} symbols...`);
    
    const results = [];
    
    for (const symbol of symbols) {
      try {
        // Only do cheap market intelligence check first
        const marketData = await this.executePayment(
          `/api/v1/data/market-intelligence?symbol=${symbol}`,
          0.005
        );
        
        // Only proceed with expensive analysis if signals are strong
        if (marketData.data.signals.strength > 0.8) {
          const fullAnalysis = await this.analyzeMarketAndDecide(symbol);
          results.push(fullAnalysis);
        } else {
          results.push({
            symbol,
            decision: 'SKIP',
            reason: 'Weak signals',
            totalSpent: 0.005,
          });
        }
        
        // Budget check
        if (this.spendingToday >= this.maxDailySpend * 0.9) {
          this.logger.warn('Approaching daily budget limit, stopping batch analysis');
          break;
        }
        
      } catch (error) {
        this.logger.error(`Failed to analyze ${symbol}:`, error.message);
        results.push({
          symbol,
          decision: 'ERROR',
          error: error.message,
          totalSpent: 0,
        });
      }
    }
    
    return results;
  }

  /**
   * Research mode: Deep dive into a topic using research papers
   */
  async researchTopic(topic) {
    this.logger.info(`Researching topic: ${topic}`);
    
    try {
      const papers = await this.executePayment(
        `/api/v1/data/research-papers?query=${encodeURIComponent(topic)}&limit=5`,
        0.01
      );
      
      this.logger.info('Research papers retrieved:', {
        count: papers.data.length,
        total: papers._meta.total,
      });
      
      return papers.data;
    } catch (error) {
      this.logger.error('Research failed:', error);
      throw error;
    }
  }

  /**
   * Get spending report
   */
  getSpendingReport() {
    const successful = this.transactions.filter(t => t.status === 'success');
    const failed = this.transactions.filter(t => t.status === 'failed');
    
    return {
      agent: this.name,
      wallet: this.wallet.address,
      period: 'today',
      budget: {
        max: this.maxDailySpend,
        spent: this.spendingToday,
        remaining: this.maxDailySpend - this.spendingToday,
        utilization: `${((this.spendingToday / this.maxDailySpend) * 100).toFixed(1)}%`,
      },
      transactions: {
        total: this.transactions.length,
        successful: successful.length,
        failed: failed.length,
        successRate: `${((successful.length / this.transactions.length) * 100).toFixed(1)}%`,
      },
      endpoints: this.groupByEndpoint(),
      timestamp: new Date().toISOString(),
    };
  }

  groupByEndpoint() {
    const grouped = {};
    
    this.transactions
      .filter(t => t.status === 'success')
      .forEach(t => {
        if (!grouped[t.endpoint]) {
          grouped[t.endpoint] = { count: 0, totalCost: 0 };
        }
        grouped[t.endpoint].count++;
        grouped[t.endpoint].totalCost += t.amount;
      });
    
    return grouped;
  }

  /**
   * Cost-optimized decision: Only use expensive services when necessary
   */
  async smartAnalysis(symbol) {
    // Always start with cheap market data
    const marketData = await this.executePayment(
      `/api/v1/data/market-intelligence?symbol=${symbol}`,
      0.005
    );
    
    // Calculate expected value of deeper analysis
    const signalStrength = marketData.data.signals.strength;
    
    // If signal is weak, don't spend more money
    if (signalStrength < 0.5) {
      return { decision: 'PASS', reason: 'Weak signal, not worth deeper analysis' };
    }
    
    // Medium signal: Use sentiment analysis ($0.02) to decide if prediction is worth it
    if (signalStrength < 0.8) {
      const newsText = await this.getMarketNews(symbol);
      const sentiment = await this.executePayment(
        '/api/v1/models/sentiment-analysis',
        0.02,
        'POST',
        { text: newsText }
      );
      
      // Only proceed with expensive prediction if sentiment confirms signal
      if (sentiment.data.sentiment === marketData.data.signals.trend) {
        const prediction = await this.executePayment(
          '/api/v1/models/price-prediction',
          0.10,
          'POST',
          { symbol, timeframe: '24h' }
        );
        
        return {
          decision: this.makeDecision(marketData, sentiment, prediction),
          totalSpent: 0.005 + 0.02 + 0.10,
        };
      }
      
      return {
        decision: 'HOLD',
        reason: 'Sentiment does not confirm signal',
        totalSpent: 0.005 + 0.02,
      };
    }
    
    // Strong signal: Go straight to prediction
    const prediction = await this.executePayment(
      '/api/v1/models/price-prediction',
      0.10,
      'POST',
      { symbol, timeframe: '24h' }
    );
    
    return {
      decision: this.makeDecision(marketData, null, prediction),
      totalSpent: 0.005 + 0.10,
    };
  }
}

// ============================================
// Example Usage
// ============================================

async function main() {
  // Initialize agent with wallet
  const agent = new TradingAgent({
    name: 'AlphaTrader-001',
    privateKey: process.env.AGENT_PRIVATE_KEY,
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    maxDailySpend: 5.0, // 5 USDC per day
  });

  console.log('\n🤖 AI Trading Agent Starting...');
  console.log(`💳 Wallet: ${agent.wallet.address}`);
  console.log(`💰 Daily Budget: ${agent.maxDailySpend} USDC\n`);

  try {
    // Discover available services
    await agent.discoverServices();
    
    // Example 1: Single symbol analysis
    console.log('\n📊 Example 1: Single Symbol Analysis');
    const btcAnalysis = await agent.analyzeMarketAndDecide('BTC');
    console.log('Decision:', btcAnalysis.decision);
    console.log('Spent:', `$${btcAnalysis.totalSpent.toFixed(3)}`);
    
    // Example 2: Batch analysis (cost-optimized)
    console.log('\n📊 Example 2: Batch Analysis');
    const symbols = ['ETH', 'SOL', 'AVAX', 'MATIC'];
    const batchResults = await agent.analyzeBatch(symbols);
    console.log('Analyzed symbols:', batchResults.length);
    console.log('Decisions:', batchResults.map(r => `${r.symbol}: ${r.decision}`));
    
    // Example 3: Smart analysis (adaptive spending)
    console.log('\n📊 Example 3: Smart Analysis (Adaptive)');
    const smartResult = await agent.smartAnalysis('BNB');
    console.log('Smart decision:', smartResult.decision);
    console.log('Spent:', `$${smartResult.totalSpent.toFixed(3)}`);
    
    // Example 4: Research mode
    console.log('\n📚 Example 4: Research Mode');
    const papers = await agent.researchTopic('DeFi yield farming strategies');
    console.log('Papers found:', papers.length);
    
    // Print spending report
    console.log('\n💰 Spending Report:');
    const report = agent.getSpendingReport();
    console.log(JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.error('\n❌ Agent failed:', error.message);
  }
}

// Run the agent
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TradingAgent };
