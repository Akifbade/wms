-- Add login page customization fields to Company table
-- Run this SQL in your database

ALTER TABLE companies 
ADD COLUMN loginVideoUrl VARCHAR(500) DEFAULT 'https://cdn.pixabay.com/video/2024/03/08/203404-921381913_large.mp4',
ADD COLUMN loginVideoEnabled BOOLEAN DEFAULT TRUE,
ADD COLUMN loginGlassEffect BOOLEAN DEFAULT TRUE,
ADD COLUMN loginBackgroundType VARCHAR(50) DEFAULT 'video',
ADD COLUMN loginBackgroundImage VARCHAR(500),
ADD COLUMN loginShowFeatures BOOLEAN DEFAULT TRUE;

-- Verify the columns were added
DESCRIBE companies;
