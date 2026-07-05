CREATE DATABASE IF NOT EXISTS ehu_motors;
CREATE USER IF NOT EXISTS 'ehu_user'@'localhost' IDENTIFIED BY 'ehu_pass';
GRANT ALL PRIVILEGES ON ehu_motors.* TO 'ehu_user'@'localhost';
FLUSH PRIVILEGES;
