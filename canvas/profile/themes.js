const themes = {
    default: {
        background: {
            color: "#151e32",
            headerGradient: [
                "#4c1d95", // #4b2aad
                "#312e81",
                "#1e1b4b", // #1e1e3f
            ],
        },

        avatar: {
            gradient: ["#9594db", "#c084fc", "#6366f1"],
            glow: "#9594db",
        },

        xpBar: {
            background: "#111827",
            fillGradient: ["#818cf8", "#c084fc"],
        },

        text: {
            primary: "#fff",
            secondary: "#a5b4fc",
        },

        separator: ["transparent", "#6366f1", "transparent"],

        medals: {
            title: "#ffffff",
            border: "#000000", // black
            background: "#808080", // grey

            achievement: {
                platinum: "#1CD6CE",
                gold: "#FAC213",
                silver: "silver",
                bronze: "grey",
                locked: "#313131",
            },
        },
    },
};

module.exports = themes;
