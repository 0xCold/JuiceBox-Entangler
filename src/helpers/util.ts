import * as fs from 'fs'
import fetch from 'node-fetch'

export const fetchAndRead = async (
    url: string
) => {
    let resp = await fetch(url)
    let text = await resp.text()
    return text
}

export const readJson = (
    path: string
) => {
    return JSON.parse(fs.readFileSync(path).toString());
}

export const writeJson = (
    data: any, 
    path: string
) => {
    let stringified = JSON.stringify(data)
    fs.writeFileSync(path, stringified)
    return path
}

export function sleep(
    ms: number
): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const getUnixTs = () => {
    return new Date().getTime() / 1000;
}

export function chunks(
    array: any, 
    size: number
) {
    return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
        (_, index: number) => array.slice(index * size, (index + 1) * size),
    );
}