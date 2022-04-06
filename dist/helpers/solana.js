import fs from 'fs';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program } from '@project-serum/anchor';
import { sleep, getUnixTs } from './util.js';
export const DEFAULT_TIMEOUT = 15000;
export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const keypairFromSecretJson = (path) => {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path).toString())));
};
export const loadAnchorProgram = async (programId, provider) => {
    const idl = await Program.fetchIdl(programId, provider);
    return new Program(idl, programId, provider);
};
export const getPriceWithMantissa = async (price, mint, walletKeyPair, anchorProgram) => {
    const token = new Token(anchorProgram.provider.connection, new PublicKey(mint), TOKEN_PROGRAM_ID, walletKeyPair);
    const mintInfo = await token.getMintInfo();
    const mantissa = 10 ** mintInfo.decimals;
    return Math.ceil(price * mantissa);
};
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
            return;
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
            return;
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
export async function simulateTransaction(connection, transaction, commitment) {
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
export async function awaitTransactionSignatureConfirmation(txid, timeout, connection, commitment = 'recent', queryStatus = false) {
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
export async function sendTransactionWithRetryWithKeypair(connection, wallet, instructions, signers, commitment = 'singleGossip', includesFeePayer = false, block, beforeSend) {
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
