// api/transactions.js
module.exports = async (req, res) => {
  // CORS headers
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

  // Multiple RPC endpoints for redundancy
  const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com'
  ];

  async function fetchPoolSignatures(poolAddress, rpcUrl) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            poolAddress, 
            { 
              limit: 50
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.error('RPC Error:', data.error);
        return [];
      }
      
      return data.result || [];
    } catch (error) {
      console.error(`Error fetching from ${rpcUrl}:`, error.message);
      return [];
    }
  }

  try {
    let allTransactions = [];
    let successfulFetch = false;
    
    // Try each RPC endpoint until one works
    for (const rpcUrl of RPC_ENDPOINTS) {
      console.log(`Trying RPC: ${rpcUrl}`);
      
      const promises = POOLS.map(pool => fetchPoolSignatures(pool, rpcUrl));
      const results = await Promise.all(promises);
      
      // Combine all results
      results.forEach((poolTxs, index) => {
        if (poolTxs && Array.isArray(poolTxs) && poolTxs.length > 0) {
          console.log(`Pool ${index + 1}: ${poolTxs.length} transactions`);
          allTransactions.push(...poolTxs);
          successfulFetch = true;
        }
      });

      // If we got data, break the loop
      if (successfulFetch) {
        console.log(`Successfully fetched ${allTransactions.length} total transactions`);
        break;
      }
    }

    if (!successfulFetch) {
      throw new Error('Failed to fetch from all RPC endpoints');
    }

    // Remove duplicates based on signature
    const uniqueTxs = Array.from(
      new Map(allTransactions.map(tx => [tx.signature, tx])).values()
    );
    
    // Sort by blockTime (newest first)
    uniqueTxs.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

    console.log(`Returning ${uniqueTxs.length} unique transactions`);

    res.status(200).json({
      success: true,
      transactions: uniqueTxs,
      count: uniqueTxs.length,
      timestamp: Date.now(),
      pools: POOLS.length
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      transactions: [],
      count: 0
    });
  }
};
