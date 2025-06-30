RatifyV1

RatifyV1 is a decentralized crowdfunding platform built on the Cardano blockchain that brings transparency and ease to the donor industry. It empowers donors to track donations and campaign statuses seamlessly without needing to navigate complex blockchain explorers. The platform also provides automated refunds for unsuccessful campaigns, enhancing trust and user experience.


Project Overview
The donor industry faces significant challenges related to transparency, trust, and ease of use. RatifyV1 addresses these by leveraging Cardano’s secure and scalable blockchain infrastructure to:

Provide real-time campaign status updates directly on the platform.

Allow donors to view their contributions without manual blockchain exploration.

Enable instant refunds if crowdfunding campaigns fail.

Facilitate smooth interaction with smart contracts via Mesh SDK.

Key Features
Wallet Integration: Connect Cardano wallets seamlessly using Mesh SDK.

Campaign Management: Create, view, and manage crowdfunding campaigns.

Donation Tracking: Donors can track their contributions and campaign progress in real-time.

Automated Refunds: Donors can claim refunds easily if campaigns do not reach their goals.

Creator Withdrawals: Campaign creators can withdraw funds once goals are met.

Transparent & Secure: All transactions and campaign data are recorded on Cardano blockchain.

Architecture
text
+-------------------+          +--------------------+          +--------------------+
|                   |          |                    |          |                    |
|      Frontend     | <------> |    Mesh SDK Layer   | <------> |  Cardano Blockchain |
|  (Next.js + React)|          | (Wallet & Tx Logic) |          |  (Smart Contracts)  |
|                   |          |                    |          |                    |
+-------------------+          +--------------------+          +--------------------+

Backend (Optional): API server for off-chain data storage & verification
Frontend: Built with Next.js and React, providing UI and wallet connection.

Mesh SDK: Handles wallet integration, transaction building, and submission.

Smart Contracts: Aiken/Plutus contracts deployed on Cardano handle escrow, minting, and campaign logic.

Backend (Optional): Stores campaign metadata, donation records, and syncs on-chain data.

Tech Stack
Frontend: Next.js, React, TypeScript, Tailwind CSS

Wallet Integration: Mesh SDK (@meshsdk/react)

Smart Contracts: Aiken / Plutus on Cardano

Backend: Node.js/Express (optional, for metadata storage)

APIs: Blockfrost for blockchain data verification

Deployment: Vercel for frontend

Getting Started
Prerequisites
Node.js (v16+ recommended)

Yarn or npm

Cardano wallet (e.g., Nami, Eternl) for testing

Access to Blockfrost API (for backend or frontend verification)

Installation
bash
git clone https://github.com/AbYahaya/RatifyV1.git
cd RatifyV1/frontend
npm install
Running Locally
bash
npm run dev
Open http://localhost:3000 in your browser.

Connect your Cardano wallet via the wallet connection UI.

Create or browse campaigns, donate, request refunds, or withdraw funds.

Deployment
The frontend is deployed on Vercel.

Ensure environment variables for Blockfrost API keys and contract addresses are configured.

Run npm run build and npm run start or deploy directly via Vercel CLI or dashboard.

Usage
Connect Wallet: Use the wallet connection button to connect your Cardano wallet.

Create Campaign: Fill in campaign details and submit to create a new campaign.

Donate: Select a campaign and donate ADA securely via smart contract escrow.

Track Donations: View your donation history and campaign statuses.

Refund: Claim refunds on failed campaigns with one click.

Withdraw: Campaign creators can withdraw funds after successful campaigns.

Folder Structure
text
/frontend
  /components       # React components (Donate, Refund, Withdraw, WalletConnection, etc.)
  /lib              # Mesh SDK helpers, transaction builders
  /pages             # Next.js pages (index, campaign/[id], transactions, 404, etc.)
  /styles           # Global and component styles (Tailwind CSS)
  /hooks            # Custom React hooks (e.g., useWallet)
  /api              # Backend API routes (if any)
  next.config.ts    # Next.js configuration
  package.json      # Dependencies and scripts
Contributing
Contributions are welcome! Please:

Fork the repository.

Create a feature branch (git checkout -b feature/your-feature).

Commit your changes (git commit -m 'Add your feature').

Push to branch (git push origin feature/your-feature).

Open a pull request.

Please follow the existing code style and write tests where applicable.

License
This project is licensed under the MIT License.

Team
Yahaya Abdulrauf – Blockchain Developer, Software Engineer, Product Manager

Samir Idris – Cardano Smart Contract Developer

Team Name: NexWave

Acknowledgments
Cardano Foundation and Mesh SDK team for their excellent tools and documentation.

Open source contributors whose libraries and examples helped build this project.
