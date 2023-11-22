import * as openpgp from 'openpgp';
import Logger from './Logger';

export default async function encryptMessage(plainText: string, publicKeyArmored: string): Promise<string> {
    try {
        
        const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
        
        //encrypt the message
        const encrypted: string = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: plainText }),
            encryptionKeys: publicKey,
        }) as string;
        
        return encrypted;
    } catch (error) {
        Logger.error(`Failed to encrypt message: ${error}`);
        throw error;
    }
}
