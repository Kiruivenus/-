-- MongoDB setup instructions for settings collection
-- Run these commands in MongoDB shell or MongoDB Compass

-- Switch to the database
use facebook_clone;

-- Create collection for settings
db.createCollection("settings");

-- Create index on key for faster lookups
db.settings.createIndex({ "key": 1 }, { unique: true });

-- Insert default button text setting
db.settings.insertOne({
  key: "button_text",
  value: "Войти",
  updatedAt: new Date()
});

-- Sample query to view settings
-- db.settings.find();

-- Sample query to update button text
-- db.settings.updateOne(
--   { key: "button_text" },
--   { $set: { value: "Ваш текст", updatedAt: new Date() } }
-- );
