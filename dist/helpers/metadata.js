import { fetchAndRead, writeJson } from "./util.js";
import fs from 'fs';
export function extractIdFromName(name) {
    let start = name.indexOf("#") + 1;
    return name.slice(start);
}
export const constructMoonrankUrl = (collection, amount) => {
    return "https://moonrank.app/mints/" + collection + "?after=0&complete=false&seen=" + amount;
};
export const getMoonrankData = async (collection, amount) => {
    let url = constructMoonrankUrl(collection, amount);
    let data = await fetchAndRead(url);
    let mintTraits = JSON.parse(data.toString()).mints.map((info) => {
        let traits = {
            id: extractIdFromName(info.name),
            mint: info.mint,
            traits: info.rank_explain
        };
        return traits;
    });
    return mintTraits;
};
export const constructMintList = (mintInfos) => {
    let ordered = mintInfos.sort(function (mi) {
        return mi.id;
    });
    let mints = ordered.map((info) => {
        return info.mint;
    });
    return mints;
};
export const constructTraitDict = (mintInfos) => {
    let allTraits = {};
    for (let info of mintInfos) {
        for (let trait of info.traits) {
            if (!allTraits.hasOwnProperty(trait.attribute)) {
                allTraits[trait.attribute] = [];
            }
            if (!allTraits[trait.attribute].includes(trait.value)) {
                allTraits[trait.attribute].push(trait.value);
            }
        }
    }
    return allTraits;
};
export const filterMintsByTrait = async (mintInfos, hasTraits) => {
    let validMints = [];
    for (let info of mintInfos) {
        for (let filter of hasTraits) {
            for (let trait of info.traits) {
                if ((trait.attribute == filter.type) && (trait.value == filter.value)) {
                    validMints.push(info);
                }
            }
        }
    }
    return validMints;
};
export const sortMintsByTrait = async (mintInfos) => {
    let mintsByTrait = {};
    for (let info of mintInfos) {
        for (let trait of info.traits) {
            if (mintsByTrait.hasOwnProperty(trait.attribute)) {
                if (mintsByTrait[trait.attribute].hasOwnProperty(trait.value)) {
                    mintsByTrait[trait.attribute][trait.value].push(info.mint);
                }
                else {
                    mintsByTrait[trait.attribute][trait.value] = [info.mint];
                }
            }
            else {
                mintsByTrait[trait.attribute] = {};
                mintsByTrait[trait.attribute][trait.value] = [info.mint];
            }
        }
    }
    return mintsByTrait;
};
export const getAndCacheCollectionInfo = async (collection, amount) => {
    let outputFolder = "output/" + collection + "/";
    fs.mkdirSync(outputFolder, { recursive: true });
    let data = await getMoonrankData(collection, amount);
    writeJson(data, outputFolder + "data.json");
    let traits = constructTraitDict(data);
    writeJson(traits, outputFolder + "traits.json");
    let mints = constructMintList(data);
    writeJson(mints, outputFolder + "mints.json");
    let byTraits = sortMintsByTrait(data);
    writeJson(byTraits, outputFolder + "by_trait.json");
    return data;
};
export function mintsFromInfos(mintInfos) {
    let mints = mintInfos.map((info) => {
        return info.mint;
    });
    return mints;
}
