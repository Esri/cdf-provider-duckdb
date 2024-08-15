const { ContainerClient } = require("@azure/storage-blob");
const fs = require("fs");

async function downloadFromAzure(containerUrl, fileName) {
	try {
		const containerClient = new ContainerClient(containerUrl);

		let folderFiles = await containerClient.listBlobsByHierarchy("/", {
			prefix: fileName + "/",
		});
		if (folderFiles.length == 0) {
			let blobClient = containerClient.getBlobClient(fileName);
			blobClient.downloadToFile(fileName);
		} else {
			if (!fs.existsSync(fileName)) {
				await fs.promises.mkdir(fileName);
				for await (const blob of folderFiles) {
					if (blob.kind !== "prefix") {
						let blobClient = containerClient.getBlobClient(blob.name);
						await blobClient.downloadToFile("./" + blob.name);
					}
				}
			}
		}
	} catch (error) {
		throw new Error("Error downloading from Azure: ", error);
	}
}

module.exports = {
	downloadFromAzure,
};
