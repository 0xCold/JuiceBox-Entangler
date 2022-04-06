import * as solanaWeb3 from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import pkg from '@project-serum/anchor';
const { Provider, Wallet, BN } = pkg;
import { sleep } from './util.js';
import { getAndCacheCollectionInfo, filterMintsByTrait, mintsFromInfos } from './metadata.js';
import { keypairFromSecretJson, loadAnchorProgram, } from './solana.js';
import { createEntanglement, TOKEN_ENTANGLEMENT_PROGRAM_ID } from './metaplex.js';
const JUICE_BOX = { type: "Mouth", value: "Ape-le Juice" };
export const getJuiceBoxMints = async () => {
    let degenApes = await getAndCacheCollectionInfo("degenapes", "10000");
    let juiceBoxApes = await filterMintsByTrait(degenApes, [JUICE_BOX]);
    return mintsFromInfos(juiceBoxApes);
};
async function main(provider, keypair) {
    console.log("Using account: " + keypair.publicKey.toString());
    const connection = new solanaWeb3.Connection(provider, { commitment: "confirmed" });
    console.log("Connected with RPC provider: " + provider);
    //const juiceBoxMints = await getJuiceBoxMints();
    const juiceBoxMints = JSON.parse(fs.readFileSync("./output/fakemints.json").toString()).map(info => new PublicKey(info.mint));
    console.log("Found " + juiceBoxMints.length + " Juice-Box Apes");
    //let entangledMints = [];
    //let i = 0;
    //for (let jbm of juiceBoxMints) {
    //    const entangledMint = await actions.mintNFT({
    //        connection: connection, 
    //        wallet: new Wallet(keypair),
    //        uri: "https://raw.githubusercontent.com/0xCold/testHosting/main/testJSON.json",
    //        maxSupply: 1
    //    });
    //    entangledMints.push(entangledMint);
    //    i++;
    //    console.log("Created entangled mint/NFT + metadata " + i);
    //    await sleep(1000);
    //}
    //fs.writeFileSync("./output/entangled.json", JSON.stringify(entangledMints));
    const entangledMints = JSON.parse(fs.readFileSync("./output/entangled.json").toString()).map(info => new PublicKey(info.mint));
    const anchorProvider = new Provider(connection, new Wallet(keypair), {});
    const program = await loadAnchorProgram(TOKEN_ENTANGLEMENT_PROGRAM_ID, anchorProvider);
    let entanglements = [];
    let i = 0;
    for (let em of entangledMints) {
        const entanglement = await createEntanglement(em, juiceBoxMints[i], 0, program, keypair);
        entanglements.push(entanglement);
        i++;
        console.log("Created entanglement for pair: " + i);
        await sleep(1000);
    }
}
const keypair = keypairFromSecretJson("/root/pls.json");
main("https://api.devnet.solana.com", keypair);
