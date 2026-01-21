export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const POOLS = [
    '7MMQtChjiwojUAhhZjeRrnnbn2VKfifKsUcAhfAjgUWZ',
    'CYPdPHMh1mD6ioFFVva7L2rFeKLBpcefVv5yv1p6iRqB',
    '97KS7T6e5KV9iVEGkxkKPNU6CbF7Eeei7dQ498xtSQx3',
    '82NacLStPnYswsaBnAA1Cf6ASqXY674mjLdRv7qd7CAX'
  ];

  const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana',
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
      console.error(`Error fetching ${poolAddress}:`, error);
      return [];
    }
  }

  try {
    let allTransactions = [];
    
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
          break;
        }
      } catch (error) {
        console.error(`RPC ${rpcUrl} failed:`, error);
        continue;
      }
    }

    const uniqueTxs = Array.from(
      new Map(allTransactions.map(tx => [tx.signature, tx])).values()
    );
    
    uniqueTxs.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

    return new Response(JSON.stringify({
      success: true,
      transactions: uniqueTxs,
      count: uniqueTxs.length,
      timestamp: Date.now()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      transactions: [],
      count: 0
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
