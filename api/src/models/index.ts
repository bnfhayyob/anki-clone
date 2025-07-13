import mongoose from 'mongoose';
import { Schema } from 'mongoose';

// Sets Schema
const setsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  private: { type: Boolean, default: true },
  creator: { type: String, required: true , default:"anonymous"},
  image: {
    data:  Schema.Types.Buffer,
    contentType: String,
    filename: String
  },
  cards: { type: Number, default: 0 }
}, { timestamps: true });

// Cards Schema
const cardsSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: 'Sets', required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  image: {
    data:  Schema.Types.Buffer,
    contentType: String,
    filename: String
  }
}, { timestamps: true });

// Learnings Schema
const learningsSchema = new mongoose.Schema({
  set: { type: mongoose.Schema.Types.ObjectId, ref: 'Sets', required: true },
  user: { type: String, required: true },
  cards_total: { type: Number, required: true },
  cards_correct: { type: Number, required: true },
  cards_wrong: { type: Number, required: true },
  score: { type: Number, required: true }
}, { timestamps: true });

// User Sets Schema
const userSetsSchema = new mongoose.Schema({
  user: { type: String, required: true },
  set: { type: mongoose.Schema.Types.ObjectId, ref: 'Sets', required: true }
}, { timestamps: true });

export const Sets = mongoose.model('Sets', setsSchema);
export const Cards = mongoose.model('Cards', cardsSchema);
export const Learnings = mongoose.model('Learnings', learningsSchema);
export const UserSets = mongoose.model('UserSets', userSetsSchema);