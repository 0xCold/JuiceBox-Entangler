import * as fs from 'fs';
import { Keypair, PublicKey, Connection, Transaction, TransactionInstruction } from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { Provider, Wallet, Program } = pkg;
import { actions } from '@metaplex/js';
import { createEntanglement } from './helpers/metaplex';
import { loadAnchorProgram } from './helpers/solana';
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const TOKEN_ENTANGLEMENT_PROGRAM_ID = new PublicKey('qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd');
const METADATA_SIGNATURE = Buffer.from([7]);
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function getUnixTs() {
    return new Date().getTime() / 1000;
}
export async function sendSignedTransaction({ signedTransaction, connection, timeout = 150000, }) {
    const rawTransaction = signedTransaction.serialize();
    const startTime = getUnixTs();
    let slot = 0;
    const txid = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
    });
    let done = false;
    (async () => {
        while (!done && getUnixTs() - startTime < timeout) {
            connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
            });
            await sleep(500);
        }
    })();
    try {
        const confirmation = await awaitTransactionSignatureConfirmation(txid, timeout, connection, 'confirmed', true);
        if (!confirmation) {
            throw new Error('Timed out awaiting confirmation on transaction');
        }
        ;
        if (confirmation.err) {
            throw new Error('Transaction failed: Custom instruction error');
        }
        ;
        slot = confirmation?.slot || 0;
    }
    catch (err) {
        if (err.timeout) {
            throw new Error('Timed out awaiting confirmation on transaction');
        }
        let simulateResult = null;
        try {
            simulateResult = (await simulateTransaction(connection, signedTransaction, 'single')).value;
        }
        catch (e) { }
        if (simulateResult && simulateResult.err) {
            if (simulateResult.logs) {
                for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
                    const line = simulateResult.logs[i];
                    if (line.startsWith('Program log: ')) {
                        throw new Error('Transaction failed: ' + line.slice('Program log: '.length));
                    }
                }
            }
            throw new Error(JSON.stringify(simulateResult.err));
        }
    }
    finally {
        done = true;
    }
    ;
    return { txid, slot };
}
async function simulateTransaction(connection, transaction, commitment) {
    // @ts-ignore
    transaction.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching);
    const signData = transaction.serializeMessage();
    // @ts-ignore
    const wireTransaction = transaction._serialize(signData);
    const encodedTransaction = wireTransaction.toString('base64');
    const config = { encoding: 'base64', commitment };
    const args = [encodedTransaction, config];
    // @ts-ignore
    const res = await connection._rpcRequest('simulateTransaction', args);
    if (res.error) {
        throw new Error('failed to simulate transaction: ' + res.error.message);
    }
    return res.result;
}
async function awaitTransactionSignatureConfirmation(txid, timeout, connection, commitment = 'recent', queryStatus = false) {
    let done = false;
    let status = {
        slot: 0,
        confirmations: 0,
        err: null,
    };
    let subId = 0;
    // eslint-disable-next-line no-async-promise-executor
    status = await new Promise(async (resolve, reject) => {
        setTimeout(() => {
            if (done) {
                return;
            }
            done = true;
            reject({ timeout: true });
        }, timeout);
        try {
            subId = connection.onSignature(txid, (result, context) => {
                done = true;
                status = {
                    err: result.err,
                    slot: context.slot,
                    confirmations: 0,
                };
                if (result.err) {
                    reject(status);
                }
                else {
                    resolve(status);
                }
            }, commitment);
        }
        catch (e) {
            done = true;
        }
        while (!done && queryStatus) {
            // eslint-disable-next-line no-loop-func
            (async () => {
                try {
                    const signatureStatuses = await connection.getSignatureStatuses([
                        txid,
                    ]);
                    status = signatureStatuses && signatureStatuses.value[0];
                    if (!done) {
                        if (!status) { }
                        else if (status.err) {
                            done = true;
                            reject(status.err);
                        }
                        else if (!status.confirmations) { }
                        else {
                            done = true;
                            resolve(status);
                        }
                    }
                }
                catch (e) { }
            })();
            await sleep(2000);
        }
    });
    //@ts-ignore
    if (connection._signatureSubscriptions[subId]) {
        connection.removeSignatureListener(subId);
    }
    ;
    done = true;
    return status;
}
async function sendTransactionWithRetryWithKeypair(connection, wallet, instructions, signers, commitment = 'singleGossip', includesFeePayer = false, block, beforeSend) {
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.recentBlockhash = (block || (await connection.getRecentBlockhash(commitment))).blockhash;
    if (includesFeePayer) {
        transaction.setSigners(...signers.map(s => s.publicKey));
    }
    else {
        transaction.setSigners(wallet.publicKey, ...signers.map(s => s.publicKey));
    }
    ;
    if (signers.length > 0) {
        transaction.sign(...[wallet, ...signers]);
    }
    else {
        transaction.sign(wallet);
    }
    ;
    if (beforeSend) {
        beforeSend();
    }
    const { txid, slot } = await sendSignedTransaction({
        connection,
        signedTransaction: transaction
    });
    return { txid, slot };
}
;
function signMetadataInstruction(metadata, creator) {
    const data = METADATA_SIGNATURE;
    const keys = [
        {
            pubkey: metadata,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: creator,
            isSigner: true,
            isWritable: false,
        },
    ];
    return new TransactionInstruction({
        keys,
        programId: TOKEN_METADATA_PROGRAM_ID,
        data,
    });
}
;
const OG_PANDA_MINTS_ORDERED = [
    "9YLMwAHLNFhZ9y1s6FhE5yQpuV5c35KbcEYL9E3qjyTK",
    "2tXqRu4wkbHBNRSDYxsyUELLn1QFyaBbSaBUVcSFqARA",
    "Gky9RWaNxb2ajbs2krTMTigQfB69Gha8ZDWKFMkhJrJH",
    "74zokAWLfxkR8LwzZvNv4k95t3FLTAybHZD5fpXozfN9",
    "2t3y1RzMFGu3MucuNBQPyAM9nTWpGndB4sYo9DTyQMME",
    "4cAsyL1uqGrU4ox7e1jyvcdSkEiAkExwqW5H7GAwoSEN",
    "AaBi3hCneS9DNbV2mmuXxBddSGxBSsNCquLydpiiRaSa",
    "Af3kmMeHq16dBhJW1kcz8Pvq9J59dJK2EV8Yd3LRPZZj",
    "3BPnN8ZurjwpAziwx3iza6uQ2MXG4aEYmEYB3h9ywZzR",
    "AizPSLrrPvxswFDMtKia8o2cvJLKt6r5s3RBg231xzGY",
    "RH6mSrXhxePUkNmygDJ2uc3yLCmPkTXH3f8dmikDaVu",
    "A7nYxXZYzd7fuGcGXdS6KRufowXuWBg3WsfCXCBz15jF",
    "AVYmTEdZTK8t3zLaTT7nnXLJoFYxTcAz4XRUYMrVETu5",
    "FUdG77JSmHHTewdQhDqFMxy7TERMwS4vdm3XgZAADLP",
    "ARHQBmkXK4eqpNnWyjf31QcdV9vhiguWLXkSCegg6Lrf",
    "bdwazdkLff6QkyyZLWVa4ksBPnHkPVprgjx5iVU7Qbt",
    "DNUvxJRVpLpecwnV2RG41BFJ5u9Sq8NnkL8VvwkqFdYf",
    "ETc3qxPdJntGhnVx3a1PHVVsZJoy4K2rVxiKuujFwJXw",
    "AnQmfmDA571XCNHBgdPjR6YSZtWjRoHcieacdHRp2G5k",
    "DVYU1oNRZYfPPMSyBLZ5UjQiJ7U4Z6LXMA1zofz7SRU6",
    "8D9vzbEvRUkuvyFazydKPpgJXttd4zB2YswCxRuztRBN",
    "7KttwqZNWKpBhjRVpHYyTnXWBLxDEU7BiZPtjiZV3qAn",
    "JD4yFTJJBkXqHrJX4qRkLf9KX3EUgPpfgysLeCRP1sXW",
    "47iLMwrKJTCrwcRPb1cYPWWToCMTwRTWBoqYcbs83dvw",
    "Hg2G7DbjrcfPXRqEWeitQeNCwHR1ZXM2jaK8PTjcJqyw",
    "3iERKArunpyyPjWXZUJB4oyajYc2oP7eBRoxd1txNmg6",
    "CzvzsCrJxB3AeTtw4rjUf8zfFYJrmmttAjkexhFNyjyA",
    "HakWa5nMXNyJifAC5QUnErKZm5kdi4Td86Z7yAcJbLtS",
    "2Fmk3dS75YaZDFEHuG7ZVZAx9tH2B1WwRkYnAe4MWzw9",
    "4shaonJqLFPERkDyDUNQo46QYEr9saSGnpZV28Wvac6j",
    "FTwF77bZHz96b9fGXEcfzp16RcGaLMyfcHGDsDWH6q4T",
    "HA6tqvMPnWwBqxN2X3NFjjhv44TV3eqQVvAn7rpuqPGH"
];
async function mintRemaining(keypairPath, rpcUrl, mintsPath, urisPath) {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath).toString())));
    const connection = new Connection(rpcUrl);
    const entangledMints = JSON.parse(fs.readFileSync(mintsPath).toString());
    const remainingUris = JSON.parse(fs.readFileSync(urisPath).toString());
    for (let uri of remainingUris) {
        const nft = await actions.mintNFT({
            connection: connection,
            wallet: new Wallet(keypair),
            uri: uri,
            maxSupply: 0
        });
        entangledMints.push(nft.mint.toString());
        console.log(nft.mint.toString());
        await sleep(1000);
    }
    fs.writeFileSync("entangled-mints.json", JSON.stringify(entangledMints));
}
async function signAll(keypairPath, rpcUrl, mintsPath) {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath).toString())));
    const connection = new Connection(rpcUrl);
    const toSign = JSON.parse(fs.readFileSync(mintsPath).toString());
    for (let mint of toSign) {
        const [metadata, _metadataBump] = await PublicKey.findProgramAddress([
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            new PublicKey(mint).toBuffer(),
        ], TOKEN_METADATA_PROGRAM_ID);
        await sendTransactionWithRetryWithKeypair(connection, keypair, [signMetadataInstruction(metadata, keypair.publicKey)], [], 'single');
        console.log("signed");
        await sleep(1000);
    }
}
async function entangleAll(keypairPath, rpcUrl, mintsPath) {
    const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath).toString())));
    const connection = new Connection(rpcUrl);
    const anchorProvider = new Provider(connection, new Wallet(keypair), {});
    const program = await loadAnchorProgram(TOKEN_ENTANGLEMENT_PROGRAM_ID, anchorProvider);
    const toEntangle = JSON.parse(fs.readFileSync(mintsPath).toString());
    let i = 0;
    for (let mint of toEntangle) {
        const ogPandaMint = OG_PANDA_MINTS_ORDERED[i];
        await createEntanglement(new PublicKey(ogPandaMint), new PublicKey(mint), program, keypair);
        i++;
        console.log("entangled");
        await sleep(1000);
    }
}
async function main(keypairPath, rpcUrl) {
    await mintRemaining(keypairPath, rpcUrl, "entangled-mints.json", "remaining-uris.json");
    await signAll(keypairPath, rpcUrl, "entangled-mints.json");
    await entangleAll(keypairPath, rpcUrl, "entangled-mints.json");
}
main("/root/coldwallet.json", "https://solana-api.projectserum.com");
