import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import { connectDB } from './database';
import { Sets, Cards, Learnings, UserSets } from './models/index'; // Remove .ts extension
const cors = require('cors');
dotenv.config();

const { PORT } = process.env;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: [
    'exp://192.168.1.15:8081',
    'http://192.168.1.15:8081',
    'http://localhost:3000' // Keep this for web testing
  ]
}));
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to MongoDB
connectDB();

// Define interfaces for better type safety
interface SeedSet {
  id: string;
  title: string;
  description: string;
  private: boolean;
  creator: string;
  [key: string]: any;
}

interface SeedCard {
  question: string;
  answer: string;
  set: string;
  [key: string]: any;
}

interface ShuffleItem<T> {
  value: T;
  sort: number;
}

// Helper function to convert base64 to buffer
const base64ToBuffer = (base64String: string): Buffer => {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

// Helper function to convert buffer to base64
const bufferToBase64 = (buffer: Buffer | any, contentType: string): string => {
  if (!buffer || !contentType) {
    throw new Error('Buffer and contentType are required');
  }
  return `data:${contentType};base64,${buffer.toString('base64')}`;
};

// Only for inserting our initial data!
app.get('/init', async (req, res) => {
  try {
    // Import your seed data
    const { sets, cardsCapitals, cardsProgramming } = require('./seed_database');
    
    // Clear existing data
    await Cards.deleteMany({});
    await Sets.deleteMany({});
    await UserSets.deleteMany({});
    await Learnings.deleteMany({});
    
    // Create sets first (without the old IDs)
    const setsToCreate = sets.map(({ id, ...setData }: SeedSet) => ({
      ...setData,
      creator: 'system' // Add a default creator
    }));
    
    const createdSets = await Sets.insertMany(setsToCreate);
    
    // Create a mapping from old IDs to new MongoDB ObjectIds
    const idMapping: { [key: string]: any } = {};
    sets.forEach((originalSet: SeedSet, index: number) => {
      idMapping[originalSet.id] = createdSets[index]._id;
    });
    
    // Create cards with proper set references
    const allCards = [...cardsCapitals, ...cardsProgramming].map((card: SeedCard) => ({
      question: card.question,
      answer: card.answer,
      set: idMapping[card.set] // Map old set ID to new MongoDB ObjectId
    }));
    
    await Cards.insertMany(allCards);
    
    // Update card counts in sets
    for (const set of createdSets) {
      const cardCount = allCards.filter(card => card.set.toString() === set._id.toString()).length;
      await Sets.findByIdAndUpdate(set._id, { cards: cardCount });
    }
    
    console.log('Database initialized successfully!');
    console.log(`Created ${createdSets.length} sets and ${allCards.length} cards`);
    
    return res.json({ 
      success: true, 
      sets: createdSets.length, 
      cards: allCards.length 
    });
  } catch (error) {
    console.error('Init error:', error);
    return res.status(500).json({ error: 'Failed to initialize data' });
  }
});


// Create a new set
app.post('/sets', upload.single('image'), async (req, res) => {
  try {
    const { title, description, private: isPrivate, creator } = req.body;
    
    const setData: any = {
      title,
      description,
      private: isPrivate,
      creator,
    };

    // Handle image upload
    if (req.file) {
      setData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname
      };
    }

    const set = await Sets.create(setData);
    console.log('set: ', set);

    return res.json(set);
  } catch (error) {
    console.error('Create set error:', error);
    return res.status(500).json({ error: 'Failed to create set' });
  }
});

// Get all sets
app.get('/sets', async (req, res) => {
  try {
    const sets = await Sets.find({ private: false })
      .select('title description image cards')
      .lean();
    
    // Convert image buffer to base64 for response
    const setsWithImages = sets.map((set: any) => ({
      ...set,
      image: set.image && set.image.data && set.image.contentType 
        ? {
            ...set.image,
            url: bufferToBase64(set.image.data, set.image.contentType)
          }
        : null
    }));

    return res.json(setsWithImages);
  } catch (error) {
    console.error('Get sets error:', error);
    return res.status(500).json({ error: 'Failed to get sets' });
  }
});

// Get a single set
app.get('/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const set = await Sets.findById(id).lean();
    
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Convert image buffer to base64 for response
    if (set.image && set.image.data && set.image.contentType) {
      (set as any).image = {
        ...set.image,
        url: bufferToBase64(set.image.data, set.image.contentType)
      };
    }

    return res.json(set);
  } catch (error) {
    console.error('Get set error:', error);
    return res.status(500).json({ error: 'Failed to get set' });
  }
});

// Remove a set
app.delete('/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove all user_sets references
    await UserSets.deleteMany({ set: id });
    
    // Remove all cards in this set
    await Cards.deleteMany({ set: id });
    
    // Remove all learnings for this set
    await Learnings.deleteMany({ set: id });
    
    // Remove the set itself
    await Sets.findByIdAndDelete(id);

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete set error:', error);
    return res.status(500).json({ error: 'Failed to delete set' });
  }
});

// Add a set to user favorites
app.post('/usersets', async (req, res) => {
  try {
    const { user, set } = req.body;
    
    // Check if already exists
    const existingUserSet = await UserSets.findOne({ user, set });
    if (existingUserSet) {
      return res.status(400).json({ error: 'Set already in user favorites' });
    }

    const userSet = await UserSets.create({ user, set });
    return res.json(userSet);
  } catch (error) {
    console.error('Create user set error:', error);
    return res.status(500).json({ error: 'Failed to add set to favorites' });
  }
});

// Get all user sets
app.get('/usersets', async (req, res) => {
  try {
    const { user } = req.query;

    const sets = await UserSets.find({ user })
      .populate('set')
      .select('set')
      .lean();

    // Convert image buffers to base64 for response
    const setsWithImages = sets.map((userSet: any) => ({
      ...userSet,
      set: {
        ...userSet.set,
        image: userSet.set.image && userSet.set.image.data && userSet.set.image.contentType 
          ? bufferToBase64(userSet.set.image.data, userSet.set.image.contentType) 
          : null
      }
    }));

    return res.json(setsWithImages);
  } catch (error) {
    console.error('Get user sets error:', error);
    return res.status(500).json({ error: 'Failed to get user sets' });
  }
});

// Create a new card
app.post('/cards', upload.single('image'), async (req, res) => {
  try {
    const { set, question, answer, image } = req.body;
    
    const cardData: any = {
      set,
      question,
      answer,
    };

    // Handle image upload
    if (image) {
      const imageBuffer = base64ToBuffer(image);
      cardData.image = {
        data: imageBuffer,
        contentType: 'image/png',
        filename: `${Date.now()}-card-image.png`
      };
    } else if (req.file) {
      cardData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname
      };
    }

    const card = await Cards.create(cardData);

    if (card) {
      await Sets.findByIdAndUpdate(set, { $inc: { cards: 1 } });
    }

    return res.json(card);
  } catch (error) {
    console.error('Create card error:', error);
    return res.status(500).json({ error: 'Failed to create card' });
  }
});

// Get all cards of a set
app.get('/cards', async (req, res) => {
  try {
    const { setid } = req.query;
    const cards = await Cards.find({ set: setid })
      .populate('set')
      .lean();

    // Convert image buffers to base64 for response
    const cardsWithImages = cards.map((card: any) => ({
      ...card,
      image: card.image && card.image.data && card.image.contentType 
        ? bufferToBase64(card.image.data, card.image.contentType) 
        : null,
      set: {
        ...card.set,
        image: card.set.image && card.set.image.data && card.set.image.contentType 
          ? bufferToBase64(card.set.image.data, card.set.image.contentType) 
          : null
      }
    }));

    return res.json(cardsWithImages);
  } catch (error) {
    console.error('Get cards error:', error);
    return res.status(500).json({ error: 'Failed to get cards' });
  }
});

// Learn a specific number of cards from a set
app.get('/cards/learn', async (req, res) => {
  try {
    const { setid, limit } = req.query;

    const cards = await Cards.find({ set: setid })
      .select('question answer image')
      .lean();

    // Get a random set of cards using limit
    const randomCards = cards
      .map((value: any) => ({ value, sort: Math.random() }))
      .sort((a: ShuffleItem<any>, b: ShuffleItem<any>) => a.sort - b.sort)
      .map(({ value }: ShuffleItem<any>) => value)
      .slice(0, +(limit as string));

    // Convert image buffers to base64 for response
    const cardsWithImages = randomCards.map((card: any) => ({
      ...card,
      image: card.image && card.image.data && card.image.contentType 
        ? bufferToBase64(card.image.data, card.image.contentType) 
        : null
    }));

    return res.json(cardsWithImages);
  } catch (error) {
    console.error('Get learn cards error:', error);
    return res.status(500).json({ error: 'Failed to get learning cards' });
  }
});

// Start learning progress
app.post('/learnings', async (req, res) => {
  try {
    const { user, set, cardsTotal, correct, wrong } = req.body;
    
    const learningData = {
      user,
      set,
      cards_total: +cardsTotal,
      cards_correct: +correct,
      cards_wrong: +wrong,
      score: (+correct / +cardsTotal) * 100,
    };

    const learning = await Learnings.create(learningData);
    return res.json(learning);
  } catch (error) {
    console.error('Create learning error:', error);
    return res.status(500).json({ error: 'Failed to create learning progress' });
  }
});

// Get user learning progress
app.get('/learnings', async (req, res) => {
  try {
    const { user } = req.query;
    
    const learnings = await Learnings.find({ user })
      .populate('set')
      .lean();

    // Convert image buffers to base64 for response
    const learningsWithImages = learnings.map((learning: any) => ({
      ...learning,
      set: {
        ...learning.set,
        image: learning.set.image && learning.set.image.data && learning.set.image.contentType 
          ? bufferToBase64(learning.set.image.data, learning.set.image.contentType) 
          : null
      }
    }));

    return res.json(learningsWithImages);
  } catch (error) {
    console.error('Get learnings error:', error);
    return res.status(500).json({ error: 'Failed to get learning progress' });
  }
});

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});