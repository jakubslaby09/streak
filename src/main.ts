import { Habbit, habbits, parseHabbits, unparseHabbits, writeHabbits } from "./habbits.ts";
import { displayError, expect } from "./log.ts";
import { StreakTile } from "./streakTile.ts";
import { backupCredentials, clearLogin, downloadBackup, generateBackupKey, login, uploadBackup } from "./online.ts";

expect("nelze zaregistrovat service worker", async () => {
    if(location.host == "localhost:3200") return;
    if(!("serviceWorker" in navigator)) throw "API není dostupné";
    navigator.serviceWorker.register(new URL("/sw.js", import.meta.url));
    navigator.serviceWorker.addEventListener("message", event => expect("nelze zpracovat zprávu ze service workeru", () => {
        if(!("error" in event.data)) throw `neznámá zpráva: ${event.data}`;
        if(!("message" in event.data) || typeof event.data.message != "string") throw `zpráva o chybě je prázdná: ${event.data}`;
        displayError(`sw: ${event.data.message}`, event.data.error);
    }));
    navigator.serviceWorker.addEventListener("controllerchange", _ => {
        navigator.serviceWorker.controller?.postMessage("x-log");
    });
    navigator.serviceWorker.controller?.postMessage("x-log");
});

const positiveSection = document.querySelector<"section">("body > section#positive-habbits" as any);
const negativeSection = document.querySelector<"section">("body > section#negative-habbits" as any);
const backupSection = document.querySelector<"section">("body > section#backup" as any);
const newHabbitDetail = document.querySelector<"details">("body > details#new-habbit" as any);
try {
    if(newHabbitDetail == null) throw "missing body > details#new-habbit";
    const nameField = newHabbitDetail.querySelector<"input">('input[type="text"]#new-name' as any);
    if(nameField == null) throw 'missing body > details#new-habbit > input[type="text"]#new-name';
    const positiveCheckbox = newHabbitDetail.querySelector<"input">('input[type="checkbox"]#new-positive' as any);
    if(positiveCheckbox == null) throw 'missing body > details#new-habbit > input[type="checkbox"]#new-positive';
    let createButton = newHabbitDetail.querySelector<"button">('button#create-new' as any);
    if(createButton == null) throw 'missing body > details#new-habbit > button#create-new';

    const checkName = () => {
        createButton.disabled = nameField.value.trim().length == 0 || habbits.find(h => h.title == nameField.value) != undefined;
    }
    nameField.addEventListener("input", checkName);

    positiveCheckbox.addEventListener("input", _ => {
        if(positiveCheckbox.checked) {
            newHabbitDetail.removeAttribute("negative");
        } else {
            newHabbitDetail.setAttribute("negative", "");
        }
    });
    
    createButton.addEventListener("click", () => expect("nelze přidat návyk", () => {
        if(positiveSection == null) {
            throw "missing body > section#positive-habbits";
        };
        if(negativeSection == null) {
            throw "missing body > section#negative-habbits";
        };
        const habbit = Habbit.newWithEntry(
            nameField.value.trim().length > 0 ? nameField.value : "Nepojmenovaný návyk",
            positiveCheckbox.checked,
        );
        habbits.unshift(habbit);
        checkName();
        const section = positiveCheckbox.checked ? positiveSection : negativeSection;
        section.insertAdjacentElement("afterbegin", new StreakTile(habbit, () => writeHabbits(habbits)));
        writeHabbits(habbits);
    }));
} catch (e) {
    displayError("nelze zprovoznit přidávání nových návyků", e);
}

function loadHabbits() {
    expect("nelze zobrazit uložené návyky", () => {
        if(positiveSection == null) throw "missing body > section#positive-habbits";
        if(negativeSection == null) throw "missing body > section#negative-habbits";
        positiveSection.innerHTML = "";
        negativeSection.innerHTML = "";
        for (const habbit of habbits) {
            console.log(habbit);
            const section = habbit.positive ? positiveSection : negativeSection;
            section.appendChild(new StreakTile(habbit, () => writeHabbits(habbits)));
        }
        // TODO: use pseudoelements
        if(positiveSection.childNodes.length == 0) {
            positiveSection.innerHTML = '<p style="text-align: center">nic tu není...<br><br></p>';
        }
        if(negativeSection.childNodes.length == 0) {
            negativeSection.innerHTML = '<p style="text-align: center">nic tu není...<br><br></p>';
        }
    });
}
loadHabbits();

expect("nelze zprovoznit zálohování", () => {
    if(backupSection == null) throw "missing body > section#backup";
    const saveButton = backupSection.querySelector<"button">('button#save-backup' as any);
    if(saveButton == null) throw 'missing body > section#backup > button#save-backup';
    const restoreButton = backupSection.querySelector<"button">('button#restore-backup' as any);
    if(restoreButton == null) throw 'missing body > section#backup > button#restore-backup';
    
    saveButton.addEventListener("click", () => expect("nelze uložit zálohu", () => {
        const backup = unparseHabbits(habbits);
        const url = URL.createObjectURL(new Blob([backup]));
        const link = document.createElement("a");
        link.href = url;
        link.download = `Streak ${new Date().toLocaleDateString()}.csv`;
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }));
    restoreButton.addEventListener("click", () => expect("nelze obnovit zálohu", async () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "text/csv,.csv";
        input.click();
        const files = await new Promise<FileList | null>(res => input.addEventListener("input", _ => res(input.files)));
        console.log(files);
        
        if(files == null || files.length == 0) return;
        if(files.length > 1) {
            // TODO: concat file entries
            throw "obnova z více souborů zatím není podporována.";
        }
        const file = await files[0]!.text();
        const parsed = parseHabbits(file);
        writeHabbits(parsed);
        habbits.length = 0;
        habbits.push(...parsed);
        loadHabbits();
    }));

    // TODO: cleanup
    expect("nelze zprovoznit přihlašování a online zálohy", () => {
        const uploadButton = backupSection.querySelector<"button">('button#upload-backup' as any);
        if(uploadButton == null) throw 'missing body > section#backup > button#upload-backup';
        const downloadButton = backupSection.querySelector<"button">('button#download-backup' as any);
        if(downloadButton == null) throw 'missing body > section#backup > button#download-backup';
        const backupKey = backupSection.querySelector<"input">('input#backup-key' as any);
        if(backupKey == null) throw 'missing body > section#backup > input#backup-key';
        const loginButton = backupSection.querySelector<"button">('button#login' as any);
        if(loginButton == null) throw 'missing body > section#backup > button#login';
        const clipboardButton = backupSection.querySelector<"button">('button#copy-backup-key' as any);
        if(clipboardButton == null) throw 'missing body > section#backup > button#copy-backup-key';

        if(backupCredentials != null) {
            backupKey.value = backupCredentials.key;
            backupKey.readOnly = true;
            saveButton.className = "outlined";
            uploadButton.style.display = "";
            downloadButton.style.display = "";
        }
        
        asyncButton(loginButton, () => expect("nelze se přihlásit", async () => {
            if(backupCredentials != null) {
                // TODO: revoke tokens
                clearLogin();
                onInput();
            } else {
                loginButton.disabled = true;
                if(backupKey.value.length == 0) {
                    const [_, string] = await generateBackupKey();
                    await login(string, true);
                } else {
                    await login(backupKey.value);
                }
                onInput();
                loginButton.disabled = false;
            }

            backupKey.readOnly = backupCredentials != null;
            saveButton.className = backupCredentials == null ? "outlined" : "";
            uploadButton.style.display = backupCredentials == null ? "none" : "";
            downloadButton.style.display = backupCredentials == null ? "none" : "";
        }));

        const onInput = () => {
            if(backupCredentials != null) {
                loginButton.innerText = "Odhlásit se";
                loginButton.disabled = false;
            } else if(backupKey.value.length == 0) {
                loginButton.innerText = "Registrovat";
                loginButton.disabled = false;
            } else {
                loginButton.innerText = "Přihlásit se";
                loginButton.disabled = backupKey.value.length != 24;
            }
        };
        onInput();
        backupKey.addEventListener("input", onInput);

        clipboardButton.addEventListener("click", () => expect("nelze pracovat se schránkou", async () => {
            if(backupKey.value.length == 0) {
                backupKey.value = await navigator.clipboard.readText();
                onInput();
            } else {
                await navigator.clipboard.writeText(backupKey.value);
            }
        }));

        asyncButton(uploadButton, () => expect("nelze nahrát zálohu", async () => {
            if(backupCredentials == null) throw "nejste přihlášeni";
            await uploadBackup(backupCredentials, unparseHabbits(habbits));
        }));
        
        asyncButton(downloadButton, () => expect("nelze stáhnout a obnovit zálohu", async () => {
            if(backupCredentials == null) throw "nejste přihlášeni";
            const parsed = parseHabbits(await downloadBackup(backupCredentials));
            writeHabbits(parsed);
            habbits.length = 0;
            habbits.push(...parsed);
            loadHabbits();
        }));
    });
});

function asyncButton(button: HTMLButtonElement, onclick: (this: HTMLButtonElement, ev: MouseEvent) => Promise<any>) {
    button.addEventListener("click", function(e) {
        button.disabled = true;
        button.setAttribute("waiting", "");
        onclick.call(this, e).finally(() => {
            button.disabled = false;
            button.removeAttribute("waiting");
        });
    });
}

(window as any).parse = parseHabbits;
(window as any).unparse = unparseHabbits;