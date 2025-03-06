SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

CREATE TABLE accidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    location VARCHAR(255),
    severity_level VARCHAR(50),
    severity_score FLOAT,
    video_path VARCHAR(255),
    accuracy FLOAT
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;