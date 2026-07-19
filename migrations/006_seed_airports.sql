-- Migration: 006_seed_airports
-- Description: 预填中国主要机场数据
-- Author: 小扶
-- Date: 2026-07-19
-- Depends on: 001_init_tables
-- 数据来源：公开 ICAO/IATA 代码

INSERT INTO airports (icao_code, iata_code, name_cn, name_en, city_cn, city_en, latitude, longitude, elevation) VALUES
-- 华北
('ZBAA', 'PEK', '北京首都国际机场', 'Beijing Capital International Airport', '北京', 'Beijing', 40.0801, 116.5846, 35),
('ZBAD', 'PKX', '北京大兴国际机场', 'Beijing Daxing International Airport', '北京', 'Beijing', 39.5098, 116.4105, 25),
('ZBTJ', 'TSN', '天津滨海国际机场', 'Tianjin Binhai International Airport', '天津', 'Tianjin', 39.1244, 117.3458, 3),
('ZBSJ', 'SJW', '石家庄正定国际机场', 'Shijiazhuang Zhengding International Airport', '石家庄', 'Shijiazhuang', 38.2812, 114.6958, 71),
('ZBYN', 'TYN', '太原武宿国际机场', 'Taiyuan Wusu International Airport', '太原', 'Taiyuan', 37.7469, 112.6297, 782),
('ZBHH', 'HET', '呼和浩特白塔国际机场', 'Hohhot Baita International Airport', '呼和浩特', 'Hohhot', 40.8497, 111.8244, 1083),

-- 东北
('ZYTX', 'SHE', '沈阳桃仙国际机场', 'Shenyang Taoxian International Airport', '沈阳', 'Shenyang', 41.6392, 123.4836, 60),
('ZYCC', 'CGQ', '长春龙嘉国际机场', 'Changchun Longjia International Airport', '长春', 'Changchun', 43.9961, 125.6856, 215),
('ZYTL', 'DLC', '大连周水子国际机场', 'Dalian Zhoushuizi International Airport', '大连', 'Dalian', 38.9657, 121.5386, 33),
('ZYHB', 'HRB', '哈尔滨太平国际机场', 'Harbin Taiping International Airport', '哈尔滨', 'Harbin', 45.6234, 126.2503, 139),

-- 华东
('ZSSS', 'SHA', '上海虹桥国际机场', 'Shanghai Hongqiao International Airport', '上海', 'Shanghai', 31.1979, 121.3364, 3),
('ZSPD', 'PVG', '上海浦东国际机场', 'Shanghai Pudong International Airport', '上海', 'Shanghai', 31.1443, 121.8083, 4),
('ZSHC', 'HGH', '杭州萧山国际机场', 'Hangzhou Xiaoshan International Airport', '杭州', 'Hangzhou', 30.2295, 120.4344, 7),
('ZSNJ', 'NKG', '南京禄口国际机场', 'Nanjing Lukou International Airport', '南京', 'Nanjing', 31.7420, 118.8622, 14),
('ZSWX', 'WUX', '无锡苏南硕放国际机场', 'Wuxi Shuofang International Airport', '无锡', 'Wuxi', 31.5022, 120.4336, 5),
('ZSWZ', 'WNZ', '温州龙湾国际机场', 'Wenzhou Longwan International Airport', '温州', 'Wenzhou', 27.9144, 120.8511, 5),
('ZSCN', 'KHN', '南昌昌北国际机场', 'Nanchang Changbei International Airport', '南昌', 'Nanchang', 28.8650, 115.9019, 44),
('ZSFZ', 'FOC', '福州长乐国际机场', 'Fuzhou Changle International Airport', '福州', 'Fuzhou', 25.9351, 119.6633, 14),
('ZSAM', 'XMN', '厦门高崎国际机场', 'Xiamen Gaoqi International Airport', '厦门', 'Xiamen', 24.5440, 118.1273, 18),
('ZSQD', 'TAO', '青岛胶东国际机场', 'Qingdao Jiaodong International Airport', '青岛', 'Qingdao', 36.3664, 120.3744, 9),
('ZSJN', 'TNA', '济南遥墙国际机场', 'Jinan Yaoqiang International Airport', '济南', 'Jinan', 36.8542, 117.2197, 23),
('ZSHZ', 'HFE', '合肥新桥国际机场', 'Hefei Xinqiao International Airport', '合肥', 'Hefei', 31.7311, 117.3078, 29),

-- 华中
('ZHHH', 'WUH', '武汉天河国际机场', 'Wuhan Tianhe International Airport', '武汉', 'Wuhan', 30.7838, 114.2081, 34),
('ZGHA', 'CSX', '长沙黄花国际机场', 'Changsha Huanghua International Airport', '长沙', 'Changsha', 28.1892, 113.2196, 66),
('ZGCY', 'CGO', '郑州新郑国际机场', 'Zhengzhou Xinzheng International Airport', '郑州', 'Zhengzhou', 34.5197, 113.8408, 151),

-- 华南
('ZGGG', 'CAN', '广州白云国际机场', 'Guangzhou Baiyun International Airport', '广州', 'Guangzhou', 23.3924, 113.2988, 11),
('ZGSZ', 'SZX', '深圳宝安国际机场', 'Shenzhen Baoan International Airport', '深圳', 'Shenzhen', 22.6394, 113.8108, 4),
('ZGSY', 'SYX', '三亚凤凰国际机场', 'Sanya Phoenix International Airport', '三亚', 'Sanya', 18.3029, 109.4124, 28),
('ZJQH', 'HAK', '海口美兰国际机场', 'Haikou Meilan International Airport', '海口', 'Haikou', 19.9349, 110.4589, 23),
('ZGOW', 'SWA', '揭阳潮汕国际机场', 'Jieyang Chaoshan International Airport', '揭阳', 'Jieyang', 23.5519, 116.5156, 15),
('ZGBH', 'BHY', '北海福成国际机场', 'Beihai Fucheng Airport', '北海', 'Beihai', 21.5386, 109.2925, 6),

-- 西南
('ZUUU', 'CTU', '成都双流国际机场', 'Chengdu Shuangliu International Airport', '成都', 'Chengdu', 30.5785, 103.9471, 495),
('ZUTF', 'TFU', '成都天府国际机场', 'Chengdu Tianfu International Airport', '成都', 'Chengdu', 30.3120, 104.4410, 462),
('ZUCK', 'CKG', '重庆江北国际机场', 'Chongqing Jiangbei International Airport', '重庆', 'Chongqing', 29.7192, 106.6417, 416),
('ZUMY', 'MIG', '绵阳南郊机场', 'Mianyang Nanjiao Airport', '绵阳', 'Mianyang', 31.4336, 104.7389, 532),
('ZUKJ', 'JHG', '西双版纳嘎洒国际机场', 'Xishuangbanna Gasa International Airport', '西双版纳', 'Xishuangbanna', 21.9906, 100.7764, 553),
('ZPPP', 'KMG', '昆明长水国际机场', 'Kunming Changshui International Airport', '昆明', 'Kunming', 25.1019, 102.9292, 2102),
('ZUGY', 'GYU', '贵阳龙洞堡国际机场', 'Guiyang Longdongbao International Airport', '贵阳', 'Guiyang', 26.5385, 106.8009, 1139),

-- 西北
('ZLXY', 'XIY', '西安咸阳国际机场', 'Xi An Xianyang International Airport', '西安', 'Xian', 34.4471, 108.7517, 479),
('ZLLL', 'LHW', '兰州中川国际机场', 'Lanzhou Zhongchuan International Airport', '兰州', 'Lanzhou', 36.5152, 103.6202, 1947),
('ZLXN', 'XNN', '西宁曹家堡国际机场', 'Xining Caojiabao International Airport', '西宁', 'Xining', 36.5333, 102.0375, 2184),
('ZLYA', 'YIN', '延安二十里堡机场', 'Yanan Ershilipu Airport', '延安', 'Yanan', 36.6375, 109.5514, 958),
('ZWSH', 'KHG', '喀什国际机场', 'Kashgar International Airport', '喀什', 'Kashgar', 39.5408, 75.9499, 1370),
('ZWAK', 'AKU', '阿克苏温宿机场', 'Aksu Wensu Airport', '阿克苏', 'Aksu', 41.2658, 80.2372, 1149),
('ZWWW', 'URC', '乌鲁木齐地窝堡国际机场', 'Urumqi Diwopu International Airport', '乌鲁木齐', 'Urumqi', 43.9072, 87.4742, 648),

-- 港澳台
('VHHH', 'HKG', '香港国际机场', 'Hong Kong International Airport', '中国香港', 'Hong Kong', 22.3080, 113.9185, 9),
('VMMC', 'MFM', '澳门国际机场', 'Macau International Airport', '中国澳门', 'Macao', 22.1496, 113.5916, 6),
('RCTP', 'TPE', '台湾桃园国际机场', 'Taiwan Taoyuan International Airport', '中国台湾', 'Taiwan', 25.0777, 121.2328, 33),
('RCSS', 'TSA', '台北松山机场', 'Taipei Songshan Airport', '中国台湾', 'Taipei', 25.0697, 121.5519, 5)
ON CONFLICT (icao_code) DO NOTHING;

SELECT '006_seed_airports: ' || COUNT(*) || ' airports inserted' AS result FROM airports;
