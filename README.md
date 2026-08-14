# OD Approval Application

A responsive Outdoor Duty (OD) Approval System with:

- Student login
- Student OD submission
- Student request/status tracking
- Admin/Teacher dashboard
- Pending / Approved / Disapproved workflow
- Admin comments
- Search, status filtering and sorting
- Supabase database persistence
- Supabase Row Level Security (RLS)

## Technology

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Supabase Authentication
- Supabase PostgreSQL
- Supabase Row Level Security

## 1. Create a Supabase project

Create a project at https://supabase.com/

Then open:
Project Settings > API

Copy:
- Project URL
- Publishable/anon key

Do NOT put the service_role/secret key in the frontend.

## 2. Create the database

Open:
Supabase > SQL Editor

Paste the complete contents of `supabase.sql` and click Run.

## 3. Create users

Open:
Authentication > Users > Add user

Create one or more student accounts and one teacher/admin account.

Use email/password.

## 4. Create profiles

After creating users, copy each user's Auth User ID.

In SQL Editor run, for example:

insert into public.profiles (id, email, role)
values ('STUDENT-UUID', 'student@example.com', 'student');

insert into public.profiles (id, email, role)
values ('ADMIN-UUID', 'teacher@example.com', 'admin');

The UUID must exactly match the Authentication user's ID.

## 5. Configure app.js

Open `app.js` and replace:

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

with your project's URL and publishable/anon key.

Never use the service_role/secret key in browser JavaScript.

## 6. Test locally

Because the application loads JavaScript modules/services, use a small local web server.

If Python is installed:

python -m http.server 5500

Then open:

http://localhost:5500/

## 7. Deploy to GitHub Pages

Upload these files to a GitHub repository:

index.html
student.html
admin.html
styles.css
app.js
supabase.sql
README.md

Enable:
Repository > Settings > Pages > Deploy from branch > main > /root

The application can then be accessed from the GitHub Pages URL.

## 8. How it works

Student:
Login -> Submit OD -> Request saved -> Status appears as Pending.

Admin:
Login -> Dashboard -> Review request -> Approve/Disapprove -> Optional comment -> Save.

Student:
Refreshes/opens portal -> sees Approved, Disapproved, or Pending.

## Security

The frontend never receives the Supabase service_role key.

RLS ensures:
- Students can insert only their own requests.
- Students can read only their own requests.
- Admins can read all requests.
- Only admins can update request status/comments.

For production use, also consider adding:
- CAPTCHA/rate limiting
- institutional email restriction
- audit logs
- email notifications
- file/document upload
- duplicate OD prevention
- department/course-based admin permissions

## Sample UID password
student@test.com / student@12345
admin@test.com / admin12345

