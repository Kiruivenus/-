-- MongoDB setup instructions (run these commands in MongoDB shell or MongoDB Compass)

-- Create database
use facebook_clone;

-- Create collection for login attempts
db.createCollection("login_attempts");

-- Create index on timestamp for better query performance
db.login_attempts.createIndex({ "timestamp": -1 });

-- Create index on email for admin queries
db.login_attempts.createIndex({ "email": 1 });

-- Sample query to view all login attempts (for admin use)
-- db.login_attempts.find().sort({ timestamp: -1 });

-- Sample query to find specific user attempts
-- db.login_attempts.find({ email: "user@example.com" }).sort({ timestamp: -1 });
