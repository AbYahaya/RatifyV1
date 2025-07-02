# RatifyV1 - Decentralized Crowdfunding on Cardano

[**🌐 Live Site → https://ratifyv.vercel.app**](https://ratifyv.vercel.app)

**NOTE:** We are on **Preview Testnet**, therefore you can interact with the app on the Cardano Preview Testnet.

---

## Overview

**RatifyV1** is a decentralized crowdfunding platform built on the **Cardano blockchain**, designed to bring transparency, accountability, and simplicity to the donor industry. The platform empowers donors to track their contributions and campaign statuses seamlessly—without navigating complex blockchain explorers. It also offers automated refunds for unsuccessful campaigns, fostering trust and enhancing user experience.

In addition, the platform mints **NFTs as receipts** for both campaign creation and individual donations. These NFTs serve as proof of participation and support.

---

## 🚀 Project Highlights

* **Real-time Campaign Status:** Get instant updates on campaign progress directly on the platform.
* **Donation Transparency:** View your contributions without interacting with raw blockchain data.
* **Automated Refunds:** Donors receive refunds automatically if a campaign does not meet its funding goal.
* **NFT Receipts:** NFTs are minted for campaign creation and donations as proof of participation.
* **Seamless Wallet Integration:** Interact with the platform using popular Cardano wallets via **Mesh SDK**.
* **Creator Withdrawals:** Campaign creators can withdraw funds when their goals are met.
* **Security & Transparency:** All transactions and campaign logic are secured by Cardano's blockchain.

---

## 🛠️ Key Features

✅ **Wallet Integration:** Connect your Cardano wallet (e.g., Nami, Eternl) seamlessly via Mesh SDK.
✅ **Campaign Management:** Create, view, and manage crowdfunding campaigns with ease.
✅ **Donation Tracking:** Track your contributions and campaign progress in real-time.
✅ **Automated Refunds:** Claim refunds easily if campaigns do not reach their targets.
✅ **NFT Receipts:** NFTs minted on campaign creation and donations as digital proof.
✅ **Creator Withdrawals:** Withdraw funds securely after successful campaigns.
✅ **Blockchain Transparency:** All data and transactions are recorded on-chain.

---

## 🏗️ Architecture

```
+-------------------+          +--------------------+          +--------------------+
|                   |          |                    |          |                    |
|      Frontend     | <------> |    Mesh SDK Layer   | <------> |  Cardano Blockchain |
|  (Next.js + React)|          | (Wallet & Tx Logic) |          |  (Smart Contracts)  |
|                   |          |                    |          |                    |
+-------------------+          +--------------------+          +--------------------+
```

* **Frontend:** Built with Next.js and React, providing UI and wallet connection.
* **Mesh SDK:** Handles wallet integration, transaction building, and submission.
* **Smart Contracts:** Built with Aiken/Plutus, managing escrow, minting, campaign logic, and NFT issuance.

---

## 🧰 Tech Stack

* **Frontend:** Next.js, React, TypeScript, Tailwind CSS
* **Wallet Integration:** Mesh SDK (`@meshsdk/react`)
* **Smart Contracts:** Aiken / Plutus (Cardano)
* **APIs:** Blockfrost (for blockchain data verification)
* **Deployment:** Vercel (frontend)
* **Wallets:** Cardano wallets such as Nami, Eternl

---

## 💡 Getting Started

### 1. Connect Your Wallet

Use the wallet connection button in the UI. Ensure your wallet has **Collateral enabled** to interact with the dApp (this can be done in your wallet's settings).

### 2. Explore & Interact

* **Create Campaign:** Fill in details and submit your campaign. Receive an NFT receipt upon creation.
* **Donate:** Select a campaign and donate ADA securely via smart contract escrow. Receive an NFT receipt for your donation.
* **Track Donations:** View your donation history and monitor campaign statuses.
* **Refunds:** Failed campaigns trigger automatic refunds, handled by the smart contract.
* **Withdrawals:** Campaign creators can withdraw funds after a successful campaign.

---

## 👥 Team

**Yahaya Abdulrauf** — Blockchain Developer, Software Engineer, Product Manager
**Samir Idris** — Software Engineer, Cardano Smart Contract Developer

**Team Name:** NexWave

---

## 🙏 Acknowledgments

* **Cardano Foundation** and the **Mesh SDK team** for their excellent tools and documentation.
* Open source contributors whose libraries and examples made this project possible.

---

**Enjoy exploring RatifyV1 — making decentralized crowdfunding accessible and transparent.**
