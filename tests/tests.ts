import { TOKEN_PROGRAM_ID, AuthorityType, decodeSyncNativeInstructionUnchecked, setAuthority, getTokenMetadata, transfer, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, burn, mintTo, mintToChecked, freezeAccount, thawAccount, unpackMint, unpackAccount} from "@solana/spl-token";
import { payer, connection } from "../src/utils";
import deploySplProgram from "../src/spl";
import * as web3 from "@solana/web3.js";
import * as umiBundler from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as umiLib from "@metaplex-foundation/umi";
import dotenv from "dotenv";
import { assert, expect } from "chai";
dotenv.config();

class TokenInfo {
    tokenAddress: web3.PublicKey;
    mintSecretKey: Uint8Array;
}

describe("CGM Token", () => {
    const randomWallet = web3.Keypair.generate();

    let tokenInfo: TokenInfo;

    it("should deploy the token", async () => {
        const { tokenAddress, mintSecretKey} = await deploySplProgram();

        tokenInfo = new TokenInfo()
        tokenInfo.tokenAddress = new web3.PublicKey(tokenAddress);
        tokenInfo.mintSecretKey = mintSecretKey;
        
        // we assert than tokenInfo.tokenAddress is not null
        assert.exists(tokenInfo.tokenAddress);
    })

    it('should be able to transfer token', async () => {
      const transferAmount = BigInt(1 * Math.pow(10, 9));
  
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const payerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      const receiverATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        randomWallet.publicKey
      );

      const transferResult = await transfer(
        connection,
        payer,
        payerATA.address,
        receiverATA.address,
        payer.publicKey,
        transferAmount,
        []
      );

      const postReceiverATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        randomWallet.publicKey
      );

      expect(postReceiverATA.amount).to.equal(transferAmount);
    })

    it('should be able to burn token', async () => {
      const burnAmount = BigInt(1 * Math.pow(10, 9));
  
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);


      const prePayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      const burnResult = await burn(
        connection,
        payer,
        prePayerATA.address,
        mintAddress,
        payer.publicKey,
        burnAmount
      );

      const postPayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      expect(postPayerATA.amount).to.equal(prePayerATA.amount - burnAmount);
    })

    it('should be able to mint token', async () => {
      const mintAmount = BigInt(1 * Math.pow(10, 9));
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const info = await connection.getAccountInfo(
        mintAddress,
        "confirmed"
      );

      const prePayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      const mintResult = await mintTo(
        connection,
        payer,
        mintAddress,
        prePayerATA.address,
        payer,
        mintAmount,
        [],
        {
          commitment: "confirmed",
          preflightCommitment: "confirmed",
          skipPreflight: false,
        },
        TOKEN_PROGRAM_ID
      );

      const postPayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      expect(postPayerATA.amount).to.equal(prePayerATA.amount + mintAmount);
    })

    it("should be able to renounce token mint", async () => {
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const renounceResult = await setAuthority(
        connection,
        payer,
        tokenInfo.tokenAddress,
        payer,
        AuthorityType.MintTokens,
        null,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      const info = await connection.getAccountInfo(mintAddress, "confirmed");

      const unpackedMint = unpackMint(mintAddress, info, TOKEN_PROGRAM_ID);

      expect(unpackedMint.mintAuthority).to.equal(null);

    })

    it('should be able to freeze token', async () => {
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const prePayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      const freezeResult = await freezeAccount(
        connection,
        payer,
        prePayerATA.address,
        mintAddress,
        payer
      );

      const postPayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      expect(postPayerATA.isFrozen).to.equal(true);
    })
    
    it("should be able to revoke freeze token", async () => {
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const prePayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      const revokeResult = await thawAccount(
        connection,
        payer,
        prePayerATA.address,
        mintAddress,
        payer
      );

      const postPayerATA = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mintAddress,
        payer.publicKey
      );

      expect(postPayerATA.isFrozen).to.equal(false);
    });

    it("should be able to renounce freeze authority", async () => {
      const mintAddress = new web3.PublicKey(tokenInfo.tokenAddress);

      const signature = await setAuthority(
        connection,
        payer,
        tokenInfo.tokenAddress,
        payer,
        AuthorityType.FreezeAccount,
        null,
        [],
        undefined,
        TOKEN_PROGRAM_ID
      );

      const info = await connection.getAccountInfo(mintAddress, "confirmed");

      const unpackedMint = unpackMint(mintAddress, info, TOKEN_PROGRAM_ID);

      expect(unpackedMint.freezeAuthority).to.equal(null);
    })

    it("should set correctly the metadata", async () => {
      const rpc = web3.clusterApiUrl("devnet");
      const umi = umiBundler.createUmi(rpc).use(mpl.mplTokenMetadata());

      // we sleep for 5 seconds
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Decode the metadata
      const metadata = await mpl.fetchDigitalAssetWithAssociatedToken(
        umi,
        umiLib.publicKey(tokenInfo.tokenAddress.toString()),
        umiLib.publicKey(payer.publicKey.toString())
      );

      // console.log({ metadata });

      expect(metadata.metadata.name).to.equal("Cows Gone Mad Token");
      expect(metadata.metadata.symbol).to.equal("CGMT");
      expect(metadata.metadata.uri).to.equal("SET THIS LATER");
    });
})