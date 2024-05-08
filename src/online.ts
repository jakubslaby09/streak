const DB = "https://str-eek-default-rtdb.europe-west1.firebasedatabase.app" as const;

function bytesToAscii(bytes: Uint8Array) {
    // TODO: don't copy
    return btoa([...bytes].map(n => String.fromCharCode(n)).join(""));
}
function asciiToBytes(ascii: string): Uint8Array {
    return new Uint8Array(atob(ascii).split("").map(ch => ch.charCodeAt(0)));
}

export async function generateBackupKey(): Promise<[CryptoKey, string]> {
    const key = await crypto.subtle.generateKey({
        name: "AES-CBC",
        length: 128,
    } as AesKeyGenParams, true, ["encrypt", "decrypt"]);
    const bytes = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    console.log(bytes);
    
    return [key, bytesToAscii(bytes)];
    
}
(window as any).test = generateBackupKey;
export async function importKey(ascii: string): Promise<CryptoKey> {
    const buffer = asciiToBytes(ascii).buffer;
    return await crypto.subtle.importKey("raw", buffer, {
        name: "AES-CBC",
        length: 128,
    } as AesKeyGenParams, true, ["decrypt", "encrypt"]);
}

type BackupCredentials = Exclude<ReturnType<typeof loadLogin>, null>;
export let backupCredentials: BackupCredentials | null = loadLogin();

function loadLogin() {
    const key = localStorage.getItem("backupKey");
    const idToken = localStorage.getItem("backupIdToken");
    const refreshToken = localStorage.getItem("backupRefreshToken");
    if(key == null || idToken == null) return null;
    return {
        key,
        idToken,
        refreshToken,
    };
}

export function saveLogin(key: string, idToken: string, refreshToken: string) {
    localStorage.setItem("backupKey", key);
    localStorage.setItem("backupIdToken", idToken);
    localStorage.setItem("backupRefreshToken", refreshToken);
    backupCredentials = loadLogin();
}

export function clearLogin() {
    localStorage.removeItem("backupKey");
    localStorage.removeItem("backupIdToken");
    localStorage.removeItem("backupRefreshToken");
    backupCredentials = null;
}

export async function login(key: string, register = false): Promise<string> {
    if(key.length != 24) throw `klíč není dlouhý 24 písmen, ale ${key.length}`;
    const username = key.slice(0, 4);
    const password = key.slice(4);

    const res: object = await (await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:${register ? "signUp" : "signInWithPassword"}?key=AIzaSyAkqeqpmNgLrDv4wmxGtTmVIjuufnmzgB4`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: `${username}@users.str-eek.firebaseapp.com`,
            password,
            returnSecureToken: true,
        }),
    })).json();
    if("error" in res) {
        throw res["error"];
    }
    if(!("idToken" in res) || typeof res["idToken"] != "string") {
        throw "odpověď neobsahuje string idToken";
    }
    if((!("refreshToken" in res) || typeof res["refreshToken"] != "string")) {
        throw "odpověď neobsahuje string refreshToken";
    }
    saveLogin(key, res.idToken, res.refreshToken);
    return res.idToken;
    // TODO: make another function for it and do it when needed
    /* const refreshRes = fetch(`https://securetoken.googleapis.com/v1/token?key=AIzaSyAkqeqpmNgLrDv4wmxGtTmVIjuufnmzgB4`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            grant_type: "refresh_token",
            refresh_token: res["refreshToken"],
        }),
    }); */
}

export async function downloadBackup(creds: BackupCredentials, key?: CryptoKey): Promise<string> {
    key ??= await importKey(creds.key);
    const username = creds.key.slice(0, 4);
    const res: unknown = await (await fetch(`${DB}/habbits/${username}.json?auth=${creds.idToken}`)).json();
    if(res == null) throw `v databázi není žádná záloha`;
    if(typeof res != "object") throw `záloha v databázi není objekt: ${res}`;
    if("error" in res) throw res["error"];
    if(!("csv" in res) || typeof res["csv"] != "string") throw "v databázi chybí array csv";
    if(!("lastWritten" in res) || typeof res["lastWritten"] != "number") throw "v databázi chybí číslo lastWritten";
    if(!("initVector" in res) || typeof res["initVector"] != "string") throw "v databázi chybí string initVector";

    const initVector = asciiToBytes(res.initVector);
    const decrypted = await crypto.subtle.decrypt({
        name: "AES-CBC",
        iv: initVector,
    }, key, asciiToBytes(res.csv));
    
    return new TextDecoder().decode(decrypted);
}
(window as any).download = downloadBackup;

export async function uploadBackup(creds: BackupCredentials, csv: string, key?: CryptoKey) {
    key ??= await importKey(creds.key);
    const initVector = new Uint8Array(16);
    crypto.getRandomValues(initVector);
    const encrypted = await crypto.subtle.encrypt({
        name: "AES-CBC",
        iv: initVector,
    }, key, new TextEncoder().encode(csv));
    if(csv.length > 10485760) throw `backup has ${(csv.length / 1048576).toFixed(1)} MiB, but backups larger than 10 MiB aren't allowed!`;
    const username = creds.key.slice(0, 4);
    const res = await fetch(
        `${DB}/habbits/${username}.json?auth=${creds.idToken}`, {
        method: "PATCH",
        body: JSON.stringify({
            lastWritten: new Date().getTime(),
            initVector: bytesToAscii(initVector),
            csv: bytesToAscii(new Uint8Array(encrypted)),
        }),
    });
    console.log(res);
}
(window as any).upload = uploadBackup;
