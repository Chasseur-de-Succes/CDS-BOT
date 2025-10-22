function discordTimestamp(date, style = "") {
    const allowedStyles = ["t", "T", "d", "D", "f", "F", "R"];
    if (style && !allowedStyles.includes(style)) {
        throw new Error(`Invalide timestamp style "${style}".`);
    }

    const timestamp = Math.floor(date / 1000);
    return `<t:${timestamp}:${style}>`;
}

module.exports = {
    discordTimestamp,
};
