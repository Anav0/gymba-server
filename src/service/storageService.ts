const { Storage } = require("@google-cloud/storage");

export interface IStorageService {
  uploadFile(file: any): Promise<string>;
}

export class StorageService implements IStorageService {
  storage: Storage;
  constructor() {
    this.storage = new Storage({
      keyFilename: "./storage-access.json"
    });
  }

  uploadFile(multerFile: any): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!multerFile) reject(new Error("No file provided"));
        const corsConfiguration = [
          [
            {
              origin: [process.env.CLIENT_URL],
              responseHeader: ["Content-Type"],
              method: ["GET", "POST", "HEAD", "DELETE"],
              maxAgeSeconds: 3600
            }
          ]
        ];
        const bucket = await this.storage.bucket("gymba-files");
        bucket.setCorsConfiguration(corsConfiguration);

        const { filename } = multerFile;

        await bucket.upload(multerFile.path, {
          gzip: true,
          public: true
        });

        return resolve(`${process.env.STORAGE_URL}/gymba-files/${filename}`);
      } catch (error) {
        reject(error);
      }
    });
  }
  deleteFile(filename: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!filename) reject(new Error("No filename provided"));

        const bucket = await this.storage.bucket("gymba-files");
        await bucket.file(filename).delete();

        return resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
