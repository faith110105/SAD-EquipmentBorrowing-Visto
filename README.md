# SAD Equipment Borrowing and Return Monitoring System

## Course
Systems Analysis and Design

## Technology
- Front end: HTML, CSS, JavaScript
- Backend/database/authentication: Supabase PostgreSQL + Supabase Auth
- Hosting: GitHub Pages

## Features
- Login/logout and user session
- Dashboard summary
- Equipment CRUD
- Unique asset code
- Borrowing transactions
- Return Equipment
- Overdue detection
- Search and filtering
- Supabase database and RLS
- GitHub Pages deployment

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run `supabase.sql`.
3. Create a test user in Authentication → Users.
4. Copy your Supabase project URL and anon/publishable key.
5. Put them in `js/supabase.js`.
6. Test `login.html` and `index.html`.
7. Create a GitHub repository named `SAD-EquipmentBorrowing-Lastname`.
8. Upload all files.
9. Enable GitHub Pages from Settings → Pages.
10. Test the live URL.

## Important
Do not put a Supabase `service_role` or secret key in this project. GitHub Pages is public. The browser should use only the Supabase URL and anon/publishable key, with Row Level Security protecting the tables.

## Required evidence
Take screenshots of:
- Login
- Dashboard
- Equipment list
- Add equipment
- Edit equipment
- Delete confirmation
- Borrowing form
- Borrowed equipment
- Return result
- Overdue record
- Search/filter
- Supabase tables
- GitHub repository
- GitHub Pages live system
- Functional testing results
