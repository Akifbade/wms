-- Add login customization columns to production database
ALTER TABLE companies 
ADD COLUMN loginVideoUrl VARCHAR(500) DEFAULT 'https://cdn.pixabay.com/video/2020/06/26/43562-435859854_large.mp4',
ADD COLUMN loginVideoEnabled BOOLEAN DEFAULT TRUE,
ADD COLUMN loginGlassEffect BOOLEAN DEFAULT TRUE,
ADD COLUMN loginBackgroundType VARCHAR(50) DEFAULT 'video',
ADD COLUMN loginBackgroundImage VARCHAR(500) DEFAULT NULL,
ADD COLUMN loginShowFeatures BOOLEAN DEFAULT TRUE;
