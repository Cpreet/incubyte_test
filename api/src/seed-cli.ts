import { openDatabase } from "./db";
import { seedDatabase } from "./seed";

const db = openDatabase();
const result = seedDatabase(db);

console.log(`Seeded ${result.employees} employees with seed ${result.seed}`);
