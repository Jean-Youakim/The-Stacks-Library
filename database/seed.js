// database/seed.js — seeds the books collection with default catalog
// Run once: node database/seed.js
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const mongoose  = require('mongoose');
const connectDB = require('../backend/config/db');
const Book      = require('../backend/models/Book');

const seedBooks = [
  { title: 'The Moonlit Archivist',    author: 'E. Marlowe',  year: 2022, genre: 'Fantasy',   tags: ['magic','library'],    cover: 'linear-gradient(135deg,#6a7cff,#c68cff)', available: true,  stock: 10, price: 14.99, description: 'A night archivist discovers that the library\u2019s indexes control the memories of an entire city.' },
  { title: 'Ink & Ember',              author: 'S. Delaunay', year: 2021, genre: 'Fantasy',   tags: ['adventure'],          cover: 'linear-gradient(135deg,#ff7b7b,#ffd36b)', available: true,  stock: 10, price: 12.50, description: 'Two rival scribes must rewrite the fate of their kingdom using a living, burning manuscript.' },
  { title: 'Clockwork Quill',          author: 'J. Viridian', year: 2019, genre: 'Steampunk', tags: ['machines','mystery'], cover: 'linear-gradient(135deg,#3ac2ff,#8a7bff)', available: true,  stock: 10, price: 11.99, description: 'In a city of gears and ink, a mechanical pen starts drafting crimes before they happen.' },
  { title: 'Whispers in the Stacks',   author: 'A. Rhee',     year: 2020, genre: 'Mystery',   tags: ['ghosts'],             cover: 'linear-gradient(135deg,#70f0c2,#6aa9ff)', available: true,  stock: 10, price: 10.99, description: 'A young librarian must bargain with ghosts that haunt overdue books.' },
  { title: 'Atlas of Luminous Seas',   author: 'K. Noor',     year: 2018, genre: 'Adventure', tags: ['ocean'],              cover: 'linear-gradient(135deg,#43b7ff,#7affdb)', available: true,  stock: 10, price: 13.25, description: 'A magical atlas reveals shifting islands that exist only when someone is reading about them.' },
  { title: 'The Paper Alchemist',      author: 'N. Sol',      year: 2023, genre: 'Fantasy',   tags: ['alchemy'],            cover: 'linear-gradient(135deg,#ffd36b,#ff8eb3)', available: true,  stock: 10, price: 15.75, description: 'An apprentice turns stories into gold\u2014but every transmutation erases a memory.' },
  { title: 'Vellichor',               author: 'M. Finch',    year: 2017, genre: 'Literary',  tags: ['bookstore'],          cover: 'linear-gradient(135deg,#7da0ff,#d29bff)', available: true,  stock: 10, price:  9.99, description: 'A quiet novel about a secondhand bookstore where the books remember their readers.' },
  { title: 'A Study in Starlight',     author: 'R. Hale',     year: 2024, genre: 'Sci-Fi',    tags: ['space'],              cover: 'linear-gradient(135deg,#7de1ff,#a07dff)', available: true,  stock: 10, price: 16.40, description: 'A researcher unravels a library of constellations that are actually encrypted messages.' },
  { title: 'Gilded Runes',             author: 'T. Armitage', year: 2016, genre: 'Fantasy',   tags: ['magic'],              cover: 'linear-gradient(135deg,#ffc96b,#ff7ab6)', available: true,  stock: 10, price: 10.50, description: 'Ancient runes awaken in the margins of a dusty spellbook and start rewriting history.' },
  { title: 'The Cartographer\u2019s Secret', author: 'I. Thorne', year: 2015, genre: 'Mystery', tags: ['maps'],            cover: 'linear-gradient(135deg,#79ffa8,#6fa8ff)', available: true,  stock: 10, price: 11.20, description: 'Every map in a forgotten archive points to the same place\u2014a city that should not exist.' },
  { title: 'Empress of Dust',          author: 'Y. Navarro',  year: 2020, genre: 'Fantasy',   tags: ['desert'],             cover: 'linear-gradient(135deg,#e77bff,#7bd1ff)', available: true,  stock: 10, price: 13.99, description: 'In a shifting desert empire, forbidden books are bound in living sand.' },
  { title: 'The Night Librarian',      author: 'C. Vale',     year: 2019, genre: 'Horror',    tags: ['horror'],             cover: 'linear-gradient(135deg,#7cc2ff,#ff7f98)', available: true,  stock: 10, price: 12.99, description: 'After midnight, the librarian must file away the stories that try to escape their shelves.' }
];

(async () => {
  await connectDB();
  const count = await Book.countDocuments();
  if (count > 0) {
    console.log(`ℹ️  Books collection already has ${count} documents. Skipping seed.`);
    console.log('   To re-seed, run: node database/seed.js --force');
    if (!process.argv.includes('--force')) { mongoose.connection.close(); return; }
    await Book.deleteMany({});
    console.log('🗑️  Cleared existing books.');
  }
  await Book.insertMany(seedBooks);
  console.log(`✅  Seeded ${seedBooks.length} books into MongoDB.`);
  mongoose.connection.close();
})();
