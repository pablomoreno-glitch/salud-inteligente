-- One database per service on a single Postgres instance (see design decision 2).
-- Runs once, when the data volume is created.
CREATE DATABASE salud_gateway;
CREATE DATABASE salud_business;
CREATE DATABASE salud_catalog;
CREATE DATABASE salud_inventory;
CREATE DATABASE salud_orders;
CREATE DATABASE salud_advisor;
CREATE DATABASE salud_notifications;
