// Import necessary functions and constants from the Solana web3.js and SPL Token packages
import * as web3 from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const RPC_URL =
  process.env.PRODUCTION === "true"
    ? process.env.MAINNET_RPC_URL
    : "https://api.devnet.solana.com";

export const connection = new web3.Connection(RPC_URL, "confirmed");

const privateKeyArr = JSON.parse(process.env.PRIVATE_KEY);
const privateKeyBytes = new Uint8Array(privateKeyArr);

export const payer = web3.Keypair.fromSecretKey(privateKeyBytes);

export const metadata = {
  name: "Cows Gone Mad Token",
  symbol: "CGMT",
  uri: "SET THIS LATER",
}

export const tokenomics = {
  amount: 1000000000,
  decimals: 9,
};