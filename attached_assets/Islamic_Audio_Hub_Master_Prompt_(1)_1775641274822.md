# 🎧 Islamic Audio Hub — Complete Master Specification
## Mobile App Recreation Prompt

---

## 1. PROJECT OVERVIEW

**App Name:** Islamic Audio Hub  
**Tagline:** செவிகள் சிறக்கட்டும்! சிந்தனை மாறட்டும்! (Let ears flourish! Let thoughts change!)  
**Purpose:** A Tamil Islamic audio learning platform — Quran Tafsir, Hadith explanations, Seerah, and daily guidance in Tamil, presented as an audio streaming app with gamified quiz system.  
**Target Audience:** Tamil-speaking Muslims  
**Language:** UI is primarily in Tamil, with some English labels  
**Theme:** Dark theme by default (charcoal + gold/amber accent), with light theme (Islamic green) toggle  
**Published URL:** https://iah.lovable.app

---

## 2. DATABASE SCHEMA

### 2.1 categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- Tamil category name
  type TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  thumbnail_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Current 5 Categories (Tamil):**
| # | Name | Track Count |
|---|------|-------------|
| 1 | குர்ஆன் விளக்கம் (Quran Tafsir) | 11 |
| 2 | ஹதீஸ் விளக்கம் (Hadith Explanation) | 20 |
| 3 | ஈமான் அடிப்படைகள் (Faith Fundamentals) | 37 |
| 4 | நபி வரலாறு (Prophet's History) | 9 |
| 5 | அன்றாட வழிகாட்டி (Daily Guide) | 29 |

### 2.2 subcategories
```sql
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📖',
  sort_order INTEGER NOT NULL DEFAULT 0,
  sort_order_start INTEGER NOT NULL,  -- Maps to track sort_order range start
  sort_order_end INTEGER NOT NULL,    -- Maps to track sort_order range end
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Subcategories map tracks by sort_order range. E.g., "ஈமான் அடிப்படைகள்" has subcategories: Aqeedha (tracks 1-16) and Asmaul Husna (tracks 17-37).

### 2.3 tracks
```sql
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  thumbnail_url TEXT,
  template_id INTEGER DEFAULT floor(random()*4+1)::int,  -- 1-4 for default thumbnails
  view_count INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_daily_free BOOLEAN NOT NULL DEFAULT false,
  free_date DATE,
  duration INTEGER DEFAULT 0,           -- seconds
  sort_order INTEGER NOT NULL DEFAULT 0,
  transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 track_segments (Multi-part audio support)
```sql
CREATE TABLE track_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id),
  audio_url TEXT NOT NULL,
  segment_order INTEGER NOT NULL DEFAULT 0,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
When a track has segments, the player plays them sequentially instead of the main audio_url.

### 2.5 quiz_questions
```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  correct_option TEXT NOT NULL,   -- 'அ', 'ஆ', or 'இ' (Tamil letters)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Each track can have 10 quiz questions in Tamil. Options use Tamil letters: அ (A), ஆ (B), இ (C).

### 2.6 user_profiles
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_until TIMESTAMPTZ,
  subscription_status TEXT NOT NULL DEFAULT 'free',
  subscription_expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Auto-created via trigger on new user signup.

### 2.7 user_roles
```sql
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
```

### 2.8 favorites
```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.9 playback_progress
```sql
CREATE TABLE playback_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id),
  progress_seconds NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, track_id)
);
```
Saves every 10 seconds. Used for "Continue Listening" feature.

### 2.10 audio_notes
```sql
CREATE TABLE audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Users can take notes while listening.

### 2.11 audio_requests
```sql
CREATE TABLE audio_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```
Users can request new audio topics.

### 2.12 comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES tracks(id),
  user_id UUID,
  author_name TEXT,
  content TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
Admin-moderated comments.

### 2.13 payment_orders (Razorpay integration)
```sql
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  type TEXT NOT NULL,        -- 'subscription' or 'track_purchase'
  track_id UUID REFERENCES tracks(id),
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.14 user_purchases
```sql
CREATE TABLE user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES tracks(id),
  amount_paid NUMERIC NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.15 daily_free_history
```sql
CREATE TABLE daily_free_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id),
  free_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Database Functions
```sql
-- Auto-create profile on signup
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, is_premium, subscription_status)
  VALUES (new.id, false, 'free') ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment view count
CREATE FUNCTION increment_view_count(track_id UUID) RETURNS void AS $$
BEGIN
  UPDATE tracks SET view_count = view_count + 1 WHERE id = track_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check user role
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Storage Buckets
- `audio` (public) — Audio files
- `thumbnails` (public) — Track thumbnail images

---

## 3. PAGES & NAVIGATION

### 3.1 Navigation Structure
**Mobile:** Fixed bottom navigation bar with 5 items:
1. 🏠 முகப்பு (Home) → `/`
2. ❤️ பிடித்தவை (Favorites) → `/favorites`
3. 👤 சுயவிவரம் (Profile) → `/profile`
4. ℹ️ பற்றி (About) → `/about`
5. ✨ கோரிக்கை (Request) → Opens modal form

**Desktop:** Top navigation bar with Logo (left) and menu links (right).

### 3.2 Home Page (`/`)
- **Mobile Header:** Logo + Theme Toggle (sticky)
- **Minimal Hero:** Tamil welcome text with app tagline
- **Latest Per Category:** Horizontal scroll of latest tracks from each category
- **Category List:** Text-based list of all categories with track counts
- **Today's Free:** Single highlighted free track
- **Quick Access:** Continue Listening + Most Popular tracks
- **Audio Player** at bottom (above nav)

### 3.3 Category/Browse Page (`/browse?category={id}`)
- Shows category name as title with track count
- **Subcategory support:** If category has subcategories, shows subcategory cards first → clicking shows filtered tracks
- Back arrow below title
- Track grid with infinite scroll

### 3.4 Track Detail Page (`/audio/{trackId}` or `/audio/{trackId}/{slug}`)
- Back button
- Large square thumbnail
- Track title, category name, duration, play count
- **Play button** (or "Unlock & Play" for premium)
- **Favorite ❤️** and **Share** buttons
- **Quiz Button** (yellow gradient, animated pulse): "🎯 கேள்வி-பதில் விளையாடு" — only appears if track has quiz questions
- Related tracks from same category
- Premium payment modal / Login modal as needed

### 3.5 Favorites Page (`/favorites`)
- Grid of favorite tracks
- Login prompt if not authenticated
- Empty state with guidance

### 3.6 Profile Page (`/profile`)
- User info card (email, avatar)
- Gold Member badge if subscribed
- Subscription status card with expiry date
- Stats: Favorites count, Hours listened
- Quick actions: Notes, Favorites, Subscription management
- Sign out button

### 3.7 About Page (`/about`)
- App introduction in Tamil
- 5 content categories explained
- "Time is Capital" section
- Features: Authentic knowledge, For the Ummah
- Support/Donation section with QR code
- Quick links to policy pages
- Contact: email + phone

### 3.8 Subscription Page (`/subscription`)
- Current status (Active Gold / Free)
- Expiry date and days remaining
- Benefits list
- Upgrade to Gold button (₹99/month)
- Cancel subscription option

### 3.9 Auth Page (`/auth`)
- Email-based signup/login
- Email verification required

### 3.10 Admin Page (`/admin`)
- Category management (CRUD)
- Track management (CRUD + bulk upload)
- Subcategory management
- **Bulk Quiz Uploader:** Paste 10 Tamil quiz questions, auto-parse and save
- Quiz format parsing:
  ```
  1. Question text?
  அ) Option A
  ஆ) Option B
  இ) Option C
  சரியான விடை: அ
  ```

### 3.11 Policy Pages
- `/privacy-policy` — Privacy Policy
- `/terms-and-conditions` — Terms & Conditions
- `/refund-policy` — Refund Policy
- `/shipping-policy` — Shipping Policy
- `/install` — PWA installation guide

---

## 4. AUDIO PLAYER SYSTEM

### 4.1 Core Features
- **Global persistent player** — plays across all pages
- **Collapsed view** (mini-player): Thumbnail, title, play/pause, speed, share, quiz icon
- **Expanded view** (mobile): Full controls with seek bar, speed selector (0.5x–2x pills), prev/next, volume
- **Default speed:** 1.25x
- **Progress bar:** Clickable, shows current time / total time
- **Background playback:** Continues playing when tab is hidden or app is backgrounded
- **Visibility handling:** Resumes playback on tab return

### 4.2 Queue System
- Add/remove tracks to queue
- Queue plays after current track
- Visual queue count badge

### 4.3 Playlist/Autoplay
- When playing from category, auto-loads all category tracks as playlist
- Autoplay toggle (on by default)
- Plays next track in playlist after current ends

### 4.4 Multi-Segment Support
- Tracks can have multiple audio segments (track_segments table)
- Player plays segments sequentially
- Progress bar shows total duration across all segments

### 4.5 Playback Progress
- Saves progress every 10 seconds (to DB if logged in, localStorage otherwise)
- "Continue Listening" section on home page shows last played track with resume point

### 4.6 Player Position
- Mobile: Fixed above bottom navigation
- Desktop: Fixed at bottom with full controls

---

## 5. PREMIUM/MONETIZATION SYSTEM

### 5.1 Track Access Logic
```
Access = FREE if:
  - track.is_premium === false
  - track.is_daily_free === true (regardless of is_premium)

Access = UNLOCKED if:
  - User is Gold Member (is_premium + valid premium_until)
  - User has purchased this specific track

Access = LOCKED if:
  - track.is_premium === true AND user is not Gold AND not purchased
```

### 5.2 Payment Flow (Razorpay)
1. User clicks locked track → Login modal (if not logged in) → Payment modal
2. Options: Buy single track (₹29) or Gold subscription (₹99/month)
3. Razorpay checkout opens → Payment verified via Edge Functions
4. On success: Unlock animation → Auto-play track

### 5.3 Edge Functions
- `razorpay-create-order` — Creates Razorpay order
- `razorpay-verify-payment` — Verifies payment signature
- `razorpay-create-qr-order` — QR code payment
- `check-payment-status` — Polling payment status
- `rotate-daily-free` — Rotates daily free track

### 5.4 Visual Badges on Tracks
- **FREE** — Green badge
- **DAILY FREE** — Green badge  
- **PREMIUM** — Gray lock badge (locked)
- **UNLOCKED** — Gold crown badge (purchased/gold member)

---

## 6. QUIZ GAME SYSTEM 🎯

### 6.1 Entry Points
- **Track Detail Page:** Large yellow gradient animated button "🎯 கேள்வி-பதில் விளையாடு"
- **Audio Player (mini):** Small quiz icon with yellow pulse dot
- **Track Cards:** "QUIZ" badge on cards that have quiz questions

### 6.2 Quiz UI (Full-Screen Game Mode)
- **Full-screen modal** with gradient background (charcoal to card)
- **Decorative elements:** Glow orbs, glassmorphism effects
- **Header:** Track title + Level number + "கேள்வி-பதில் விளையாடு"

### 6.3 Question Screen
- **Progress:** "3 / 10" badge + progress bar with gradient fill + glow
- **Streak counter:** Shows 🔥 streak when 2+ consecutive correct
- **Score display:** ⭐ points with gradient background
- **Timer:** 12-second countdown per question (animated progress bar)
- **Question card:** Gradient background with bold Tamil text
- **3 options:** Large tap-friendly buttons (அ, ஆ, இ — Tamil letters)
  - Default: Secondary background with border
  - Hover: Scale up effect
  - Correct: Green glow + bounce animation
  - Wrong: Red + shake animation, correct shown in green
- **Points popup:** "+1" or "+2" floats up with animation
- **Auto-advance:** 1.5 seconds after answering → next question
- **Manual Next button** also available

### 6.4 Scoring Logic
- Correct answer: +1 point
- **Streak bonus:** 3+ consecutive correct = +2 points per answer
- Time up (no answer): 0 points, streak resets

### 6.5 Result Screen
- Trophy image with pulse animation
- Star burst decoration
- Score: "X / 10"
- Star rating: 0-3 stars based on percentage
  - 0-29%: 0 stars
  - 30-59%: 1 star
  - 60-89%: 2 stars
  - 90-100%: 3 stars
- Best streak display
- Performance message in Tamil:
  - 90%+: "அருமை! சிறப்பான செயல்திறன்! 🏆"
  - 60%+: "நல்ல முயற்சி! தொடருங்கள்! 💪"
  - else: "மீண்டும் முயற்சி செய்யுங்கள்! 📚"
- **Buttons:**
  - 🔄 மீண்டும் விளையாடு (Play Again)
  - ➡️ அடுத்த நிலை (Next Level) — loads next track's quiz
  - ✖ மூடு (Close)

### 6.6 Level Progression
- Each track = 1 Level
- After completing a quiz, system fetches next track in same category (by sort_order)
- If next track has quiz → "Next Level" button appears
- If no more quizzes → "🎉 அனைத்து நிலைகளும் முடிந்தன!" (All levels completed)

### 6.7 Quiz Data Format (Admin Bulk Upload)
```
1. Question text in Tamil?
அ) Option A text
ஆ) Option B text
இ) Option C text
சரியான விடை: அ

2. Next question...
```

---

## 7. DESIGN SYSTEM

### 7.1 Color Tokens (HSL)

**Dark Theme (Default):**
```css
--background: 0 0% 4%        /* Near black */
--foreground: 45 10% 90%      /* Warm off-white */
--card: 0 0% 6%               /* Slightly lighter */
--primary: 43 96% 56%         /* Gold/Amber */
--primary-foreground: 0 0% 4% /* Dark text on gold */
--secondary: 0 0% 10%
--muted: 0 0% 12%
--muted-foreground: 0 0% 55%
--accent: 43 80% 45%          /* Darker gold */
--border: 0 0% 14%
--destructive: 0 72% 51%      /* Red */
--gold: 43 96% 56%
--gold-glow: 43 100% 65%
--charcoal: 0 0% 8%
--radius: 0px                 /* Sharp corners throughout */
```

**Light Theme:**
```css
--background: 120 20% 97%     /* Light green tint */
--foreground: 150 30% 15%     /* Dark green text */
--primary: 150 60% 35%        /* Islamic green */
--card: 120 15% 95%
```

### 7.2 Typography
- **Primary:** Geist (Latin text)
- **Tamil fonts:** Noto Sans Tamil, Anek Tamil, Catamaran
- Track cards use varied font styles per track (hash-based) for visual variety
- Dynamic font sizing based on title length

### 7.3 Design Principles
- **Sharp corners** (border-radius: 0) — distinctive aesthetic
- **Glassmorphism** on headers (backdrop-blur)
- **Gold accents** on interactive elements
- **Minimal, text-first** design
- **Mobile-first** responsive layout
- Cards with border, subtle hover effects
- No excessive animations except quiz game

---

## 8. FEATURES SUMMARY

### User Features
1. ✅ Browse categories and subcategories
2. ✅ Play audio tracks (single + multi-segment)
3. ✅ Playback speed control (0.5x-2x)
4. ✅ Background audio playback
5. ✅ Playback progress save/resume
6. ✅ Queue management
7. ✅ Autoplay next track
8. ✅ Favorites (add/remove)
9. ✅ Take notes while listening
10. ✅ Share tracks (Web Share API + clipboard fallback)
11. ✅ Search tracks
12. ✅ Daily free premium track
13. ✅ Quiz game with timer, streak, levels
14. ✅ Premium track purchase (₹29/track)
15. ✅ Gold subscription (₹99/month)
16. ✅ QR code payment option
17. ✅ Theme toggle (dark/light)
18. ✅ PWA installable
19. ✅ Audio request form
20. ✅ Responsive (mobile + desktop)

### Admin Features
1. ✅ Category CRUD
2. ✅ Track CRUD + Bulk upload
3. ✅ Subcategory management
4. ✅ Bulk quiz upload (Tamil format parsing)
5. ✅ Audio request management
6. ✅ Comment moderation

---

## 9. ROUTING MAP

```
/                          → Home page
/auth                      → Login/Signup
/browse?category={id}      → Category tracks (with subcategory support)
/audio/{trackId}           → Track detail
/audio/{trackId}/{slug}    → Track detail (SEO-friendly)
/favorites                 → User favorites
/profile                   → User profile
/about                     → About + Contact + Donation
/subscription              → Subscription management
/admin                     → Admin panel
/install                   → PWA install guide
/privacy-policy            → Privacy Policy
/terms-and-conditions      → Terms & Conditions
/refund-policy             → Refund Policy
/shipping-policy           → Shipping Policy
```

---

## 10. SECURITY (RLS POLICIES)

- **Tracks, Categories, Subcategories, Quiz Questions:** Public read, Admin write
- **Favorites, Notes, Progress, Purchases:** Users own data only
- **User Profiles:** Own profile read/write, Admin manages all
- **User Roles:** Admin manages, users read own role
- **Comments:** Public read approved, Admin manages all, Anyone can submit
- **Audio Requests:** Anyone can submit, Users see own, Admin sees all

---

## 11. EDGE FUNCTIONS

1. **razorpay-create-order** — Creates payment order for track/subscription
2. **razorpay-verify-payment** — Verifies Razorpay payment signature, updates user_profiles/user_purchases
3. **razorpay-create-qr-order** — Generates QR code for UPI payment
4. **check-payment-status** — Polls order status
5. **rotate-daily-free** — Cron: Picks random premium track as today's free

---

## 12. KEY TECHNICAL PATTERNS

### Audio Context (Global State)
- React Context wrapping entire app
- Single HTMLAudioElement instance
- Refs for stable event handler access (avoids stale closures)
- Visibility change handling for background playback
- Page show event handling for bfcache

### Track Access Control
- `useTrackAccess` hook centralizes all access logic
- Checks: is_daily_free → is_premium → isGoldMember → hasPurchased
- Three states: 'free' | 'unlocked' | 'locked'

### Quiz System Architecture
- `useQuizQuestions(trackId)` — Fetches quiz for current track
- `useQuizTrackIds()` — Fetches all track IDs that have quizzes (for badge display)
- `useNextQuizTrack()` — Finds next track with quiz in same category
- `QuizModal` — Main game container
- `QuizTimer` — Countdown component
- `QuizOptionButton` — Answer button with animations
- `QuizResultScreen` — Score card with stars

### Thumbnail System
- 4 default template images (mapped by template_id 1-4)
- Custom thumbnail_url overrides template
- `getTrackThumbnail()` utility function

---

## 13. CONTACT INFO
- Email: support@islamicaudiohub.com
- Phone: +91 80156 44319

---

*This document contains the complete specification for recreating the Islamic Audio Hub as a mobile application. All database schemas, page designs, features, quiz logic, payment flows, and design tokens are documented above.*
