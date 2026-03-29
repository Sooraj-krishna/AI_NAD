-- Database Schema

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  user_id varchar(255),
  action varchar(255),
  timestamp timestamp
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email varchar(255),
  password_hash varchar(255),
  role varchar(100)
);

CREATE TABLE tokens (
  id uuid PRIMARY KEY,
  user_id uuid,
  token varchar(255),
  expiry_time timestamp
);

