import { Keypair } from '@solana/web3.js';
import Bundlr from '@bundlr-network/client';

export const uploadArweaveBundle = async (
    keypair: Keypair,
    path: string
) => {
    const bundlr = new Bundlr("http://node1.bundlr.network", "arweave");
    await bundlr.uploadFile(path);
};

