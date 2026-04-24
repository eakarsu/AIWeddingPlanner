const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_wedding_planner',
  user: process.env.DB_USER || 'erolakarsu',
  password: process.env.DB_PASSWORD || '',
});

async function seed() {
  console.log('Creating tables...');

  await pool.query(`
    DROP TABLE IF EXISTS notes CASCADE;
    DROP TABLE IF EXISTS wedding_profile CASCADE;
    DROP TABLE IF EXISTS accommodation CASCADE;
    DROP TABLE IF EXISTS transportation CASCADE;
    DROP TABLE IF EXISTS florals CASCADE;
    DROP TABLE IF EXISTS music CASCADE;
    DROP TABLE IF EXISTS photography CASCADE;
    DROP TABLE IF EXISTS registry_items CASCADE;
    DROP TABLE IF EXISTS invitations CASCADE;
    DROP TABLE IF EXISTS menu_items CASCADE;
    DROP TABLE IF EXISTS venues CASCADE;
    DROP TABLE IF EXISTS guests CASCADE;
    DROP TABLE IF EXISTS seating CASCADE;
    DROP TABLE IF EXISTS timeline_items CASCADE;
    DROP TABLE IF EXISTS budget_items CASCADE;
    DROP TABLE IF EXISTS vendors CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE vendors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      contact_email VARCHAR(255),
      phone VARCHAR(50),
      price_range VARCHAR(100),
      rating DECIMAL(2,1),
      description TEXT,
      website VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE budget_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(100),
      item_name VARCHAR(255) NOT NULL,
      estimated_cost DECIMAL(10,2),
      actual_cost DECIMAL(10,2),
      paid BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE timeline_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      due_date DATE,
      completed BOOLEAN DEFAULT FALSE,
      category VARCHAR(100),
      priority VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE seating (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      table_name VARCHAR(100),
      table_number INTEGER,
      capacity INTEGER,
      guest_names TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE guests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      rsvp_status VARCHAR(20) DEFAULT 'pending',
      meal_preference VARCHAR(100),
      plus_one BOOLEAN DEFAULT FALSE,
      group_name VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE venues (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      address TEXT,
      capacity INTEGER,
      price DECIMAL(10,2),
      venue_type VARCHAR(100),
      contact VARCHAR(255),
      phone VARCHAR(50),
      rating DECIMAL(2,1),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE menu_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      course VARCHAR(100),
      item_name VARCHAR(255) NOT NULL,
      description TEXT,
      dietary_info VARCHAR(255),
      price DECIMAL(10,2),
      selected BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE invitations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      guest_name VARCHAR(255),
      guest_email VARCHAR(255),
      style VARCHAR(100),
      status VARCHAR(50) DEFAULT 'draft',
      sent_date DATE,
      response_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE registry_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_name VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      price DECIMAL(10,2),
      store VARCHAR(255),
      url TEXT,
      purchased BOOLEAN DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE photography (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      photographer_name VARCHAR(255),
      style VARCHAR(100),
      package_name VARCHAR(255),
      price DECIMAL(10,2),
      hours INTEGER,
      includes TEXT,
      contact VARCHAR(255),
      rating DECIMAL(2,1),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE music (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(100),
      name VARCHAR(255),
      genre VARCHAR(100),
      price DECIMAL(10,2),
      hours INTEGER,
      contact VARCHAR(255),
      rating DECIMAL(2,1),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE florals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_name VARCHAR(255),
      flower_type VARCHAR(100),
      color VARCHAR(100),
      quantity INTEGER,
      price DECIMAL(10,2),
      vendor VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE transportation (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      vehicle_type VARCHAR(100),
      company VARCHAR(255),
      capacity INTEGER,
      price DECIMAL(10,2),
      pickup_time TIME,
      pickup_location TEXT,
      dropoff_location TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE accommodation (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      hotel_name VARCHAR(255),
      address TEXT,
      room_type VARCHAR(100),
      price_per_night DECIMAL(10,2),
      nights INTEGER,
      guests_count INTEGER,
      check_in DATE,
      check_out DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE wedding_profile (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      partner1_name VARCHAR(255),
      partner2_name VARCHAR(255),
      wedding_date DATE,
      venue_name VARCHAR(255),
      wedding_style VARCHAR(100),
      color_palette VARCHAR(255),
      total_budget DECIMAL(12,2),
      guest_count_target INTEGER,
      ceremony_time TIME,
      reception_time TIME,
      website_url VARCHAR(255),
      hashtag VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      category VARCHAR(100),
      pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created. Seeding data...');

  // Create demo user
  const hashedPassword = await bcrypt.hash(process.env.DEMO_PASSWORD || 'demo123456', 10);
  const userResult = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    ['Demo User', process.env.DEMO_EMAIL || 'demo@weddingplanner.com', hashedPassword]
  );
  const userId = userResult.rows[0].id;

  // Seed Vendors (15 items)
  const vendors = [
    [userId, 'Elegant Events Catering', 'Catering', 'info@elegantevents.com', '(555) 101-0001', '$5,000-$15,000', 4.8, 'Premium full-service catering with custom menus', 'www.elegantevents.com'],
    [userId, 'Bloom & Petal Florals', 'Florist', 'hello@bloompetal.com', '(555) 101-0002', '$2,000-$8,000', 4.9, 'Luxury floral design for weddings and events', 'www.bloompetal.com'],
    [userId, 'Capture the Moment Photography', 'Photography', 'book@capturemoment.com', '(555) 101-0003', '$3,000-$10,000', 5.0, 'Award-winning wedding photography team', 'www.capturemoment.com'],
    [userId, 'Harmony Sound DJ Services', 'DJ/Music', 'play@harmonysound.com', '(555) 101-0004', '$1,500-$4,000', 4.7, 'Professional DJ with extensive wedding experience', 'www.harmonysound.com'],
    [userId, 'Sweet Celebrations Bakery', 'Bakery', 'orders@sweetcelebrations.com', '(555) 101-0005', '$800-$3,000', 4.6, 'Custom wedding cakes and dessert tables', 'www.sweetcelebrations.com'],
    [userId, 'Graceful Gowns Bridal', 'Bridal Wear', 'appt@gracefulgowns.com', '(555) 101-0006', '$2,000-$12,000', 4.8, 'Designer bridal gowns and accessories', 'www.gracefulgowns.com'],
    [userId, 'Premier Limo & Transport', 'Transportation', 'ride@premierlimo.com', '(555) 101-0007', '$500-$3,000', 4.5, 'Luxury wedding transportation fleet', 'www.premierlimo.com'],
    [userId, 'Starlight Event Rentals', 'Rentals', 'rent@starlight.com', '(555) 101-0008', '$1,000-$5,000', 4.4, 'Tables, chairs, linens, and decor rentals', 'www.starlightrentals.com'],
    [userId, 'Divine Decor & Design', 'Decoration', 'design@divinedecor.com', '(555) 101-0009', '$2,500-$10,000', 4.9, 'Full event decoration and styling services', 'www.divinedecor.com'],
    [userId, 'Cinematic Wedding Films', 'Videography', 'film@cinematicweddings.com', '(555) 101-0010', '$4,000-$12,000', 4.8, 'Cinematic wedding videography and drone shots', 'www.cinematicweddings.com'],
    [userId, 'Heavenly Hair & Makeup', 'Beauty', 'glam@heavenlyhair.com', '(555) 101-0011', '$500-$2,000', 4.7, 'Bridal hair and makeup artistry team', 'www.heavenlyhair.com'],
    [userId, 'Sacred Ceremonies Officiant', 'Officiant', 'marry@sacredceremonies.com', '(555) 101-0012', '$300-$1,000', 5.0, 'Personalized wedding ceremony officiant', 'www.sacredceremonies.com'],
    [userId, 'Party Prints Stationery', 'Stationery', 'print@partyprints.com', '(555) 101-0013', '$400-$2,000', 4.6, 'Custom wedding invitations and stationery', 'www.partyprints.com'],
    [userId, 'Groove Band Live', 'Live Band', 'gig@grooveband.com', '(555) 101-0014', '$3,000-$8,000', 4.9, '8-piece live wedding band with vocalist', 'www.grooveband.com'],
    [userId, 'Enchanted Garden Venue', 'Venue', 'events@enchantedgarden.com', '(555) 101-0015', '$8,000-$25,000', 4.8, 'Romantic garden wedding venue with indoor backup', 'www.enchantedgarden.com'],
  ];
  for (const v of vendors) {
    await pool.query('INSERT INTO vendors (user_id, name, category, contact_email, phone, price_range, rating, description, website) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', v);
  }

  // Seed Budget Items (15 items)
  const budgetItems = [
    [userId, 'Venue', 'Ceremony & Reception Venue', 15000, 14500, true, 'Enchanted Garden - includes setup'],
    [userId, 'Catering', 'Full-Service Dinner & Bar', 12000, 11800, true, '150 guests, 3-course dinner'],
    [userId, 'Photography', 'Wedding Photography Package', 5000, 5000, true, '10 hours, 2 photographers, album'],
    [userId, 'Videography', 'Cinematic Wedding Film', 4500, 0, false, 'Full day coverage, highlight reel'],
    [userId, 'Florals', 'Flowers & Centerpieces', 3500, 3200, true, 'Bouquets, boutonnieres, centerpieces'],
    [userId, 'Music', 'DJ & Sound System', 2500, 2500, true, 'Ceremony + reception, 8 hours'],
    [userId, 'Cake', 'Wedding Cake & Desserts', 1200, 0, false, '4-tier cake + dessert table'],
    [userId, 'Attire', 'Bridal Gown & Alterations', 4000, 3800, true, 'Designer gown with veil'],
    [userId, 'Attire', 'Groom Suit & Accessories', 1500, 1400, true, 'Custom suit with shoes'],
    [userId, 'Stationery', 'Invitations & Programs', 800, 750, true, 'Custom letterpress invitations'],
    [userId, 'Transportation', 'Limo & Guest Shuttle', 1800, 0, false, 'Vintage car + guest bus'],
    [userId, 'Decorations', 'Ceremony & Reception Decor', 3000, 2800, true, 'Lights, draping, signage'],
    [userId, 'Beauty', 'Hair & Makeup', 1200, 1200, true, 'Bride + 4 bridesmaids'],
    [userId, 'Officiant', 'Wedding Officiant', 500, 500, true, 'Personalized ceremony'],
    [userId, 'Favors', 'Guest Favors & Welcome Bags', 600, 0, false, 'Custom candles for 150 guests'],
  ];
  for (const b of budgetItems) {
    await pool.query('INSERT INTO budget_items (user_id, category, item_name, estimated_cost, actual_cost, paid, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)', b);
  }

  // Seed Timeline Items (15 items)
  const timelineItems = [
    [userId, 'Book Wedding Venue', 'Research and book the perfect venue for ceremony and reception', '2026-04-01', true, 'Venue', 'high'],
    [userId, 'Hire Photographer', 'Interview and book wedding photographer', '2026-04-15', true, 'Photography', 'high'],
    [userId, 'Send Save the Dates', 'Design and mail save-the-date cards', '2026-05-01', true, 'Stationery', 'high'],
    [userId, 'Book Caterer', 'Finalize catering menu and contract', '2026-05-15', true, 'Catering', 'high'],
    [userId, 'Choose Wedding Party', 'Select bridesmaids and groomsmen', '2026-04-20', true, 'Planning', 'medium'],
    [userId, 'Order Wedding Cake', 'Schedule tasting and order cake', '2026-06-01', false, 'Cake', 'medium'],
    [userId, 'Book Florist', 'Select floral designs and arrangements', '2026-06-15', false, 'Florals', 'medium'],
    [userId, 'Hire DJ/Band', 'Book music entertainment for reception', '2026-06-01', true, 'Music', 'medium'],
    [userId, 'Send Wedding Invitations', 'Print and mail formal invitations', '2026-07-01', false, 'Stationery', 'high'],
    [userId, 'Final Dress Fitting', 'Complete final alterations and fitting', '2026-08-01', false, 'Attire', 'high'],
    [userId, 'Book Transportation', 'Arrange wedding day transport', '2026-07-15', false, 'Transportation', 'medium'],
    [userId, 'Plan Rehearsal Dinner', 'Organize rehearsal dinner venue and menu', '2026-08-15', false, 'Planning', 'medium'],
    [userId, 'Create Seating Chart', 'Finalize guest seating arrangements', '2026-08-20', false, 'Planning', 'high'],
    [userId, 'Confirm All Vendors', 'Final confirmation with every vendor', '2026-08-25', false, 'Planning', 'high'],
    [userId, 'Wedding Day Timeline', 'Create minute-by-minute wedding day schedule', '2026-08-28', false, 'Planning', 'high'],
  ];
  for (const t of timelineItems) {
    await pool.query('INSERT INTO timeline_items (user_id, title, description, due_date, completed, category, priority) VALUES ($1,$2,$3,$4,$5,$6,$7)', t);
  }

  // Seed Seating (15 tables)
  const seatingData = [
    [userId, 'Head Table', 1, 10, 'Sarah & James, Best Man Tom, MOH Lisa, Parents of Bride, Parents of Groom', 'Main table with bridal party'],
    [userId, 'Family Table A', 2, 8, 'Uncle Robert, Aunt Mary, Cousin Emma, Cousin Jack, Grandma Rose, Grandpa Bill, Aunt Sue, Uncle Dan', 'Bride family table'],
    [userId, 'Family Table B', 3, 8, 'Uncle Mike, Aunt Carol, Cousin Ryan, Cousin Ava, Grandma Pearl, Grandpa Joe, Aunt Dee, Uncle Ron', 'Groom family table'],
    [userId, 'College Friends', 4, 8, 'Mark, Jen, Dave, Katie, Chris, Amy, Steve, Rachel', 'Bride college friends'],
    [userId, 'Work Friends', 5, 8, 'Michael, Janet, Kevin, Priya, Alex, Diana, Sam, Tina', 'Groom work colleagues'],
    [userId, 'High School Friends', 6, 8, 'Brandon, Ashley, Tyler, Nicole, Derek, Megan, Josh, Carly', 'Mutual high school friends'],
    [userId, 'Neighbors & Community', 7, 8, 'Mr. Wilson, Mrs. Wilson, Dr. Chen, Linda Chen, Bob & Sue Martin, The Garcias', 'Neighborhood friends'],
    [userId, 'Kids Table', 8, 10, 'Tommy, Sally, Jake, Emma Jr, Max, Lily, Zoe, Ben, Maya, Oliver', 'Children table with activities'],
    [userId, 'Extended Family C', 9, 8, 'Cousin Leo, his wife Maria, Cousin Nate, his partner Jordan, Great Aunt Flo, Cousin Pete, wife Sandy, Cousin Amy', 'Mixed extended family'],
    [userId, 'Partner Work Friends', 10, 8, 'Helen, Rick, Courtney, Vijay, Lauren, Marcus, Erica, Jeff', 'Bride work colleagues'],
    [userId, 'Travel Friends', 11, 8, 'Marco, Sofia, Yuki, Kenji, Pierre, Marie, Hans, Greta', 'Friends from travels'],
    [userId, 'Sports Club', 12, 8, 'Coach Dan, Linda, Tommy Sr, Rita, Phil, Karen, Greg, Nancy', 'Sports league friends'],
    [userId, 'Book Club', 13, 8, 'Donna, Frank, Elaine, George, Ruth, Harold, Irene, Walter', 'Book club members'],
    [userId, 'Vendor VIPs', 14, 6, 'Planner Jessica, Photographer Mike, DJ Carlos, Florist Anna, Baker Sue, Officiant Rev. Kim', 'Vendor appreciation table'],
    [userId, 'Singles Mix', 15, 8, 'Brad, Tiffany, Connor, Vanessa, Ethan, Sienna, Leo, Ava', 'Single friends mix table'],
  ];
  for (const s of seatingData) {
    await pool.query('INSERT INTO seating (user_id, table_name, table_number, capacity, guest_names, notes) VALUES ($1,$2,$3,$4,$5,$6)', s);
  }

  // Seed Guests (15 items)
  const guestsData = [
    [userId, 'Sarah Johnson', 'sarah@email.com', '(555) 201-0001', 'confirmed', 'Vegetarian', true, 'Bride Family', 'Bride sister'],
    [userId, 'Tom Williams', 'tom@email.com', '(555) 201-0002', 'confirmed', 'Standard', false, 'Groom Friends', 'Best man'],
    [userId, 'Lisa Chen', 'lisa@email.com', '(555) 201-0003', 'confirmed', 'Gluten-Free', false, 'Bride Friends', 'Maid of honor'],
    [userId, 'Robert & Mary Smith', 'robert@email.com', '(555) 201-0004', 'confirmed', 'Standard', true, 'Bride Family', 'Uncle and aunt of bride'],
    [userId, 'Emma Davis', 'emma@email.com', '(555) 201-0005', 'pending', 'Vegan', true, 'Bride Family', 'Cousin of bride'],
    [userId, 'Michael Brown', 'michael@email.com', '(555) 201-0006', 'confirmed', 'Standard', false, 'Groom Work', 'Groom coworker'],
    [userId, 'Janet Wilson', 'janet@email.com', '(555) 201-0007', 'declined', 'Standard', false, 'Groom Work', 'Out of town'],
    [userId, 'Mark & Jen Anderson', 'mark@email.com', '(555) 201-0008', 'confirmed', 'Standard', true, 'College Friends', 'College roommate'],
    [userId, 'Grandma Rose', 'rose@email.com', '(555) 201-0009', 'confirmed', 'Diabetic-Friendly', false, 'Bride Family', 'Needs wheelchair access'],
    [userId, 'Dr. Kevin Patel', 'kevin@email.com', '(555) 201-0010', 'pending', 'Halal', true, 'Groom Friends', 'Family doctor and friend'],
    [userId, 'Ashley Thompson', 'ashley@email.com', '(555) 201-0011', 'confirmed', 'Standard', false, 'High School', 'High school friend'],
    [userId, 'Brandon & Nicole Lee', 'brandon@email.com', '(555) 201-0012', 'confirmed', 'Kosher', true, 'High School', 'High school friends, married'],
    [userId, 'Sofia Rodriguez', 'sofia@email.com', '(555) 201-0013', 'pending', 'Pescatarian', false, 'Travel Friends', 'Met while traveling in Spain'],
    [userId, 'Mr. & Mrs. Wilson', 'wilson@email.com', '(555) 201-0014', 'confirmed', 'Standard', false, 'Neighbors', 'Next door neighbors, 20 years'],
    [userId, 'Coach Dan Murphy', 'dan@email.com', '(555) 201-0015', 'confirmed', 'Standard', true, 'Sports Club', 'Groom basketball coach'],
  ];
  for (const g of guestsData) {
    await pool.query('INSERT INTO guests (user_id, name, email, phone, rsvp_status, meal_preference, plus_one, group_name, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', g);
  }

  // Seed Venues (15 items)
  const venuesData = [
    [userId, 'Enchanted Garden Estate', '1234 Rose Lane, Beverly Hills, CA', 250, 18000, 'Garden', 'Jessica Moore', '(555) 301-0001', 4.9, 'Beautiful outdoor garden with indoor backup tent'],
    [userId, 'The Grand Ballroom', '500 Luxury Ave, Los Angeles, CA', 400, 25000, 'Ballroom', 'David King', '(555) 301-0002', 4.8, 'Classic elegant ballroom with crystal chandeliers'],
    [userId, 'Malibu Beach Resort', '789 Ocean Dr, Malibu, CA', 150, 22000, 'Beach', 'Sarah Waves', '(555) 301-0003', 4.7, 'Stunning oceanfront ceremony and reception'],
    [userId, 'Vineyard Hills Winery', '456 Grape Rd, Napa, CA', 200, 16000, 'Winery', 'Marco Vino', '(555) 301-0004', 4.9, 'Romantic vineyard setting with wine tasting'],
    [userId, 'Historic Manor House', '321 Heritage Blvd, Pasadena, CA', 180, 14000, 'Historic', 'Elizabeth Worth', '(555) 301-0005', 4.6, 'Restored 1920s mansion with manicured grounds'],
    [userId, 'Skyline Rooftop Venue', '100 Downtown Plaza, LA, CA', 120, 20000, 'Rooftop', 'Tony Sky', '(555) 301-0006', 4.5, 'Stunning city skyline views for evening events'],
    [userId, 'Rustic Barn & Ranch', '987 Country Rd, Ojai, CA', 200, 10000, 'Barn', 'Billy Ranch', '(555) 301-0007', 4.7, 'Charming rustic barn with open fields'],
    [userId, 'Crystal Lake Lodge', '654 Lakeside Way, Big Bear, CA', 150, 12000, 'Lodge', 'Nina Lake', '(555) 301-0008', 4.8, 'Mountain lodge overlooking crystal clear lake'],
    [userId, 'The Art Museum Gallery', '222 Culture St, Santa Monica, CA', 300, 28000, 'Museum', 'Art Director', '(555) 301-0009', 4.6, 'Modern art museum with exhibition hall'],
    [userId, 'Botanical Conservatory', '333 Green Way, San Diego, CA', 175, 13000, 'Garden', 'Flora Green', '(555) 301-0010', 4.9, 'Tropical conservatory with rare plants'],
    [userId, 'Castle on the Hill', '444 Royal Rd, Santa Barbara, CA', 250, 35000, 'Castle', 'Lady Stone', '(555) 301-0011', 5.0, 'Fairytale castle with panoramic views'],
    [userId, 'Seaside Cliff Resort', '555 Cliff Ave, Laguna Beach, CA', 100, 19000, 'Resort', 'Cliff Manager', '(555) 301-0012', 4.7, 'Intimate cliffside venue above the ocean'],
    [userId, 'Downtown Loft Space', '666 Urban St, Arts District, LA', 200, 8000, 'Loft', 'Leo Urban', '(555) 301-0013', 4.4, 'Industrial chic loft with exposed brick'],
    [userId, 'Forest Chapel Retreat', '777 Pine Trail, Lake Arrowhead, CA', 100, 9000, 'Chapel', 'Rev. Pine', '(555) 301-0014', 4.8, 'Intimate forest chapel among towering pines'],
    [userId, 'Yacht Club Marina', '888 Harbor Blvd, Marina del Rey, CA', 120, 24000, 'Yacht Club', 'Captain Blue', '(555) 301-0015', 4.6, 'Elegant yacht club with marina views'],
  ];
  for (const v of venuesData) {
    await pool.query('INSERT INTO venues (user_id, name, address, capacity, price, venue_type, contact, phone, rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', v);
  }

  // Seed Menu Items (15 items)
  const menuData = [
    [userId, 'Appetizer', 'Bruschetta Trio', 'Classic tomato, mushroom truffle, and fig & prosciutto bruschetta', 'Vegetarian option available', 12, true],
    [userId, 'Appetizer', 'Shrimp Cocktail', 'Jumbo prawns with house-made cocktail sauce and lemon', 'Contains shellfish', 16, true],
    [userId, 'Appetizer', 'Caprese Salad', 'Fresh mozzarella, heirloom tomatoes, basil, balsamic glaze', 'Vegetarian, Gluten-Free', 10, false],
    [userId, 'Soup', 'Butternut Squash Bisque', 'Creamy roasted butternut squash with sage cream', 'Vegetarian, Gluten-Free', 8, true],
    [userId, 'Salad', 'Caesar Salad', 'Romaine hearts, parmesan, croutons, house-made dressing', 'Contains dairy', 9, true],
    [userId, 'Main Course', 'Filet Mignon', '8oz center-cut filet with red wine reduction and roasted vegetables', 'Gluten-Free', 55, true],
    [userId, 'Main Course', 'Pan-Seared Salmon', 'Wild salmon with lemon dill sauce, asparagus, and risotto', 'Gluten-Free, Pescatarian', 45, true],
    [userId, 'Main Course', 'Herb-Crusted Chicken', 'Free-range chicken breast with herbs, mashed potatoes, green beans', 'Contains dairy', 38, false],
    [userId, 'Main Course', 'Mushroom Risotto', 'Wild mushroom risotto with truffle oil and parmesan', 'Vegetarian, Gluten-Free', 32, true],
    [userId, 'Main Course', 'Vegan Wellington', 'Roasted vegetables in puff pastry with mushroom gravy', 'Vegan', 35, true],
    [userId, 'Dessert', 'Wedding Cake - Vanilla', '4-tier vanilla bean cake with buttercream and fresh flowers', 'Contains dairy, gluten', 8, true],
    [userId, 'Dessert', 'Chocolate Mousse', 'Dark chocolate mousse with raspberry coulis', 'Gluten-Free', 10, true],
    [userId, 'Dessert', 'Mini Pastry Assortment', 'Macarons, eclairs, fruit tarts, and cream puffs', 'Contains dairy, gluten, nuts', 14, false],
    [userId, 'Beverage', 'Signature Cocktail - Love Potion', 'Champagne, raspberry liqueur, rose water, edible gold', 'Contains alcohol', 15, true],
    [userId, 'Beverage', 'Non-Alcoholic Spritzer', 'Sparkling water, elderflower, cucumber, mint', 'Non-alcoholic', 8, true],
  ];
  for (const m of menuData) {
    await pool.query('INSERT INTO menu_items (user_id, course, item_name, description, dietary_info, price, selected) VALUES ($1,$2,$3,$4,$5,$6,$7)', m);
  }

  // Seed Invitations (15 items)
  const invitationsData = [
    [userId, 'Sarah & David Johnson', 'sarah@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-15', 'RSVP received - attending'],
    [userId, 'Tom Williams', 'tom@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-10', 'Best man - confirmed'],
    [userId, 'Lisa & Mark Chen', 'lisa@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-20', 'MOH - confirmed with plus one'],
    [userId, 'Robert & Mary Smith', 'robert@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-18', 'Bride uncle - confirmed'],
    [userId, 'Emma Davis', 'emma@email.com', 'Modern Minimal', 'sent', '2026-05-01', null, 'Awaiting response'],
    [userId, 'Michael Brown', 'michael@email.com', 'Modern Minimal', 'sent', '2026-05-01', '2026-05-25', 'Groom coworker - confirmed'],
    [userId, 'Janet Wilson', 'janet@email.com', 'Modern Minimal', 'sent', '2026-05-01', '2026-06-01', 'Declined - conflict'],
    [userId, 'Grandma Rose', 'rose@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-08', 'Needs wheelchair access noted'],
    [userId, 'Dr. Kevin Patel', 'kevin@email.com', 'Modern Minimal', 'sent', '2026-05-01', null, 'Awaiting response'],
    [userId, 'Ashley Thompson', 'ashley@email.com', 'Rustic Charm', 'sent', '2026-05-01', '2026-05-22', 'Confirmed attending'],
    [userId, 'Brandon & Nicole Lee', 'brandon@email.com', 'Rustic Charm', 'sent', '2026-05-01', '2026-05-19', 'Confirmed - kosher meal'],
    [userId, 'Sofia Rodriguez', 'sofia@email.com', 'Tropical', 'draft', null, null, 'International guest - needs address'],
    [userId, 'Mr. & Mrs. Wilson', 'wilson@email.com', 'Classic Elegant', 'sent', '2026-05-01', '2026-05-12', 'Neighbors - confirmed'],
    [userId, 'Coach Dan Murphy', 'dan@email.com', 'Rustic Charm', 'sent', '2026-05-01', '2026-05-30', 'Confirmed with plus one'],
    [userId, 'Marco & Yuki Tanaka', 'marco@email.com', 'Tropical', 'draft', null, null, 'Travel friends - sending digital invite'],
  ];
  for (const i of invitationsData) {
    await pool.query('INSERT INTO invitations (user_id, guest_name, guest_email, style, status, sent_date, response_date, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', i);
  }

  // Seed Registry Items (15 items)
  const registryData = [
    [userId, 'KitchenAid Stand Mixer', 'Kitchen', 399.99, 'Williams Sonoma', 'https://example.com', false, 'Artisan series, empire red'],
    [userId, 'Le Creuset Dutch Oven', 'Kitchen', 369.95, 'Williams Sonoma', 'https://example.com', true, '5.5 qt, flame color'],
    [userId, 'Dyson V15 Vacuum', 'Home', 749.99, 'Best Buy', 'https://example.com', false, 'Cordless with laser detection'],
    [userId, 'Egyptian Cotton Sheet Set', 'Bedroom', 289.99, 'Pottery Barn', 'https://example.com', true, 'King size, white'],
    [userId, 'Nespresso Vertuo Plus', 'Kitchen', 189.95, 'Sur La Table', 'https://example.com', false, 'With milk frother bundle'],
    [userId, 'All-Clad Cookware Set', 'Kitchen', 849.99, 'Williams Sonoma', 'https://example.com', false, '10-piece stainless steel'],
    [userId, 'Honeymoon Fund', 'Experience', 500.00, 'Zola', 'https://example.com', false, 'Contribution to Bali honeymoon'],
    [userId, 'Wine Subscription', 'Experience', 240.00, 'Wine.com', 'https://example.com', true, '6-month curated wine delivery'],
    [userId, 'Vitamix Blender', 'Kitchen', 549.95, 'Sur La Table', 'https://example.com', false, 'Professional series 750'],
    [userId, 'Outdoor Dining Set', 'Patio', 1299.99, 'Crate & Barrel', 'https://example.com', false, '6-person teak table and chairs'],
    [userId, 'Robot Vacuum', 'Home', 549.99, 'Amazon', 'https://example.com', true, 'iRobot Roomba j7+'],
    [userId, 'Luxury Towel Set', 'Bathroom', 199.99, 'Restoration Hardware', 'https://example.com', false, '802-gram Turkish cotton'],
    [userId, 'Cocktail Making Kit', 'Bar', 149.99, 'Crate & Barrel', 'https://example.com', false, 'Professional bar set with recipes'],
    [userId, 'Charity Donation', 'Charity', 100.00, 'Various', 'https://example.com', false, 'Donate to our favorite charity'],
    [userId, 'Sonos Speaker System', 'Electronics', 899.00, 'Best Buy', 'https://example.com', false, 'Sonos Arc soundbar bundle'],
  ];
  for (const r of registryData) {
    await pool.query('INSERT INTO registry_items (user_id, item_name, category, price, store, url, purchased, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', r);
  }

  // Seed Photography (15 items)
  const photoData = [
    [userId, 'Alex Rivera Photography', 'Documentary', 'Gold Package', 8000, 12, 'Full day, 2 photographers, album, online gallery, engagement shoot', 'alex@photo.com', 5.0, 'Top rated, books fast'],
    [userId, 'Sarah Kim Studios', 'Fine Art', 'Premium Package', 6500, 10, 'Full day, 1 photographer, album, prints, online gallery', 'sarah@photo.com', 4.9, 'Beautiful editorial style'],
    [userId, 'Mike Chen Photography', 'Traditional', 'Standard Package', 4000, 8, 'Full day, 1 photographer, digital files, online gallery', 'mike@photo.com', 4.7, 'Classic and reliable'],
    [userId, 'Luna & Sol Collective', 'Bohemian', 'Complete Package', 7500, 10, 'Full day, 2 photographers, album, prints, video highlight', 'luna@photo.com', 4.8, 'Husband-wife team'],
    [userId, 'Urban Light Studios', 'Modern', 'City Package', 5500, 8, 'Full day, 1 photographer, assistant, digital files, album', 'urban@photo.com', 4.6, 'Great with city venues'],
    [userId, 'Timeless Frames', 'Classic', 'Timeless Package', 5000, 8, 'Full day, 1 photographer, canvas prints, digital files', 'timeless@photo.com', 4.8, 'Elegant classic approach'],
    [userId, 'Adventure Photo Co', 'Adventure', 'Explorer Package', 9000, 14, '2 days, 2 photographers, drone, album, online gallery', 'adventure@photo.com', 4.9, 'Great for outdoor weddings'],
    [userId, 'Simply Candid', 'Candid', 'Natural Package', 3500, 6, 'Half day, 1 photographer, digital files, highlights', 'candid@photo.com', 4.5, 'Affordable candid style'],
    [userId, 'Prestige Imagery', 'Luxury', 'Platinum Package', 12000, 14, '2 days, 3 photographers, luxury album, prints, wall art', 'prestige@photo.com', 5.0, 'Celebrity photographer'],
    [userId, 'Golden Hour Studios', 'Romantic', 'Sunset Package', 5500, 8, 'Full day, 1 photographer, golden hour session, album', 'golden@photo.com', 4.7, 'Specializes in golden hour'],
    [userId, 'Flash Forward', 'Contemporary', 'Modern Package', 4500, 8, 'Full day, 1 photographer, digital files, social media edits', 'flash@photo.com', 4.6, 'Quick turnaround'],
    [userId, 'Heritage Studios', 'Vintage', 'Heritage Package', 6000, 10, 'Full day, film + digital, darkroom prints, album', 'heritage@photo.com', 4.8, 'Film photography specialist'],
    [userId, 'Drone View Wedding', 'Aerial', 'Sky Package', 3000, 4, 'Drone coverage, aerial video, 50 aerial photos', 'drone@photo.com', 4.5, 'Add-on aerial coverage'],
    [userId, 'Photo Booth Express', 'Photo Booth', 'Fun Package', 1500, 4, 'Open booth, props, prints, digital copies, guest book', 'booth@photo.com', 4.7, 'Great reception add-on'],
    [userId, 'Cinematic Wedding Video', 'Videography', 'Film Package', 7000, 10, 'Full day video, highlight reel, full ceremony, drone', 'cinema@video.com', 4.9, 'Cinematic wedding films'],
  ];
  for (const p of photoData) {
    await pool.query('INSERT INTO photography (user_id, photographer_name, style, package_name, price, hours, includes, contact, rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', p);
  }

  // Seed Music (15 items)
  const musicData = [
    [userId, 'DJ', 'DJ Smooth Vibes', 'Top 40/Dance', 2500, 6, 'smooth@dj.com', 4.8, 'Great crowd reader, all equipment included'],
    [userId, 'Live Band', 'The Wedding Crashers', 'Pop/Rock', 6000, 5, 'band@crashers.com', 4.9, '8-piece band with male and female vocalists'],
    [userId, 'String Quartet', 'Harmony Strings', 'Classical', 2000, 3, 'strings@harmony.com', 5.0, 'Perfect for ceremony and cocktail hour'],
    [userId, 'DJ', 'DJ Electric Dreams', 'EDM/House', 3000, 8, 'electric@dj.com', 4.6, 'High energy, light show included'],
    [userId, 'Jazz Ensemble', 'Blue Note Jazz', 'Jazz', 3500, 4, 'jazz@bluenote.com', 4.8, '5-piece jazz combo, great for cocktails'],
    [userId, 'Solo Acoustic', 'Jake Martin Guitar', 'Acoustic/Folk', 1200, 3, 'jake@guitar.com', 4.7, 'Beautiful acoustic ceremony music'],
    [userId, 'Live Band', 'Soul Kitchen', 'Soul/R&B', 5500, 5, 'soul@kitchen.com', 4.9, '10-piece band with horn section'],
    [userId, 'Harpist', 'Elena Strings', 'Classical/Celtic', 1500, 2, 'elena@harp.com', 5.0, 'Elegant harp for ceremony'],
    [userId, 'DJ', 'DJ Night Owl', 'Hip-Hop/R&B', 2000, 6, 'owl@dj.com', 4.5, 'Great song selection, MC skills'],
    [userId, 'Mariachi Band', 'Los Brillantes', 'Mariachi', 2500, 3, 'mariachi@brillantes.com', 4.8, 'Authentic mariachi, 7 musicians'],
    [userId, 'Live Band', 'The Motown Revue', 'Motown/Classics', 5000, 4, 'motown@revue.com', 4.7, 'Classic Motown hits, matching outfits'],
    [userId, 'Steel Drum', 'Island Rhythms', 'Caribbean', 1800, 3, 'steel@island.com', 4.6, 'Perfect for beach/tropical theme'],
    [userId, 'Pianist', 'David Keys', 'Jazz/Classical', 1500, 3, 'david@keys.com', 4.9, 'Concert pianist, can learn custom songs'],
    [userId, 'DJ', 'DJ Celebration', 'Multi-Genre', 2200, 6, 'celebrate@dj.com', 4.7, 'Bilingual MC, diverse music library'],
    [userId, 'Orchestra', 'Grand City Orchestra', 'Classical/Film', 8000, 3, 'orchestra@grand.com', 5.0, '20-piece orchestra for grand entrance'],
  ];
  for (const m of musicData) {
    await pool.query('INSERT INTO music (user_id, type, name, genre, price, hours, contact, rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', m);
  }

  // Seed Florals (15 items)
  const floralsData = [
    [userId, 'Bridal Bouquet', 'Garden Roses', 'Blush Pink & White', 1, 350, 'Bloom & Petal Florals', 'Cascading garden roses with eucalyptus'],
    [userId, 'Bridesmaid Bouquets', 'Peonies', 'Dusty Rose', 4, 600, 'Bloom & Petal Florals', 'Matching smaller versions of bridal bouquet'],
    [userId, 'Groom Boutonniere', 'Ranunculus', 'White', 1, 35, 'Bloom & Petal Florals', 'Single ranunculus with greenery'],
    [userId, 'Groomsmen Boutonnieres', 'Spray Roses', 'Blush', 5, 125, 'Bloom & Petal Florals', 'Simple spray rose boutonnieres'],
    [userId, 'Ceremony Arch', 'Mixed Garden', 'Pink, White, Green', 1, 1200, 'Divine Decor & Design', 'Full floral arch with draping'],
    [userId, 'Centerpieces - Tall', 'Hydrangeas & Roses', 'White & Blush', 8, 1600, 'Bloom & Petal Florals', 'Tall glass vases with full arrangements'],
    [userId, 'Centerpieces - Low', 'Mixed Seasonal', 'Blush & Cream', 7, 700, 'Bloom & Petal Florals', 'Low garden-style in gold compotes'],
    [userId, 'Aisle Markers', 'Roses & Peonies', 'White', 10, 500, 'Bloom & Petal Florals', 'Pew end arrangements'],
    [userId, 'Head Table Garland', 'Eucalyptus & Roses', 'Green & Blush', 1, 450, 'Bloom & Petal Florals', '15ft table runner garland'],
    [userId, 'Cake Flowers', 'Spray Roses', 'Blush & White', 1, 150, 'Bloom & Petal Florals', 'Fresh flowers for cake decoration'],
    [userId, 'Flower Girl Basket', 'Rose Petals', 'Pink', 2, 80, 'Bloom & Petal Florals', 'Basket with fresh petals to scatter'],
    [userId, 'Corsages (Mothers)', 'Orchids', 'White & Blush', 4, 160, 'Bloom & Petal Florals', 'Wrist corsages for mothers and grandmothers'],
    [userId, 'Welcome Sign Florals', 'Mixed', 'Blush & Greenery', 1, 200, 'Divine Decor & Design', 'Floral arrangement for welcome sign'],
    [userId, 'Cocktail Hour Florals', 'Seasonal Mix', 'Pastel', 6, 300, 'Bloom & Petal Florals', 'Small bud vases for cocktail tables'],
    [userId, 'Toss Bouquet', 'Carnations & Roses', 'Mixed Pink', 1, 75, 'Bloom & Petal Florals', 'Smaller bouquet for bouquet toss'],
  ];
  for (const f of floralsData) {
    await pool.query('INSERT INTO florals (user_id, item_name, flower_type, color, quantity, price, vendor, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', f);
  }

  // Seed Transportation (15 items)
  const transportData = [
    [userId, 'Vintage Rolls Royce', 'Premier Limo & Transport', 4, 1500, '14:00', 'Bride Home, 123 Oak St', 'Enchanted Garden Estate', 'Bride arrival - classic white Rolls Royce'],
    [userId, 'Black Stretch Limo', 'Premier Limo & Transport', 10, 800, '13:30', 'Groom Home, 456 Elm Ave', 'Enchanted Garden Estate', 'Groom + groomsmen transport'],
    [userId, 'White SUV Limo', 'Premier Limo & Transport', 8, 700, '13:30', 'Hotel Marmont, 789 Sunset', 'Enchanted Garden Estate', 'Bridesmaids transport'],
    [userId, 'Guest Shuttle Bus A', 'City Coach Lines', 45, 600, '15:00', 'Downtown Hilton', 'Enchanted Garden Estate', 'Guest shuttle - first run'],
    [userId, 'Guest Shuttle Bus B', 'City Coach Lines', 45, 600, '15:30', 'Beach Resort Hotel', 'Enchanted Garden Estate', 'Guest shuttle - second pickup'],
    [userId, 'Vintage Car - Getaway', 'Classic Car Rental Co', 2, 1200, '23:00', 'Enchanted Garden Estate', 'Suite at The Peninsula', 'Couple getaway car - red convertible'],
    [userId, 'Return Shuttle A', 'City Coach Lines', 45, 500, '23:30', 'Enchanted Garden Estate', 'Downtown Hilton', 'Guest return shuttle'],
    [userId, 'Return Shuttle B', 'City Coach Lines', 45, 500, '00:00', 'Enchanted Garden Estate', 'Beach Resort Hotel', 'Late return shuttle'],
    [userId, 'VIP Town Car', 'Executive Car Service', 4, 400, '12:00', 'LAX Airport', 'Downtown Hilton', 'Grandparents airport pickup'],
    [userId, 'Vendor Van', 'Quick Move Transport', 12, 300, '08:00', 'Bloom & Petal Warehouse', 'Enchanted Garden Estate', 'Floral delivery transport'],
    [userId, 'Party Bus', 'Party Bus LA', 30, 1500, '22:00', 'Enchanted Garden Estate', 'After-Party Club', 'After-party transport for wedding party'],
    [userId, 'Horse & Carriage', 'Royal Carriages', 4, 2000, '14:30', 'Garden Gate', 'Ceremony Altar', 'Bride ceremonial entrance - white horses'],
    [userId, 'Trolley Car', 'Vintage Trolley Rentals', 35, 800, '15:00', 'Guest Parking Area', 'Enchanted Garden Estate', 'Charming trolley for guest transport'],
    [userId, 'Airport Sedan - Post', 'Executive Car Service', 3, 350, '06:00', 'The Peninsula Hotel', 'LAX Airport', 'Couple airport transfer for honeymoon'],
    [userId, 'Accessibility Van', 'Wheelchair Transport Co', 6, 400, '14:30', 'Rose Senior Home', 'Enchanted Garden Estate', 'Wheelchair accessible for elderly guests'],
  ];
  for (const t of transportData) {
    await pool.query('INSERT INTO transportation (user_id, vehicle_type, company, capacity, price, pickup_time, pickup_location, dropoff_location, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', t);
  }

  // Seed Accommodation (15 items)
  const accommodationData = [
    [userId, 'The Peninsula Beverly Hills', '9882 S Santa Monica Blvd, Beverly Hills', 'Honeymoon Suite', 950, 3, 2, '2026-08-30', '2026-09-02', 'Couple honeymoon night + extra night'],
    [userId, 'Hilton Downtown LA', '555 Downtown Blvd, Los Angeles', 'Standard King', 189, 2, 2, '2026-08-30', '2026-09-01', 'Block of 10 rooms for guests'],
    [userId, 'Beach Resort Hotel', '123 Ocean Ave, Santa Monica', 'Ocean View Double', 275, 2, 2, '2026-08-30', '2026-09-01', 'Block of 8 rooms for guests'],
    [userId, 'Hotel Marmont', '8221 Sunset Blvd, Hollywood', 'Deluxe Suite', 450, 2, 4, '2026-08-30', '2026-09-01', 'Bridal party getting ready room'],
    [userId, 'Courtyard by Marriott', '200 Main St, Santa Monica', 'Standard Queen', 159, 2, 2, '2026-08-30', '2026-09-01', 'Budget option for guests'],
    [userId, 'The Ritz-Carlton', '900 W Olympic Blvd, LA', 'Club Level King', 550, 2, 2, '2026-08-30', '2026-09-01', 'Parents of bride'],
    [userId, 'Four Seasons LA', '300 S Doheny Dr, LA', 'Deluxe King', 650, 2, 2, '2026-08-30', '2026-09-01', 'Parents of groom'],
    [userId, 'Holiday Inn Express', '100 Budget Lane, LA', 'Double Queen', 129, 2, 4, '2026-08-30', '2026-09-01', 'Extended family budget rooms'],
    [userId, 'Airbnb - Beach House', '456 Pacific Coast Hwy, Malibu', 'Entire House', 400, 3, 8, '2026-08-29', '2026-09-01', 'Groomsmen pre-wedding house'],
    [userId, 'Airbnb - Villa', '789 Canyon Rd, Beverly Hills', 'Entire Villa', 500, 3, 6, '2026-08-29', '2026-09-01', 'Bridesmaids pre-wedding house'],
    [userId, 'Hampton Inn', '321 Travel Rd, LAX Area', 'King Suite', 139, 1, 2, '2026-08-30', '2026-08-31', 'Late-arriving guests near airport'],
    [userId, 'W Hotel Hollywood', '6250 Hollywood Blvd, Hollywood', 'Wonderful King', 325, 2, 2, '2026-08-30', '2026-09-01', 'College friends block'],
    [userId, 'Shutters on the Beach', '1 Pico Blvd, Santa Monica', 'Ocean View Suite', 700, 2, 2, '2026-08-30', '2026-09-01', 'VIP guest room - grandparents'],
    [userId, 'Best Western Plus', '400 Easy St, Pasadena', 'Standard King', 119, 2, 2, '2026-08-30', '2026-09-01', 'Additional budget option'],
    [userId, 'Bali Resort & Spa', '1 Paradise Rd, Ubud, Bali', 'Private Pool Villa', 350, 10, 2, '2026-09-02', '2026-09-12', 'Honeymoon - 10 nights in Bali'],
  ];
  for (const a of accommodationData) {
    await pool.query('INSERT INTO accommodation (user_id, hotel_name, address, room_type, price_per_night, nights, guests_count, check_in, check_out, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', a);
  }

  // Seed Wedding Profile
  await pool.query(
    `INSERT INTO wedding_profile (user_id, partner1_name, partner2_name, wedding_date, venue_name, wedding_style, color_palette, total_budget, guest_count_target, ceremony_time, reception_time, website_url, hashtag, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [userId, 'Sarah', 'James', '2026-09-01', 'Enchanted Garden Estate', 'Classic Elegant', 'Blush Pink, Ivory, Sage Green', 60000, 150, '16:00', '18:00', 'www.sarahandjames2026.com', '#SarahAndJamesForever', 'Outdoor garden ceremony, indoor reception backup plan']
  );

  // Seed Notes
  const notesData = [
    [userId, 'Venue Visit Notes', 'Enchanted Garden Estate was absolutely stunning! The garden ceremony area fits 200 chairs comfortably. Indoor ballroom available as rain backup. Parking for 100 cars. Caterer is flexible with outside vendors.', 'Venue', true],
    [userId, 'Color Palette Ideas', 'Final palette: Blush pink, ivory, sage green with gold accents. Bridesmaids in sage green, groomsmen in charcoal with blush ties. Flowers in blush and ivory. Table linens in ivory with sage runners.', 'Design', true],
    [userId, 'Catering Tasting Notes', 'Loved the filet mignon and salmon options. Butternut squash bisque was a hit. Need to confirm vegan wellington for 3 guests. Bar package B (premium) is within budget.', 'Catering', false],
    [userId, 'Photography Shot List', 'Must-have shots: First look at garden arch, family formals (both sides), bridal party on stone bridge, sunset portraits, sparkler exit. Photographer needs 30 min for family formals.', 'Photography', true],
    [userId, 'Music Playlist Notes', 'Ceremony: Canon in D for processional, A Thousand Years for bridal entrance. First dance: Perfect by Ed Sheeran. Father-daughter: My Girl. Mother-son: What a Wonderful World.', 'Music', false],
    [userId, 'Honeymoon Planning', 'Bali for 10 nights! Flights booked through Singapore Airlines. Activities: Ubud rice terraces, Uluwatu temple, snorkeling in Nusa Penida, cooking class, spa day.', 'Travel', false],
    [userId, 'Guest Accommodation Info', 'Room blocks at Ritz-Carlton ($299/night) and Hilton ($189/night). Shuttle from both hotels to venue. Share info on invitations. Deadline for booking: August 1.', 'Logistics', false],
    [userId, 'Day-Of Emergency Kit', 'Pack: sewing kit, stain remover, bobby pins, hairspray, breath mints, band-aids, Advil, tissues, phone charger, safety pins, fashion tape, blister pads.', 'Planning', true],
  ];
  for (const n of notesData) {
    await pool.query('INSERT INTO notes (user_id, title, content, category, pinned) VALUES ($1,$2,$3,$4,$5)', n);
  }

  console.log('Seed data complete! All features seeded with sample data.');
  console.log('Demo login: ' + (process.env.DEMO_EMAIL || 'demo@weddingplanner.com') + ' / ' + (process.env.DEMO_PASSWORD || 'demo123456'));
  await pool.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
