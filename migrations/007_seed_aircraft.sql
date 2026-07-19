-- Migration: 007_seed_aircraft
-- Description: 预填常见机型数据
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables
-- 数据来源：ICAO 机型代码表

INSERT INTO aircraft (icao_code, name, manufacturer, family, engine_count, engine_type, cruise_range, seats_typical) VALUES
-- Airbus 系列
('A318', 'Airbus A318', 'Airbus', 'A320', 2, '涡扇', 6000, 132),
('A319', 'Airbus A319', 'Airbus', 'A320', 2, '涡扇', 6700, 156),
('A320', 'Airbus A320-200', 'Airbus', 'A320', 2, '涡扇', 6100, 180),
('A321', 'Airbus A321-200', 'Airbus', 'A320', 2, '涡扇', 5950, 220),
('A332', 'Airbus A330-200', 'Airbus', 'A330', 2, '涡扇', 13450, 293),
('A333', 'Airbus A330-300', 'Airbus', 'A330', 2, '涡扇', 11750, 335),
('A338', 'Airbus A330-800', 'Airbus', 'A330', 2, '涡扇', 15700, 257),
('A339', 'Airbus A330-900', 'Airbus', 'A330', 2, '涡扇', 13300, 287),
('A343', 'Airbus A340-300', 'Airbus', 'A340', 4, '涡扇', 13700, 335),
('A345', 'Airbus A340-500', 'Airbus', 'A340', 4, '涡扇', 16700, 313),
('A346', 'Airbus A340-600', 'Airbus', 'A340', 4, '涡扇', 14600, 380),
('A359', 'Airbus A350-900', 'Airbus', 'A350', 2, '涡扇', 15000, 325),
('A35K', 'Airbus A350-1000', 'Airbus', 'A350', 2, '涡扇', 16100, 366),
('A388', 'Airbus A380-800', 'Airbus', 'A380', 4, '涡扇', 15200, 555),

-- Boeing 系列
('B712', 'Boeing 717-200', 'Boeing', '717', 2, '涡扇', 3820, 117),
('B732', 'Boeing 737-200', 'Boeing', '737', 2, '涡扇', 4260, 130),
('B733', 'Boeing 737-300', 'Boeing', '737', 2, '涡扇', 5000, 149),
('B734', 'Boeing 737-400', 'Boeing', '737', 2, '涡扇', 4000, 168),
('B735', 'Boeing 737-500', 'Boeing', '737', 2, '涡扇', 5180, 132),
('B736', 'Boeing 737-600', 'Boeing', '737', 2, '涡扇', 5925, 145),
('B737', 'Boeing 737-700', 'Boeing', '737', 2, '涡扇', 6230, 149),
('B738', 'Boeing 737-800', 'Boeing', '737', 2, '涡扇', 5765, 189),
('B739', 'Boeing 737-900', 'Boeing', '737', 2, '涡扇', 5265, 215),
('B7M8', 'Boeing 737 MAX 8', 'Boeing', '737 MAX', 2, '涡扇', 6570, 178),
('B7M9', 'Boeing 737 MAX 9', 'Boeing', '737 MAX', 2, '涡扇', 6170, 193),
('B744', 'Boeing 747-400', 'Boeing', '747', 4, '涡扇', 13450, 416),
('B748', 'Boeing 747-8', 'Boeing', '747', 4, '涡扇', 14310, 467),
('B752', 'Boeing 757-200', 'Boeing', '757', 2, '涡扇', 7270, 200),
('B753', 'Boeing 757-300', 'Boeing', '757', 2, '涡扇', 6420, 243),
('B762', 'Boeing 767-200', 'Boeing', '767', 2, '涡扇', 7130, 216),
('B763', 'Boeing 767-300', 'Boeing', '767', 2, '涡扇', 9070, 261),
('B764', 'Boeing 767-400', 'Boeing', '767', 2, '涡扇', 10420, 304),
('B772', 'Boeing 777-200', 'Boeing', '777', 2, '涡扇', 9700, 314),
('B773', 'Boeing 777-300', 'Boeing', '777', 2, '涡扇', 11165, 396),
('B77W', 'Boeing 777-300ER', 'Boeing', '777', 2, '涡扇', 13650, 396),
('B77L', 'Boeing 777-200LR', 'Boeing', '777', 2, '涡扇', 17395, 317),
('B788', 'Boeing 787-8', 'Boeing', '787', 2, '涡扇', 13620, 242),
('B789', 'Boeing 787-9', 'Boeing', '787', 2, '涡扇', 14140, 296),
('B78X', 'Boeing 787-10', 'Boeing', '787', 2, '涡扇', 11160, 330),

-- 中国商飞 COMAC
('ARJ21', 'COMAC ARJ21', 'COMAC', 'ARJ21', 2, '涡扇', 3700, 90),
('C919', 'COMAC C919', 'COMAC', 'C919', 2, '涡扇', 5555, 168),

-- Embraer 巴西航空工业
('E145', 'Embraer ERJ-145', 'Embraer', 'ERJ', 2, '涡扇', 3700, 50),
('E170', 'Embraer E170', 'Embraer', 'E-Jet', 2, '涡扇', 4260, 78),
('E190', 'Embraer E190', 'Embraer', 'E-Jet', 2, '涡扇', 4537, 114),
('E195', 'Embraer E195', 'Embraer', 'E-Jet', 2, '涡扇', 4260, 132),

-- Bombardier 庞巴迪 / Airbus A220
('CRJ2', 'Bombardier CRJ200', 'Bombardier', 'CRJ', 2, '涡扇', 3046, 50),
('CRJ7', 'Bombardier CRJ700', 'Bombardier', 'CRJ', 2, '涡扇', 3530, 70),
('CRJ9', 'Bombardier CRJ900', 'Bombardier', 'CRJ', 2, '涡扇', 3500, 90),
('CS300', 'Airbus A220-300 (原 CS300)', 'Airbus', 'A220', 2, '涡扇', 6112, 135)
ON CONFLICT (icao_code) DO NOTHING;

SELECT '007_seed_aircraft: ' || COUNT(*) || ' aircraft inserted' AS result FROM aircraft;
