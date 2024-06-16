import { Habbit, habbits } from "./habbits";
import { expect } from "./log";
import { SafetyButton } from "./safetyButton";

const STREAK_RESERVE = 1000 * 60 * 60 * 6;
const STREAK_STEP = 1000 * 60 * 60 * 24;

export class StreakTile extends HTMLElement {
    name: HTMLHeadingElement;
    deleteButton: SafetyButton;
    streaks: HTMLDivElement;
    entryButton: HTMLButtonElement;
    timeLeft: HTMLSpanElement;
    timeLeftUpdater: number | NodeJS.Timeout;
    entries: HTMLDetailsElement;
    entriesSummary: HTMLElement;
    constructor(public habbit: Habbit, private save: () => any) {
        super();
        this.name = document.createElement("h3");
        this.name.innerText = habbit.title;
        super.appendChild(this.name);
        this.deleteButton = new SafetyButton("×", "☢️");
        this.deleteButton.className = "delete icon outlined";
        this.deleteButton.addEventListener("click", _ => expect("nelze smazat zvyk", () => this.delete()));
        super.appendChild(this.deleteButton);
        this.timeLeft = document.createElement("span");
        this.timeLeft.className = "timeLeft";
        super.appendChild(this.timeLeft);
        this.streaks = document.createElement("div");
        this.streaks.className = "streaks";
        super.appendChild(this.streaks);
        this.entryButton = document.createElement("button");
        this.entryButton.innerText = habbit.positive ? "Splnit" : "Porušit";
        this.entryButton.addEventListener("click", _ => expect("nelze přidat záznam", () => this.addEntry()));
        // TODO: this.entryButton.addEventListener("contextmenu", _ => /* Add a record with a note */)
        super.appendChild(this.entryButton);
        this.timeLeftUpdater = setInterval(() => this.updateTimeLeft(), 30000);
        this.entries = document.createElement("details");
        this.entries.className = "entries";
        this.entriesSummary = document.createElement("summary");
        this.entriesSummary.innerText = "Historie"
        this.entries.appendChild(this.entriesSummary);
        super.appendChild(this.entries);
        
        this.updateEntries();
    }

    private addEntry() {
        this.habbit.entries.push({
            date: new Date(),
            habbitTitle: this.habbit.title,
            notes: "",
            success: this.habbit.positive,
        });
        this.save();
        this.updateEntries();
    }

    private updateEntries() {
        // TODO: check performance
        this.entries.querySelectorAll(":not(summary)").forEach(child => child.remove())

        for(const record of this.habbit.entries) {
            if(record.success != this.habbit.positive) continue;
            const entry = document.createElement("div");
            entry.innerText = `${record.date.toLocaleString("cz", {weekday: "short", month: "2-digit", day: "2-digit", year: "2-digit"})} ${record.notes}`
            this.entries.insertAdjacentElement("afterbegin", entry);
        }
        this.updateStreaks()
    }
    private updateStreaks() {
        this.streaks.innerHTML = "";
        if(this.habbit.entries.length == 0) return;
        for(const streak of streaks(this.habbit).reverse()) {
            const span = document.createElement("span");
            span.innerHTML = streak.toString();
            this.streaks.appendChild(span);
        }
        this.updateTimeLeft();
    }

    private updateTimeLeft() {
        if(this.habbit.entries.length == 0) {
            // TODO: help text
            this.timeLeft.innerText = "";
            return;
        }
        const lastEntry = this.habbit.entries[this.habbit.entries.length - 1]!;
        const timeLeft = this.habbit.positive
            ? (STREAK_STEP + STREAK_RESERVE) - new Date().getTime() + lastEntry.date.getTime()
            : STREAK_STEP - (new Date().getTime() - lastEntry.date.getTime()) % STREAK_STEP;
        if(timeLeft > 0) {
            // TODO: format time
            this.timeLeft.innerText = `${(timeLeft / 1000 / 60 / 60).toFixed(1)} h`;
            if(!this.habbit.positive) {
                const last = this.streaks.childNodes[0];
                if(!(last instanceof HTMLSpanElement)) return;
                const streak = Math.floor((new Date().getTime() - lastEntry.date.getTime()) / STREAK_STEP);
                last.innerText = streak.toString();
            }
        } else {
            this.timeLeft.innerText = "";
        }
    }

    private delete() {
        const index = habbits.indexOf(this.habbit);
        if(index == -1) throw "nelze najít zvyk ke smazání";
        habbits.splice(index, 1);
        this.save();
        super.remove();
    }

    disconnectedCallback() {
        clearInterval(this.timeLeftUpdater);
    }
}
customElements.define("streak-tile", StreakTile);

export function streaks(habbit: Habbit, now = new Date()): number[] {
    const streaks: number[] = [];
    let lastTime: number | null = null;
    // TODO: don't repeat things
    if(habbit.positive) {
        let currentStreak = 0;
        for (const entry of habbit.entries.slice(1)) {
            if(!entry.success) {
                // console.log(entry.date, `an unsuccessful entry; streak ended at ${currentStreak}`);
                streaks.push(currentStreak);
                currentStreak = 0;
                lastTime = null;
                continue;
            }
            if(lastTime != null && entry.date.getTime() - lastTime > (STREAK_STEP + STREAK_RESERVE)) {
                // console.log(entry.date, `a late entry; streak ended at ${currentStreak}, starting a new one`);
                streaks.push(currentStreak);
                currentStreak = 1;
                lastTime = entry.date.getTime();
                continue;
            }
            // if(lastTime == null) {
            //     console.log(entry.date, `starting a new streak`);
            //     lastTime = entry.date.getTime();
            //     continue;
            // }
            lastTime = entry.date.getTime();
            currentStreak += 1;
            // console.log(entry.date, `streak at ${currentStreak}`);
        }
        streaks.push(currentStreak);
        if(currentStreak > 0 && (!lastTime || now.getTime() - lastTime > (STREAK_STEP + STREAK_RESERVE))) {
            // console.log(now, `no new entry; adding streak 0`);
            streaks.push(0);
        }
    } else {
        for(const entry of habbit.entries) {
            if(lastTime == null) {
                lastTime = entry.date.getTime();
                // console.log(entry.date, `starting a new streak`);
                continue;
            }
            const streak = Math.floor((entry.date.getTime() - lastTime) / STREAK_STEP);
            if(entry.success) {
                // console.log(entry.date, `ignoring successful entry. streak at ${streak}`);
                continue;
            }
            // console.log(entry.date, `streak ended at ${streak}. starting a new one`);
            streaks.push(streak);
            lastTime = entry.date.getTime();
        }
        streaks.push(Math.floor((now.getTime() - (lastTime ?? now.getTime())) / STREAK_STEP));
    }
    return streaks;
}