import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { MetaHeader } from "~~/components/MetaHeader";
import DisperseForm from "~~/components/disperse/DisperseForm";

const Home: NextPage = () => {
  const { isConnected } = useAccount();

  return (
    <>
      <MetaHeader
        title="cheapDisperse | Batch ETH & Token Transfers"
        description="Gas-optimized batch ETH and ERC-20 token disperse tool. Send to up to 1,000 recipients in a single transaction."
      />

      <div className="min-h-screen bg-base-200">
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-2">
              cheap<span className="text-primary">Disperse</span>
            </h1>
            <p className="text-base-content/60 text-lg">
              Batch ETH &amp; token transfers — gas‑optimized
            </p>
          </div>

          {/* Connect wallet prompt */}
          {!isConnected ? (
            <div className="card bg-base-100 shadow-lg">
              <div className="card-body items-center text-center py-16">
                <div className="text-6xl mb-4">🔌</div>
                <h2 className="card-title text-2xl">Connect your wallet</h2>
                <p className="text-base-content/60 max-w-sm">
                  Connect a wallet to start dispersing ETH or ERC-20 tokens to multiple recipients in a single transaction.
                </p>
                <div className="mt-6">
                  {/* RainbowKit ConnectButton is rendered via the Scaffold-ETH header */}
                  <p className="text-sm text-base-content/40">
                    Use the connect button in the top navigation bar.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DisperseForm />
          )}

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm text-base-content/50">
            <div className="badge badge-outline badge-lg gap-1">⚡ Gas-optimized</div>
            <div className="badge badge-outline badge-lg gap-1">📦 Up to 1,000 recipients</div>
            <div className="badge badge-outline badge-lg gap-1">🪙 ETH &amp; ERC-20</div>
            <div className="badge badge-outline badge-lg gap-1">🔒 Non-custodial</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
