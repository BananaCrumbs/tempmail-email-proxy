

import Email from "./Email";
import {SMTPServer, SMTPServerDataStream, SMTPServerSession} from "smtp-server";
import {AddressObject, simpleParser} from "mailparser";
import Logger from "./Logger";

/**
 * Handles the incoming emails.
 */
export default class EmailServer {
    
    private server: SMTPServer;
    
    /**
     * Creates a new EmailServer.
     * @param port {number} The port to listen on.
     * @param listener {listener: (email: Email) => any} The listener to call when an email is received.
     */
    public constructor(port: number, listener: (email: Email[]) => void) {
        this.server = new SMTPServer({
            name: "Postfix (Ubuntu)", //helps to avoid tempmail detection
            secure: false,
            authOptional: true,
            sessionTimeout: 20,
            size: 1048576, //1MB
            disabledCommands: ["AUTH", "STARTTLS"],
            onData(stream: SMTPServerDataStream, session: SMTPServerSession, callback: (err?: (Error | null)) => void) {
                try {
                    EmailServer.dataListener(stream, session, callback, listener);
                } catch(e) {
                    console.error(e);
                }
            },
        });
        
        this.server.on("error", (e: any) => {
            Logger.log("Email server error: " + e);
        })
        
        //listen
        this.server.listen(port, () => {
            Logger.log(`Email server listening on port ${port}`);
        });
        
    }
    
    /**
     * Listens for incoming emails.
     *
     * @param stream {SMTPServerDataStream} The stream to listen on.
     * @param session {SMTPServerSession} The session of the stream.
     * @param callback {(err?: (Error | null)) => void} The callback to call when the stream is done.
     * @param listener {listener: (email: Email) => any} The listener to call when an email is received.
     * @private
     */
    private static dataListener(stream: SMTPServerDataStream, session: SMTPServerSession, callback: (err?: (Error | null)) => void, listener: (email: Email[]) => void) {
        let stringbuff = "";
        
        if(stream.sizeExceeded) {
            callback(new Error("Message size exceeded"));
            Logger.warn(`Email message size exceeded from ${session.remoteAddress} (${stream.byteLength} bytes)`)
            return;
        }
        
        stream.on("data", (chunk: Buffer) => {
            stringbuff += Buffer.from(chunk);
        });
        
        stream.on("end", async () => {
            const parsed = await simpleParser(stringbuff);
            
            const sender = session.envelope.mailFrom ? session.envelope.mailFrom.address : undefined;
            const rcpt   = session.envelope.rcptTo.map((rcpt: any) => rcpt.address)[0];
            
            //if sender/rcpt are not set
            if(!sender || !rcpt) {
                return callback(new Error("Invalid envelope (nullish sender/rcpt)"));
            }
            
            //create a new email and send it to the listener
            const email = new Email(sender,
                rcpt,
                parsed.subject || "[no subject]",
                parsed.text || "[email has empty or invalid body]",
                Date.now(),
                session.remoteAddress,
                parsed.html || undefined
            );
            
            let emails = [email];
            
            async function addCC(type: "cc" | "bcc") {
                for(let i = 0; i < (parsed[type] as AddressObject[]).length; i++){
                    const cc = ((parsed.cc as AddressObject[])[i]);
                    
                    if(!cc || !cc.value) continue;
                    
                    for(const c of cc.value) {
                        
                        if(c.address) emails.push(new Email(
                            sender as string,
                            c.address,
                            parsed.text || "[no subject]",
                            parsed.text || "[email has empty or invalid body]",
                            Date.now(),
                            session.remoteAddress,
                            parsed.html || undefined,
                        ));
                    }
                }
            }
            
            //search for any carbon copy addresses (unlikely)
            if(parsed.cc && parsed.cc instanceof Array) {
                await addCC("cc");
            }
            
            //search for any bcc addresses (might be used for newsletters)
            if(parsed.bcc && parsed.bcc instanceof Array) {
                await addCC("bcc");
            }
            
            listener(emails);
            callback();
        });
    }
    
}
