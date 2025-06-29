import React, { useEffect, useState } from "react";
import { CardanoWallet, useAddress } from "@meshsdk/react";

const BLOCKFROST_API_KEY = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;
const BLOCKFROST_API_URL = "https://cardano-preview.blockfrost.io/api/v0"; // or testnet

async function fetchTxHashes(address: string) {
  const resp = await fetch(
    `${BLOCKFROST_API_URL}/addresses/${address}/transactions?order=desc&count=10`,
    {
      headers: { project_id: BLOCKFROST_API_KEY! },
    }
  );
  if (!resp.ok) throw new Error("Failed to fetch transactions");
  return resp.json();
}

async function fetchTxDetails(txHash: string) {
  const resp = await fetch(`${BLOCKFROST_API_URL}/txs/${txHash}`, {
    headers: { project_id: BLOCKFROST_API_KEY! },
  });
  if (!resp.ok) throw new Error("Failed to fetch transaction details");
  return resp.json();
}

export default function Transactions() {
  const address = useAddress();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);

    fetchTxHashes(address)
      .then(async (hashes) => {
        const details = await Promise.all(
          hashes.map((tx: any) => fetchTxDetails(tx.tx_hash))
        );
        setTxs(details);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Transaction History</h1>
      <div className="mb-6 flex justify-center">
        <CardanoWallet label="Connect Wallet" persist={true} />
      </div>

      {!address && <div>Please connect your wallet to see your transactions.</div>}
      {address && loading && <div>Loading transactions...</div>}
      {address && error && <div className="text-red-600">{error}</div>}

      {address && !loading && !error && (
        <ul>
          {txs.length === 0 && <li>No transactions found.</li>}
          {txs.map((tx: any) => (
            <li key={tx.hash}>
              <a
                href={`https://cardanoscan.io/transaction/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tx.hash.slice(0, 12)}...
              </a>{" "}
              <span>
                | Block: {tx.block_height} | Time:{" "}
                {new Date(tx.block_time * 1000).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
