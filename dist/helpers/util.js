import * as fs from 'fs';
import fetch from 'node-fetch';
export const fetchAndRead = async (url) => {
    let resp = await fetch(url);
    let text = await resp.text();
    return text;
};
export const readJson = (path) => {
    return JSON.parse(fs.readFileSync(path).toString());
};
export const writeJson = (data, path) => {
    let stringified = JSON.stringify(data);
    fs.writeFileSync(path, stringified);
    return path;
};
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export const getUnixTs = () => {
    return new Date().getTime() / 1000;
};
export function chunks(array, size) {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map((_, index) => array.slice(index * size, (index + 1) * size));
}
