import * as borsh from 'borsh';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { AccountLayout, u64, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import pkg from '@project-serum/anchor';
const { BN } = pkg;
import { WRAPPED_SOL_MINT } from './solana.js';
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const TOKEN_ENTANGLEMENT_PROGRAM_ID = new PublicKey('qntmGodpGkrM42mN68VCZHXnKqDCT8rdY23wFcXCLPd');
const METADATA_REPLACE = new RegExp('\u0000', 'g');
const METADATA_SIGNATURE = Buffer.from([7]);
export const MAX_NAME_LENGTH = 32;
export const MAX_URI_LENGTH = 200;
export const MAX_SYMBOL_LENGTH = 10;
export const MAX_CREATOR_LEN = 32 + 1 + 1;
export const MAX_CREATOR_LIMIT = 5;
export class Creator {
    address;
    verified;
    share;
    constructor(args) {
        this.address = args.address;
        this.verified = args.verified;
        this.share = args.share;
    }
}
export class ConfigData {
    name;
    symbol;
    uri;
    sellerFeeBasisPoints;
    creators;
    maxNumberOfLines;
    isMutable;
    maxSupply;
    retainAuthority;
    constructor(args) {
        this.name = args.name;
        this.symbol = args.symbol;
        this.uri = args.uri;
        this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
        this.creators = args.creators;
        this.maxNumberOfLines = args.maxNumberOfLines;
        this.isMutable = args.isMutable;
        this.maxSupply = args.maxSupply;
        this.retainAuthority = args.retainAuthority;
    }
}
export var MetadataKey;
(function (MetadataKey) {
    MetadataKey[MetadataKey["Uninitialized"] = 0] = "Uninitialized";
    MetadataKey[MetadataKey["MetadataV1"] = 4] = "MetadataV1";
    MetadataKey[MetadataKey["EditionV1"] = 1] = "EditionV1";
    MetadataKey[MetadataKey["MasterEditionV1"] = 2] = "MasterEditionV1";
    MetadataKey[MetadataKey["MasterEditionV2"] = 6] = "MasterEditionV2";
    MetadataKey[MetadataKey["EditionMarker"] = 7] = "EditionMarker";
})(MetadataKey || (MetadataKey = {}));
export class MasterEditionV1 {
    key;
    supply;
    maxSupply;
    printingMint;
    oneTimePrintingAuthorizationMint;
    constructor(args) {
        this.key = MetadataKey.MasterEditionV1;
        this.supply = args.supply;
        this.maxSupply = args.maxSupply;
        this.printingMint = args.printingMint;
        this.oneTimePrintingAuthorizationMint =
            args.oneTimePrintingAuthorizationMint;
    }
}
export class MasterEditionV2 {
    key;
    supply;
    maxSupply;
    constructor(args) {
        this.key = MetadataKey.MasterEditionV2;
        this.supply = args.supply;
        this.maxSupply = args.maxSupply;
    }
}
export class EditionMarker {
    key;
    ledger;
    constructor(args) {
        this.key = MetadataKey.EditionMarker;
        this.ledger = args.ledger;
    }
}
export class Edition {
    key;
    parent;
    edition;
    constructor(args) {
        this.key = MetadataKey.EditionV1;
        this.parent = args.parent;
        this.edition = args.edition;
    }
}
export class Data {
    name;
    symbol;
    uri;
    sellerFeeBasisPoints;
    creators;
    constructor(args) {
        this.name = args.name;
        this.symbol = args.symbol;
        this.uri = args.uri;
        this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
        this.creators = args.creators;
    }
}
export class Metadata {
    key;
    updateAuthority;
    mint;
    data;
    primarySaleHappened;
    isMutable;
    masterEdition;
    edition;
    constructor(args) {
        this.key = MetadataKey.MetadataV1;
        this.updateAuthority = args.updateAuthority;
        this.mint = args.mint;
        this.data = args.data;
        this.primarySaleHappened = args.primarySaleHappened;
        this.isMutable = args.isMutable;
    }
}
export const METADATA_SCHEMA = new Map([
    [
        MasterEditionV1,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['supply', 'u64'],
                ['maxSupply', { kind: 'option', type: 'u64' }],
                ['printingMint', 'pubkey'],
                ['oneTimePrintingAuthorizationMint', [32]],
            ],
        },
    ],
    [
        MasterEditionV2,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['supply', 'u64'],
                ['maxSupply', { kind: 'option', type: 'u64' }],
            ],
        },
    ],
    [
        Edition,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['parent', [32]],
                ['edition', 'u64'],
            ],
        },
    ],
    [
        Data,
        {
            kind: 'struct',
            fields: [
                ['name', 'string'],
                ['symbol', 'string'],
                ['uri', 'string'],
                ['sellerFeeBasisPoints', 'u16'],
                ['creators', { kind: 'option', type: [Creator] }],
            ],
        },
    ],
    [
        Creator,
        {
            kind: 'struct',
            fields: [
                ['address', [32]],
                ['verified', 'u8'],
                ['share', 'u8'],
            ],
        },
    ],
    [
        Metadata,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['updateAuthority', [32]],
                ['mint', [32]],
                ['data', Data],
                ['primarySaleHappened', 'u8'],
                ['isMutable', 'u8'],
            ],
        },
    ],
    [
        EditionMarker,
        {
            kind: 'struct',
            fields: [
                ['key', 'u8'],
                ['ledger', [31]],
            ],
        },
    ],
]);
export const getMetadata = async (mint) => {
    return (await PublicKey.findProgramAddress([
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
    ], TOKEN_METADATA_PROGRAM_ID))[0];
};
export const getMasterEdition = async (mint) => {
    return (await PublicKey.findProgramAddress([
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
    ], TOKEN_METADATA_PROGRAM_ID))[0];
};
export const deserializeAccount = (data) => {
    const accountInfo = AccountLayout.decode(data);
    accountInfo.mint = new PublicKey(accountInfo.mint);
    accountInfo.owner = new PublicKey(accountInfo.owner);
    accountInfo.amount = u64.fromBuffer(accountInfo.amount);
    if (accountInfo.delegateOption === 0) {
        accountInfo.delegate = null;
        accountInfo.delegatedAmount = new u64(0);
    }
    else {
        accountInfo.delegate = new PublicKey(accountInfo.delegate);
        accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
    }
    accountInfo.isInitialized = accountInfo.state !== 0;
    accountInfo.isFrozen = accountInfo.state === 2;
    if (accountInfo.isNativeOption === 1) {
        accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
        accountInfo.isNative = true;
    }
    else {
        accountInfo.rentExemptReserve = null;
        accountInfo.isNative = false;
    }
    if (accountInfo.closeAuthorityOption === 0) {
        accountInfo.closeAuthority = null;
    }
    else {
        accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
    }
    return accountInfo;
};
export const getAtaForMint = async (mint, buyer) => {
    return (await PublicKey.findProgramAddress([
        buyer.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mint.toBuffer()
    ], ASSOCIATED_TOKEN_PROGRAM_ID))[0];
};
export const getEntangledPairs = async (mintA, mintB) => {
    let [entangledPair, entangledPairBump] = await PublicKey.findProgramAddress([
        Buffer.from("token_entangler"),
        mintA.toBuffer(),
        mintB.toBuffer()
    ], TOKEN_ENTANGLEMENT_PROGRAM_ID);
    let [reverseEntangledPair, reverseEntangledPairBump] = await PublicKey.findProgramAddress([
        Buffer.from("token_entangler"),
        mintB.toBuffer(),
        mintA.toBuffer()
    ], TOKEN_ENTANGLEMENT_PROGRAM_ID);
    return [
        { pair: entangledPair, bump: entangledPairBump },
        { pair: reverseEntangledPair, bump: reverseEntangledPairBump }
    ];
};
export const getEntangledPairEscrows = async (mintA, mintB) => {
    let [escrowA, escrowABump] = await PublicKey.findProgramAddress([
        Buffer.from("token_entangler"),
        mintA.toBuffer(),
        mintB.toBuffer(),
        Buffer.from('escrow'),
        Buffer.from('A')
    ], TOKEN_ENTANGLEMENT_PROGRAM_ID);
    let [escrowB, escrowBBump] = await PublicKey.findProgramAddress([
        Buffer.from("token_entangler"),
        mintA.toBuffer(),
        mintB.toBuffer(),
        Buffer.from('escrow'),
        Buffer.from('B')
    ], TOKEN_ENTANGLEMENT_PROGRAM_ID);
    return [
        { address: escrowA, bump: escrowABump },
        { address: escrowB, bump: escrowBBump }
    ];
};
export const createEntanglement = async (mintA, mintB, program, keypair) => {
    let [pairA, pairB] = await getEntangledPairs(mintA, mintB);
    let [escrowA, escrowB] = await getEntangledPairEscrows(mintA, mintB);
    const ata = await getAtaForMint(mintB, keypair.publicKey);
    await program.methods
        .createEntangledPair(pairA.bump, pairB.bump, escrowA.bump, escrowB.bump, new BN(0), false)
        .accounts({
        treasuryMint: WRAPPED_SOL_MINT,
        payer: keypair.publicKey,
        transferAuthority: keypair.publicKey,
        authority: keypair.publicKey,
        mintA: mintA,
        metadataA: await getMetadata(mintA),
        editionA: await getMasterEdition(mintA),
        mintB: mintB,
        metadataB: await getMetadata(mintB),
        editionB: await getMasterEdition(mintB),
        tokenB: ata,
        tokenAEscrow: escrowA.address,
        tokenBEscrow: escrowB.address,
        entangledPair: pairA.pair,
        reverseEntangledPair: pairB.pair
    })
        .rpc();
    return [pairA, pairB];
};
async function getProgramAccounts(connection, programId, configOrCommitment) {
    const extra = {};
    let commitment;
    if (configOrCommitment) {
        if (typeof configOrCommitment === 'string') {
            commitment = configOrCommitment;
        }
        else {
            commitment = configOrCommitment.commitment;
            if (configOrCommitment.dataSlice) {
                extra.dataSlice = configOrCommitment.dataSlice;
            }
            if (configOrCommitment.filters) {
                extra.filters = configOrCommitment.filters;
            }
        }
    }
    const args = connection._buildArgs([programId], commitment, 'base64', extra);
    const unsafeRes = await connection._rpcRequest('getProgramAccounts', args);
    console.log(unsafeRes);
    const data = unsafeRes.result.map(item => {
        return {
            account: {
                data: Buffer.from(item.account.data[0], 'base64'),
                executable: item.account.executable,
                lamports: item.account.lamports,
                owner: item.account.owner,
            },
            pubkey: item.pubkey,
        };
    });
    return data;
}
export function decodeMetadata(buffer) {
    const metadata = borsh.deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);
    metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
    metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
    metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
    return metadata;
}
export async function getAccountsByCreatorAddress(creatorAddress, connection) {
    const metadataAccounts = await getProgramAccounts(connection, TOKEN_METADATA_PROGRAM_ID.toBase58(), {
        filters: [
            {
                memcmp: {
                    offset: 1 + // key
                        32 + // update auth
                        32 + // mint
                        4 + // name string length
                        MAX_NAME_LENGTH + // name
                        4 + // uri string length
                        MAX_URI_LENGTH + // uri*
                        4 + // symbol string length
                        MAX_SYMBOL_LENGTH + // symbol
                        2 + // seller fee basis points
                        1 + // whether or not there is a creators vec
                        4 + // creators vec length
                        0 * MAX_CREATOR_LEN,
                    bytes: creatorAddress,
                },
            },
        ],
    });
    console.log(metadataAccounts);
    const decodedAccounts = [];
    for (let i = 0; i < metadataAccounts.length; i++) {
        const e = metadataAccounts[i];
        const decoded = await decodeMetadata(e.account.data);
        const accountPubkey = e.pubkey;
        const store = [decoded, accountPubkey];
        decodedAccounts.push(store);
    }
    return decodedAccounts;
}
export function signMetadataInstruction(metadata, creator) {
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
