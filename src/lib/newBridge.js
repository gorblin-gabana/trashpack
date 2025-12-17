import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import CryptoJS from 'crypto-js';

const ADMIN_ADDRESS = new PublicKey('HnHsrxJwRfDs1wNS61bvkfNRGExGEJ7nvRu9F5TAviFY');
const PROGRAM_ID = new PublicKey("GbbpxBP9rT4MWeKqUYQhj8gxA9HddK8NnJpSPX97vtaV");

class NewBridge {
  getInstructionDiscriminator(name) {
    const hash = CryptoJS.SHA256(`global:${name}`);
    // Convert the WordArray to a Hex string, then manually extract the first 8 bytes (16 hex chars)
    const hashHex = hash.toString(CryptoJS.enc.Hex);
    // Return as a Buffer (first 8 bytes)
    return Buffer.from(hashHex.slice(0, 16), 'hex');
  }

  deriveLockPda(user, mint, programId = PROGRAM_ID) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lock'), user.toBuffer(), mint.toBuffer()],
      programId,
    )[0];
  }

  async buildLockTokensInstruction(params) {

    console.log("BUild trabnsaction para====>", params)
    const discriminator = this.getInstructionDiscriminator('lock_tokens');
    console.log("Discriminator => ", discriminator);
    const amount = new BN(params.amountLamports);

    const data = Buffer.alloc(8 + 8 + 32);
    discriminator.copy(data, 0);
    amount.toArrayLike(Buffer, 'le', 8).copy(data, 8);
    params.destination.toBuffer().copy(data, 16);

    // Ensure params.user and params.mint are PublicKey instances
    const userPubkey = params.user instanceof PublicKey ? params.user : new PublicKey(params.user);
    const mintPubkey = params.mint instanceof PublicKey ? params.mint : new PublicKey(params.mint);

    const adminTokenAccount = await getAssociatedTokenAddress(mintPubkey, ADMIN_ADDRESS);
    const userTokenAccount = await getAssociatedTokenAddress(mintPubkey, userPubkey);
    const lockPda = this.deriveLockPda(userPubkey, mintPubkey, params.programId);

    return {
      instruction: {
        programId: params.programId,
        keys: [
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: ADMIN_ADDRESS, isSigner: false, isWritable: true },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: adminTokenAccount, isSigner: false, isWritable: true },
          { pubkey: lockPda, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data,
      },
      meta: { adminTokenAccount, userTokenAccount, lockPda },
    };
  }

  /**
   * Lock native SOL into the bridge program (wraps to wSOL ATA, creates ATAs if needed).
   * Returns a fake signature for now; extend with real sendRawTransaction if desired.
   */
  async lock_token(params) {
    const {
      connection,
      wallet, // must expose publicKey and signTransaction
      destination, // PublicKey or string
      solAmount,
      programId = PROGRAM_ID,
      admin = ADMIN_ADDRESS,
      token
    } = params || {};

    console.log("Params => ", params);

    if (!connection || !(connection instanceof Connection)) {
      throw new Error('connection is required and must be a web3.js Connection');
    }
    if (!wallet?.publicKey || typeof wallet.signTransaction !== 'function') {
      throw new Error('wallet with publicKey and signTransaction is required');
    }
    if (!destination) {
      throw new Error('destination address is required');
    }
    if (!solAmount || solAmount <= 0) {
      throw new Error('solAmount must be greater than 0');
    }

    const destinationPk = destination instanceof PublicKey ? destination : new PublicKey(destination);
    const user = wallet.publicKey;
    const decimal = token.decimals ? token.decimals : 9;
    console.log("Decimal => ", decimal);
    const lamports = Math.floor(solAmount * Math.pow(10, decimal));

    const userAta = await getAssociatedTokenAddress(new PublicKey(token.mint), new PublicKey(user));
    const adminAta = await getAssociatedTokenAddress(new PublicKey(token.mint), new PublicKey(admin));

    const tx = new Transaction();

    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      tx.add(createAssociatedTokenAccountInstruction(user, userAta, user, new PublicKey(token.mint)));
    }

    const adminAtaInfo = await connection.getAccountInfo(adminAta);
    if (!adminAtaInfo) {
      tx.add(createAssociatedTokenAccountInstruction(user, adminAta, admin, new PublicKey(token.mint)));
    }

    // Wrap SOL into user's wSOL ATA

    if (new PublicKey(token.mint).toBase58() === NATIVE_MINT.toBase58()) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: user,
          toPubkey: userAta,
          lamports,
        }),
        createSyncNativeInstruction(userAta),
      );
    }


    // Build lock instruction (structure only; not added to tx here)
    const lockInstruction = await this.buildLockTokensInstruction({
      user,
      mint: new PublicKey(token.mint),
      destination: new PublicKey(destinationPk),
      amountLamports: lamports,
      programId,
    });
    tx.add(lockInstruction.instruction);
    console.log("Lock Instruction => ", tx);

    tx.feePayer = user;
    const bl = await connection.getLatestBlockhash();
    tx.recentBlockhash = bl.blockhash;
    tx.lastValidBlockHeight = bl.lastValidBlockHeight;

    const signedTx = await wallet.signTransaction(tx);
    console.log("Signed Tx => ", signedTx);
    const serializedTx = signedTx.serialize();
    const signature = await connection.sendRawTransaction(serializedTx, {
      skipPreflight: true,
      preflightCommitment: 'confirmed',
    });

    console.log("Signature => ", signature);

    // await connection.confirmTransaction({
    //   signature,
    //   blockhash: tx.recentBlockhash,
    //   lastValidBlockHeight: tx.lastValidBlockHeight,
    // });

    // For now, we only log the transaction; you can uncomment to send:
    // const sig = await connection.sendRawTransaction(signedTx.serialize());
    // return sig;

    await connection.confirmTransaction({
      signature,
      blockhash: tx.recentBlockhash,
      lastValidBlockHeight: tx.lastValidBlockHeight,
    });

    console.log('Prepared bridge lock tx (not sent):', {
      user: user.toBase58(),
      destination: destinationPk.toBase58(),
      lamports,
      userAta: userAta.toBase58(),
      adminAta: adminAta.toBase58(),
      programId: programId.toBase58(),
    });

    return signature;
  }
}

export const newBridge = new NewBridge();
export default newBridge;
