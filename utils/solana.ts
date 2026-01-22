import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

const ALCHEMY_RPC = 'https://solana-mainnet.g.alchemy.com/v2/ZWNWr-7by0-zszR1wteqV';

const connection = new Connection(ALCHEMY_RPC, 'confirmed');

const TOKEN_SYMBOLS: Record<string, string> = {
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
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
    const prices = await fetchPrices(allMints);
    
    const solPrice = prices['So11111111111111111111111111111111111111112'] || 0;
    const solUSD = solAmount * solPrice;
    
    console.log('SOL price:', solPrice, 'SOL USD value:', solUSD);
    
    tokens.forEach(token => {
      const price = prices[token.mint] || 0;
      token.usdValue = token.amount * price;
      console.log('Token', token.mint, 'price:', price, 'USD value:', token.usdValue);
    });
    
    const tokensUSD = tokens.reduce((sum, token) => sum + token.usdValue, 0);
    const totalUSD = solUSD + tokensUSD;
    
    console.log('Total USD:', totalUSD);
    
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

async function fetchPrices(mints: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  
  try {
    const pricePromises = mints.map(async (mint) => {
      try {
        const url = `https://api.g.alchemy.com/prices/v1/ZWNWr-7by0-zszR1wteqV/tokens/by-address`;
        
        console.log(`Fetching price for ${TOKEN_SYMBOLS[mint] || mint.slice(0, 8)}...`);
        
        const response = await axios.post(url, {
          addresses: [
            {
              network: 'solana-mainnet',
              address: mint,
            }
          ]
        }, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`Alchemy response for ${TOKEN_SYMBOLS[mint] || mint}:`, JSON.stringify(response.data));
        
        if (response.data?.data && response.data.data.length > 0) {
          const tokenData = response.data.data[0];
          if (tokenData.prices && tokenData.prices.length > 0) {
            prices[mint] = parseFloat(tokenData.prices[0].value);
            console.log(`✓ Price for ${TOKEN_SYMBOLS[mint] || mint}: $${prices[mint]}`);
          }
        }
      } catch (err: any) {
        console.error(`Failed to fetch ${TOKEN_SYMBOLS[mint] || mint}:`, err.response?.data || err.message);
      }
    });
    
    await Promise.all(pricePromises);
  } catch (error: any) {
    console.error('Alchemy Prices API failed:', error.message);
  }
  
  console.log('Final prices:', prices);
  return prices;
}

