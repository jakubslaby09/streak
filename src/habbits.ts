import csvParse from 'papaparse';
import { displayError } from './log';

const FORMAT_VERSION = 0 as const;
const LOCALSTORAGE_KEY = "habbits" as const;

export class Habbit {
    entries: HabbitEntry[] = []
    constructor(
        public title: string,
        public positive: boolean,
    ) {}

    static newWithEntry(title: string, positive: boolean): Habbit {
        const it = new Habbit(title, positive);
        it.entries.push({
            date: new Date(),
            habbitTitle: title,
            success: !positive,
            notes: "",
        });
        return it;
    }
}

export interface HabbitEntry {
    date: Date,
    habbitTitle: string,
    success: boolean,
    notes: string,
}
function parseHabbitEntry(entry: string[]): HabbitEntry {
    const values = Object.values(entry);
    if(values.length < 4) throw `habbit entry has less than 4 values: ${JSON.stringify(values)}`;
    return {
        date: new Date(values[0]!),
        habbitTitle: values[1],
        success: (values[2]!).trim() != "",
        notes: values[3],
    } as HabbitEntry;
}

export const habbits = readHabbits() ?? [];

export function parseHabbits(csv: string): Habbit[] {
    const parsed = csvParse.parse(csv, {
        delimiter: ";",
        header: false,
    });

    const habbits: {[title: string]: Habbit} = {}
    if(!Array.isArray(parsed.data[0])) throw "parsed csv header is not an array";
    if(parsed.data[0][0] != FORMAT_VERSION.toString()) throw `parsed csv has an unsupported version: ${parsed.data[0][0]}`;
    for (const entry of parsed.data.slice(1)) {
        if(!Array.isArray(entry)) throw "parsed csv entry is not an array";
        const parsed = parseHabbitEntry(entry as string[]);
        habbits[parsed.habbitTitle] ??= new Habbit(parsed.habbitTitle, !parsed.success);
        habbits[parsed.habbitTitle]!.entries.push(parsed);
    }
    
    return Object.values(habbits);
}

export function unparseHabbits(habbits: Habbit[]) {
    const entries: [string, string, string, string][] = [[FORMAT_VERSION.toString(), "habbit", "success", "notes"]];
    for (const habbit of habbits) {
        for (const entry of habbit.entries) {
            entries.push([
                entry.date.toISOString(),
                habbit.title,
                entry.success ? "x" : " ",
                entry.notes,
            ]);
        }
    }
    return csvParse.unparse(entries, {
        delimiter: ";",
    })
}

function readHabbits(): Habbit[] | null {
    try {
        const csv = localStorage.getItem(LOCALSTORAGE_KEY);
        if(csv == null) return null;
        return parseHabbits(csv);
    } catch (e) {
        // TODO: backup broken csv
        displayError("nelze načíst návyky z localstorage", e);
        return null;
    }
}
export function writeHabbits(habbits: Habbit[]) {
    localStorage.setItem(LOCALSTORAGE_KEY, unparseHabbits(habbits));
}