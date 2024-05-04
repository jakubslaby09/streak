import { Habbit } from "./habbits";
import { streaks } from "./streakTile";

describe("positive habbit streaks", () => {
    const h = new Habbit("test", true);
    test("gives a single 0 for no entries", () => {
        expect(streaks(h)).toEqual([0]);
    });
    test("calculates streak", () => {
        h.entries = [
            {
                date: new Date("4-20-2024 5:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("4-20-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-21-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-23-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
        ];
        expect(streaks(h, new Date("4-23-2024 5:01"))).toEqual([2, 1]);
    });
    test("resets streak when time's up", () => {
        h.entries = [
            {
                date: new Date("4-20-2024 5:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("4-20-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-21-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-22-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
        ];
        expect(streaks(h, new Date("4-23-2024 5:02"))).toEqual([3, 0]);
    });
    test("resets streak on an unsuccessful entry", () => {
        h.entries = [
            {
                date: new Date("4-20-2024 5:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("4-20-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-21-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("4-21-2024 6:01"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("4-22-2024 5:01"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
        ];
        expect(streaks(h, new Date("4-23-2024 5:02"))).toEqual([2, 1, 0]);
    });
});

describe("negative habbit streaks", () => {
    const h = new Habbit("test", false);

    test("gives a single 0 for no entries", () => {
        expect(streaks(h)).toEqual([0]);
    });
    
    test("calculates the current streak", () => {
        h.entries = [
            {
                date: new Date("5-3-2024 12:00"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
        ]
        expect(streaks(h, new Date("5-4-2024 12:01"))).toEqual([1]);
    });

    test("counts zero-day streaks", () => {
        h.entries = [
            {
                date: new Date("5-3-2024 12:00"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("5-3-2024 12:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("5-3-2024 14:30"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("5-3-2024 18:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
        ];
        expect(streaks(h, new Date("5-3-2024 18:00"))).toEqual([0, 0, 0, 0]);
    });
    
    test("calculates streaks", () => {
        h.entries = [
            {
                date: new Date("5-3-2024 12:00"),
                habbitTitle: "test",
                success: true,
                notes: "",
            },
            {
                date: new Date("5-4-2024 12:01"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("5-4-2024 12:30"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
            {
                date: new Date("5-6-2024 13:00"),
                habbitTitle: "test",
                success: false,
                notes: "",
            },
        ]
        expect(streaks(h, new Date("5-6-2024 13:01"))).toEqual([1, 0, 2, 0]);
    });
});