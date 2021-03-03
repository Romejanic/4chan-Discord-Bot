CREATE DATABASE IF NOT EXISTS 4chanbot;
USE 4chanbot;

CREATE TABLE `server_config` (
  `id` varchar(24) NOT NULL,
  `default_board` varchar(10) DEFAULT NULL,
  `prefix` varchar(10) DEFAULT NULL,
  `restricted` tinyint(1) DEFAULT NULL,
  `removal_time` int DEFAULT 0,
  PRIMARY KEY (`id`)
);

CREATE TABLE `server_allowed_channels` (
  `server` varchar(24) NOT NULL,
  `channel` varchar(24) NOT NULL,
  PRIMARY KEY (`server`,`channel`)
);