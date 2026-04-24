const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [budget, guests, tasks, vendors, tables, profile] = await Promise.all([
      pool.query(
        'SELECT COALESCE(SUM(estimated_cost),0) as total_estimated, COALESCE(SUM(actual_cost),0) as total_actual, COUNT(*) as item_count, COUNT(CASE WHEN paid THEN 1 END) as paid_count FROM budget_items WHERE user_id=$1',
        [userId]
      ),
      pool.query(
        "SELECT COUNT(*) as total, COUNT(CASE WHEN rsvp_status='confirmed' THEN 1 END) as confirmed, COUNT(CASE WHEN rsvp_status='pending' THEN 1 END) as pending, COUNT(CASE WHEN rsvp_status='declined' THEN 1 END) as declined, COUNT(CASE WHEN plus_one THEN 1 END) as plus_ones FROM guests WHERE user_id=$1",
        [userId]
      ),
      pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN completed THEN 1 END) as completed, COUNT(CASE WHEN NOT completed AND due_date < NOW() THEN 1 END) as overdue FROM timeline_items WHERE user_id=$1',
        [userId]
      ),
      pool.query(
        'SELECT COUNT(*) as total FROM vendors WHERE user_id=$1',
        [userId]
      ),
      pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(capacity),0) as total_capacity FROM seating WHERE user_id=$1',
        [userId]
      ),
      pool.query(
        'SELECT wedding_date FROM wedding_profile WHERE user_id=$1',
        [userId]
      )
    ]);

    res.json({
      budget: budget.rows[0],
      guests: guests.rows[0],
      tasks: tasks.rows[0],
      vendors: vendors.rows[0],
      tables: tables.rows[0],
      wedding_date: profile.rows.length > 0 ? profile.rows[0].wedding_date : null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/budget-summary', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT category, COALESCE(SUM(estimated_cost),0) as estimated, COALESCE(SUM(actual_cost),0) as actual, COUNT(*) as items FROM budget_items WHERE user_id=$1 GROUP BY category ORDER BY estimated DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/guest-summary', auth, async (req, res) => {
  try {
    const [mealResult, groupResult] = await Promise.all([
      pool.query(
        'SELECT meal_preference, COUNT(*) as count FROM guests WHERE user_id=$1 GROUP BY meal_preference',
        [req.user.id]
      ),
      pool.query(
        "SELECT group_name, COUNT(*) as count FROM guests WHERE user_id=$1 AND group_name IS NOT NULL AND group_name != '' GROUP BY group_name ORDER BY count DESC",
        [req.user.id]
      )
    ]);

    res.json({
      meal_breakdown: mealResult.rows,
      group_breakdown: groupResult.rows
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/checklist-templates', auth, async (req, res) => {
  try {
    const templates = [
      {
        name: '12-Month Planning',
        description: 'Complete wedding planning timeline starting a year before your big day. Covers all major milestones.',
        tasks: [
          { title: 'Set overall budget', description: 'Determine your total wedding budget and how to allocate it across categories.', category: 'Planning', priority: 'high', months_before: 12 },
          { title: 'Create guest list draft', description: 'Start compiling names for your guest list with both families.', category: 'Guests', priority: 'high', months_before: 12 },
          { title: 'Research and book venue', description: 'Visit potential venues, compare pricing, and secure your date.', category: 'Venue', priority: 'high', months_before: 11 },
          { title: 'Hire a wedding planner', description: 'Interview and book a wedding planner or coordinator if desired.', category: 'Planning', priority: 'medium', months_before: 11 },
          { title: 'Book photographer and videographer', description: 'Research portfolios, meet with candidates, and book your favorites.', category: 'Photography', priority: 'high', months_before: 10 },
          { title: 'Book caterer or confirm venue catering', description: 'Arrange tastings and finalize your catering provider.', category: 'Catering', priority: 'high', months_before: 10 },
          { title: 'Choose wedding party', description: 'Ask bridesmaids, groomsmen, and other attendants.', category: 'Planning', priority: 'medium', months_before: 10 },
          { title: 'Book entertainment or DJ', description: 'Listen to demos, check availability, and book your music.', category: 'Music', priority: 'medium', months_before: 9 },
          { title: 'Shop for wedding attire', description: 'Begin shopping for wedding dress, suit, or other attire.', category: 'Attire', priority: 'high', months_before: 9 },
          { title: 'Book florist', description: 'Research florists, discuss arrangements, and book.', category: 'Florals', priority: 'medium', months_before: 8 },
          { title: 'Book officiant', description: 'Find and secure your ceremony officiant.', category: 'Ceremony', priority: 'high', months_before: 8 },
          { title: 'Register for gifts', description: 'Set up your wedding registry at preferred stores.', category: 'Planning', priority: 'low', months_before: 8 },
          { title: 'Order invitations', description: 'Design and order your wedding invitations and RSVP cards.', category: 'Stationery', priority: 'medium', months_before: 7 },
          { title: 'Plan honeymoon', description: 'Research destinations, book flights and accommodation.', category: 'Travel', priority: 'medium', months_before: 7 },
          { title: 'Book transportation', description: 'Arrange transportation for the wedding day (limo, shuttle, etc.).', category: 'Transportation', priority: 'low', months_before: 6 },
          { title: 'Send save-the-dates', description: 'Mail or email save-the-date notices to all guests.', category: 'Stationery', priority: 'high', months_before: 6 },
          { title: 'Schedule cake tasting', description: 'Visit bakeries, taste options, and order your wedding cake.', category: 'Catering', priority: 'medium', months_before: 5 },
          { title: 'Arrange accommodations for out-of-town guests', description: 'Reserve hotel room blocks for traveling guests.', category: 'Accommodation', priority: 'medium', months_before: 5 },
          { title: 'Mail invitations', description: 'Send out formal wedding invitations with RSVP deadline.', category: 'Stationery', priority: 'high', months_before: 3 },
          { title: 'Final dress fitting', description: 'Complete final alterations and fitting for wedding attire.', category: 'Attire', priority: 'high', months_before: 1 }
        ]
      },
      {
        name: '6-Month Planning',
        description: 'Condensed planning timeline for couples with 6 months to prepare. Prioritizes the essentials.',
        tasks: [
          { title: 'Set budget and priorities', description: 'Determine budget and identify your top priorities.', category: 'Planning', priority: 'high', months_before: 6 },
          { title: 'Book venue', description: 'Find and secure a venue that has your date available.', category: 'Venue', priority: 'high', months_before: 6 },
          { title: 'Finalize guest list', description: 'Confirm the final guest list with both families.', category: 'Guests', priority: 'high', months_before: 6 },
          { title: 'Book photographer', description: 'Hire a photographer and videographer.', category: 'Photography', priority: 'high', months_before: 5 },
          { title: 'Book caterer', description: 'Arrange catering tastings and book your caterer.', category: 'Catering', priority: 'high', months_before: 5 },
          { title: 'Book DJ or band', description: 'Secure your wedding entertainment.', category: 'Music', priority: 'medium', months_before: 5 },
          { title: 'Shop for wedding attire', description: 'Purchase or order wedding dress, suit, or attire.', category: 'Attire', priority: 'high', months_before: 5 },
          { title: 'Book florist', description: 'Choose your florist and discuss arrangements.', category: 'Florals', priority: 'medium', months_before: 4 },
          { title: 'Book officiant', description: 'Find and secure your ceremony officiant.', category: 'Ceremony', priority: 'high', months_before: 4 },
          { title: 'Order invitations and send', description: 'Design, order, and mail invitations promptly.', category: 'Stationery', priority: 'high', months_before: 4 },
          { title: 'Book transportation', description: 'Arrange wedding day transportation.', category: 'Transportation', priority: 'low', months_before: 3 },
          { title: 'Order wedding cake', description: 'Schedule tasting and order your cake.', category: 'Catering', priority: 'medium', months_before: 3 },
          { title: 'Plan honeymoon', description: 'Book honeymoon flights and hotel.', category: 'Travel', priority: 'medium', months_before: 3 },
          { title: 'Finalize seating chart', description: 'Arrange guest seating after RSVPs are collected.', category: 'Planning', priority: 'medium', months_before: 1 },
          { title: 'Final attire fitting', description: 'Complete final fitting and alterations.', category: 'Attire', priority: 'high', months_before: 1 }
        ]
      },
      {
        name: '3-Month Quick Plan',
        description: 'Fast-track planning for quick engagements. Focus on must-haves and skip what can wait.',
        tasks: [
          { title: 'Set budget and book venue', description: 'Determine budget and immediately secure an available venue.', category: 'Venue', priority: 'high', months_before: 3 },
          { title: 'Finalize guest list and send invitations', description: 'Finalize guest list and send invitations right away.', category: 'Guests', priority: 'high', months_before: 3 },
          { title: 'Book photographer', description: 'Find an available photographer and book immediately.', category: 'Photography', priority: 'high', months_before: 3 },
          { title: 'Book caterer', description: 'Secure catering services quickly.', category: 'Catering', priority: 'high', months_before: 3 },
          { title: 'Purchase wedding attire', description: 'Buy off-the-rack or rush-order wedding attire.', category: 'Attire', priority: 'high', months_before: 3 },
          { title: 'Book officiant', description: 'Secure your ceremony officiant.', category: 'Ceremony', priority: 'high', months_before: 2 },
          { title: 'Book DJ or create playlist', description: 'Hire a DJ or prepare your own music playlist.', category: 'Music', priority: 'medium', months_before: 2 },
          { title: 'Order flowers and decorations', description: 'Arrange florals and decor with available vendors.', category: 'Florals', priority: 'medium', months_before: 2 },
          { title: 'Order cake or dessert', description: 'Book a bakery for your wedding cake or dessert.', category: 'Catering', priority: 'medium', months_before: 2 },
          { title: 'Confirm all vendors and finalize details', description: 'Reconfirm every vendor, finalize timeline and seating.', category: 'Planning', priority: 'high', months_before: 1 }
        ]
      }
    ];

    res.json(templates);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
