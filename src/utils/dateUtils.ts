export function getSundayOfCurrentWeek(): string {
    const today = new Date();
    const day = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = today.getDate() - day + (day === 0 ? 0 : 7); // Adjust to next Sunday if today is not Sunday?
    // User said "The Sunday that the date belongs to". Usually this means the upcoming Sunday or the Sunday of that week.
    // In Korean church context, "주일" usually refers to the Sunday of that week.
    // If today is Monday (1), Sunday is +6 days.
    // If today is Sunday (0), it is today.
    // Let's assume "This week's Sunday".
    // If today is 2024-12-04 (Wednesday). Sunday is 2024-12-08.

    // Logic: Sunday is day 0.
    // If we want the Sunday of the *current* week (assuming week starts on Monday or Sunday? Church usually treats Sunday as the main day).
    // Let's target the *upcoming* Sunday or *today* if it is Sunday.

    const daysUntilSunday = 7 - (day === 0 ? 7 : day); // If 0 (Sun), 0. If 1 (Mon), 6. If 3 (Wed), 4.
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + daysUntilSunday);

    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const date = String(sunday.getDate()).padStart(2, '0');

    return `${year}-${month}-${date}`;
}
