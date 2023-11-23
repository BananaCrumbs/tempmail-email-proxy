import { readFileSync } from "fs";
import encryptMessage from "./encryptMessage";
import EmailServer from "./EmailServer";
import Email from "./Email";
import Logger from "./Logger";

const pub = readFileSync("pub.txt", "utf8");

new EmailServer(25, async (emails: Email[]) => {
    
    const body = await encryptMessage(JSON.stringify(emails), pub);
    
    fetch("https://api.tempmail.lol/addEmail", {
        method: "POST",
        body: body,
    }).then((res) => {
        if(!res.ok) {
            Logger.error(`Failed to send emails to the master server. Status code ${res.status}.`);
        } else {
            Logger.log(`Successfully sent ${emails.length} emails to the master server.`);
        }
    });
});

Logger.log("Started email server.");
