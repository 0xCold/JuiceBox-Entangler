import * as fs from 'fs';
import { stat } from 'fs/promises';
import fetch from 'node-fetch';
import * as path from 'path';
import FormData from 'form-data';
import { spawn } from 'child_process';
import { programs } from '@metaplex/js';
import { 
    PublicKey,
    Connection,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import pkg from '@project-serum/anchor';
const { 
    Provider, 
    Wallet 
} = pkg;
import { actions } from '@metaplex/js';
import { 
    sleep,
    readJson, 
    writeJson,
    chunks,
    fetchAndRead
} from './helpers/util.js';
import {
    keypairFromSecretJson,
    loadAnchorProgram,
    sendTransactionWithRetryWithKeypair
} from './helpers/solana.js';
import {
    createEntanglement,
    decodeMetadata,
    getMetadata,
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
    signMetadataInstruction,
    TOKEN_METADATA_PROGRAM_ID
} from './helpers/metaplex.js';
import { calculate } from '@metaplex/arweave-cost';

const OG_PANDA_MINTS_ORDERED = [
    "9YLMwAHLNFhZ9y1s6FhE5yQpuV5c35KbcEYL9E3qjyTK",
    "2tXqRu4wkbHBNRSDYxsyUELLn1QFyaBbSaBUVcSFqARA",
    "Gky9RWaNxb2ajbs2krTMTigQfB69Gha8ZDWKFMkhJrJH",
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
    "FTwF77bZHz96b9fGXEcfzp16RcGaLMyfcHGDsDWH6q4T",
    "HA6tqvMPnWwBqxN2X3NFjjhv44TV3eqQVvAn7rpuqPGH",
    "4shaonJqLFPERkDyDUNQo46QYEr9saSGnpZV28Wvac6j",
    "AnQmfmDA571XCNHBgdPjR6YSZtWjRoHcieacdHRp2G5k"
];

const ARWEAVE_UPLOAD_ENDPOINT = 'https://us-central1-metaplex-studios.cloudfunctions.net/uploadFile';

export const ARWEAVE_PAYMENT_WALLET = new PublicKey(
    '6FKvsq4ydWFci6nGq9ckbjYMtnmaqAoatz5c9XWjiDuS',
);

async function getJuiceBoxTrashHolders(connection: any) {
    const allTrash = readJson("./current-trash-wallets.json");
    const juiceBoxHolders = {};
    let i = 0;
    let count = 0;
    for (let trashMint of Object.keys(allTrash)) {
        if (allTrash[trashMint] != "trshC9cTgL3BPXoAbp5w9UfnUMWEJx5G61vUijXPMLH") {
            const trashMetadataAddress = await getMetadata(new PublicKey(trashMint));
            const trashMetadataInfo = await programs.metadata.Metadata.getInfo(connection, trashMetadataAddress);
            const trashData = decodeMetadata(trashMetadataInfo.data);
            if (trashData.data.name == "Juice Box") {
                juiceBoxHolders[trashMint] = allTrash[trashMint];
                count++;
                console.log(trashData.data.name, count, i)
            }
            await sleep(2222)
        }
        i++;
    }
    writeJson(juiceBoxHolders, "juicebox-holders.json")
}

async function createAllEntangledImages(toDrawPath: string, outputPath: string) {
    const python = spawn(
        'python3', 
        [
            './src/psd_layer_generator.py', 
            '-p', './JBP_TRAITS.psd', 
            '-o', outputPath, 
            '-t', toDrawPath,
            '-e', 'FINISHERS',
            '-n', '0'
        ]
    );
    return ""
}

async function createEntangledNFTs(amount: number, connection: any, keypair: any) {
    let entangledMints = [];
    for (let i = 0; i < amount; i++) {
        let newMetadata = readJson("./baseMetadata.json");
        newMetadata.name = newMetadata.name + i;
        newMetadata.image = i + ".png";
        writeJson(newMetadata, i + ".json");

        const entangledMint = await actions.mintNFT({
            connection: connection, 
            wallet: new Wallet(keypair),
            uri: "https://raw.githubusercontent.com/0xCold/testHosting/main/testJSON.json",
            maxSupply: 1
        });
        entangledMints.push(entangledMint.mint);

        await sleep(1000);
    }
    return entangledMints
}

async function signAllEntangledMetadata(metadatas: any[], connection: any) {

}

/*async function getAllUnentangledPandaTraits(connection: any, onlySmirks: boolean) {
    const toDraw = [];
    for (let holder of Object.keys(JB_HOLDER_PANDA_MINTS)) {
        console.log(JB_HOLDER_PANDA_MINTS[holder])
        const pandaMint = new PublicKey(JB_HOLDER_PANDA_MINTS[holder]);
        const pandaMetadataInfo = await programs.metadata.Metadata.getInfo(connection, await getMetadata(pandaMint));
        const pandaMetadata = decodeMetadata(pandaMetadataInfo.data);
        const pandaData = JSON.parse(await fetchAndRead(pandaMetadata.data.uri));
        const pandaTraits = {};
        for (let trait of pandaData.attributes) {
            if (["BACKGROUND", "FUR", "BODY", "HEAD", "GLASSES"].includes(trait["trait_type"])) {
                if (["Santa Jacket", "Xmas Crown", "Elf Jacket"].includes(trait["value"])) {
                    console.log(trait["value"])
                    pandaTraits[trait["trait_type"]] = "No Traits";
                } else {
                    pandaTraits[trait["trait_type"]] = trait["value"];
                }
            }
        }
        pandaTraits["FUR"] = pandaTraits["FUR"].slice(0, pandaTraits["FUR"].indexOf('-') + 1) + " Smirk";
        pandaTraits["MOUTH"] = "Juice Box";
        toDraw.push(pandaTraits);
        await sleep(1000);
    }
    writeJson(toDraw, "pandas-to-entangle.json");
}*/

async function main(provider: string, keypair: any) {    
    const connection = new Connection(provider, {commitment: "confirmed"});

    //let toEntangle = await getAllUnentangledPandaTraits(connection, true);
    //console.log(toEntangle)

    //let newImages = await createAllEntangledImages("pandas-to-entangle.json", "./assets/");
    
    //const jbPandaTraits = readJson("pandas-to-entangle.json")
    //let j = 0
    //let imgUrls = readJson("juicebox.json");
    //for (let panda of jbPandaTraits) {
    //    const pandaMint = new PublicKey(JB_HOLDER_PANDA_MINTS[Object.keys(JB_HOLDER_PANDA_MINTS)[j]]);
    //    const pandaMetadataInfo = await programs.metadata.Metadata.getInfo(connection, await getMetadata(pandaMint));
    //    const pandaMetadata = decodeMetadata(pandaMetadataInfo.data);
    //    const pandaData = JSON.parse(await fetchAndRead(pandaMetadata.data.uri));

    //    let metadata = readJson("baseMetadata.json");
    //    metadata.image = imgUrls[j]
    //    for (let traitType of Object.keys(panda)) {
    //        metadata.attributes.push({"trait_type": traitType, "value": panda[traitType]})
   //     }
   //     metadata.name = pandaData.name
   //     writeJson(metadata, j + ".json")
   //     j++
   //     await sleep(1000)
   // }
    
    /*let uris = []
    for (let num of [19, 30]) {
        const soldierPandaMetadata = fs.readFileSync(num + ".json");
        const imgFile = num + ".png"
        const [imgUrl, url] = await arweaveUpload(
            keypair,
            connection,
            "mainnet-beta",
            imgFile,
            soldierPandaMetadata
        )
        console.log(num, imgUrl, url)
        uris.push(imgUrl)
        await sleep(1000)
    }*/
    //writeJson(uris, "juice-uris.json")

    const anchorProvider = new Provider(connection, new Wallet(keypair), {});
    const program = await loadAnchorProgram(
        TOKEN_ENTANGLEMENT_PROGRAM_ID,
        anchorProvider
    );

    /*let uris = readJson("remaining-uris.json")
    let entangledMints = readJson("entangled-mints.json");
    for (let uri of uris) {
        const entangledMint = await actions.mintNFT({
            connection: connection, 
            wallet: new Wallet(keypair),
            uri: uri,
            maxSupply: 0
        });
        entangledMints.push(entangledMint.mint);
        console.log(entangledMint)
        await sleep(1000);
    }
    writeJson(entangledMints, "JB-EMINTS-FINAL.json")*/
    
    /*let entangledMints = readJson("to-ent.json")
    let i = 0;
    for (let mint of entangledMints) {
        const ogPandaMint = OG_PANDA_MINTS_ORDERED[i];
        await createEntanglement(
            new PublicKey(ogPandaMint),
            new PublicKey(mint), 
            program, 
            keypair
        );
        i++;
        console.log("entangled");
        await sleep(1000);
    }*/

    let toSign = readJson("entangled-mints.json");
    for (let mint of toSign) {
        const [metadata, _metadataBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                new PublicKey(mint).toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
        );
        await sendTransactionWithRetryWithKeypair(
            connection,
            keypair,
            [signMetadataInstruction(metadata, keypair.publicKey)],
            [],
            'single'
        );
        console.log("signed")
        await sleep(10000)
    }

    console.log("Done");
}

function estimateManifestSize(filenames: string[]) {
    const paths = {};
    for (const name of filenames) {
        paths[name] = {
            id: '2tlQunr3LK66FEwvZi85b6UkLM01yhN9_U-nYKuzCH8',
            ext: path.extname(name).replace('.', ''),
        };
    }
    const manifest = {
        manifest: 'arweave/paths',
        version: '0.1.0',
        paths,
        index: {
            path: 'metadata.json',
        },
    };
    const data = Buffer.from(JSON.stringify(manifest), 'utf8');
    return data.length;
}

async function fetchAssetCostToStore(fileSizes: number[]) {
    const result = await calculate(fileSizes);
    return result.solana * LAMPORTS_PER_SOL;
}

export async function arweaveUpload(
    walletKeyPair: any,
    connection: any,
    env: string,
    image: any,
    manifestBuffer: any, 
  ) {
    const imageExt = path.extname(image);
    const fsStat = await stat(image);
    const estimatedManifestSize = estimateManifestSize([
      image,
      'SoldierPandaMetadata.json',
    ]);
    const storageCost = await fetchAssetCostToStore([
      fsStat.size,
      manifestBuffer.length,
      estimatedManifestSize,
    ]);
    console.log(`lamport cost to store ${image}: ${storageCost / LAMPORTS_PER_SOL}`);
    const instructions = [
        SystemProgram.transfer({
            fromPubkey: walletKeyPair.publicKey,
            toPubkey: ARWEAVE_PAYMENT_WALLET,
            lamports: storageCost,
        }),
    ];
    const tx = await sendTransactionWithRetryWithKeypair(
        connection,
        walletKeyPair,
        instructions,
        [],
        'confirmed'
    );
    const data = new FormData();
    data.append('transaction', tx['txid']);
    data.append('env', env);
    data.append('file[]', fs.createReadStream(image), {
        filename: image,
        contentType: 'image/png',
    });
    data.append('file[]', manifestBuffer, 'metadata.json');
    const result: any = await upload(data);
    const metadataFile = result.messages?.find(
        (m: any) => m.filename === 'manifest.json',
    );
    const imageFile = result.messages?.find(
        (m: any) => m.filename === image,
    );
    if (metadataFile?.transactionId) {
        const link = `https://arweave.net/${metadataFile.transactionId}`;
        const imageLink = `https://arweave.net/${
            imageFile.transactionId
        }?ext=${imageExt.replace('.', '')}`;
        return [link, imageLink];
    } 
    else {
        throw new Error(`No transaction ID for upload`);
    }
}

  
async function upload(data: FormData) {
    return await (
        await fetch(ARWEAVE_UPLOAD_ENDPOINT, {
            method: 'POST',
            // @ts-ignore
            body: data,
        })
    ).json();
}

async function entangleSoldierPanda(keypair: any) {
    const connection = new Connection("https://solana-api.projectserum.com", {commitment: "confirmed"});

    const soliderImage = "Soldier.png"

    //const soldierPandaMetadata = fs.readFileSync('./SoldierPandaMetadata.json');
    //const [imageLink, metaLink] = await arweaveUpload(
    //    keypair,
    //    connection,
    //    "mainnet-beta",
    //    soliderImage,
    //    soldierPandaMetadata
    //);

    let mint = await mintEntangled(connection, keypair);
    console.log(mint)
}

console.log(process.argv)
const keypair = keypairFromSecretJson(process.argv[2]);
main(process.argv[3], keypair)

async function mintEntangled(connection, keypair) {
    const entangledMint = await actions.mintNFT({
        connection: connection, 
        wallet: new Wallet(keypair),
        uri: "https://arweave.net/n7CsQQVJJDkLo-SPeF3wLUr_rYfMVknLvM0Hvgx-fqo",
        maxSupply: 0
    });
    return entangledMint;
}