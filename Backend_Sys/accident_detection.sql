SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

CREATE TABLE `accidents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` datetime NOT NULL,
  `location` varchar(255) NOT NULL,
  `severity_level` enum('low','medium','high') NOT NULL,
  `severity_score` float NOT NULL,
  `video_path` varchar(255) NOT NULL,
  `accuracy` float NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;