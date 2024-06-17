import * as web3 from "@solana/web3.js";
import * as umiBundler from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as umiLib from "@metaplex-foundation/umi";
import { payer, metadata, tokenomics } from "./utils";

const wallet = payer;

const rpc = web3.clusterApiUrl(process.env.PRODUCTION === "true" ? "mainnet-beta" : "devnet");

async function createTokenAndMint(rpc, wallet, { metadata, amount, decimals }) {
  if( metadata.uri === null ) {
    throw new Error("Metadata URI cannot be null");
  }
  
  const umi = umiBundler.createUmi(rpc).use(mpl.mplTokenMetadata());

  const payer = umiLib.createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(wallet.secretKey));
  umi.use(umiLib.keypairIdentity(payer));

  const mint = umiLib.generateSigner(umi);

  await mpl
    .createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: umiLib.percentAmount(0),
      decimals: decimals,
      amount: BigInt(amount * Math.pow(10, decimals)),
      tokenOwner: umi.identity.publicKey,
      tokenStandard: mpl.TokenStandard.Fungible,
    })
    .sendAndConfirm(umi)
    .then(() => {
      console.log("Token deployed successfully");
      console.log("Token address: ", mint.publicKey);
      console.log("Token secret key: ", mint.secretKey);
    });

  return { tokenAddress: mint.publicKey, mintSecretKey: mint.secretKey };
}

async function deploySplProgram() {
  const { tokenAddress, mintSecretKey } = await createTokenAndMint(rpc, wallet, {
    metadata: metadata,
    amount: tokenomics.amount,
    decimals: tokenomics.decimals
  })

  return { tokenAddress, mintSecretKey }
}

export default deploySplProgram;