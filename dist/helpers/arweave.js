import Bundlr from '@bundlr-network/client';
export const uploadArweaveBundle = async (keypair, path) => {
    const bundlr = new Bundlr("http://node1.bundlr.network", "arweave");
    await bundlr.uploadFile(path);
};
