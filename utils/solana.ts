import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

const ALCHEMY_RPC = 'https://solana-mainnet.g.alchemy.com/v2/ZWNWr-7by0-zszR1wteqV';

const connection = new Connection(ALCHEMY_RPC, 'confirmed');

const TOKEN_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'WIF',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'PYTH',
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6': 'TNSR',
};

export interface TokenData {
  mint: string;
  symbol: string;
  amount: number;
  decimals: number;
  usdValue: number;
}

export interface WalletData {
  address: string;
  solBalance: number;
  tokens: TokenData[];
  totalUSD: number;
}

export interface Transaction {
  signature: string;
  timestamp: number;
  type: 'send' | 'receive';
  amount: number;
  from?: string;
  to?: string;
}

export async function getWalletData(address: string): Promise<WalletData> {
  try {
    const publicKey = new PublicKey(address);
    
    console.log('Fetching balance for:', address);
    const solBalance = await connection.getBalance(publicKey);
    const solAmount = solBalance / 1e9;
    console.log('SOL balance:', solAmount);
    
    console.log('Fetching token accounts...');
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });
    
    console.log('Found token accounts:', tokenAccounts.value.length);
    
    const tokens: TokenData[] = tokenAccounts.value
      .map((account) => {
        const parsed = account.account.data.parsed.info;
        const amount = parsed.tokenAmount.uiAmount;
        
        if (amount === 0 || amount === null) return null;
        
        const mint = parsed.mint;
        const symbol = TOKEN_SYMBOLS[mint] || mint.slice(0, 4).toUpperCase();
        
        console.log('Token:', symbol, '(' + mint + ')', 'Amount:', amount);
        
        return {
          mint,
          symbol,
          amount,
          decimals: parsed.tokenAmount.decimals,
          usdValue: 0,
        };
      })
      .filter((token): token is TokenData => token !== null);
    
    console.log('Tokens with balance:', tokens.length);
    
    const allMints = ['So11111111111111111111111111111111111111112', ...tokens.map(t => t.mint)];
    console.log('[WALLET] Fetching prices for', allMints.length, 'tokens (1 SOL +', tokens.length, 'tokens)');
    const prices = await fetchPrices(allMints);
    
    const solPrice = prices['So11111111111111111111111111111111111111112'] || 0;
    const solUSD = solAmount * solPrice;
    
    console.log('[WALLET] SOL:', solAmount.toFixed(4), 'SOL x $' + solPrice.toFixed(2), '= $' + solUSD.toFixed(2));
    
    tokens.forEach(token => {
      const price = prices[token.mint] || 0;
      token.usdValue = token.amount * price;
      const symbol = token.symbol.padEnd(8, ' ');
      console.log(`[WALLET] ${symbol}:`, token.amount.toFixed(4).padStart(12), 'x $' + price.toFixed(6).padStart(10), '= $' + token.usdValue.toFixed(2).padStart(10));
    });
    
    const tokensUSD = tokens.reduce((sum, token) => sum + token.usdValue, 0);
    const totalUSD = solUSD + tokensUSD;
    
    console.log('[WALLET] ========================================');
    console.log('[WALLET] TOTAL VALUE: $' + totalUSD.toFixed(2));
    console.log('[WALLET]   - SOL Value:    $' + solUSD.toFixed(2));
    console.log('[WALLET]   - Tokens Value: $' + tokensUSD.toFixed(2));
    console.log('[WALLET] ========================================');
    
    return {
      address,
      solBalance: solAmount,
      tokens,
      totalUSD,
    };
  } catch (error) {
    console.error('Error in getWalletData:', error);
    throw new Error(`Failed to fetch wallet data: ${error}`);
  }
}

export async function getRecentTransactions(address: string, limit: number = 10): Promise<Transaction[]> {
  try {
    const publicKey = new PublicKey(address);
    
    console.log('Fetching recent transactions for:', address);
    
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    
    if (signatures.length === 0) {
      return [];
    }
    
    const transactions: Transaction[] = [];
    
    for (const sigInfo of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta) continue;
        
        const accountKeys = tx.transaction.message.accountKeys;
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        
        const accountIndex = accountKeys.findIndex(
          (key) => key.pubkey.toString() === address
        );
        
        if (accountIndex === -1) continue;
        
        const preBalance = preBalances[accountIndex];
        const postBalance = postBalances[accountIndex];
        const balanceChange = (postBalance - preBalance) / 1e9;
        
        if (Math.abs(balanceChange) < 0.000001) continue;
        
        transactions.push({
          signature: sigInfo.signature,
          timestamp: sigInfo.blockTime || 0,
          type: balanceChange > 0 ? 'receive' : 'send',
          amount: Math.abs(balanceChange),
        });
      } catch (err) {
        console.error('Error parsing transaction:', err);
      }
    }
    
    console.log(`Found ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  try {
    console.log('[PRICES] Fetching prices for', mints.length, 'tokens');
    
    // Try Jupiter Price API v1 first
    const mintIds = mints.join(',');
    const jupiterUrl = `https://price.jup.ag/v4/price?ids=${mintIds}`;
    
    console.log('[PRICES] Requesting:', jupiterUrl);
    
    const response = await axios.get(jupiterUrl, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('[PRICES] Response received');
    
    if (response.data?.data) {
      const priceData = response.data.data;
      
      for (const mint of mints) {
        if (priceData[mint]?.price) {
          prices[mint] = priceData[mint].price;
          const symbol = TOKEN_SYMBOLS[mint] || mint.slice(0, 6);
          console.log(`[PRICES] ${symbol}: $${prices[mint].toFixed(6)}`);
        } else {
          const symbol = TOKEN_SYMBOLS[mint] || mint.slice(0, 6);
          console.log(`[PRICES] No price found for ${symbol}`);
        }
      }
    }
    
    console.log('[PRICES] Successfully fetched', Object.keys(prices).length, '/', mints.length, 'prices');
  } catch (error: any) {
    console.error('[PRICES] API request failed:', error.message);
    if (error.response) {
      console.error('[PRICES] Status:', error.response.status);
      console.error('[PRICES] Data:', error.response.data);
    }
  }
  
  return prices;
}

