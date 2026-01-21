// Vercel Serverless Function
// Save this as: api/transactions.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const POOLS = [
    '7MMQtChjiwojUAhhZjeRrnnbn2VKfifKsUcAhfAjgUWZ',
    'CYPdPHMh1mD6ioFFVva7L2rFeKLBpcefVv5yv1p6iRqB',
    '97KS7T6e5KV9iVEGkxkKPNU6CbF7Eeei7dQ498xtSQx3',
    '82NacLStPnYswsaBnAA1Cf6ASqXY674mjLdRv7qd7CAX'
  ];

  const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ];

  async function fetchPoolSignatures(poolAddress, rpcUrl) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [poolAddress, { limit: 30 }]
        })
      });

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error(`Error fetching ${poolAddress}:`, error.message);
      return [];
    }
  }

  try {
    let allTransactions = [];
    
    // Try each RPC endpoint
    for (const rpcUrl of RPC_ENDPOINTS) {
      try {
        const promises = POOLS.map(pool => fetchPoolSignatures(pool, rpcUrl));
        const results = await Promise.all(promises);
        
        results.forEach(poolTxs => {
          if (poolTxs && Array.isArray(poolTxs)) {
            allTransactions.push(...poolTxs);
          }
        });

        if (allTransactions.length > 0) {
          break; // Success, no need to try other RPCs
        }
      } catch (error) {
        console.error(`RPC ${rpcUrl} failed:`, error.message);
        continue;
      }
    }

    // Sort by block time
    allTransactions.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

    // Return data
    res.status(200).json({
      success: true,
      transactions: allTransactions,
      count: allTransactions.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      transactions: [],
      count: 0
    });
  }
}