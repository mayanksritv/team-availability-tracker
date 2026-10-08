require("dotenv").config();

const mongoose = require("mongoose");
const Member = require("./models/Member");
const seedData = require("./seed-data.json");

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  await Member.deleteMany({});
  await Member.insertMany(seedData);

  console.log(`Inserted ${seedData.length} team members.`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
