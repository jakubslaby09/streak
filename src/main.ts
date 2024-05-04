import { Habbit, habbits, parseHabbits, unparseHabbits, writeHabbits } from "./habbits.ts";
import { displayError, expect } from "./log.ts";
import { StreakTile } from "./streakTile.ts";

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
        // if(!('showSaveFilePicker' in window)) throw "potřebné API není podporováno";
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
});

(window as any).parse = parseHabbits;
(window as any).unparse = unparseHabbits;