USE 4chanbot;

-- upgrade to v2.0.0
ALTER TABLE server_config ADD COLUMN `subscribed_board` varchar(10) DEFAULT NULL;
ALTER TABLE server_config ADD COLUMN `subscribed_time` int DEFAULT NULL;
ALTER TABLE server_config ADD COLUMN `subscribed_channel` varchar(24) DEFAULT NULL;