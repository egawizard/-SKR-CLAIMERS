export default async function handler(req, res) {
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
    'https://rpc.ankr.com/solana',
    'https://solana-api.projectserum.com'
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
    
    for (const rpcUrl of RPC_ENDPOINTS) {
      try {
        const promises = POOLS.map(pool => fetchPoolS
